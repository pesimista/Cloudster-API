export interface IFile {
   id?: number;
   ino: number;
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
   dependency?: number;
   nivel: number;
   usuario?: string;
}