import { Request, Response } from "express";
import fs, { PathLike, Dirent } from "fs";
import path from "path";
import { IFile } from "../../models/files";
import { conn, connSync, getTokenKey } from "../../util/util";

const _ = (process.platform === 'win32' ? '\\' : '/');
/* Defines whether or not the data base is being updated */
export let updating: boolean = false;
export let cwd: string;
/* files to exclude */
const exclude: string[] = [
   'node_modules',
   'build',
   'files.json',
   'ranger.json'
];

const generateFile = (fileName: string, dir: string, dep: string | number, nivel: number = 1): IFile => {
   let stat;
   try {
      stat = fs.statSync(dir + _ + fileName);
   } catch (e) {
      console.log(`no such file or directory, stat ${dir + _ + fileName}`);
      return <IFile>{};
   }

   /* Nivel de acceso  de la carpeta contenedora */
   if (nivel === -1) {
      const deplvl = findFile(+dep);
      if (deplvl && nivel < deplvl.nivel)
         nivel = deplvl.nivel;
      else nivel = 1;
   }

   const ext = stat.isDirectory() ? '' :
      path.parse(fileName).ext === '' ?
         '~' : path.parse(fileName).ext.substring(1);
   const file: IFile = {
      ino: stat.ino.toString(),
      name: fileName,
      ext: ext,
      isFile: stat.isFile(),
      available: true,
      birthtime: stat.birthtime,
      fullSize: stat.size,
      size: parseSize(stat.size),
      dependency: dep.toString(),
      nivel: nivel
   };

   return file;
}

const loadFiles = (dir: PathLike, dep: string = '0', nivel: number = 1): IFile[] => {
   let files: IFile[] = [], unprocessedFiles: Dirent[];
   try {
      unprocessedFiles = fs.readdirSync(dir, { withFileTypes: true });
   }
   catch (err) {
      console.log(`no such file or directory, readdir ${dir}`);
      // return { status: 500, response: { ...err, message: 'readdirSync: ' + err.message } };
      return [];
   }
   unprocessedFiles.forEach((dirent: Dirent) => {
      if (exclude.includes(dirent.name)) return;

      const file = generateFile(dirent.name, dir.toString(), dep, nivel);
      files.push(file);

      if (!file.isFile) {
         const dependedFiles = loadFiles(dir + _ + dirent.name, file.ino, file.nivel);
         files = files.concat(dependedFiles);
      }
   });
   return files;
}

/**
 * Verifies all the files cloudster will manage
 */
export const initializeServer = (): void => {

   /* Initialy updating is set to true */
   updating = true;

   /* The files that are currently active in the folder */
   // const files = loadFiles('', cwd, 0);
   const files = loadFiles(cwd);
   conn.each(`SELECT ino from archivos`, (err: Error, rowIno: { ino: number }) => {
      const selected = files.find(
         f => f.ino.trim() === rowIno.ino.toString().trim()
      )
      if (!selected) {
         deleteFile(rowIno.ino);
         return;
      }

      conn.run(`
      UPDATE archivos SET
         name = '${selected.name}'
         , ext = '${selected.ext}'
         , isFile = ${selected.isFile ? 1 : 0}
         , fullSize = ${selected.fullSize}
         , size = '${selected.size}'
      WHERE ino = ? COLLATE NOCASE`
         , rowIno.ino
         , (e) => console.log('\x1b[34mUpdate \x1b[36mASYNC\x1b[0m ' + (e ? e.message : rowIno.ino))
      );
   });

   conn.all(`SELECT ino FROM archivos;`, (error: Error, row: IFile[]) => checkFiles(error, row, files));

}

/**
 * Checks if all the files currently located on the 
 * initial path are avalible in the database
 * @param error the error that might occur during query execution
 * @param rows the retrieved rows by the query
 * @param files the file list that will be used as reference
 */
const checkFiles = (error: Error, rows: IFile[], files: IFile[]): void => {
   if (error) {
      console.log("\x1b[31mERROR\t\x1b[0m " + error.message);
      return;
   }

   files.forEach(
      file => {
         const selected = rows.find(
            (row: IFile) => row.ino.toString().trim() === file.ino.trim()
         );
         if (!selected)
            insertFile(file);
      }
   );

   updating = false;
}

/**
 * It doesn't actually remove the file from the server, 
 * it just marks it as unavailable
 * @param ino 
 */
