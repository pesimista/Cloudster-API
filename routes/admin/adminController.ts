import { IFile } from './../../models/files';
import { Response, Request } from 'express';
import { connSync, getTokenKey } from '../../util/util';
import { parseSize } from '../files/rangerController';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import hbs, { template } from 'handlebars';
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
  const query = `SELECT
    ${suma} as totalSize,
    count(${id}) as total,
    SUM(${available}) as available,
    SUM(1 - ${available}) as disabled
  FROM
    ${table}`;

  const [res] = (connSync.run(query) as unknown) as Details[];

  const chartData = (connSync.run(
    `SELECT
      ${name} as name,
      count(${id}) as value
    FROM
      ${table}
    GROUP BY 
      ${name} COLLATE NOCASE`
  ) as unknown) as ChartData[];

  return {
    ...res,
    chartData,
  };
};

export const getUsersDetails = (req: Request, res: Response): void => {
  const details = getDetails('id', '0', 'nivel', 'usuarios', 'active');

  res.status(200).json({
    ...details,
    actions: 0,
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

  const parsedSize: string = parseSize(details.totalSize);
  if (details.chartData) {
    details.chartData = details.chartData.map(({ name, value }) => ({
      value,
      name: name || 'carpeta',
    }));
  }

  res.status(200).json({
    ...details,
    actions: 0,
    parsedSize,
  });
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

export const generateFileReport = (req: Request, res: Response) => {
  const { username = 'Yo' } = getTokenKey(req.headers.authorization);

  const query = `SELECT
    \`ino\`,
    \`name\`,
    IFNULL(B.\`usuario\`, A.\`usuario\`) as username,
    \`birthtime\`,
    \`lastModified\`,
    \`C\`.\`usuario\` as username_mo,
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
    res.status(500).json({ ...result.error });
    return;
  }

  const today = new Date().toLocaleString('es-VE');
  const mappedFiles = result.map((file: IFile) => ({
    ...file,
    birthtime: new Date(file.birthtime).toLocaleString('es-VE'),
    lastModified: file.lastModified
      ? new Date(file.lastModified as Date).toLocaleString('es-VE')
      : '-',
  }));

  const templatePath = path.join(__dirname, 'template', 'template.hbs');
  const html = fs.readFileSync(templatePath, 'UTF-8');

  const report = hbs.compile(html)({
    username,
    date: today,
    files: [...mappedFiles, ...mappedFiles],
  });

  printPDF(report, (pdf) => {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  });
};

const printPDF = async (content: string, cb: Function) => {
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
};
