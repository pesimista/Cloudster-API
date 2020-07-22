"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilesByUser = exports.checkUserQuestions = exports.getUserQuestions = exports.getQuestions = exports.deleteUser = exports.updateUserData = exports.register = exports.login = exports.checkUser = exports.getUsers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importStar(require("crypto"));
const util_1 = require("../../util/util");
const rangerController_1 = require("../files/rangerController");
// import ranger from "./ranger";
exports.getUsers = (req, res, sendRes = true) => {
    const { id: tokenID } = util_1.getTokenKey(req.headers.authorization);
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
      \`active\`,
      \`nivel\`
   FROM usuarios`;
    const where = id ? ` WHERE id='${id}';` : ';';
    const result = util_1.connSync.run(query + where);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return [];
    }
    if (!sendRes) {
        return result;
    }
    else if (id) {
        util_1.makeUserReg(tokenID, id, 'read');
        res.status(200).send(result[0] || {});
    }
    else {
        res.status(200).send(result);
    }
    return [];
};
exports.checkUser = (req, res) => {
    const user = util_1.getTokenKey(req.headers.authorization);
    const query = `
    SELECT
      \`id\`,
      \`usuario\`,
      \`nombre\`,
      \`apellido\`,
      \`desde\`,
      \`pregunta1\`,
      \`pregunta2\`,
      \`nivel\`
    FROM
      usuarios
    WHERE
      key='${user.key}';
  `;
    const result = util_1.connSync.run(query);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return;
    }
    else if (!result[0]) {
        res.status(401).json();
        return;
    }
    util_1.makeUserReg(user.id, '', 'check', '', '', 'success');
    res.status(200).json(result[0]);
};
/**
 * Verifies whether or not theres is an user with the given
 * credentials and returns a token
 * @param body The User information
 * @param callback The callback function to be called afterwards
 */
// export const login = (body: IUser, callback: Function): void => {
exports.login = (req, res) => {
    const body = Object.assign({}, req.body);
    if (!body.password || !body.usuario) {
        res.status(400).json({ message: `Faltan datos` });
        return;
    }
    const result = util_1.connSync.run(`
    SELECT * FROM usuarios
      WHERE
    usuario='${body.usuario.replace(/\'/g, "''")}'
    COLLATE NOCASE;
  `);
    if (result.error) {
        res.status(500).json({ name: 'SQLite error', message: result.error });
        return;
    }
    const [row] = result;
    if (!row) {
        /* Unathorized */
        res.status(401).json({ message: `Credenciales incorrectas` });
        return;
    }
    else if (!row.active) {
        util_1.makeUserReg(row.id, '', 'login', '', '', 'inactive');
        res.status(401).json({
            message: `El usuario se encuentra suspendido. Comuniquese con el adminitrador.`,
        });
        return;
    }
    else if (row.password.trim() !== body.password.trim() ||
        row.intentos >= 3) {
        util_1.connSync.run(`UPDATE usuarios
      SET
        intentos=intentos+1
      WHERE
        usuario='${body.usuario.replace(/\'/g, "''")}'
      COLLATE NOCASE;`);
        /* Unathorized */
        util_1.makeUserReg(row.id, '', 'login', '', '', 'fail');
        const message = ++row.intentos >= 3
            ? `Bloqueado por multiples intentos fallidos`
            : `Credenciales incorrectas.`;
        res.status(401).send({ message });
    }
    else {
        util_1.makeUserReg(row.id, '', 'login', '', '', 'success');
        const key = crypto_1.default.randomBytes(16).toString('hex');
        util_1.connSync.run(`
      UPDATE usuarios SET
        intentos=0,
        key='${key}'
      WHERE
        usuario='${body.usuario.replace(/\'/g, "''")}'
        COLLATE NOCASE;`);
        const token = hashToken(row, key);
        res.status(200).send({
            response: `Grant access`,
            token,
            user: Object.assign(Object.assign({}, row), { respuesta2: undefined, respuesta1: undefined, password: undefined, intentos: undefined }),
        });
        return;
    }
};
/**
 * Makes a new entry if all the conditions are met,
 * returns the user + its access key as a JWT
 * @param body The user information
 * @param callback The callback function to be called afterwards
 */
