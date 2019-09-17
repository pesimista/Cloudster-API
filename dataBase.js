const sqlite = require('sqlite3')
const ranger = require('./ranger');

const sqlite3 = sqlite.verbose();
let conn = new sqlite3.Database('./Software2.db', err => {
  if(err)
  {
    console.log("Error");
  }
  else 
  {
    console.log('Connected Successfully to the Database');
  }
});

let rs = [{
  id : 1,
  nombre : "Gary",
  password : "dejavu",
  nivel: 5,
  email: "gary@gmail.com",
  desde: "27-06-2019",
  usuario: "GMezzMar",
  pregunta1: 1,
  pregunta2: 2,
  respuesta1: "Diego",
  respuesta2: "Maracay"
},
{
  id: 2,
  nombre: "Diego Lopez",
  password : "asdfghjkl",
  nivel: 5,
  email:"ddlg161299@gmail.com",
  desde: "25-06-2019",
  usuario: "Diomes",
  pregunta1: 1,
  pregunta2: 2,
  respuesta1: "Gary",
  respuesta2: "Cabimas"
},
{
  id: 3,
  nombre: "Vin Venture",
  password : "elend",
  nivel: 4,
  email:"ImaMistborn@luthadel.com",
  desde: "27-06-2019",
  usuario: "Vin",
  pregunta1: 1,
  pregunta2: 2,
  respuesta1: "Kelsier",
  respuesta2: "Luthadel"
},
{
  id: 4,
  nombre: "José Oropeza",
  password : "123456",
  nivel: 3,
  email:"josoro2018@gmail.com",
  desde: "04-07-2019",
  usuario: "Oro",
  pregunta1: 1,
  pregunta2: 2,
  respuesta1: "Diosito",
  respuesta2: "Maracaibo"
}];

let preguntas = [
  {
  id: 1,
  pregunta: "Cuál es el nombre de tu mejor amigo?"
  },
  {
    id: 2,
    pregunta: "Cuál es la ciudad donde naciste?"
  },
  {
    id: 3,
    pregunta: "Cómo se llamaba tu primera mascota?"
  },
  {
    id: 4,
    pregunta: "Cuál es tu color favorito?"
  },
  {
    id: 5,
    pregunta: "Cuál es el segundo nombre de tu madre?"
  }
]

// --------------- login ---------------
async function login(body, callback)
{
  try{
    console.log("Loging in");
    conn.get(`select * from usuarios where usuario='${body.usuario}'`, 
    (err, row) => 
    {
      if(err) {console.log(err.message); return}
      // console.log(body);

      if(typeof row === 'undefined')
      {
        callback({
          response: `El usuario ${body.usuario} no existe.`,
          user: undefined
        });
        return;
      }

      if(row.password !== body.password || row.intentos>=3)
      {
        conn.serialize( () =>{
          conn.run(`update usuarios set intentos=intentos+1 where usuario='${body.usuario}';`, 
            errRUN => {
              if(errRUN){console.log(errRUN.message, "Line : 125") ; return}
            }
          ).get(`select intentos from usuarios where usuario='${body.usuario}'`, 
            (errGET, rowGet) => {
              if(rowGet.intentos>=3)
              {
                console.log(rowGet.intentos, 'tries');
                callback({
                  response: `Bloqueado por multiples intentos fallidos`,
                  user: undefined,
                  count: rowGet.intentos
                });
                return;
              }
              callback({
                response: `Contraseña incorrecta!`,
                user: undefined,
                count: rowGet.intentos
              });
              return;
            }) 
        });//Serialize
      }
      else
      {
        makeReg({
          userId: row.id,
          accion: 'login'
        });

        conn.run(`update usuarios set intentos=0 where usuario='${body.usuario}';`, 
          errRUN => {
            if(errRUN){console.log(errRUN.message, "Line : 153") ; return}
          }
        );

        callback({
          response: `Grant access`,
          user: {
            id: row.id,
            nombre: row.nombre,
            nivel: row.nivel,
            desde: row.desde,
            usuario: row.usuario,
            pregunta1: row.pregunta1,
            pregunta2: row.pregunta2,
          }
        });
        return;
      }
    });
  } 
  catch (err) {
    console.log(err.message);
  }
}

