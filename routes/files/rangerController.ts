import { Request, Response } from 'express';
import fs, { Dirent, PathLike } from 'fs';
import path from 'path';
import { IFile } from '../../models/files';
import {
  connSync,
  getTokenKey,
  getLocalPage,
  makeReg
} from '../../util/util';
import { IUser } from '../../models/user';

/* Defines whether or not the data base is being updated */
export let updating: boolean = false;
/* The directory to work with */
export let cwd: string;
/* files to exclude */
const exclude: string[] = [
  'node_modules',
  'build',
  'files.json',
  'ranger.json',
];

/**
 * Verifies the integrity of all the files cloudster will manage
 */
export const initializeServer = (): void => {
  /* Initialy updating is set to true */
  updating = true;

  /* The files that are currently active in the folder */
  const files = loadFiles(cwd);

  let rows: IFile[] = connSync
    .run(`SELECT ino, name from archivos`) as unknown as IFile[];

  rows.forEach(({ino: currentIno, name}) => {
    const selected: IFile = files.find((f) => f.ino === currentIno) as IFile;

    /* If the file doesn't exist in the current folder, marks it as unavailable */
    if (!selected) {
      deleteFileSync(currentIno, name);
      return;
    }

    /* If it is, the data gets updated */
    const update = connSync.run(`
      UPDATE archivos SET
        name = '${selected.name.replace(/\'/g, "''")}'
        , ext = '${selected.ext}'
        , isFile = ${selected.isFile ? 1 : 0}
        , fullSize = ${selected.fullSize}
        , size = '${selected.size}'
        , dependency = ${selected.dependency}
      WHERE ino = ${currentIno} COLLATE NOCASE
      `);
    if (update.error) {
      console.log('\x1b[31mUpdate \x1b[36m SYNC\x1b[0m ');
      return;
    }
    console.log('\x1b[34mUpdate \x1b[36m SYNC\x1b[0m ' + currentIno);
  }); // foreach
  const inoArray = rows.map(({ino}) => ino);
  checkFiles(inoArray, files);
};

/**
 * Checks if all the files currently located on the
 * initial path are avalible in the database
 * @param error the error that might occur during query execution
 * @param rows the retrieved rows by the query
 * @param files the file list that will be used as reference
 */
const checkFiles = (rows: number[], files: IFile[], error?: Error): void => {
  if (error) {
    // console.log("\x1b[31mERROR\t\x1b[0m " + error.message);
    return;
  }
  files.forEach((file) => {
    const selected: number = rows.find((row) => row === file.ino) as number;
    if (!selected) {
      insertFileSync(file);
    }
  });
};

/**
 * Reads all the files and folders recursively in order to have
 * a temporal log of all the data inside the server
 * @param dir The directory the file is in
 * @param dep The ino corresponding to the directory
 * @param nivel The Hierarchy to be assign to the file
 */
const loadFiles = (
  dir: PathLike,
  dep: number = 0,
  nivel: number = 1
): IFile[] => {
  let files: IFile[] = [];
  let unprocessedFiles: Dirent[];
  try {
    unprocessedFiles = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    // console.log(`no such file or directory, readdir ${dir}`);
    // return { status: 500, response: { ...err, message: 'readdirSync: ' + err.message } };
    return [];
  }
  unprocessedFiles.forEach((dirent: Dirent) => {
    if (exclude.includes(dirent.name)) return;

    const file = generateFile(dirent.name, dir.toString(), dep, nivel);
    files.push(file);

    if (dirent.isDirectory()) {
      const dependedFiles = loadFiles(
        path.join(dir.toString(), dirent.name),
        file.ino,
        file.nivel
      );
      files = files.concat(dependedFiles);
    }
  });
  return files;
};

/**
 * Generates the structure of a file according to the stat
 * Returns a IFile object
 * @param fileName The name of the file to be generated
 * @param dir The directory where the file is held
 * @param dep The ino corresponding to the directory
 * @param nivel The Hierarchy to be assign to the file
 */
