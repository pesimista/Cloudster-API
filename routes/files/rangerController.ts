import fs, { PathLike, Dirent } from "fs";
import path from "path";
import { IFile } from "../../models/files";

const _ = (process.platform === 'win32' ? '\\' : '/');
let cwd;
let fileList: IFile[] = [];
const exclude: string[] = [
   'node_modules',
   'build',
   'files.json',
   'ranger.json'
];

function loadFiles(index: number, dir: PathLike, nivel: number): IFile[] {
   let files: IFile[] = [], unprocessedFiles: Dirent[];
   const dep: number = index;
   // try {
      unprocessedFiles = fs.readdirSync(dir, { withFileTypes: true });
   // }
   // catch (err) {
      // console.log(`no such file or directory, readdir ${dir}`);
      // return { status: 500, response: { ...err, message: 'readdirSync: ' + err.message } };
   // }

   unprocessedFiles.forEach((dirent: Dirent) => {
      if (!exclude.includes(dirent.name)) {

         const stat = fs.statSync(dir + _ + dirent.name);
         const ext = stat.isDirectory() ? '' :
            path.parse(dirent.name).ext.substring(1) === '' ? '~' :
               path.parse(dirent.name).ext.substring(1);
         const file: IFile = {
            ino: stat.ino,
            name: dirent.name,
            ext: ext,
            isFile: stat.isFile(),
            birthtime: stat.birthtime,
            fullSize: stat.size,
            size: parseSize(stat.size),
            dependency: dep,
            nivel: nivel
         };

         files.push(file);

         if (stat.isDirectory()) {
            const dependedFiles = loadFiles(stat.ino, dir + _ + dirent.name, nivel);
            files = files.concat(dependedFiles);
         }         
      }
   });
   return files;
}





const getFile = (id: number) => {
   if (typeof id === 'string') return fileList.find(f => f.id === parseInt(id));
   else return fileList.find(f => f.id === id);
}
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