"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sqlite_sync_1 = __importDefault(require("sqlite-sync"));
const path_1 = __importDefault(require("path"));
const app_1 = require("../app");
const connection = sqlite_sync_1.default.connect(path_1.default.join(app_1.distParent, 'cloudster.db'));
exports.connSync = {
    run: (query, args) => {
        var _a;
        if (args) {
            args.forEach((item) => {
                if (typeof item === 'string')
                    item = item.replace(/\'/g, "''");
            });
        }
        const res = connection.run(query, args);
        const columns = (_a = res[0]) === null || _a === void 0 ? void 0 : _a.columns;
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
exports.Authorization = (req, res, next) => {
    const token = req.headers.authorization || 'bearer ' + req.query.token;
    if (!token || !token.toLocaleLowerCase().startsWith('bearer ')) {
        res.status(401).json({ message: 'Unanthorized 1 invalid token or null' });
        return;
    }
    let decoded;
    try {
        decoded = exports.getTokenKey(token);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
    if (!decoded && !req.headers.authorization) {
        res.status(200).sendFile(exports.getLocalPage());
        return;
    }
    try {
        if (!decoded.key || !decoded.id) {
            res
                .status(401)
                .json({ message: 'Unanthorized 2 Invalid token; not key nor id' });
            return;
        }
    }
    catch (error) {
        res.status(400).json(Object.assign({}, error));
        return;
    }
    const rows = exports.connSync.run(`SELECT 1 FROM usuarios WHERE id='${decoded.id.trim()}' AND key='${decoded.key.trim()}' COLLATE NOCASE`);
    if (rows.error) {
        res.status(500).json(rows.error);
        return;
    }
    const [row] = rows;
    if (!row) {
        res.status(401).json({ message: 'Unanthorized 3' });
        return;
    }
    return next();
};
exports.AdminAuth = (req, res, next) => {
    const token = req.header('Authorization') || 'bearer ' + req.query.token;
    const decoded = exports.getTokenKey(token);
    const rows = exports.connSync.run(`
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
    const [row] = rows;
    if (row.nivel < 5)
        res.status(401).json({ message: 'Unanthorized 4' });
    return next();
};
exports.getTokenKey = (token = '') => {
    const res = jsonwebtoken_1.default.decode(token.replace(/[Bb]earer /, ''));
    return res;
};
/**
 * Nada, pone letras mayusculas de forma aleatoria en las palaras
 * @param value la frase
 */
exports.randomUpper = (value) => {
    value = value.trim();
    let toReturn = '';
    [...value].forEach((item, index) => {
        if (Math.random() >= 0.4)
            toReturn += item.toLowerCase();
        else
            toReturn += item.toUpperCase();
    });
    return toReturn;
};
exports.getLocalPage = (pageName = 'notFound.html') => {
    const dir = path_1.default.dirname(__dirname);
    return path_1.default.join(dir, 'pages', 'notFound.html');
};
exports.makeFileReg = (performedBy, ino, accion, oldVal = '', newVal = '', campo = '') => __awaiter(void 0, void 0, void 0, function* () {
    const res = exports.connSync.run(`
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
});
exports.makeUserReg = (performedBy, userID, accion, oldVal = '', newVal = '', campo = '') => __awaiter(void 0, void 0, void 0, function* () {
    const res = exports.connSync.run(`
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
});
//# sourceMappingURL=util.js.map