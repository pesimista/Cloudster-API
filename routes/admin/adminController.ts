import { IFile } from './../../models/files';
import { Response, Request } from 'express';
import { connSync, getTokenKey } from '../../util/util';
import { parseSize } from '../files/rangerController';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import hbs from 'handlebars';
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

  const result = connSync.run(query);
  if (result.error) {
    res.status(500).json({ ...result.error });
    return;
  }

  res.status(200).send(result);
};

const getDetails = (
  id: string,
  suma: string,
  name: string,
  table: string,
  available: string
): Details => {
  const query = `
    SELECT
      ${suma} as totalSize,
      count(${id}) as total,
      SUM(${available}) as available,
      SUM(1 - ${available}) as disabled
    FROM
      ${table}`;

  const [res] = (connSync.run(query) as unknown) as Details[];

  const chartData = (connSync.run(`
    SELECT
      ${name} as name,
      count(${id}) as value
    FROM
      ${table}
    GROUP BY
      ${name}
    ORDER BY
      value DESC
    LIMIT 10`) as unknown) as ChartData[];

  return {
    ...res,
    chartData,
  };
};

export const getUsersDetails = (req: Request, res: Response): void => {
  const details = getDetails('id', '0', 'nivel', 'usuarios', 'active');

  details.chartData = details.chartData?.map((data) => ({
    value: data.value,
    name: 'Nivel ' + data.name,
  }));

  const [result] = (connSync.run(`
    SELECT COUNT(id) as actions FROM (SELECT DISTINCT fecha, performedBy AS id FROM registros);
  `) as unknown) as { actions: number }[];

  res.status(200).json({
    ...details,
    actions: result.actions,
  });
};

export const getFilesDetails = (req: Request, res: Response): void => {
  const details = getDetails(
    'ino',
    'SUM(fullSize)',
    'ext',
    'archivos',
    'available'
  );

  const [result] = (connSync.run(`
    SELECT count(id) AS actions FROM registros WHERE accion='downloaded'
  `) as unknown) as { actions: number }[];

  const parsedSize: string = parseSize(details.totalSize);
  if (details.chartData) {
    details.chartData = details.chartData.map(({ name, value }) => ({
      value,
      name: !name ? 'carpeta' : name === '~' ? 'sin ext' : name,
    }));
  }

  res.status(200).json({
    ...details,
    actions: result.actions,
    parsedSize,
  });
};

export const generateFileReport = (req: Request, res: Response) => {
  const token = getTokenKey(req.headers.authorization);
  if (!token.usuario){
    const userResult = connSync.run(`
      SELECT usuario FROM usuarios WHERE key='${token.key}'
    `);
    if (userResult.error) {
      res.status(500).json({code: 'SQLite', message: userResult.error});
      return;
    }
    if (!userResult[0]) {
      res.status(401).json({message: 'No token'});
      return;
    }
    token.usuario = userResult[0].usuario;
  }

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
  const result = connSync.run(query);
  if (result.error) {
    res.status(500).json({code: 'SQLite', message: result.error});
    return;
  }

  const mappedFiles = result.map((file: IFile) => ({
    ...file,
    birthtime: new Date(file.birthtime).toLocaleString('es-VE'),
    lastModified: file.lastModified
      ? new Date(file.lastModified as Date).toLocaleString('es-VE')
      : '-',
  }));

  const callback = (pdf) => {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  };
  const onError = (message: string) => {
    res.status(500).json({code: 'puppeteer', message});
  }

  compile('template.hbs', mappedFiles, token.username, callback, onError);
};

export const getGenericReport = (req: Request, res: Response) => {
  const token = getTokenKey(req.headers.authorization);
  if (!token.usuario){
    const userResult = connSync.run(`
      SELECT usuario FROM usuarios WHERE key='${token.key}'
    `);
    if (userResult.error) {
      res.status(500).json({code: 'SQLite', message: userResult.error});
      return;
    }
    if (!userResult[0]) {
      res.status(401).json({message: 'No token'});
      return;
    }
    token.usuario = userResult[0].usuario;
  }
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
  const result = connSync.run(query);
  if (result.error) {
    res.status(500).json({ code:'SQLite', message: result.error });
    return;
  }

  const mappedFiles = result.map((row: FileActivity) => ({
    ...row,
    fecha: new Date(row.fecha).toLocaleString('es-VE'),
  }));

  const callback = (pdf) => {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  };
  const onError = (message: string) => {
    res.status(500).json({code: 'puppeteer', message});
  }

  compile('downloads.hbs', mappedFiles, token.username, callback, onError);
};

export const getLogReport = (req: Request, res: Response) => {
  const token = getTokenKey(req.headers.authorization);
  if (!token.usuario){
    const userResult = connSync.run(`
      SELECT usuario FROM usuarios WHERE key='${token.key}'
    `);
    if (userResult.error) {
      res.status(500).json({code: 'SQLite', message: userResult.error});
      return;
    }
    if (!userResult[0]) {
      res.status(401).json({message: 'No token'});
      return;
    }
    token.usuario = userResult[0].usuario;
  }

  const query = `
    SELECT
      A.fecha,
      SUBSTR(A.performedBy, -5) as performedBy,
      IFNULL(B.\`usuario\`, A.\`performedBy\`) as username,
      A.accion,
      CASE
        WHEN A.campo='inactive' THEN 'Negado - Inactivo'
        WHEN A.campo='fail' THEN 'Negado - Contraseña incorrecta'
        ELSE 'Otorgado'
      END as result
    FROM
      \`registros\` as A
    INNER JOIN
      \`usuarios\` as B
    ON
      A.\`performedBy\` = B.\`id\`
    WHERE
      A.accion='login' OR A.accion='check'
    ORDER BY
      A.fecha DESC;
  `;
  const result = connSync.run(query);
  if (result.error) {
    res.status(500).json({ ...result.error });
    return;
  }

  const mappedFiles = result.map(
    (row: LogActivity): LogActivity => ({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-VE'),
    })
  );

  const callback = (pdf): void => {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  };
  const onError = (message: string) => {
    res.status(500).json({code: 'puppeteer', message});
  }

  compile('logs.hbs', mappedFiles, token.usuario, callback, onError);
};

const compile = (
  template: string,
  data: any[],
  username: string,
  cb: (pdf) => void ,
  onError?: (val) => void
) => {
  const today = new Date().toLocaleString('es-VE');
  const root = path.dirname(path.dirname(__dirname));
  const templatePath = path.join(root, 'templates', template);
  const html = fs.readFileSync(templatePath, 'UTF-8');

  const report = hbs.compile(html)({
    username,
    date: today,
    data,
  });

  printPDF(report, cb, onError);
};

const printPDF = async (
  content: string,
  cb: (pdf) => void,
  onError?: (val) => void
) => {
  try{
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(content);
    await page.emulateMediaType('screen');
    const pdf = await page.pdf({
      format: 'Letter',
      background: true,
      margin: {
        top: '2cm',
        bottom: '1cm',
        left: '1cm',
        right: '1cm',
      },
    });
    await browser.close();
    // return pdf;
    cb(pdf);
  } catch(e) {
    onError?.(e.message);
  }
};

interface Details {
  totalSize: number;
  total: number;
  available: number;
  disabled: number;
  chartData?: ChartData[];
}
interface ChartData {
  name: string;
  value: number;
}
interface FileActivity {
  ino: number;
  name: string;
  username: string;
  fecha: number | string;
}
interface LogActivity {
  fecha: number | string;
  username: string;
  campo: string;
  result: string;
  performedBy: string;
  accion: string;
}
