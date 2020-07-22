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
exports.getLogReport = exports.getGenericReport = exports.generateFileReport = exports.getFilesDetails = exports.getUsersDetails = exports.getUsers = exports.getFiles = void 0;
const util_1 = require("../../util/util");
const rangerController_1 = require("../files/rangerController");
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
// import ranger from "./ranger";
/**
 * Retrieves the info for a spefic file
 * @param req The incoming request
 * @param res The outgoing response
 */
exports.getFiles = (req, res) => {
    res.status(200).json(util_1.connSync.run(`SELECT * FROM archivos`));
};
exports.getUsers = (req, res) => {
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
    const result = util_1.connSync.run(query);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return;
    }
    res.status(200).send(result);
};
const getDetails = (id, suma, name, table, available) => {
    const query = `
    SELECT
      ${suma} as totalSize,
      count(${id}) as total,
      SUM(${available}) as available,
      SUM(1 - ${available}) as disabled
    FROM
      ${table}`;
    const [res] = util_1.connSync.run(query);
    const chartData = util_1.connSync.run(`
    SELECT
      ${name} as name,
      count(${id}) as value
    FROM
      ${table}
    GROUP BY
      ${name}
    ORDER BY
      value DESC
    LIMIT 10`);
    return Object.assign(Object.assign({}, res), { chartData });
};
exports.getUsersDetails = (req, res) => {
    var _a;
    const details = getDetails('id', '0', 'nivel', 'usuarios', 'active');
    details.chartData = (_a = details.chartData) === null || _a === void 0 ? void 0 : _a.map((data) => ({
        value: data.value,
        name: 'Nivel ' + data.name,
    }));
    const [result] = util_1.connSync.run(`
    SELECT COUNT(id) as actions FROM (SELECT DISTINCT fecha, performedBy AS id FROM registros);
  `);
    res.status(200).json(Object.assign(Object.assign({}, details), { actions: result.actions }));
};
exports.getFilesDetails = (req, res) => {
    const details = getDetails('ino', 'SUM(fullSize)', 'ext', 'archivos', 'available');
    const [result] = util_1.connSync.run(`
    SELECT count(id) AS actions FROM registros WHERE accion='downloaded'
  `);
    const parsedSize = rangerController_1.parseSize(details.totalSize);
    if (details.chartData) {
        details.chartData = details.chartData.map(({ name, value }) => ({
            value,
            name: !name ? 'carpeta' : name === '~' ? 'sin ext' : name,
        }));
    }
    res.status(200).json(Object.assign(Object.assign({}, details), { actions: result.actions, parsedSize }));
};
exports.generateFileReport = (req, res) => {
    const { username = 'Yo' } = util_1.getTokenKey(req.headers.authorization);
    const query = `SELECT
    \`ino\`,
    \`name\`,
    IFNULL(B.\`usuario\`, A.\`usuario\`) as username,
    \`birthtime\`,
    \`lastModified\`,
    IFNULL(\`C\`.\`usuario\`, '-') as username_mo,
    \`size\`
  FROM
    \`archivos\` as A
  LEFT JOIN
    \`usuarios\` as B
  ON
    A.\`usuario\` = B.\`id\`
  LEFT JOIN
    \`usuarios\` as  C
  ON
    A.\`usuario_mo\` = C.\`id\`
  `;
    const result = util_1.connSync.run(query);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return;
    }
    const mappedFiles = result.map((file) => (Object.assign(Object.assign({}, file), { birthtime: new Date(file.birthtime).toLocaleString('es-VE'), lastModified: file.lastModified
            ? new Date(file.lastModified).toLocaleString('es-VE')
            : '-' })));
    const callback = (pdf) => {
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdf.length,
        });
        res.send(pdf);
    };
    compile('template.hbs', mappedFiles, username, callback);
};
exports.getGenericReport = (req, res) => {
    const { username = 'Yo' } = util_1.getTokenKey(req.headers.authorization);
    const { accion = 'read' } = req.params;
    const query = `
    SELECT
      A.\`ino\`,
      C.\`name\`,
      IFNULL(B.\`usuario\`, A.\`performedBy\`) as username,
      A.fecha
    FROM
      \`registros\` as A
    LEFT JOIN
      \`usuarios\` as B
    ON
      A.\`performedBy\` = B.\`id\`
    INNER JOIN
      \`archivos\` as  C
    ON
      A.\`ino\` = C.\`ino\`
    WHERE
      A.accion='${accion}'
  `;
    const result = util_1.connSync.run(query);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return;
    }
    const mappedFiles = result.map((row) => (Object.assign(Object.assign({}, row), { fecha: new Date(row.fecha).toLocaleString('es-VE') })));
    const callback = (pdf) => {
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdf.length,
        });
        res.send(pdf);
    };
    compile('downloads.hbs', mappedFiles, username, callback);
};
exports.getLogReport = (req, res) => {
    const { username = 'Yo' } = util_1.getTokenKey(req.headers.authorization);
    const query = `
    SELECT
      A.fecha,
      A.performedBy,
      IFNULL(B.\`usuario\`, A.\`performedBy\`) as username,
      A.accion,
      A.campo
    FROM
      \`registros\` as A
    INNEr JOIN
      \`usuarios\` as B
    ON
      A.\`performedBy\` = B.\`id\`
    WHERE
      A.accion='login' OR A.accion='check'
    ORDER BY
      A.fecha DESC;
  `;
    const result = util_1.connSync.run(query);
    if (result.error) {
        res.status(500).json(Object.assign({}, result.error));
        return;
    }
    const getStatus = (campo) => {
        switch (campo) {
            case 'inactive':
                return { result: 'Negado - Inactivo' };
            case 'fail':
                return { result: 'Negado - Contraseña incorrecta' };
            default:
                return { result: 'Otorgado' };
        }
    };
    const mappedFiles = result.map((row) => (Object.assign(Object.assign(Object.assign({}, row), getStatus(row.campo)), { performedBy: row.performedBy.slice(-5), fecha: new Date(row.fecha).toLocaleString('es-VE') })));
    const callback = (pdf) => {
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdf.length,
        });
        res.send(pdf);
    };
    compile('logs.hbs', mappedFiles, username, callback);
};
const compile = (template, data, username, cb) => {
    const today = new Date().toLocaleString('es-VE');
    const templatePath = path_1.default.join(__dirname, 'templates', template);
    const html = fs_1.default.readFileSync(templatePath, 'UTF-8');
    const report = handlebars_1.default.compile(html)({
        username,
        date: today,
        data,
    });
    printPDF(report, cb);
};
const printPDF = (content, cb) => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield puppeteer_1.default.launch({ headless: true });
    const page = yield browser.newPage();
    yield page.setContent(content);
    yield page.emulateMediaType('screen');
    const pdf = yield page.pdf({
        format: 'Letter',
        background: true,
        margin: {
            top: '2cm',
            bottom: '1cm',
            left: '1cm',
            right: '1cm',
        },
    });
    yield browser.close();
    // return pdf;
    cb(pdf);
});
//# sourceMappingURL=adminController.js.map