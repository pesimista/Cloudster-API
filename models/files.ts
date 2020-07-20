export interface IFile {
  id?: number;
  ino: number;
  name: string;
  url?: string;
  ext: string;
  isFile: boolean;
  available?: boolean;
  lastModified?: number | Date;
  lastDownload?: number | Date;
  lastAccessed?: number | Date;
  birthtime: number | Date;
  fullSize: number;
  size: string;
  dependency?: number;
  nivel: number;
  usuario?: string;
  upBy?: string;
}
