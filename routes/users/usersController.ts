import { Response, Request } from "express";
import jwt from "jsonwebtoken";
import crypto, { pbkdf2Sync } from "crypto";
import { IUser } from "../../models/user";
import { conn } from "../../util/util";
// import ranger from "./ranger";


export const getUsers = (req: Request, res: Response): void => {
   const id = req.params.id;
   const exe = id ? 'get' : 'all';
   const query = `SELECT 
      \`id\`,
      \`usuario\`,
      \`nombre\`,
      \`desde\`,
      \`pregunta1\`,
      \`pregunta2\`,
      \`respuesta1\`,
      \`respuesta2\`,
      \`nivel\` 
   FROM usuarios`;

   const where = id ? ` WHERE id="${id}";` : ';';
   conn[exe](query + where, (error: any, row: IUser | IUser[]) => {
      if (error) res.status(500).json({ name: error.code, message: error.message });
      else res.status(200).send(row);
   });
}

/**
 * Verifies whether or not theres is an user with the given 
 * credentials and returns a token
 * @param body The User information
 * @param callback The callback function to be called afterwards
 */
// export const login = (body: IUser, callback: Function): void => {
export const login = (req: Request, res: Response): void => {
   const body = { ...req.body } as unknown as IUser;
   if (!body.password || !body.usuario) {
      res.status(400).json({ message: `Faltan datos` });
      return;
   };
   try {
      conn.get(`SELECT * FROM usuarios 
            WHERE 
               usuario='${body.usuario}'
            COLLATE NOCASE;`,
         (err: any, row: IUser) => {
            if (err) {
               /* Internal server error */
               res.status(500).json({ name: err.code, message: err.message });
               return;
            }

            if (!row) {
               /* Unathorized */
               res.status(401).json({ message: `Credenciales incorrectas` });
               return;
            } else if (row.password !== body.password || row.intentos >= 3) {
               conn.serialize(() => {
                  conn.run(`UPDATE usuarios 
                     SET 
                        intentos=intentos+1 
                     WHERE 
                        usuario='${body.usuario}'
                     COLLATE NOCASE;`,
                     (errorOnRun: Error) => {
                        /* Unathorized */
                        res.status(401)
                           .send(++row.intentos >= 3 ?
                              `Bloqueado por multiples intentos fallidos` :
                              `Credenciales incorrectas.`)
                        return;
                     }
                  );
               });
            } else {
               // makeReg({
               //    userId: row.id,
               //    accion: 'login'
               // });
               const key = crypto.randomBytes(16).toString("hex");

               conn.run(`UPDATE usuarios 
                  SET 
                     intentos=0,
                     key="${key}" 
                  WHERE 
                     usuario='${body.usuario}'
                  COLLATE NOCASE;`,
                  (errRUN: Error) => {
                     if (errRUN) { console.log(errRUN.message, "Line : 153"); return }
                  }
               );
               const token = hashToken(row, key);
               res.status(200).send({
                  response: `Grant access`,
                  user: token
               });
               return;
            }
         });
   }
   catch (err) {
      /* Internal server error */
      res.status(500).json(err);
      return;
   }
}

/**
 * Makes a new entry if all the conditions are met
 * @param body The user information
 * @param callback The callback function to be called afterwards
 */
export const register = (req: Request, res: Response): void => {
   const body = { ...req.body } as unknown as IUser;
   /* Validar que tenga todos los campos */
   if (!body.usuario) {
      /* BadRequest */
      res.status(400).send(`Falta Usuario!`);
      return;
   } else if (!body.nombre) {
      /* BadRequest */
      res.status(400).send(`Falta nombre!`);
      return;
   } else if (!body.password) {
      /* BadRequest */
      res.status(400).send(`Falta contraseña`);
      return;
   } else if (!body.pregunta1 || !body.pregunta2) {
      /* BadRequest */
      res.status(400).send(`Falta pregunta secreta`);
      return;
   } else if (!body.respuesta1 || !body.respuesta2) {
      /* BadRequest */
      res.status(400).send(`Falta respuesta a la pregunta secreta`);
      return;
   }
   /* Llegados a este punto se asume que tiene todos los campos */
   conn.get(`SELECT '' FROM usuarios WHERE usuario='${body.usuario}'`,
      (err: any, row: string) => {
         if (err) {
            /* Internal server error */
            res.status(500).json({ name: err.code, message: err.message });
         };
         if (row) {
            res.status(400).send(`El nombre de usuario ya existe`);
            return;
         }

         const key = crypto.randomBytes(16).toString("hex");
         const id = crypto.randomBytes(16).toString("hex");

         conn.serialize(() => {
            conn.run(`INSERT INTO usuarios(
               \`id\`
               ,\`nombre\`
               ,\`apellido\`
               ,\`password\`
               ,\`desde\`
               ,\`usuario\`
               ,\`pregunta1\`
               ,\`pregunta2\`
               ,\`respuesta1\`
               ,\`respuesta2\`
               ,\`nivel\`
               ,\`key\`
            ) VALUES(
               "${id}",
               "${body.nombre}",
               "${body.apellido}",
               "${body.password}",
               date(),
               "${body.usuario}",
               ${body.pregunta1},
               ${body.pregunta2},
               "${body.respuesta1}",
               "${body.respuesta2}",
               1,
               "${key}"
            )`).get(
               `SELECT * FROM usuarios WHERE usuario='${body.usuario}'`,
               (err: any, row: IUser) => {
                  if (err) {
                     /* Internal server error */
                     res.status(500).json({ name: err.code, message: err.message });
                     return
                  }
                  // makeReg({
                  //    userId: row.id,
                  //    accion: 'register'
                  // });
                  res.status(200).send({
                     response: `Grant access`,
                     token: hashToken(row, key)
                  });//Callback
               })//Get
         })//Serialize
      }//Callback
   );//Select * from usuarios
}