exports.register = (req, res) => {
    const body = Object.assign({}, req.body);
    /* Validar que tenga todos los campos */
    if (!body.usuario) {
        /* BadRequest */
        res.status(400).send(`Falta Usuario!`);
        return;
    }
    else if (!body.nombre) {
        /* BadRequest */
        res.status(400).send(`Falta nombre!`);
        return;
    }
    else if (!body.password) {
        /* BadRequest */
        res.status(400).send(`Falta contraseña`);
        return;
    }
    else if (!body.pregunta1 || !body.pregunta2) {
        /* BadRequest */
        res.status(400).send(`Falta pregunta secreta`);
        return;
    }
    else if (!body.respuesta1 || !body.respuesta2) {
        /* BadRequest */
        res.status(400).send(`Falta respuesta a la pregunta secreta`);
        return;
    }
    /* Llegados a este punto se asume que tiene todos los campos */
    let [row] = util_1.connSync.run(`
      SELECT 1 FROM
         usuarios
      WHERE
         usuario='${body.usuario.replace(/\'/g, "''")}'
      `);
    if (!row) {
        res.status(400).send(`El nombre de usuario ya existe`);
        return;
    }
    const [key, id] = [
        crypto_1.default.randomBytes(16).toString('hex'),
        crypto_1.default.randomBytes(16).toString('hex'),
    ];
    const result = util_1.connSync.run(`
    INSERT INTO usuarios(
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
      ,\`active\`
      ,\`key\`
    ) VALUES(
      '${id}',
      '${body.nombre.replace(/\'/g, "''")}',
      '${body.apellido.replace(/\'/g, "''")}',
      '${body.password.replace(/\'/g, "''")}',
      date(),
      '${body.usuario.replace(/\'/g, "''")}',
      ${body.pregunta1},
      ${body.pregunta2},
      '${body.respuesta1.replace(/\'/g, "''")}',
      '${body.respuesta2.replace(/\'/g, "''")}',
      1,
      1,
      '${key}'
    )`);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return;
    }
    [row] = util_1.connSync.run(`
    SELECT * FROM
      usuarios
    WHERE
      usuario='${body.usuario.replace(/\'/g, "''")}'
    `);
    util_1.makeUserReg(row.id, '', 'register');
    res.status(200).send({
        response: `Grant access`,
        token: hashToken(row, key),
        user: Object.assign(Object.assign({}, row), { respuesta2: undefined, respuesta1: undefined, password: undefined, intentos: undefined }),
    });
};
/**
 * Updates the user info, if everything goes as espected,
 * then it retrieves the updated information
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.updateUserData = (req, res) => {
    const body = req.body;
    const token = util_1.getTokenKey(req.headers.authorization);
    const { id, nivel } = token;
    if ((req.params.id !== id && nivel < 5) ||
        (nivel < 5 && body.hasOwnProperty('active'))) {
        res.status(401).json({ message: `No tienes los permisos` });
        return;
    }
    const [row] = util_1.connSync.run(`SELECT * FROM usuarios WHERE id='${req.params.id}' COLLATE NOCASE;`);
    if (!row) {
        res.status(400).json({ message: `El usuario no existe` });
        return;
    }
    let query = 'UPDATE usuarios SET ';
    /*  Loop to add all the fields in the database */
    const keys = [
        { name: 'usuario', has: true },
        { name: 'nombre', has: true },
        { name: 'apellido', has: true },
        { name: 'password', has: true },
        { name: 'pregunta1', has: false },
        { name: 'respuesta1', has: true },
        { name: 'pregunta2', has: false },
        { name: 'respuesta2', has: true },
        { name: 'nivel', has: false },
        { name: 'active', has: false },
    ];
    keys.forEach((key) => {
        const { name, has } = key;
        if (body.hasOwnProperty(name)) {
            if (has)
                query += ` ${name}='${body[name].replace(/\'/g, "''")}',`;
            else
                query += ` ${name}=${body[name]},`;
        }
    });
    query.slice(0, -1);
    query += ` intentos=0 WHERE id='${req.params.id}' COLLATE NOCASE;`;
    /* runs the update query  */
    const result = util_1.connSync.run(query);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return;
    }
    let regQuery = `
    INSERT INTO registros (
      performedBy,
      usuario,
      accion,
      old_value,
      new_value,
      campo,
      fecha
    ) values `;
    const time = new Date().getTime();
    Object.keys(row).forEach((key) => {
        if (body.hasOwnProperty(key) && body[key] !== row[key]) {
            regQuery += `(
        '${id}',
        '${row.id}',
        'modified',
        '${row[key].toString()}',
        '${body[key].toString()}',
        '${key}',
        ${time}
      ),`;
        }
    });
    regQuery.slice(0, -1);
    util_1.connSync.run(regQuery + ';');
    const [newrow] = util_1.connSync.run(`
    SELECT * FROM
      usuarios
    WHERE
      id='${req.params.id}' COLLATE NOCASE;
  `);
    /* Oll Korrect */
    const hideToken = req.params.id !== id;
    res.status(200).json({
        response: `Usuario actualizado`,
        token: hideToken ? '' : hashToken(newrow),
        user: hideToken
            ? ''
            : Object.assign(Object.assign({}, newrow), { respuesta2: undefined, respuesta1: undefined, password: undefined, intentos: undefined }),
    });
}; // updateUserData
/**
 * Deletes an user from the database;
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.deleteUser = (req, res) => {
    const query = `
   DELETE FROM
      usuarios
   WHERE
      \`id\`='${req.params.id}';`;
    const result = util_1.connSync.run(query);
    if (result.error) {
        res.status(500).json(Object.assign({}, result));
        return;
    }
    res.status(200).json({ message: 'oll korrect' });
};
/**
 * Sends back all the questions
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.getQuestions = (req, res) => {
    const query = `SELECT * FROM preguntas`;
    const rows = util_1.connSync.run(query);
    res.status(200).json(rows);
};
/**
 * Retrieves the questions selected by a specific user
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.getUserQuestions = (req, res) => {
    const query = `SELECT
      \`preguntas\`.\`id\` as id_pregunta,
      \`pregunta1\`,
      \`pregunta2\`,
      \`usuario\`,
      \`usuarios\`.\`id\` as id_usuario,
      \`usuarios\`.\`active\`,
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
      \`usuarios\`.\`usuario\`='${req.params.usuario.replace(/\'/g, "''")}' COLLATE NOCASE;`;
    const rows = util_1.connSync.run(query);
    if (rows.error) {
        res.status(500).json({ message: rows.error });
        return;
    }
    if (!rows || !rows.length) {
        res.status(404).json({ message: 'El usuario ingresado no existe.' });
        return;
    }
    if (!rows[0].active) {
        res.status(401).json({
            message: `El usuario se encuentra suspendido. Comuniquese con el adminitrador.`,
        });
        return;
    }
    const pregunta1 = rows.find((a) => a.id_pregunta === a.pregunta1);
    const pregunta2 = rows.find((a) => a.id_pregunta === a.pregunta2);
    /* Sends username, userid, and both questions */
    res.status(200).json({
        usuario: rows[0].usuario,
        id_usuario: rows[0].id_usuario,
        pregunta1: pregunta1 === null || pregunta1 === void 0 ? void 0 : pregunta1.pregunta,
        pregunta2: pregunta2 === null || pregunta2 === void 0 ? void 0 : pregunta2.pregunta,
    });
};
/**
 * Verifies whether or not the answers to the given questions match what is
 * stores in the database, if they do, a new key to renew the password is sent
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.checkUserQuestions = (req, res) => {
    const id = req.params.id;
    const { respuesta1, respuesta2 } = req.body;
    const query = `SELECT * FROM usuarios WHERE id='${id}' COLLATE NOCASE;`;
    const rows = util_1.connSync.run(query);
    if (rows.error) {
        res.status(500).json(rows.error);
        return;
    }
    const [row] = rows;
    if (row.respuesta1.toLowerCase() === respuesta1.toLowerCase() &&
        row.respuesta2.toLowerCase() === respuesta2.toLowerCase()) {
        res.status(200).json({
            response: `Grant access`,
            token: jsonwebtoken_1.default.sign({
                id: row.id,
                key: row.key,
            }, 'supersecretkeythatnobodyisgonnaguess'),
        });
        return;
    }
    else
        res.status(401).json({ message: 'Las respuestas no concuerdan' });
};
exports.getFilesByUser = (req, res) => {
    const [user] = exports.getUsers(req, res, false);
    const files = util_1.connSync
        .run(`SELECT * FROM
            archivos
         WHERE
            usuario = ?
         AND
            nivel<=?
         COLLATE NOCASE`, [user.id, user.nivel])
        .map((f) => {
        return Object.assign(Object.assign({}, f), { isFile: f.isFile ? true : false });
    });
    const [{ totalSize = 0 }] = util_1.connSync.run(`
    SELECT SUM(fullSize) as totalSize FROM
      archivos
    WHERE
      usuario = '${user.id}'
    AND
      nivel<=${user.nivel}
    COLLATE NOCASE`);
    const query = `
    SELECT ext as name, count(ino) as value FROM
      archivos
    WHERE
      usuario = '${user.id}'
    AND
      nivel<=${user.nivel}
    GROUP BY
      ext
    ORDER BY
      value DESC
    LIMIT 10
  `;
    const chartData = util_1.connSync.run(query);
    const parsedSize = rangerController_1.parseSize(totalSize);
    const mappedData = chartData.map(({ name, value }) => ({
        value,
        name: !name ? 'carpeta' : name === '~' ? 'sin ext' : name,
    }));
    res.status(200).json({
        files,
        totalSize,
        parsedSize,
        chartData: mappedData,
    });
};
/**
 * Creates a jwt based on an user info
 */
const hashToken = (user, key) => {
    const now = new Date();
    return jsonwebtoken_1.default.sign({
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        // password: user.password,
        nivel: user.nivel,
        key: key || user.key,
        expires: now.setHours(now.getHours() + 1),
    }, 'supersecretkeythatnobodyisgonnaguess');
};
const hashPassword = (password) => {
    const iterations = 5;
    const salt = 'iwannadie';
    const hash = crypto_1.pbkdf2Sync(password, salt, iterations, 64, 'sha512');
    return hash;
};
//# sourceMappingURL=usersController.js.map