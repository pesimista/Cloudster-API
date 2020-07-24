import path from 'path';
export const distParent = path.dirname(__dirname);
// export const distParent = __dirname;

import compression from 'compression';
import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import logger from 'morgan';
import { setDirectory, viewFile } from './routes/files/rangerController';
import filesRouter from './routes/files/rangerRoute';
import adminRouter from './routes/admin/adminRoute';
import indexRouter from './routes/index.route';
import { getQuestions } from './routes/users/usersController';
import usersRouter from './routes/users/usersRoute';
import { Authorization } from './util/util';

/* Instantiate app */
const app: Application = express();

/* Compresses all routes */
app.use(compression());

/* Sets appropriate HTTP headers in order to help protect the app from well-known web vulnerabilities  */
app.use(helmet());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// app.use(express.static(path.join(__dirname, 'public')));

/**
 * Cross Origin Requests Service
 */
app.use((req: Request, res: Response, next: NextFunction) => {
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
app.use('/api/users', usersRouter);
app.get('/api/questions', getQuestions);
/* Archivos */
app.use('/api/files', filesRouter);
app.use('/api/admin', adminRouter);
app.use('/api', indexRouter);

app.get('/api/watch/:ino', Authorization, viewFile);


const react = express.Router();

react.use(express.static(distParent));
react.use(express.static(path.join(distParent, 'build')));
react.get('*', (req, res) => {
  res.sendFile(path.join(distParent, 'build', 'index.html'));
});
app.use('/app', react)
app.get(['/:route', '/'], (req: Request, res: Response) => {
  res.redirect('/app');
  return;
});


/**
 * @Description Get the corresponding color for every route depending on the method
 * @param method Method
 */
const getColor = (method: string) => {
  method = method.toLowerCase();
  const color =
    method === 'get'
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

setDirectory(path.join(distParent, 'temp'));
export default app;