const generateFile = (
  fileName: string,
  dir: string,
  dep: number,
  nivel: number = 1
): IFile => {
  let stat;
  try {
    stat = fs.statSync(path.join(dir, fileName));
  } catch (e) {
    // console.log(`no such file or directory, stat ${dir + _ + fileName}`);
    return {} as IFile;
  }

  /* Nivel de acceso  de la carpeta contenedora */
  if (nivel === -1) {
    const deplvl = findFile(+dep);
    if (deplvl && nivel < deplvl.nivel) nivel = deplvl.nivel;
    else nivel = 1;
  }

  const ext = stat.isDirectory()
    ? ''
    : path.parse(fileName).ext === ''
    ? '~'
    : path.parse(fileName).ext.substring(1);
  const file: IFile = {
    ino: stat.ino,
    name: fileName,
    ext,
    isFile: stat.isFile(),
    available: true,
    birthtime: stat.birthtime,
    fullSize: stat.size,
    size: parseSize(stat.size),
    dependency: dep,
    nivel,
  };

  return file;
};

/**
 * =====================
 *    Generic Queries
 * =====================
 */
const insertFileSync = (file: IFile, user: string = 'Cloudster'): boolean => {
  const query = insertQuery(file, user);
  const res = connSync.run(query);
  if (res.error) {
    console.log('\x1b[32mINSERT \x1b[36m SYNC \x1b[0m ' + file.ino);
    console.error(res.error);
    return false;
  }
  console.log(
    '\x1b[33mINSERT \x1b[36m SYNC \x1b[0m ' + file.ino + ' ' + file.name
  );
  return true;
};
/**
 * Returns the query to update the file reg
 * @param file fiel
 */
const insertQuery = (file: IFile, user: string = 'Cloudster'): string => {
  return `
    INSERT INTO archivos (
      ino
      , name
      , ext
      , isFile
      , available
      , birthtime
      , fullSize
      , size
      , dependency
      , nivel
      , usuario
    )
    VALUES (
      ${file.ino}
      , '${file.name.replace(/\'/g, "''")}'
      , '${file.ext}'
      , ${file.isFile ? 1 : 0}
      , 1
      , ${(file.birthtime as Date).getTime()}
      , ${file.fullSize}
      , '${file.size}'
      , ${file.dependency}
      , ${file.nivel}
      , '${user}'
    );
  `;
};

/**
 * it DOES delete them
 * @param ino
 */
const deleteFileSync = (ino: number, fileName: string, userID: string = 'Cloudster' ): boolean => {
  const res = connSync.run(`
    DELETE FROM
      archivos
    WHERE
      ino = ${ino}`);
  if (res.error) return false;

  makeReg(userID, ino, 'deleted', fileName);

  console.log('\x1b[32mDELETE \x1b[36mSYNC \x1b[0m ' + ino);

  const dep: IFile[] = (connSync.run(
    `SELECT ino, name FROM archivos WHERE dependency=${+ino} COLLATE NOCASE`
  ) as unknown) as IFile[];
  dep.forEach((file) => {
    deleteFileSync(file.ino, file.name);
  });

  return true;
};

/**
 * ====================================
 *    The actual routes' controller
 * ====================================
 */

/**
 * Retrieves all the files inside a folder, excluding all of those which level
 * is higher than the user's
 * @param req The incoming request
 * @param res The outgoing response
 */
