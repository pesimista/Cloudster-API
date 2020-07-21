import compression from 'compression';
import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import logger from 'morgan';
import { setDirectory } from './routes/files/rangerController';
import filesRouter from './routes/files/rangerRoute';
import adminRouter from './routes/admin/adminRoute';
import indexRouter from './routes/index.route';
import { getQuestions } from './routes/users/usersController';
import usersRouter from './routes/users/usersRoute';
import path from 'path';

/* Instantiate app */
const app: Application = express();

/* Compresses all routes */
app.use(compression());

/* Sets appropriate HTTP headers in order to help protect the app from well-known web vulnerabilities  */
app.use(helmet());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.clear();
// app.use(express.static(path.join(__dirname, 'public')));

/**
 * Cross Origin Requests Service
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');

  // console.log(`\n${getColor(req.method)}\t\x1b[36m'${req.originalUrl}'\x1b[0m\t `)

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
app.use('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('AYUDAMEDIOS');
});
app.use('/*', (req, res) => {
  res.status(404).send();
});

// // catch 404 and forward to error handler
// app.use((req: Request, res: Response, next: NextFunction) => {
//    next(createError(404));
// });

/**
 * error handler
 */
// app.use((err: any, req: Request, res: Response, next: NextFunction) => {
//    // set locals, only providing error in development
//    res.locals.message = err.message;
//    res.locals.error = req.app.get('env') === 'development' ? err : {};

//    // render the error page
//    res.status(err.status || 500);
//    res.render('error');
// });

// module.exports = app;

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

setDirectory(__dirname);
export default app;
