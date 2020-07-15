import { Response, Request } from 'express';
import jwt from 'jsonwebtoken';
import crypto, { pbkdf2Sync } from 'crypto';
import { IUser, IPreguntas } from '../../models/user';
import { connSync, getTokenKey } from '../../util/util';
import { IResult } from '../../models/result';
// import ranger from "./ranger";

/**
 * Retrieves the info for a spefic file
 * @param req The incoming request
 * @param res The outgoing response
 */
export const getFiles = (req: Request, res: Response): void => {
  res.status(200).json(connSync.run(`SELECT * FROM archivos`));
};

export const getUsers = (req: Request, res: Response): void => {
  const id = req.params.id;
  const query = `SELECT
      \`id\`,
      \`usuario\`,
      \`nombre\`,
      \`apellido\`,
      \`desde\`,
      \`pregunta1\`,
      \`pregunta2\`,
      \`respuesta1\`,
      \`respuesta2\`,
      \`nivel\`
   FROM usuarios`;

  const where = id ? ` WHERE id='${id}';` : ';';

  const result = connSync.run(query + where);
  if (result.error) {
    res.status(500).json({ ...result.error });
    return;
  }

  if (id) {
    res.status(200).send(result[0] || {});
    return;
  } else {
    res.status(200).send(result);
  }
};
