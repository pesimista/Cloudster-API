import sqlite from "sqlite3";
import jwt from "jsonwebtoken";
import crypto, { pbkdf2Sync } from "crypto";
import { IUser } from "../../models/user.interface";
// import ranger from "./ranger";

const sqlite3 = sqlite.verbose();

const conn = new sqlite3.Database('./Software2.db', (err: Error | null) => {
   if (err) {
      console.log("Error");
   }
   else {
      console.log('Connected Successfully to the Database');
   }
});

/**
 * Verifies whether or not theres is an user with the given 
 * credentials and returns a token
 * @param body The User information
 * @param callback The callback function to be called afterwards
 */
export const login = (body: IUser, callback: Function): void => {
   try {
      conn.get(`SELECT * FROM usuarios WHERE usuario='${body.usuario}'`,
         (err: Error, row: IUser) => {
            if (err) {
               callback({
                  /**
                   * Internal server error
                   */
                  status: 500,
                  responseBody: err.message
               });
               return;
            }

            if (!row) {
               callback({
                  status: 401,
                  responseBody: `Credenciales incorrectas.`
               });
               return;
            } else if (row.password !== body.password || row.intentos >= 3) {
               conn.serialize(() => {
                  conn.run(`UPDATE usuarios SET intentos=intentos+1 WHERE usuario='${body.usuario}';`
                     , (errorOnRun: Error) => {
                        callback({
                           status: 401,
                           responseBody: ++row.intentos >= 3 ?
                              `Bloqueado por multiples intentos fallidos` :
                              `Credenciales incorrectas.`,
                        });
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

               conn.run(`UPDATE usuarios SET intentos=0,key="${key}" WHERE usuario='${body.usuario}';`,
                  (errRUN: Error) => {
                     if (errRUN) { console.log(errRUN.message, "Line : 153"); return }
                  }
               );
               const token = hashToken(row, key);

               callback({
                  status: 200,
                  responseBody: {
                     response: `Grant access`,
                     user: token
                  }
               });
               return;
            }
         });
   }
   catch (err) {
      callback({
         /**
          * Internal server error
          */
         status: 500,
         responseBody: err.message
      });
      return;
   }
}

/**
 * Makes a new entry if all the conditions are met
 * @param body The user information
 * @param callback The callback function to be called afterwards
 */
export const register = (body: IUser, callback: Function): void => {
   /**
    * Validar que tenga todos los campos
    */
   if (!body.usuario) {
      callback({
         status: 400,
         responseBody: `Falta Usuario!`
      });
      return;
   } else if (!body.nombre) {
      callback({
         status: 400,
         responseBody: `Falta nombre!`
      });
      return;
   } else if (!body.password) {
      callback({
         status: 400,
         responseBody: `Falta contraseña`
      });
      return;
   } else if (!body.pregunta1 || !body.pregunta2) {
      callback({
         status: 400,
         responseBody: `Falta pregunta secreta`
      });
      return;
   } else if (!body.respuesta1 || !body.respuesta2) {
      callback({
         status: 400,
         responseBody: `Falta respuesta a la pregunta secreta`
      });
      return;
   }
   /**
    * Llegados a este punto se asume que tiene todos los campos
    */
   conn.get(`SELECT '' FROM usuarios WHERE usuario='${body.usuario}'`,
      (err: Error, row: string) => {
         if (err) {
            callback({
               /**
                * Internal server error
                */
               status: 500,
               responseBody: err.message
            });
            return
         };
         if (row) {
            callback({
               status: 400,
               responseBody: `El nombre de usuario ya existe`
            });
            return;
         }

         const key = crypto.randomBytes(16).toString("hex");

         conn.serialize(() => {
            console.log("serialize");
            conn.run(`INSERT INTO usuarios(
               \`nombre\`
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
               "${body.nombre}",
               "${body.password}",
               date(),
               "${body.usuario}",
               "${body.pregunta1}",
               "${body.pregunta2}",
               "${body.respuesta1}",
               "${body.respuesta2}",
               1,
               "${key}"
            )`).get(
               `SELECT * FROM usuarios WHERE usuario='${body.usuario}'`,
               (err: Error, row: IUser) => {
                  if (err) {
                     /**
                      * Internal server error
                      */
                     callback({
                        status: 500,
                        responseBody: err.message
                     });
                     return
                  }
                  // makeReg({
                  //    userId: row.id,
                  //    accion: 'register'
                  // });
                  callback({
                     status: 200,
                     responseBody: {
                        response: `Grant access`,
                        user: hashToken(row, key)
                     }
                  })//Callback
               })//Get
         })//Serialize
      }//Callback
   );//Select * from usuarios
}

export const updateUserData = (body: IUser, callback: Function): void => {
   conn.get(`SELECT * FROM usuarios WHERE id=${body.id}`, (err: Error, row: IUser) => {
      if (err) { console.log(err) }
      if (!row) {
         callback(
            {
               status: 400,
               responseBody: `El usuario no existe.`
            });
         return;
      }
      else if (body.confirmpassword !== row.password) {
         callback({
            status: 400,
            responseBody: `La contraseña de confirmación no coincide con la actual.`,
         });
         return;
      }

      let query: string = 'UPDATE usuarios SET ';
      /**
       * Loop to add all the fields in the database
       */
      Object.keys(body).forEach(
         (key: string) => {
            if (!key.includes('id') && body[key]) {
               query += ` ${key}='${body[key]}',`;
            }
         }
      );

      query = query.slice(0, -1);
      query += ` WHERE id=${body.id};`

      conn.serialize(() => {
         conn
            .run(query)
            .get(`SELECT * FROM usuarios WHERE id=${body.id}`,
               (errGet, updatedValues) => {
                  if (errGet) {
                     callback({ status: 500, responseBody: errGet.message });
                     return;
                  }
                  callback({
                     status: 200,
                     responseBody: { response: `Usuario actualizado`, user: hashToken(updatedValues) }
                  });//send response
               }//get callback
            )//conn get
      });//serialize
   })//initial get
}//updateUserData

export const getUsers = (callback: Function, id: string = ''): void => {
   const exe = id ? conn.get : conn.all;
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

   const where = id ? ` WHERE id=${id};` : ';';
   exe(query + where, (error: Error, row: IUser) => {
      callback({
         status: error ? 500 : 200,
         responseBody: row
      });
   });
}

export const getUserQuestions = (id: string, callback: Function, ) => {
   const query = `SELECT 
      \`usuario\`,
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
      \`usuarios\`.\`id\`=${id};`;

   conn.all(query, (error: Error, rows: any[]) => {
      callback({
         status: error ? 500 : 200,
         responseBody: {
            usuario: rows[0].usuario,
            pregunta1: rows[0].pregunta,
            pregunta2: rows[1].pregunta
         }
      })
   });//all
}

/**
 * Creates a jwt based on an user info
 */
const hashToken = (user: IUser, key?: string): string => {
   const now = new Date();
   return jwt.sign({
      id: user.id,
      nombre: user.nombre,
      nivel: user.nivel,
      usuario: user.usuario,
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