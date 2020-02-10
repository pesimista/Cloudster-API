export interface IFile {
   id?: number;
   ino: string;
   name: string;
   url?: string;
   ext: string;
   isFile: boolean;
   available: boolean;
   lastModified?: Date;
   lastChanged?: Date;
   lastAccessed?: Date;
   birthtime: Date;
   fullSize: number;
   size: string;
   dependency: string;
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


   CREATE TABLE archivos (
      id int NULL,
      ino int not NULL,
      name varchar(255),
      ext varchar(10),
      isFile integer DEFAULT 1,
      lastModified datetime,
      lastChanged datetime,
      lastAccessed datetime,
      birthtime datetime,
      fullSize int,
      size varchar(12),
      dependency int NULL,
      nivel int DEFAULT 1
   );

 */