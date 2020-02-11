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