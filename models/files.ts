export interface IFile {
   id?: number;
   ino: number;
   name: string;
   url?: string;
   ext: string;
   isFile: boolean;
   lastModified?: Date;
   lastChanged?: Date;
   LastAccessed?: Date;
   birthtime: Date;
   fullSize: number;
   size: string;
   dependency: number;
   nivel: number;
}

/**
   id: ++index,
   name: dirent.name,
   ext: (!dirent.isFile()? '' :
   path.parse(dirent.name).ext.substring(1)==='' ? '~' :
   path.parse(dirent.name).ext.substring(1)),
   isFile: stat.isFile(),
   lastModified: parseDate(stat.mtime),
   fullSize: stat.size,
   size: parseSize(stat.size),
   dependency: dep,
   nivel: nivel
 */