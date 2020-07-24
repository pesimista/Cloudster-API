"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
exports.distParent = path_1.default.dirname(__dirname);
// export const distParent = __dirname;
const compression_1 = __importDefault(require("compression"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const rangerController_1 = require("./routes/files/rangerController");
const rangerRoute_1 = __importDefault(require("./routes/files/rangerRoute"));
const adminRoute_1 = __importDefault(require("./routes/admin/adminRoute"));
const index_route_1 = __importDefault(require("./routes/index.route"));
const usersController_1 = require("./routes/users/usersController");
const usersRoute_1 = __importDefault(require("./routes/users/usersRoute"));
const util_1 = require("./util/util");
/* Instantiate app */
const app = express_1.default();
/* Compresses all routes */
app.use(compression_1.default());
/* Sets appropriate HTTP headers in order to help protect the app from well-known web vulnerabilities  */
app.use(helmet_1.default());
app.use(morgan_1.default('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// app.use(express.static(path.join(__dirname, 'public')));
/**
 * Cross Origin Requests Service
 */
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    /* Pa que no aparezca en gris el req >///< */
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', '*');
        return res.json({});
    }
    return next();
});
/**
 * Routes
 */
/* Usuarios */
app.use('/api/users', usersRoute_1.default);
app.get('/api/questions', usersController_1.getQuestions);
/* Archivos */
app.use('/api/files', rangerRoute_1.default);
app.use('/api/admin', adminRoute_1.default);
app.use('/api', index_route_1.default);
app.get('/api/watch/:ino', util_1.Authorization, rangerController_1.viewFile);
const react = express_1.default.Router();
react.use(express_1.default.static(exports.distParent));
react.use(express_1.default.static(path_1.default.join(exports.distParent, 'build')));
react.get('*', (req, res) => {
    res.sendFile(path_1.default.join(exports.distParent, 'build', 'index.html'));
});
app.use('/app', react);
app.get(['/:route', '/'], (req, res) => {
    res.redirect('/app');
    return;
});
/**
 * @Description Get the corresponding color for every route depending on the method
 * @param method Method
 */
const getColor = (method) => {
    method = method.toLowerCase();
    const color = method === 'get'
        ? '\x1b[32m'
        : method === 'post'
            ? '\x1b[33m'
            : method === 'put'
                ? '\x1b[34m'
                : method === 'delete'
                    ? '\x1b[31m'
                    : '\x1b[35m';
    return color + method.toUpperCase();
};
rangerController_1.setDirectory(path_1.default.join(exports.distParent, 'temp'));
exports.default = app;
//# sourceMappingURL=app.js.map