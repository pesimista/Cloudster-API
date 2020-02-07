"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("../../util/util");
const _ = (process.platform === 'win32' ? '\\' : '/');
let cwd;
const exclude = [
    'node_modules',
    'build',
    'files.json',
    'ranger.json'
];
function loadFiles(index, dir, nivel) {
    let files = [], unprocessedFiles;
    const dep = index;
    // try {
    unprocessedFiles = fs_1.default.readdirSync(dir, { withFileTypes: true });
    // }
    // catch (err) {
    // console.log(`no such file or directory, readdir ${dir}`);
    // return { status: 500, response: { ...err, message: 'readdirSync: ' + err.message } };
    // }
    unprocessedFiles.forEach((dirent) => {
        if (!exclude.includes(dirent.name)) {
            const stat = fs_1.default.statSync(dir + _ + dirent.name);
            const ext = stat.isDirectory() ? '' :
                path_1.default.parse(dirent.name).ext.substring(1) === '' ? '~' :
                    path_1.default.parse(dirent.name).ext.substring(1);
            const file = {
                ino: stat.ino.toString(),
                name: dirent.name,
                ext: ext,
                isFile: stat.isFile(),
                birthtime: stat.birthtime,
                fullSize: stat.size,
                size: parseSize(stat.size),
                dependency: dep.toString(),
                nivel: nivel
            };
            files.push(file);
            if (stat.isDirectory()) {
                const dependedFiles = loadFiles(file.ino, dir + _ + dirent.name, nivel);
                files = files.concat(dependedFiles);
            }
        }
    });
    return files;
}
exports.updating = false;
/**
 * Verifies all the files cloudster will manage
 */
exports.initializeServer = () => {
    /* Initialy updating is set to true */
    exports.updating = true;
    /* The files that are currently active in the folder */
    const files = loadFiles('', cwd, 1);
    util_1.conn.each(`SELECT ino from archivos`, (err, rowIno) => {
        const selected = files.find(f => f.ino.trim() === rowIno.toString().trim());
        if (!selected) {
            util_1.conn.run(`DELETE FROM archivos WHERE ino=? COLLATE NOCASE`, rowIno);
            return;
        }
        util_1.conn.run(`UPTATE archivos SET
         name = ${selected.name}
         ext = ${selected.ext}
         isFile = ${selected.isFile ? 1 : 0}
         fullSize = ${(selected.fullSize)}
         size = ${selected.size}
      WHERE ino = ? COLLATE NOCASE`, rowIno);
    });
    util_1.conn.all(`SELECT ino FROM archivos COLLATE NOCASE`, (error, row) => checkFiles(error, row, files));
};
/**
 * Checks if all the files currently located on the initial path are avalible in the database
 * @param error the error that might occur during query execution
 * @param rows the retrieved rows by the query
 * @param files the file list that will be used as reference
 */
const checkFiles = (error, rows, files) => {
    if (error) {
        console.log("\x1b[31mERROR\t\x1b[36m " + error.message);
        return;
    }
    files.forEach(file => {
        const selected = rows.find(row => row.toString().trim() === file.ino.trim());
        if (!selected)
            util_1.conn.run(`
               INSERT INTO archivos (
                  ino
                  , name
                  , ext
                  , isFile
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
                  , '${file.birthtime}'
                  , ${file.fullSize}
                  , '${file.size}'
                  , ${file.dependency}
                  , ${file.nivel}
               )`);
    });
    exports.updating = false;
};
/**
 * ¯\\_(ツ)_/¯
 * @param data
 * @param message
 * @param con
 */
exports.createJSON = (data, message, con) => {
    fs_1.default.writeFile('files.json', data, 'utf8', (err) => {
        if (err) {
            console.log('An error occurred during initialization.');
            return;
        }
        console.log(`\nfiles.json Successfully ${message}!\n`);
        if (con)
            fileList = JSON.parse(fs_1.default.readFileSync('files.json', 'utf8'));
        return;
    });
};
/**
 * Retrieves the full path to a file
 * @param file the file
 */
function getFileFullPath(file) {
    let dir = cwd + _ + parseDependency(file);
    return dir;
}
/**
 * Finds the relative path to a file
 * @param file the file
 */
const parseDependency = (file) => {
    let dir = file.name;
    if (file.dependency) {
        dir = parseDependency(findFile(file.dependency)) + _ + dir;
    }
    return dir;
};
/**
 * Looks for a specific file inside the database
 * @param ino the file's unique identifier
 */
const findFile = (ino) => {
    let file;
    util_1.conn.get(`SELECT * FROM archivos WHERE ino=?`, ino, (error, row) => {
        if (error || !row)
            file = {};
        else
            file = row;
    });
    while (!file) {
        /* Wait for the file to be found ¯\_(ツ)_/¯ */
    }
    return file;
};
/**
 * Converts the bytes into it correspoding unit in terms of space
 * @param size full size
 */
const parseSize = (size) => {
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