export const getFilesInDirectory = (req: Request, res: Response): void => {
  const [nivel, file, usuario] = verifyPermission(req, res);

  if (nivel === -1) return;

  const last = req.url.split('/').pop();
  let key = '';
  switch (last) {
    case 'peers': {
      key = 'dependency';
      break;
    }
    case 'files':
    default: {
      key = 'ino';
      break;
    }
  }

  connSync.run(
    `UPDATE archivos SET
      lastAccessed=${new Date().getTime()},
      usuario_ac='${usuario.id}'
    WHERE
      dependency=${file[key]}
      AND nivel<=?${nivel}
      AND available=1
    COLLATE NOCASE`
  );
    
  const query = `INSERT INTO registros (
    usuario,
    ino,
    accion,
    fecha
  ) SELECT 
    '${usuario.id}' as usuario,
    ino,
    'read' as accion,
    ${new Date().getTime()}
  FROM
    archivos
  WHERE
    dependency=${file[key]}
    AND nivel<=${nivel}
    AND available=1
  COLLATE NOCASE`
  connSync.run(query);

  const files: IFile[] = connSync.run(
    `SELECT 
      \`archivos\`.\`id\`,
      \`archivos\`.\`ino\`,
      \`archivos\`.\`name\`,
      \`archivos\`.\`ext\`,
      \`archivos\`.\`isFile\`,
      \`archivos\`.\`birthtime\`,
      \`archivos\`.\`fullSize\`,
      \`archivos\`.\`size\`,
      \`archivos\`.\`dependency\`,
      \`archivos\`.\`nivel\`,
      \`archivos\`.\`usuario\`,
      IFNULL(\`usuarios\`.\`usuario\`, \`archivos\`.\`usuario\`) as upBy
    FROM
      archivos
    LEFT JOIN
      \`usuarios\`
    ON
      \`archivos\`.\`usuario\` = \`usuarios\`.\`id\`
    WHERE
      dependency=${file[key]}
      AND archivos.nivel<=${nivel}
      AND available=1
    COLLATE NOCASE`
  ) as unknown as IFile[];

  res.status(200).json(
    files.map((f) => {
      return {
        ...f,
        isFile: Boolean(f.isFile),
        birthtime: new Date(f.birthtime)
      };
    })
  );
};

export const getParent = (req: Request, res: Response): void => {
  const [nivel, file, user] = verifyPermission(req, res);

  if (nivel === -1) return;

  const parent = findFile(file.dependency);
  makeReg(user.id, parent.ino, 'read');
  res.status(200).json({
    ...parent,
    isFile: Boolean(parent.isFile)
  });
};

/**
 * Retrieves the info for a spefic file
 * @param req The incoming request
 * @param res The outgoing response
 */
export const getFileInfo = (req: Request, res: Response): void => {
  const [nivel, file, user] = verifyPermission(req, res);
  if (nivel === -1) return;
  makeReg(user, file.ino, 'read');
  res.status(200).json(file);
};

/**
 * Downloads the file
 * @param req The incoming request
 * @param res The outgoing response
 */
export const downloadFile = (req: Request, res: Response): void => {
  const [nivel, file, usuario] = verifyPermission(req, res);
  if (nivel === -1) {
    return;
  }
  if (!file.isFile) {
    res.status(400).send();
    return;
  }
  const route = getFileFullPath(file);
  connSync.run(`
    UPDATE archivos SET
      lastDownload=${new Date().getTime()},
      usuario_do='${usuario.id}
    WHERE ino=${file.ino};
  `);
  makeReg(usuario.id, file.ino, 'downloaded');
  res.status(200).download(route);
};

/**
 * A the file
 * @param req The incoming request
 * @param res The outgoing response
 */
export const viewFile = (req: Request, res: Response): void => {
  res.removeHeader('X-Frame-Options');
  const [, file, usuario] = verifyPermission(req, res, false);

  if (file.status && file.status === 404) {
    res.status(200).sendFile(getLocalPage());
    return;
  } else if (file.status === 401) {
    res.status(200).send();
    return;
  }
  if (!file.isFile) {
    res.status(400).send();
    return;
  }
  const route = getFileFullPath(file);
  connSync.run(`
    UPDATE archivos SET
      lastDownload=${new Date().getTime()},
      usuario_do='${usuario.id}'
    WHERE ino=${file.ino};
  `);
  makeReg(usuario.id, file.ino, 'downloaded');
  res.status(200).sendFile(route);
};