const deleteFile = (ino: string | number): void => {
   console.log(ino);
   conn.run(`
       UPDATE archivos SET
         available = 0
      WHERE ino = ${+ino} COLLATE NOCASE`,
      (e) => console.log('\x1b[31mDelete\x1b[36m ' + (e ? e.message : ino))
   );
   conn.all(`SELECT ino FROM archivos WHERE dependency=? COLLATE NOCASE`
      , [+ino]
      , (err, rows: IFile) => deleteFile(rows.ino)
   );
}

/**
 * It doesn't actually remove the file from the server,
 * it just marks it as unavailable
 * @param ino
 */
const deleteFileSync = (ino: string | number): boolean => {
   try {
      connSync.run(`
       UPDATE archivos SET
         available = 0
      WHERE ino = ? COLLATE NOCASE`
         , [+ino]
      );
      const dep: IFile[] = connSync.run(`
         SELECT ino FROM archivos WHERE dependency=? COLLATE NOCASE`
         , [+ino]
      );

      console.log('\x1b[31mDelete \x1b[36mSYNC \x1b[0m ' + ino)
      dep.forEach(file => {
         deleteFileSync(file.ino);
      });
      return true;
   } catch (e) {
      console.log('\x1b[31mDelete \x1b[36mSYNC \x1b[0m ' + (e ? e.message : ino))
      return false;
   }
}

const insertFile = (file: IFile): void => {
   const query = insertQuery(file);
   // console.log(query)
   // console.log("------------------------------")
   conn.run(query, (e) => console.log('\x1b[33mINSERT \x1b[36mASYNC\x1b[0m ' + (e ? e.message : file.ino)));
}
const insertFileSync = (file: IFile): boolean => {
   const query = insertQuery(file);
   try {
      connSync.run(query);
      console.log('\x1b[33mINSERT \x1b[36mSYNC \x1b[0m ' + file.ino);
      return true;
   } catch (e) {
      console.log("\x1b[31mERROR \x1b[36mSYNC \x1b[0m " + e.message);
      return false;
   }

}

