"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite3 = sqlite3_1.default.verbose();
exports.conn = new sqlite3.Database('./cloudster.db', (err) => {
    if (err) {
        console.log("Error");
    }
    else {
        console.log('Connected Successfully to the DatabasE');
    }
});
exports.Authorization = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token || !token.startsWith('bearer ')) {
        res.status(401).send();
        return;
    }
    const decoded = jsonwebtoken_1.default.decode(token.replace('bearer ', ''));
    if (!decoded.key) {
        res.status(401).send();
        return;
    }
    exports.conn.get(`SELECT '' FROM usuarios WHERE key='${decoded.key.trim()}'`, (error, row) => {
        if (error || !row) {
            res.status(401).json({ message: 'Unanthorized' });
            return;
        }
        return next();
    });
};
//# sourceMappingURL=util.js.map