/**
 * Handles the entire process of uploading a new file to the server
 * @param req The incoming request
 * @param res The outgoing response
 */
export const postFile = (req: Request, res: Response): void => {
  const ino = parseInt(req.params.ino, 10);
  const token = getTokenKey(req.headers.authorization);
  if (isNaN(ino)) {
    res.status(400).send({ message: 'El ino no es compatible' });
    return;
  }

  const folder = findFile(ino);

  const baseDir = ino !== 0 ? getFileFullPath(folder) : cwd;

  const final = setNewName(req.file.originalname, ino);
  const newName: string = path.join(baseDir, final);

  try {
    fs.renameSync(req.file.path, newName);
    try {
      fs.statSync(newName);
    } catch (e) {
      res.status(500).json(e);
      return;
    }
    const file = generateFile(final, baseDir, ino, -1);
    insertFileSync(file, token.id);
    makeReg(token.id, file.ino, 'uploaded');
    res.status(200).json({ message: 'Recibido' });
  } catch (e) {
    if (e && e.message.includes('cross-device link not permitted')) {
      const is = fs.createReadStream(req.file.path);
      const os = fs.createWriteStream(newName);
      is.pipe(os);
      is.on('end', () => {
        fs.unlinkSync(req.file.path);
        const file = generateFile(final, baseDir, ino, -1);
        const response = insertFileSync(file, token.id);
        if (!response){
          return res.status(500).json({
            message: `I'm fucking tired already, I just wanna leave it right here.
                     \nAh right!, something bad happened so...`,
          });
        }
        makeReg(token.id, file.ino, 'uploaded');
        res.status(200).json({ message: 'Recibido' });
      });
    } else res.status(500).json({ message: e.message });
  }
};

/**
 * Handles the entire process of uploading a new file to the server
 * @param req The incoming request
 * @param res The outgoing response
 */
export const postFolder = (req: Request, res: Response): void => {
  const [nivel, file, user] = verifyPermission(req, res);
  if (nivel === -1) {
    return;
  }
  if (file.isFile) {
    res
      .status(400)
      .json({ message: 'No se puede crear una carpeta dentro de un archivo' });
    return;
  }
  const route = file.ino ? getFileFullPath(file) : cwd;
  const newName = setNewName(req.body.name, file.ino);
  try {
    fs.mkdirSync(path.join(route, newName), { recursive: true });
  } catch (error) {
    res.status(400).json({ ...error });
  }
  const folder = generateFile(newName, route, file.ino, -1);
  insertFileSync(folder, user.id);
  makeReg(user.id, folder.ino, 'uploaded');
  res
    .status(200)
    .json({ message: `carpeta ${newName} creada en ${file.name}` });
};

/**
 * Doesn't actually changes the file but updates its access level
 * @param req The incoming request
 * @param res The outgoing response
 */
