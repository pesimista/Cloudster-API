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
                  responseBody: `El usuario ${body.usuario} no existe.`
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
                              `Contraseña incorrecta!`,
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
         responseBody: `Falta contraseña!`
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
            conn.run(`insert into usuarios(
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
            ) values(
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
                     status: 500,
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

/**
 * Creates a jwt based on an user info
 */
const hashToken = (user: IUser, key: string): string => {
   const now = new Date();
   return jwt.sign({
      id: user.id,
      nombre: user.nombre,
      nivel: user.nivel,
      usuario: user.usuario,
      key: key,
      expires: now.setHours(now.getHours() + 1)
   }, 'supersecretkeythatnobodyisgonnaguess');
}

const changeUserData = (body: IUser, callback: Function) => {
   conn.get(`select * from usuarios where id=${body.id}`, (err, row) => {
      if (err) { console.log(err) }
      if (typeof row === 'undefined') {
         callback({
            response: `El usuario ${body.id} no existe.`,
         });
         return;
      }
      else if (body.confirmpassword === row.password) {
         conn.serialize(() => {
            conn.run((body.usuario && body.usuario.length > 0) ? `update usuarios set nombre='${body.nombre}' where id=${body.id}` : '',
               (e) => {
                  if (!e) console.log("Updated usuario")
               })
               .run((body.nombre.length > 0) ? `update usuarios set nombre='${body.nombre}' where id=${body.id}` : '',
                  (e) => {
                     if (!e) console.log("Updated nombre")
                  })
               .run((body.password.length > 0) ? `update usuarios set password='${body.password}' where id=${body.id}` :
                  '', (e) => {
                     if (!e) console.log("Updated password")
                  })
               .run((body.respuesta1.length > 0) ? `update usuarios set pregunta1=${body.pregunta1} where id=${body.id}`
                  : '', (e) => {
                     if (!e) {
                        console.log("Updated Pregunta1")
                        conn.run(`update usuarios set respuesta1=${body.respuesta1} where id=${body.id}`)
                        console.log("Updated Respuesta1")
                     }
                  })
               .run((body.respuesta2.length > 0) ? `update usuarios set pregunta2=${body.pregunta2} where id=${body.id}`
                  : '', (e) => {
                     if (!e) {
                        console.log("Updated Pregunta2")
                        conn.run(`update usuarios set respuesta2=${body.respuesta2} where id=${body.id}`)
                        console.log("Updated Respuesta2")
                     }
                  })
               .get(`select * from usuarios where id=${body.id}`,
                  (errGet, newRow) => {
                     if (errGet) { console.log(errGet.message); }
                     callback({
                        response: `Grant access`,
                        user: {
                           id: newRow.id,
                           nombre: newRow.nombre,
                           nivel: newRow.nivel,
                           desde: newRow.desde,
                           usuario: newRow.usuario,
                           pregunta1: newRow.pregunta1,
                           pregunta2: newRow.pregunta2,
                        }
                     })
                  })
         }); //Serialize
      }
      else {
         callback({
            response: `La contraseña de confirmación no coincide con la actual.`,
         });
         return;
      }
   })
}

const hashPassword = (password: string) => {
   const iterations = 5;
   const salt = "iwannadie";
   const hash = pbkdf2Sync(password, salt, iterations, 64, 'sha512');
   return hash;
}