"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSize = exports.findFile = exports.parseDependency = exports.getFileFullPath = exports.setDirectory = exports.moveFile = exports.removeFile = exports.putFile = exports.postFolder = exports.postFile = exports.viewFile = exports.downloadFile = exports.getFileInfo = exports.getParent = exports.getFilesInDirectory = exports.initializeServer = exports.cwd = exports.updating = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("../../util/util");
/* Defines whether or not the data base is being updated */
exports.updating = false;
/* files to exclude */
const exclude = [
    'node_modules',
    'build',
    'files.json',
    'ranger.json',
];
/**
 * Verifies the integrity of all the files cloudster will manage
 */
exports.initializeServer = () => {
    /* Initialy updating is set to true */
    exports.updating = true;
    /* The files that are currently active in the folder */
    const files = loadFiles(exports.cwd);
    const rows = util_1.connSync.run(`SELECT ino, name from archivos`);
    rows.forEach(({ ino: currentIno, name }) => {
        const selected = files.find((f) => f.ino === currentIno);
        /* If the file doesn't exist in the current folder, marks it as unavailable */
        if (!selected) {
            deleteFileSync(currentIno, name);
            return;
        }
        /* If it is, the data gets updated */
        const update = util_1.connSync.run(`
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
            // console.log('\x1b[31mUpdate \x1b[36m SYNC\x1b[0m ');
            return;
        }
        // console.log('\x1b[34mUpdate \x1b[36m SYNC\x1b[0m ' + currentIno);
    }); // foreach
    const inoArray = rows.map(({ ino }) => ino);
    checkFiles(inoArray, files);
};
/**
 * Checks if all the files currently located on the
 * initial path are avalible in the database
 * @param error the error that might occur during query execution
 * @param rows the retrieved rows by the query
 * @param files the file list that will be used as reference
 */
const checkFiles = (rows, files, error) => {
    if (error) {
        // console.log("\x1b[31mERROR\t\x1b[0m " + error.message);
        return;
    }
    files.forEach((file) => {
        const selected = rows.find((row) => row === file.ino);
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
const loadFiles = (dir, dep = 0, nivel = 1) => {
    let files = [];
    let unprocessedFiles;
    try {
        unprocessedFiles = fs_1.default.readdirSync(dir, { withFileTypes: true });
    }
    catch (err) {
        // console.log(`no such file or directory, readdir ${dir}`);
        // return { status: 500, response: { ...err, message: 'readdirSync: ' + err.message } };
        return [];
    }
    unprocessedFiles.forEach((dirent) => {
        if (exclude.includes(dirent.name))
            return;
        const file = generateFile(dirent.name, dir.toString(), dep, nivel);
        files.push(file);
        if (dirent.isDirectory()) {
            const dependedFiles = loadFiles(path_1.default.join(dir.toString(), dirent.name), file.ino, file.nivel);
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
const generateFile = (fileName, dir, dep, nivel = 1) => {
    let stat;
    try {
        stat = fs_1.default.statSync(path_1.default.join(dir, fileName));
    }
    catch (e) {
        // console.log(`no such file or directory, stat ${dir + _ + fileName}`);
        return {};
    }
    /* Nivel de acceso  de la carpeta contenedora */
    if (nivel === -1) {
        const deplvl = exports.findFile(+dep);
        if (deplvl && nivel < deplvl.nivel)
            nivel = deplvl.nivel;
        else
            nivel = 1;
    }
    const ext = stat.isDirectory()
        ? ''
        : path_1.default.parse(fileName).ext === ''
            ? '~'
            : path_1.default.parse(fileName).ext.substring(1);
    const file = {
        ino: stat.ino,
        name: fileName,
        ext,
        isFile: stat.isFile(),
        available: true,
        birthtime: stat.birthtime,
        fullSize: stat.size,
        size: exports.parseSize(stat.size),
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
const insertFileSync = (file, user = 'Cloudster') => {
    const query = insertQuery(file, user);
    const res = util_1.connSync.run(query);
    if (res.error) {
        // console.log('\x1b[32mINSERT \x1b[36m SYNC \x1b[0m ' + file.ino);
        // console.error(res.error);
        return false;
    }
    /*console.log(
    '\x1b[33mINSERT \x1b[36m SYNC \x1b[0m ' + file.ino + ' ' + file.name
    );*/
    return true;
};
/**
 * Returns the query to update the file reg
 * @param file fiel
 */
const insertQuery = (file, user = 'Cloudster') => {
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
      , ${file.birthtime.getTime()}
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
const deleteFileSync = (ino, fileName, userID = 'Cloudster') => {
    const res = util_1.connSync.run(`
    DELETE FROM
      archivos
    WHERE
      ino = ${ino}`);
    if (res.error)
        return false;
    util_1.makeFileReg(userID, ino, 'deleted', fileName);
    // console.log('\x1b[32mDELETE \x1b[36mSYNC \x1b[0m ' + ino);
    const dep = util_1.connSync.run(`SELECT ino, name FROM archivos WHERE dependency=${+ino} COLLATE NOCASE`);
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
exports.getFilesInDirectory = (req, res) => {
    const [nivel, file, usuario] = verifyPermission(req, res);
    if (nivel === -1)
        return;
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
    util_1.connSync.run(`UPDATE archivos SET
      lastAccessed=${new Date().getTime()},
      usuario_ac='${usuario.id}'
    WHERE
      dependency=${file[key]}
      AND nivel<=?${nivel}
      AND available=1
    COLLATE NOCASE`);
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
  COLLATE NOCASE`;
    util_1.connSync.run(query);
    const files = util_1.connSync.run(`SELECT
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
    COLLATE NOCASE`);
    res.status(200).json(files.map((f) => {
        return Object.assign(Object.assign({}, f), { isFile: Boolean(f.isFile), birthtime: new Date(f.birthtime) });
    }));
};
exports.getParent = (req, res) => {
    const [nivel, file, user] = verifyPermission(req, res);
    if (nivel === -1)
        return;
    const parent = exports.findFile(file.dependency);
    util_1.makeFileReg(user.id, parent.ino, 'read');
    res.status(200).json(Object.assign(Object.assign({}, parent), { isFile: Boolean(parent.isFile) }));
};
/**
 * Retrieves the info for a spefic file
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.getFileInfo = (req, res) => {
    const [nivel, file, user] = verifyPermission(req, res);
    if (nivel === -1)
        return;
    util_1.makeFileReg(user, file.ino, 'read');
    res.status(200).json(file);
};
/**
 * Downloads the file
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.downloadFile = (req, res) => {
    const [nivel, file, usuario] = verifyPermission(req, res);
    if (nivel === -1) {
        return;
    }
    if (!file.isFile) {
        res.status(400).send();
        return;
    }
    const route = exports.getFileFullPath(file);
    util_1.connSync.run(`
    UPDATE archivos SET
      lastDownload=${new Date().getTime()},
      usuario_do='${usuario.id}
    WHERE ino=${file.ino};
  `);
    util_1.makeFileReg(usuario.id, file.ino, 'downloaded');
    res.status(200).download(route);
};
/**
 * A the file
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.viewFile = (req, res) => {
    res.removeHeader('X-Frame-Options');
    const [, file, usuario] = verifyPermission(req, res, false);
    if (file.status && file.status === 404) {
        res.status(200).sendFile(util_1.getLocalPage());
        return;
    }
    else if (file.status === 401) {
        res.status(200).send();
        return;
    }
    if (!file.isFile) {
        res.status(400).send();
        return;
    }
    const route = exports.getFileFullPath(file);
    util_1.connSync.run(`
    UPDATE archivos SET
      lastDownload=${new Date().getTime()},
      usuario_do='${usuario.id}'
    WHERE ino=${file.ino};
  `);
    util_1.makeFileReg(usuario.id, file.ino, 'downloaded');
    res.status(200).sendFile(route);
};
/**
 * Handles the entire process of uploading a new file to the server
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.postFile = (req, res) => {
    const ino = parseInt(req.params.ino, 10);
    const token = util_1.getTokenKey(req.headers.authorization);
    if (isNaN(ino)) {
        res.status(400).send({ message: 'El ino no es compatible' });
        return;
    }
    const folder = exports.findFile(ino);
    const baseDir = ino !== 0 ? exports.getFileFullPath(folder) : exports.cwd;
    const final = setNewName(req.file.originalname, ino);
    const newName = path_1.default.join(baseDir, final);
    try {
        fs_1.default.renameSync(req.file.path, newName);
        try {
            fs_1.default.statSync(newName);
        }
        catch (e) {
            res.status(500).json(e);
            return;
        }
        const file = generateFile(final, baseDir, ino, -1);
        insertFileSync(file, token.id);
        util_1.makeFileReg(token.id, file.ino, 'uploaded');
        res.status(200).json({ message: 'Recibido' });
    }
    catch (e) {
        if (!e || !e.message.includes('cross-device link not permitted')) {
            res.status(500).json({ message: e.message });
        }
        const is = fs_1.default.createReadStream(req.file.path);
        const os = fs_1.default.createWriteStream(newName);
        is.pipe(os);
        is.on('end', () => {
            fs_1.default.unlinkSync(req.file.path);
            const file = generateFile(final, baseDir, ino, -1);
            const response = insertFileSync(file, token.id);
            if (!response) {
                return res.status(500).json({
                    message: `I'm fucking tired already, I just wanna leave it right here.
                    \nAh right!, something bad happened so...`,
                });
            }
            util_1.makeFileReg(token.id, file.ino, 'uploaded');
            res.status(200).json({ message: 'Recibido' });
        });
    }
};
/**
 * Handles the entire process of uploading a new file to the server
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.postFolder = (req, res) => {
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
    const route = file.ino ? exports.getFileFullPath(file) : exports.cwd;
    const newName = setNewName(req.body.name, file.ino);
    try {
        fs_1.default.mkdirSync(path_1.default.join(route, newName), { recursive: true });
    }
    catch (error) {
        res.status(400).json(Object.assign({}, error));
    }
    const folder = generateFile(newName, route, file.ino, -1);
    insertFileSync(folder, user.id);
    util_1.makeFileReg(user.id, folder.ino, 'uploaded');
    res
        .status(200)
        .json({ message: `carpeta ${newName} creada en ${file.name}` });
};
/**
 * Doesn't actually changes the file but updates its access level
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.putFile = (req, res) => {
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
    let { nivel = 0 } = req.body;
    const { name = '' } = req.body;
    if (!nivel) {
        nivel = file.nivel;
    }
    else if (nivel > userLevel) {
        nivel = userLevel;
    }
    let response;
    if (name) {
        const ext = path_1.default.extname(name);
        const originalname = exports.getFileFullPath(file);
        const final = setNewName(name, ino);
        const parentFolder = path_1.default.dirname(originalname);
        const newName = path_1.default.join(parentFolder, final);
        try {
            // console.log(fs.existsSync(originalname).toString());
            fs_1.default.renameSync(originalname, newName);
        }
        catch (error) {
            res.status(500).json(Object.assign({}, error));
            return;
        }
        response = util_1.connSync.run(`
      UPDATE archivos SET
        name='${name}',
        ext='${ext.substr(1)}',
        lastModified=${new Date().getTime()},
        usuario_mo='${user.id}'
      WHERE ino=${ino};
    `);
        util_1.makeFileReg(user.id, file.ino, 'modified', file.name, final, 'name');
        if (response.error)
            res.status(500).json(response);
    }
    response = util_1.connSync.run(`
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
    util_1.makeFileReg(user.id, ino, 'modified', file.nivel.toString(), nivel.toString(), 'nivel');
    res.status(200).json({ message: 'Oll korrect' });
};
/**
 * Doesn't actually deletes the file but marks it as unavailable
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.removeFile = (req, res) => {
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
    util_1.makeFileReg(user.id, +req.params.ino, 'modified', (!file.available).toString(), Boolean(file.available).toString(), 'available');
    if (result) {
        const message = !file.available
            ? 'Archivo restaurado'
            : 'Archivo suspendido';
        res.status(200).json({ message });
        return;
    }
    res.status(500).json({ response: 'Algo salió mal' });
};
const markUnavailableSync = (ino, value, userID) => {
    const res = util_1.connSync.run(`
    UPDATE archivos SET
      available = ${value},
      lastModified=${new Date().getTime()},
      usuario_mo='${userID}'
    WHERE ino = ${ino} COLLATE NOCASE`);
    return !Boolean(res.error);
};
exports.moveFile = (req, res) => {
    var _a, _b;
    const folder = exports.findFile(req.params.folder);
    const file = exports.findFile(req.params.ino);
    const token = util_1.getTokenKey(req.headers.authorization);
    if (!folder || !file) {
        res.status(400).json({ response: 'Carpeta o archivo no encontrado' });
        return;
    }
    if (folder.ino === file.dependency) {
        res.status(200).json({ message: 'Listo' });
    }
    const newName = setNewName(file.name, folder.ino);
    const oldPath = exports.getFileFullPath(file);
    const newPath = exports.getFileFullPath(Object.assign(Object.assign({}, file), { name: newName, dependency: folder.ino }));
    // console.log(oldPath, newPath);
    const result = util_1.connSync.run(`
    UPDATE
      archivos
    SET
      name='${newName.replace(/\'/g, "''")}',
      dependency=${folder.ino}
    WHERE
      ino=${file.ino}
  `);
    if (result.error) {
        res.status(500).json({ error: result.error });
        return;
    }
    util_1.makeFileReg(token.id, file.ino, 'modified', (_a = file.dependency) === null || _a === void 0 ? void 0 : _a.toString(), (_b = folder.ino) === null || _b === void 0 ? void 0 : _b.toString(), 'dependency');
    if (file.name !== newName) {
        util_1.makeFileReg(token.id, file.ino, 'modified', file.name, newName, 'name');
    }
    const onError = (error) => {
        res.status(500).json({ error });
    };
    const move = () => {
        const readStream = fs_1.default.createReadStream(oldPath);
        const writeStream = fs_1.default.createWriteStream(newPath);
        readStream.on('error', onError);
        writeStream.on('error', onError);
        // console.log('moving');
        readStream.on('close', () => {
            fs_1.default.unlinkSync(oldPath);
            // console.log('Closed');
            res.status(200).json({ message: 'Listo' });
        });
        readStream.pipe(writeStream);
    };
    try {
        fs_1.default.renameSync(oldPath, newPath);
        res.status(200).json({ message: 'Listo' });
    }
    catch (err) {
        if (err) {
            if (err.code === 'EXDEV') {
                move();
            }
            else {
                onError(err);
            }
            return;
        }
    }
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
exports.setDirectory = (dir) => {
    exports.cwd = dir;
    exports.initializeServer();
    return true;
    /*
    try {
      fs.accessSync(dir);
      let directory = fs.readFileSync(dir + _ + 'folder', 'utf-8');
      try {
        fs.accessSync(directory);
        cwd = directory;
  
        return true;
      }
      catch (e) {
        console.log(directory);
        console.log(`La direccion en el archivo 'Directorio.txt' no es valida`);
        console.log(`Corrija y vuelva a intentarlo`);
        return false;
      }
    }
    catch (err) {
      console.log('--------------    Creando Directorio.txt    --------------');
      try {
        fs.writeFileSync('dir', dir + _ + 'folder', 'utf8');
        initializeServer();
        return true;
      }
      catch (e) {
        console.log('Ha ocurrido un error al inicializar.');
        return false;
        process.exit();
      }
    }*/
};
/**
 * Verifies that the user indeed has permission to access the file he requested
 * @param req The incoming request
 * @param res The outgoing response
 */
const verifyPermission = (req, res, sendRes = true) => {
    const { key } = util_1.getTokenKey(req.headers.authorization || 'bearer ' + req.query.token);
    const [user] = util_1.connSync.run(`SELECT * FROM usuarios WHERE key='${key}' COLLATE NOCASE`);
    if (!req.params.ino)
        return [user.nivel, { ino: 0 }, user];
    const file = exports.findFile(req.params.ino);
    if (!file) {
        if (sendRes)
            res.status(404).send({ response: 'file not found' });
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
exports.getFileFullPath = (file) => {
    return path_1.default.join(exports.cwd, exports.parseDependency(file));
};
/**
 * Finds the relative path to a file
 * @param file the file
 */
exports.parseDependency = (file) => {
    let dir = file.name;
    if (file.dependency) {
        const parentFolder = exports.parseDependency(exports.findFile(file.dependency));
        dir = path_1.default.join(parentFolder, dir);
    }
    return dir;
};
/**
 * Looks for a specific file inside the database
 * @param ino the file's unique identifier
 */
exports.findFile = (ino = 0) => {
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
            upBy: 'Cloudster',
        };
    }
    const [file] = util_1.connSync.run(`
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
  `);
    if (!file)
        return file;
    return Object.assign(Object.assign({}, file), { isFile: Boolean(file.isFile) });
};
const setNewName = (fileName, ino = 0) => {
    const _ext = path_1.default.extname(fileName);
    const nombre = path_1.default.basename(fileName, _ext);
    const exist = (a) => {
        const result = util_1.connSync.run(`SELECT ino FROM archivos WHERE name=? AND dependency=?`, [a, ino]);
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
exports.parseSize = (size) => {
    if (!size)
        size = 0;
    if (size < 1024)
        return `${size.toFixed(2)} Bytes`;
    size = size / 1024;
    if (size < 1024)
        return `${size.toFixed(2)} KB`;
    size = size / 1024;
    if (size < 1024)
        return `${size.toFixed(2)} MB`;
    size = size / 1024;
    return `${size.toFixed(2)} GB`;
};
//# sourceMappingURL=rangerController.js.map