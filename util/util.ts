/// <reference types="./sqlite-sync"/>
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import sqliteSync from "sqlite-sync";
import { IResult } from "../models/result";
import { IUser } from "../models/user";
import path from "path";

const connection = sqliteSync.connect('cloudster.db');

export const connSync = {

   run: (query: string, args?: any[]): IResult => {
      const res = connection.run(query, args);
      const columns = res[0]?.columns;

      if (res.error || (query.includes('*') && !columns) || !columns) {
         // console.log('Direct');
         return res;
      }

      const [rows] = res;
      console.log(rows);

      const keys = rows.columns;

      return rows['values'].map(arr => {
         let row = {};
         keys.forEach((key, index) => {
            row[key] = arr[index]
         });
         return row;
      });
   }
};



// const sqlite3 = sqlite.verbose();
// export const conn = new sqlite3.Database('./cloudster.db')

/*
, (err: Error | null) => {
   if (err) {
      console.log("Error");
   }
   else {
      console.log(randomUpper('cONNeCTed suCcESsfUlLy To tHe DatABasE'));
   }
});
*/
/**
 * Express Middleware to validate that the key sent by the client has a
 * key that corresponds to the user
 * @param req The incoming request
 * @param res The outgoing response
 * @param next The function to be called after the authorization is validated
 */
export const Authorization = (req: Request, res: Response, next: NextFunction) => {
   const token = req.header('Authorization') || 'bearer ' + req.query.token;
   if (!token || !token.toLocaleLowerCase().startsWith('bearer ')) {
      res.status(401).send('1');
      return;
   }
   let decoded;
   try {
      decoded = getTokenKey(token);
   } catch (error) {
      return res.status(500).json({ message: error.message });
   }

   if (!decoded && !req.headers.origin) {
      const dir = path.dirname(__dirname);
      res.status(200).sendFile(`${dir}${_}pages${_}notFound.html`);
      return;
   }


   try {
      if (!decoded.key || !decoded.id) {
         res.status(401).send('2');
         return;
      }
   } catch (error) {
      res.status(400).json({ ...error });
      return;
   }
   console.log(decoded.key);

   try {
      const rows = connSync.run(`SELECT '' FROM usuarios WHERE id='${decoded.id.trim()}' AND key='${decoded.key.trim()}' COLLATE NOCASE`);
      if (rows.error) {
         res.status(500).json(rows.error);
         return;
      }
      const [row] = rows as unknown as any[];

      if (!row) {
         res.status(401).json({ message: 'Unanthorized ' });
         return;
      }

      return next();
   } catch (error) {
      res.status(401).json({ message: 'Unanthorized - ' + error?.message });
      return;
   }
}

export const getTokenKey = (token: string = ''): IUser => {
   return jwt.decode(token.replace(/[Bb]earer /, '')) as unknown as IUser;
}

/**
 * Nada, pone letras mayusculas de forma aleatoria en las palaras
 * @param value la frase
 */
export const randomUpper = (value: string): string => {
   value = value.trim();
   let toReturn = "";
   [...value].forEach((item, index) => {
      if (Math.random() >= 0.40)
         toReturn += item.toLowerCase();
      else toReturn += item.toUpperCase();
   })

   return toReturn;
};
/** The saparator */
export const _ = (process.platform === 'win32' ? '\\' : '/');