export const updateUserData = (req: Request, res: Response): void => {
   const body = req.body as unknown as IUser;
   conn.get(`SELECT * FROM usuarios WHERE id='${req.params.id}' COLLATE NOCASE;`, (err: Error, row: IUser) => {
      if (err) { console.log(err) }
      if (!row) {
         res.status(400).json({ message: `El usuario no existe` })
         return;
      }

      // else if (body.confirmpassword !== row.password) {
      //    res.status(401).json({
      //       message: `La contraseña de confirmación no coincide con la actual.`,
      //    });
      //    return;
      // }

      let query: string = 'UPDATE usuarios SET ';
      /**
       * Loop to add all the fields in the database
       */
      const keys = [
         { name: "usuario", has: true },
         { name: "nombre", has: true },
         { name: "apellido", has: true },
         { name: "password", has: true },
         { name: "pregunta1", has: false },
         { name: "respuesta1", has: false },
         { name: "pregunta2", has: true },
         { name: "respuesta2", has: true },
         { name: "nivel", has: false },
      ]
      keys.forEach(
         (key) => {
            const { name, has } = key
            if (body[name]) {
               if (has) query += ` ${name}='${body[name]}',`;
               else query += ` ${name}=${body[name]},`;
            }
         }
      );

      query += `intentos=0 WHERE id='${body.id}' COLLATE NOCASE;`

      conn.serialize(() => {
         conn
            .run(query)
            .get(`SELECT * FROM usuarios WHERE id='${body.id}' COLLATE NOCASE;`,
               (errGet: any, updatedValues: IUser) => {
                  if (errGet) {
                     res.status(500).json({ name: errGet.code, message: errGet.message });
                     return;
                  }
                  res.status(200).json({
                     response: `Usuario actualizado`,
                     token: hashToken(updatedValues)
                  });//send response
               }//get callback
            )//conn get
      });//serialize
   })//initial get
}//updateUserData

export const deleteUser = (req: Request, res: Response): void => {
   const query = `DELETE 
   FROM
      usuarios
   WHERE 
      \`id\`='${req.params.id}';`;

   conn.run(query, (error: any) => {
      if (error) {
         res.status(500).json({ name: error.code, message: error.message })
         return;
      };
      res.status(200).json({ message: 'oll korrect' });
   })
}

export const getQuestions = (callback: Function) => {
   const query = `SELECT pregunta FROM preguntas`
   conn.all(query, (error: Error, rows: string[]) => {
      callback({
         status: error ? 500 : 200,
         responseBody: rows
      });
   });
}

export const getUserQuestions = (req: Request, res: Response): void => {
   const query = `SELECT 
      \`preguntas\`.\`id\` as id_pregunta,
      \`pregunta1\`,
      \`pregunta2\`,
      \`usuario\`,
      \`usuarios\`.\`id\` as id_usuario,
      \`pregunta\`
   FROM 
      \`usuarios\`
   INNER JOIN 
      \`preguntas\`
   ON 
      \`preguntas\`.\`id\`=\`usuarios\`.\`pregunta1\`
   OR 
      \`preguntas\`.\`id\`=\`usuarios\`.\`pregunta2\`
   WHERE 
      \`usuarios\`.\`usuario\`='${req.params.usuario}' COLLATE NOCASE;`;

   conn.all(query, (error: any, rows: any[]) => {
      if (error) {
         res.status(500).json({ name: error.code, message: error.message });
         return;
      };
      if (!rows) {
         res.status(404).json({ message: 'El usuario ingresado no existe.' });
         return;
      }
      const [pregunta1] = rows.filter(a => a.id_pregunta === a.pregunta1);
      const [pregunta2] = rows.filter(a => a.id_pregunta === a.pregunta2);
      res.status(200).json({
         usuario: rows[0].usuario,
         id_usuario: rows[0].id_usuario,
         pregunta1: pregunta1.pregunta,
         pregunta2: pregunta2.pregunta
      })
   });//all
}

export const checkUserQuestions = (req: Request, res: Response): void => {
   const id = req.params.id;
   const { respuesta1, respuesta2 } = req.body;
   const query = `SELECT * FROM usuarios WHERE id='${id}' COLLATE NOCASE;`;

   conn.get(query,
      (error: any, row: IUser) => {
         if (error) {
            res.status(500).json({ name: error.code, message: error.message })
            return;
         };
         if (row.respuesta1.toLowerCase() === respuesta1.toLowerCase()
            && row.respuesta2.toLowerCase() === respuesta2.toLowerCase()) {
            res.status(200).json({
               response: `Grant access`,
               token: jwt.sign({
                  id: row.id,
                  key: row.key
               }, 'supersecretkeythatnobodyisgonnaguess')
            });
            return;
         }
      })
}

/**
 * Creates a jwt based on an user info
 */
const hashToken = (user: IUser, key?: string): string => {
   const now = new Date();
   return jwt.sign({
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      password: user.password,
      nivel: user.nivel,
      key: key || user.key,
      expires: now.setHours(now.getHours() + 1)
   }, 'supersecretkeythatnobodyisgonnaguess');
}

const hashPassword = (password: string) => {
   const iterations = 5;
   const salt = "iwannadie";
   const hash = pbkdf2Sync(password, salt, iterations, 64, 'sha512');
   return hash;
}