const insertQuery = (file: IFile): string => {
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
      ) 
      VALUES (
         ${file.ino}
         , '${file.name}'
         , '${file.ext}'
         , ${file.isFile ? 1 : 0}
         , 1
         , '${file.birthtime}'
         , ${file.fullSize}
         , '${file.size}'
         , '${file.dependency}'
         , ${file.nivel}
      );`;
}

/**
 * ¯\\_(ツ)_/¯
 * @param data 
 * @param message 
 * @param con 
 */
export const createJSON = (data: string
   , message: string
   , con: boolean) => {
   fs.writeFile('files.json', data, 'utf8',
      (err) => {
         if (err) {
            console.log('An error occurred during initialization.');
            return;
         }
         console.log(`\nfiles.json Successfully ${message}!\n`);
         if (con) JSON.parse(fs.readFileSync('files.json', 'utf8'));
         return;
      });
}

/**
 * Retrieves the full path to a file
 * @param file the file
 */
export const getFileFullPath = (file: IFile): string => {
   let dir: string = cwd + _ + parseDependency(file);
   return dir;
}

/**
 * Finds the relative path to a file
 * @param file the file
 */
export const parseDependency = (file: IFile): string => {
   let dir: string = file.name;
   if (file.dependency) {
      dir = parseDependency(findFile(file.dependency)) + _ + dir;
   }
   return dir;
}
/**
 * Looks for a specific file inside the database
 * @param ino the file's unique identifier
 */
export const findFile = (ino: string | number = 0): IFile => {
   //    /* Wait for the file to be found ¯\_(ツ)_/¯ */
   let [file] = connSync.run(
      `SELECT * FROM archivos WHERE ino=? && available=1`
      , [ino]
   );

   if (!file) return file;
   return { ...file, isFile: file.isFile !== 0 ? true : false };
}

/**
 * Sets the new directory cloudster will be working with
 * @param dir the new directory
 */
export const setDirectory = (dir: string): boolean => {
   // console.log(dir);
   cwd = dir;
   console.log("UPDATING")

   initializeServer();

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
}

/**
 * Verifies that the user indeed has permission to access the file he requested
 * @param req The incoming request
 * @param res The outgoing response
 */
const verifyPermission = (req: Request, res: Response): any[] => {
   const { key } = getTokenKey(req.header('Authorization'));
   const [{ nivel }] = connSync
      .run(
         `SELECT nivel FROM usuarios WHERE key=? COLLATE NOCASE`
         , [key]
      );

   if (!req.params.ino) return [nivel, { ino: 0 }]

   const file = findFile(req.params.ino);
   if (!file) {
      res.status(404).send();
      return [-1, {}];
   };
   if (file.nivel > nivel) {
      res.status(401).json({ message: `No tiene acceso a este archivo` });
      return [-1, {}];
   }
   return [nivel, file];
}

/**
 * Retrieves all the files inside a folder, excluding all of those which level
 * is higher than the user's
 * @param req The incoming request
 * @param res The outgoing response
 */
export const getFilesInDirectory = (req: Request, res: Response): void => {
   const [nivel, file] = verifyPermission(req, res);
   if (nivel === -1)
      return;

   const files: IFile[] = connSync
      .run(
         `SELECT * FROM 
            archivos 
         WHERE 
            dependency=? 
         AND 
            nivel<=? 
         AND 
            available=1   
         COLLATE NOCASE`
         , [file.ino, nivel]
      );


   res.status(200).json(files.map(f => {
      return { ...f, isFile: +f.isFile !== 0 ? true : false };
   }));
}

/**
 * Retrieves the info for a spefic file
 * @param req The incoming request
 * @param res The outgoing response
 */
export const getFileInfo = (req: Request, res: Response): void => {
   const [nivel, file] = verifyPermission(req, res);
   if (nivel === -1)
      return;

   res.status(200).json(file);
}

/**
 * Retrieves the info for a spefic file
 * @param req The incoming request
 * @param res The outgoing response
 */
export const test = (req: Request, res: Response): void => {
   res.status(200).json(
      connSync.run(`SELECT * FROM archivos`)
   );
}

/**
 * Handles the entire process of uploading a new file to the server
 * @param req The incoming request
 * @param res The outgoing response
 */
export const postFile = (req: Request, res: Response): void => {
   const where = !req.params.ino ? parseInt(req.params.ino) : 0;
   const folder = !req.params.ino ? findFile(req.params.ino) : <IFile>{};

   if (isNaN(where) || !folder) {
      res.status(400).send({ message: 'El ino no es compatible' });
      return;
   };

   let baseDir = !req.params.ino ? getFileFullPath(folder) : cwd;
   const newName: string = baseDir + _ + req.file.originalname;


   try {
      fs.accessSync(req.file.path);
      fs.renameSync(req.file.path, newName);

      try {
         fs.statSync(newName);
      }
      catch (e) {
         console.log(`no such file or directory, stat ${newName}`);
         res.status(500).json({ message: e.message });
         return;
      }

      insertFileSync(generateFile(req.file.originalname, baseDir, req.params.ino, -1));
      res.status(200).json({ message: "Recibido" });

   } catch (e) {
      if (e && e.message.includes('cross-device link not permitted')) {
         let is = fs.createReadStream(req.file.path);
         let os = fs.createWriteStream(newName);
         is.pipe(os);
         is.on('end', () => {
            fs.unlinkSync(req.file.path);
            const response = insertFileSync(
               generateFile(req.file.originalname, baseDir, req.params.ino, -1)
            );
            if (!response)
               return res.status(500)
                  .json({
                     message: `I'm fucking tired already, I just wanna leave it right here.
                     \nAh right!, something bad happened so...`
                  });
            res.status(200).json({ message: "Recibido" });
         });
      }
      else res.status(500).json({ message: e.message });
   }
}

export const putFile = (req: Request, res: Response): void => {
   const { nivel } = <IFile>req.body;
   connSync.run(`
      UPDATE archivos SET
         nivel=${nivel}
      WHERE ino=${req.params.ino};
   `);
   res.status(200).json({ message: 'Oll korrect' });
}

export const removeFile = (req: Request, res: Response): void => {
   deleteFileSync(req.params.ino);
}


/**
 * Converts the bytes into its correspoding unit in terms of space
 * @param size full size
 */
const parseSize = (size: number): string => {
   if (size < 1024)
      return `${size.toFixed(2)} Bytes`;

   size = size / 1024;
   if (size < 1024)
      return `${size.toFixed(2)} KB`

   size = size / 1024;
   if (size < 1024)
      return `${size.toFixed(2)} MB`

   size = size / 1024;
   return `${size.toFixed(2)} GB`
}

