/// <reference types="./sqlite-sync"/>
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import sqliteSync from 'sqlite-sync';
import { IResult } from '../models/result';
import { IUser } from '../models/user';
import path from 'path';

const connection = sqliteSync.connect(path.join(__dirname, '..', 'cloudster.db'));

export const connSync = {
  run: (query: string, args?: any[]): IResult => {
    if (args) {
      args.forEach((item) => {
        if (typeof item === 'string') item = item.replace(/\'/g, "''");
      });
    }

    const res = connection.run(query, args);
    const columns = res[0]?.columns;

    if (res.error || (query.includes('*') && !columns) || !columns) {
      return res;
    }

    const [rows] = res;
    const keys = rows.columns;

    return rows.values.map((arr) => {
      const row = {};
      keys.forEach((key, index) => {
        row[key] = arr[index];
      });
      return row;
    });
  },
};

/**
 * Express Middleware to validate that the key sent by the client has a
 * key that corresponds to the user
 * @param req The incoming request
 * @param res The outgoing response
 * @param next The function to be called after the authorization is validated
 */
export const Authorization = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization || 'bearer ' + req.query.token;
  if (!token || !token.toLocaleLowerCase().startsWith('bearer ')) {
    res.status(401).json({ message: 'Unanthorized 1 invalid token or null' });
    return;
  }
  let decoded;
  try {
    decoded = getTokenKey(token);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }

  if (!decoded && !req.headers.authorization) {
    res.status(200).sendFile(getLocalPage());
    return;
  }

  try {
    if (!decoded.key || !decoded.id) {
      res
        .status(401)
        .json({ message: 'Unanthorized 2 Invalid token; not key nor id' });
      return;
    }
  } catch (error) {
    res.status(400).json({ ...error });
    return;
  }

  const rows = connSync.run(
    `SELECT 1 FROM usuarios WHERE id='${decoded.id.trim()}' AND key='${decoded.key.trim()}' COLLATE NOCASE`
  );
  if (rows.error) {
    res.status(500).json(rows.error);
    return;
  }
  const [row] = (rows as unknown) as any[];

  if (!row) {
    res.status(401).json({ message: 'Unanthorized 3' });
    return;
  }

  return next();
};

export const AdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization') || 'bearer ' + req.query.token;
  const decoded = getTokenKey(token);

  const rows = connSync.run(`
      SELECT
         nivel
      FROM
         usuarios
      WHERE
         id='${decoded.id.trim()}'
      AND
         key='${decoded.key.trim()}'
      COLLATE NOCASE
   `);

  if (rows.error) {
    res.status(500).json(rows.error);
    return;
  }
  const [row] = (rows as unknown) as any[];

  if (row.nivel < 5) res.status(401).json({ message: 'Unanthorized 4' });

  return next();
};

export const getTokenKey = (token: string = ''): IUser => {
  const res = (jwt.decode(token.replace(/[Bb]earer /, '')) as unknown) as IUser;
  return res;
};

/**
 * Nada, pone letras mayusculas de forma aleatoria en las palaras
 * @param value la frase
 */
export const randomUpper = (value: string): string => {
  value = value.trim();
  let toReturn = '';
  [...value].forEach((item, index) => {
    if (Math.random() >= 0.4) toReturn += item.toLowerCase();
    else toReturn += item.toUpperCase();
  });

  return toReturn;
};

export const getLocalPage = (pageName: string = 'notFound.html'): string => {
  const dir = path.dirname(__dirname);
  return path.join(dir, 'pages', 'notFound.html');
};

export const makeFileReg = async (
  performedBy: string,
  ino: number,
  accion: 'read' | 'downloaded' | 'modified' | 'uploaded' | 'deleted',
  oldVal: string = '',
  newVal: string = '',
  campo: string = ''
): Promise<boolean> => {
  const res = connSync.run(`
    INSERT INTO registros (
      performedBy,
      ino,
      accion,
      old_value,
      new_value,
      campo,
      fecha
    ) values (
      '${performedBy}',
       ${ino},
      '${accion}',
      '${oldVal}',
      '${newVal}',
      '${campo}',
      ${new Date().getTime()}
    )
  `);
  return Boolean(res.error);
};
export const makeUserReg = async (
  performedBy: string,
  userID: string,
  accion: 'login' | 'check' | 'register' | 'modified' | 'read',
  oldVal: string = '',
  newVal: string = '',
  campo: string = ''
): Promise<boolean> => {
  const res = connSync.run(`
    INSERT INTO registros (
      performedBy,
      usuario,
      accion,
      old_value,
      new_value,
      campo,
      fecha
    ) values (
      '${performedBy}',
      '${userID}',
      '${accion}',
      '${oldVal}',
      '${newVal}',
      '${campo}',
      ${new Date().getTime()}
    )
  `);
  return Boolean(res.error);
};
