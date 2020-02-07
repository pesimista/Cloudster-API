import fs, { PathLike, Dirent } from "fs";
import path from "path";
import { IFile } from "../../models/files";
import { conn } from "../../util/util";

const _ = (process.platform === 'win32' ? '\\' : '/');
export let cwd: string;
const exclude: string[] = [
   'node_modules',
   'build',
   'files.json',
   'ranger.json'
];

const loadFiles = (index: string, dir: PathLike, nivel: number): IFile[] => {
   let files: IFile[] = [], unprocessedFiles: Dirent[];
   const dep: string = index;
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

      let stat;
      try {
         stat = fs.statSync(dir + _ + dirent.name);
      } catch (e) {
         console.log(`no such file or directory, stat ${dir + _ + dirent.name}`);
         return '404 not found';
      }

      const ext = stat.isDirectory() ? '' :
         path.parse(dirent.name).ext === '' ?
            '~' : path.parse(dirent.name).ext.substring(1);
      const file: IFile = {
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
   });
   return files;
}


export let updating: boolean = false;

/**
 * Verifies all the files cloudster will manage
 */
export const initializeServer = (): void => {

   /* Initialy updating is set to true */
   updating = true;

   /* The files that are currently active in the folder */
   const files = loadFiles('', cwd, 1);
   conn.each(`SELECT ino from archivos`, (err: Error, rowIno: {ino:number}) => {
      const selected = files.find(
         f => f.ino.trim() === rowIno.ino.toString().trim()
      )
      if (!selected) {
         console.log(selected);
         conn.run(`DELETE FROM archivos WHERE ino=? COLLATE NOCASE`, rowIno,
            (e) => console.log('\x1b[31mDeleted\x1b[36m ' + (e ? e.message : rowIno))
         );
         return;
      }


      conn.run(`UPDATE archivos SET
         name = '${selected.name}'
         , ext = '${selected.ext}'
         , isFile = ${selected.isFile ? 1 : 0}
         , fullSize = ${(selected.fullSize)}
         , size = '${selected.size}'
      WHERE ino = ? COLLATE NOCASE`, rowIno,
         (e) => console.log('\x1b[34mUpdate\x1b[36m ' + (e ? e.message : rowIno))
      );

   });

   conn.all(`SELECT ino FROM archivos;`, (error: Error, row: IFile[]) => checkFiles(error, row, files));

}

/**
 * Checks if all the files currently located on the initial path are avalible in the database
 * @param error the error that might occur during query execution
 * @param rows the retrieved rows by the query
 * @param files the file list that will be used as reference
 */
const checkFiles = (error: Error, rows: IFile[], files: IFile[]): void => {
   if (error) {
      console.log("\x1b[31mERROR\t\x1b[36m " + error.message);
      return;
   }

   files.forEach(
      file => {
         const selected = rows.find(
            (row: IFile) => row.ino.toString().trim() === file.ino.trim()
         );
         if (!selected) {
            const query = `
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
               );`;
            // console.log(query)
            conn.run(query, (e) => console.log('\x1b[33mINSERT\x1b[36m ' + (e ? e.message : file.ino)));
         }
      }
   );

   updating = false;
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
export const findFile = (ino: string | number): IFile => {
   let file;
   conn.get(`SELECT * FROM archivos WHERE ino=?`, ino, (error: Error, row: IFile) => {
      if (error || !row) file = {};
      else file = row;
   });

   while (!file) {
      /* Wait for the file to be found ¯\_(ツ)_/¯ */
   }

   return file;
}
export const setDirectory = (dir: string): boolean => {
   console.log(dir);
   cwd = dir;
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
 * Converts the bytes into it correspoding unit in terms of space
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