export const putFile = (req: Request, res: Response): void => {
  const ino = +req.params.ino;
  if (isNaN(ino) || ino === 0) {
    res.status(400).json({ response: 'Algo salió mal' });
    return;
  }

  const [userLevel, file, user] = verifyPermission(req, res);

  if (user.id !== file.usuario && user.nivel < 5) {
    res.status(401).json({ response: `No tienes los permisos` });
    return;
  }

  let { nivel = 0, name = '' } = req.body as IFile;
  if (!nivel) {
    nivel = file.nivel;
  } else if (nivel > userLevel) {
    nivel = userLevel;
  }

  let response;
  if (name) {
    const ext = path.extname(name);

    const originalname = getFileFullPath(file);
    const final = setNewName(name, ino);
    const parentFolder = path.dirname(originalname);
    const newName: string = path.join(parentFolder, final);
    try {
      // console.log(fs.existsSync(originalname).toString());
      fs.renameSync(originalname, newName);
    } catch (error) {
      res.status(500).json({ ...error });
      return;
    }

    response = connSync.run(`
      UPDATE archivos SET
        name='${name}',
        ext='${ext.substr(1)}',
        lastModified=${new Date().getTime()},
        usuario_mo='${user.id}'
      WHERE ino=${ino};
    `);
    makeReg(user.id, file.ino, 'modified', file.name, final);
    if (response.error) res.status(500).json(response);
  }

  response = connSync.run(`
    UPDATE archivos SET
      lastModified=${new Date().getTime()},
      nivel=${nivel},
      usuario_mo='${user.id}'
    WHERE ino=${ino};
  `);
  if (response.error) {
    res.status(500).json(response);
    return;
  }

  makeReg(user.id, ino, 'modified', file.nivel.toString(), nivel.toString());
  res.status(200).json({ message: 'Oll korrect' });
};

/**
 * Doesn't actually deletes the file but marks it as unavailable
 * @param req The incoming request
 * @param res The outgoing response
 */
export const removeFile = (req: Request, res: Response): void => {
  const ino = +req.params.ino;
  if (isNaN(ino) || ino === 0) {
    res.status(400).json({ response: 'Algo salió mal' });
    return;
  }

  const [userLevel, file, user] = verifyPermission(req, res);

  if (user.id !== file.usuario && userLevel < 5) {
    res.status(401).json({ response: `No tienes los permisos.` });
    return;
  }

  if (!file.isFile) {
    res.status(400).json({ response: `Las carpetas no pueden desactivarse.` });
    return;
  }

  const result = markUnavailableSync(+req.params.ino, +!file.available, user.id);

  makeReg(
    user.id,
    +req.params.ino,
    'modified',
    (!file.available).toString(),
    Boolean(file.available).toString()
  );

  if (result) {
    const message = !file.available
      ? 'Archivo restaurado'
      : 'Archivo suspendido';
    res.status(200).json({ message });
    return;
  }
  res.status(500).json({ response: 'Algo salió mal' });
};

const markUnavailableSync = (ino: number, value: number, userID: string): boolean => {
  const res = connSync.run(`
    UPDATE archivos SET
      available = ${value},
      lastModified=${new Date().getTime()},
      usuario_mo='${userID}'
    WHERE ino = ${ino} COLLATE NOCASE`);
  return !Boolean(res.error);
};

/**
 * ===============
 *    Utilities
 * ===============
 */

/**
 * Sets the new directory cloudster will be working with
 * @param dir the new directory
 */
export const setDirectory = (dir: string): boolean => {
  cwd = dir;

  initializeServer();
  debugger;
  return true;
  // try {
  //    fs.accessSync(dir);
  //    let directory = fs.readFileSync(dir + _ + 'folder', 'utf-8');
  //    try {
  //       fs.accessSync(directory);
  //       cwd = directory;
  //
  //       return true;
  //    }
  //    catch (e) {
  //       console.log(directory);
  //       console.log(`La direccion en el archivo 'Directorio.txt' no es valida`);
  //       console.log(`Corrija y vuelva a intentarlo`);
  //       return false;
  //    }
  // }
  // catch (err) {
  //    console.log('--------------    Creando Directorio.txt    --------------');
  //    try {
  //       fs.writeFileSync('dir', dir + _ + 'folder', 'utf8');
  //       initializeServer();
  //       return true;
  //    }
  //    catch (e) {
  //       console.log('Ha ocurrido un error al inicializar.');
  //       return false;
  //       process.exit();
  //    }
  // }
};

/**
 * Verifies that the user indeed has permission to access the file he requested
 * @param req The incoming request
 * @param res The outgoing response
 */