// --------------- Register ---------------
async function register(body, callback)
{
  try{
    console.log("Register");
    console.log(body);
    if(!body.usuario)
    {
      callback({
        response: `Falta Usuario!`,
        user: undefined
      });
      return;
    }
    if(!body.nombre)
    {
      callback({
        response: `Falta nombre!`,
        user: undefined
      });
      return;
    }
    else if(!body.password) 
    {
      callback({
        response: `Falta contraseña!`,
        user: undefined
      });
      return;
    }
    else if(!body.pregunta1 || !body.pregunta2)
    {
      callback({
        response: `Falta pregunta secreta`,
        user: undefined
      });
      return;
    }
    else if(!body.respuesta1 || !body.respuesta2)
    {
      callback({
        response: `Falta respuesta a la pregunta secreta`,
        user: undefined
      });
      return;
    }
    conn.all( `select * from usuarios where usuario='${body.usuario}'` , 
    (err, rows) => {
      if(err){console.log("Inside all line:200",err.message); return};
      if(rows[0])
      {
        callback({
          response: `El nombre de usuario ya existe!`,
          user: undefined
          });
        return;  
      }
      conn.serialize( () => {
        console.log("serialize");
        conn.run(`insert into usuarios
        (\`nombre\`,\`password\`,\`desde\`,\`usuario\`,\`pregunta1\`,\`pregunta2\`,\`respuesta1\`,\`respuesta2\`,\`nivel\`) 
          values(
          "${body.nombre}",
          "${body.password}",
          date(),
          "${body.usuario}",
          "${body.pregunta1}",
          "${body.pregunta2}",
          "${body.respuesta1}",
          "${body.respuesta2}",
          1
          )
        `)
        .get(`select * from usuarios where usuario='${body.usuario}'`, 
        (err, row) => {
          console.log('GET 227')
          console.log(row);
          if(err) { console.log('Inside get line:226', err.message); console.log(err); return }

          makeReg({
            userId: row.id,
            accion: 'register'
          });

          callback({
            response: `Grant access`,
            user: {
              id: row.id,
              nombre: row.nombre,
              nivel: row.nivel,
              desde: row.desde,
              usuario: row.usuario,
              pregunta1: row.pregunta1,
              pregunta2: row.pregunta2,
            }
          })//Callback
        })//Get
      })//Serialize
    });//Select * from usuarios
    
  } 
  catch (err) {
    console.log('Outside it all:245',err);

  }
}

