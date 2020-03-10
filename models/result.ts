export interface IResult {
   error: {
      Error: string;
   };
   columns?: string[];
   values?: string[][];
   [key: string]: any;
   [key: number]: any;
}