const verifyPermission = (
  req: Request,
  res: Response,
  sendRes = true
): any[] => {
  const { key } = getTokenKey(
    req.headers.authorization || 'bearer ' + req.query.token
  );

  const [user] = connSync.run(`SELECT * FROM usuarios WHERE key='${key}' COLLATE NOCASE`) as unknown as IFile[];

  if (!req.params.ino) return [user.nivel, { ino: 0 }, user];

  const file = findFile(req.params.ino);

  if (!file) {
    if (sendRes) res.status(404).send({ response: 'file not found' });
    return [-1, { status: 404 }, user];
  }
  if (file.nivel > user.nivel) {
    if (sendRes)
      res.status(401).json({ message: `No tiene acceso a este archivo` });
    return [-1, { status: 401 }];
  }
  return [user.nivel, file, user];
};

/**
 * Retrieves the full path to a file
 * @param file the file
 */
export const getFileFullPath = (file: IFile): string => {
  return path.join(cwd, parseDependency(file));
};

/**
 * Finds the relative path to a file
 * @param file the file
 */
export const parseDependency = (file: IFile): string => {
  let dir: string = file.name;
  if (file.dependency) {
    const parentFolder = parseDependency(findFile(file.dependency));
    dir = path.join(parentFolder, dir);
  }
  return dir;
};

/**
 * Looks for a specific file inside the database
 * @param ino the file's unique identifier
 */
export const findFile = (ino: string | number = 0): IFile => {
  //    /* Wait for the file to be found ¯\_(ツ)_/¯ */
  if (+ino === 0) {
    return {
      id: 0,
      ino: 0,
      name: 'root',
      ext: '',
      isFile: false,
      birthtime: new Date(1999, 9, 6),
      fullSize: 0,
      size: '0.00 Bytes',
      nivel: 1,
      usuario: 'Cloudster',
      upBy: 'Cloudster'
    };
  }

  const [file]: IFile[] = connSync.run(`
    SELECT 
      \`archivos\`.\`id\`,
      \`archivos\`.\`ino\`,
      \`archivos\`.\`name\`,
      \`archivos\`.\`ext\`,
      \`archivos\`.\`isFile\`,
      \`archivos\`.\`birthtime\`,
      \`archivos\`.\`fullSize\`,
      \`archivos\`.\`available\`,
      \`archivos\`.\`size\`,
      \`archivos\`.\`dependency\`,
      \`archivos\`.\`nivel\`,
      \`archivos\`.\`usuario\`,
      IFNULL(\`usuarios\`.\`usuario\`, \`archivos\`.\`usuario\`) as upBy
    FROM
      archivos
    LEFT JOIN
      \`usuarios\`
    ON
      \`archivos\`.\`usuario\` = \`usuarios\`.\`id\`
    WHERE
      ino=${ino}
  `
  ) as unknown as IFile[];
  
  if (!file) return file;
  return {
    ...file,
    isFile: Boolean(file.isFile),
  };
};

const setNewName = (fileName: string, ino: number = 0): string => {
  const _ext: string = path.extname(fileName);
  const nombre: string = path.basename(fileName, _ext);

  const exist = (a: string): number => {
    const result = connSync.run(
      `SELECT ino FROM archivos WHERE name=? AND dependency=?`,
      [a, ino]
    );
    return result.length;
  };

  let i = 0;
  let nuevo = `${nombre}${_ext}`;

  while (exist(nuevo)) {
    nuevo = `${nombre}_${++i}${_ext}`;
  }
  return nuevo;
};

/**
 * Converts the bytes into its correspoding unit in terms of space
 * @param size full size
 */
export const parseSize = (size: number): string => {
  if (size < 1024) return `${size.toFixed(2)} Bytes`;

  size = size / 1024;
  if (size < 1024) return `${size.toFixed(2)} KB`;

  size = size / 1024;
  if (size < 1024) return `${size.toFixed(2)} MB`;

  size = size / 1024;
  return `${size.toFixed(2)} GB`;
};