async function changeUserData(body, callback)
{
  try{
    conn.get(`select * from usuarios where id=${body.id}`, (err, row) =>{
      if(err){console.log(err)}
      if(typeof row === 'undefined')
      {
        callback({
          response: `El usuario ${body.id} no existe.`,
        });
        return;
      }
      else if(body.confirmpassword === row.password)
      {
        conn.serialize( () =>{
          conn.run((body.usuario && body.usuario.length > 0)? `update usuarios set nombre='${body.nombre}' where id=${body.id}`: '',
            (e) => {
              if(!e)console.log("Updated usuario") 
            })
          .run((body.nombre.length > 0)? `update usuarios set nombre='${body.nombre}' where id=${body.id}` : '',
            (e) => {
              if(!e)console.log("Updated nombre") 
            })
          .run( (body.password.length > 0)? `update usuarios set password='${body.password}' where id=${body.id}`:
            '', (e) => {
              if(!e)console.log("Updated password") 
            })
          .run((body.respuesta1.length > 0)? `update usuarios set pregunta1=${body.pregunta1} where id=${body.id}`
            :'', (e) => {
              if(!e)
              {
                console.log("Updated Pregunta1") 
                conn.run(`update usuarios set respuesta1=${body.respuesta1} where id=${body.id}`)
                console.log("Updated Respuesta1") 
              }
            })
          .run((body.respuesta2.length > 0)? `update usuarios set pregunta2=${body.pregunta2} where id=${body.id}`
            :'', (e) => {
              if(!e)
              {
                console.log("Updated Pregunta2") 
                conn.run(`update usuarios set respuesta2=${body.respuesta2} where id=${body.id}`)
                console.log("Updated Respuesta2") 
              }
            })
          .get(`select * from usuarios where id=${body.id}`, 
          (errGet, newRow) => {
            if(errGet) {console.log(errGet.message);}
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
      else 
      {
        callback({
          response: `La contraseña de confirmación no coincide con la actual.`,
        });
        return;
      }
    })
  } 
  catch (err) {
    console.log(err);
  }
}

// --------------- Cambiar contraseña ---------------
async function changePassword(body, callback)
{
  try{
    conn.get(`select * from usuarios where usuario='${body.usuario}'`, (err, row) =>{
      if(err){console.log(err)}
      if(typeof row === 'undefined')
      {
        callback({
          response: `El usuario ${body.usuario} no existe.`,
        });
        return;
      }
      conn.run(`update usuarios set password='${body.password}' where usuario='${body.usuario}'`, 
      err => {
        if(err) {console.log(err); return}
        else {
          makeReg({
            userId: row.id,
            accion: 'Cambio de contraseña'
          });

          conn.run(`update usuarios set intentos=0 where usuario='${body.usuario}';`, 
            errRUN => {
              if(errRUN){console.log(errRUN.message, "Line : 310") ; return}
            }
          );

          if(body.withUser) 
          callback({
            response: `Contraseña cambiada de forma exitosa`,
            user: {
              id: row.id,
              nombre: row.nombre,
              nivel: row.nivel,
              desde: row.desde,
              usuario: row.usuario,
              pregunta1: row.pregunta1,
              pregunta2: row.pregunta2,
            }
          });
          else callback({response: `Contraseña cambiada de forma exitosa`});
          return;
        }
      })     
    })
  } 
  catch (err) {
    console.log(err);
  }
}

// --------------- Consultar Preguntas ---------------
async function getQuestions(usuario, callback)
{
  try{
    conn.get(`select \`usuario\`,\`pregunta1\`,\`pregunta2\` from usuarios where usuario='${usuario}'`,
    (err, row) => {
      if(typeof row === 'undefined')
      {
        callback({
          response: `El usuario ingresado no existe.`,
          user: undefined
        });
        return;
      }
      //Q de questions
      conn.all(`select * from preguntas where id=${row.pregunta1} or id=${row.pregunta2}`, 
      (err, rows) => {
        callback({
          response: `Show questions`,
          user: {
            usuario: row.usuario,
            pregunta1: rows[0].pregunta,
            pregunta2: rows[1].pregunta
          }
        });
      });//all
    });
  }
  catch( err )
  {
    console.log(err);
  }
}

async function checkQuestions(body, callback)
{
  try{
    conn.get(`select * from usuarios where usuario='${body.usuario}'`,
    (err, row) => {
      if( row.respuesta1.toLowerCase() === body.respuesta1.toLowerCase() && row.respuesta2.toLowerCase() === body.respuesta2.toLowerCase() )
      {
        callback({response: `Grant access`});
        return;
      }
      callback({response: `Las respuestas son incorrectas`});
      return;
    });
  }
  catch( err )
  {
    console.log(err)
  }
}

// --------------- Crear Registro ---------------
async function makeReg(body)
{
  try{
    // conn = await req.getConnection();
    // console.log("Waiting");
    let path = body.fileId? ranger.getDependency(body.fileId) : '';
    conn.run(`insert into registros(\`user\`,\`archivo\`,\`accion\`,\`fecha\`) values(${body.userId}, '${path}', '${body.accion}', date())`,
    (err)=>{
      if(err){console.log(err); return}
    })
  } 
  catch (err) {
    console.log(err);
  }
}
// --------------- Retorna la lista de todas las preguntas ---------------
async function getQuestionList(callback)
{
  let resultSet;
  try{
    // conn = await req.getConnection();
    // resultSet = await conn.query(`select * from preguntas;'`);
    resultSet = preguntas;
    callback({
      response: `List of all questions`,
      preguntas: resultSet
    });
    return;
  }
  catch( err )
  {
    console.log(err);
  }
}

// --------------- Get Everything I have ---------------
// --------------- Users ---------------
async function getUsers(callback)
{
  conn.all(`select \`id\`,\`nombre\`,\`desde\`,\`usuario\`,\`pregunta1\`,\`pregunta2\`,\`respuesta1\`,\`respuesta2\`,\`nivel\` from usuarios;`, 
  (err, rows) => {
    if(err){ console.log(err); return };
    callback(rows);
  });
  return;
}

// --------------- Columns ---------------
async function getColumns(table, callback)
{
  let resultSet;
  let res = [];
  try{
    conn = await req.getConnection();
    console.log("Waiting");
    resultSet = await conn.query(`show columns from ${table};`); 
    let columns = Object.keys(resultSet);
    columns.pop();
    columns.forEach( col => 
    {
      console.log('\t' ,resultSet[col].Field);
      res.push(resultSet[col].Field);
    });
    callback(res);
  } 
  catch (err) {
    console.log(err);
  }
}

function userExists(id, callback)
{
  try{
    conn.get(`select usuario from usuarios where id=${id};`,
    (err, row)=>
    {
      if(err){console.log(err); return}
      if(row)
      {
        console.log(`${id} exist`);
        callback();
      }
      console.log(`${id} doesn't exist`);
    }); 
  } 
  catch (err) {
    console.log(err);
  }
}

function setNivel(body, callback)
{
  try{
    conn.run(`update usuarios set nivel=${body.newNivel} where id=${body.id};`,
    (err)=>
    {
      if(err){console.log(err); return}
      callback()
    }); 
  } 
  catch (err) {
    console.log(err);
  }
}

function deleteUser( id, callback )
{
  let usuario;
  conn.serialize( () => {
    conn.get(`select usuario from usuarios where id=${id}`, 
    (err, row) => {
      if(err) { console.log(err); callback({response: 'wrong'}); return};
      usuario = row.usuario;
    })
    .run(`delete from usuarios where id=${id}`, 
    (err) => {
      if(err) { console.log(err); callback({response: 'wrong'}); return};
      callback({
        response: `oll korrect`,
        usuario: usuario
      });
    });
  });
}


module.exports.login = login;
module.exports.register = register;
module.exports.getUsers = getUsers;
module.exports.getColumns = getColumns;
module.exports.getQuestions = getQuestions;
module.exports.checkQuestions = checkQuestions;
module.exports.getQuestionList = getQuestionList;
module.exports.changePassword = changePassword;
module.exports.makeReg = makeReg;
module.exports.userExists = userExists;
module.exports.changeUserData = changeUserData;
module.exports.setNivel = setNivel;
module.exports.deleteUser = deleteUser;