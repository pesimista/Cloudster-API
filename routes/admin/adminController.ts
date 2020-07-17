import { Response, Request } from 'express';
import { connSync } from '../../util/util';
import { parseSize } from '../files/rangerController';
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
  console.log(id, suma, name, table)
  console.clear();
  const query = `SELECT
    ${suma} as totalSize,
    count(${id}) as total,
    SUM(${available}) as available,
    SUM(1 - ${available}) as disabled
  FROM
    ${table}`;
  
  console.log(query);
  const [res] = connSync.run(query) as unknown as Details[];

  const chartData = connSync.run(
    `SELECT
      ${name} as name,
      count(${id}) as value
    FROM
      ${table}
    GROUP BY 
      ${name} COLLATE NOCASE`,
  ) as unknown as ChartData[];

  return {
    ...res,
    chartData,
  };
}

export const getUsersDetails = (req: Request, res: Response): void => {
  const details = getDetails(
    'id',
    '0',
    'nivel',
    'usuarios',
    'active'
  );

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
    details.chartData = details.chartData.map(({name, value}) => ({
      value,
      name: name || 'carpeta'
    }));
  }

  res.status(200).json({
    ...details,
    actions: 0,
    parsedSize
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
