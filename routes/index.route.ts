import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { existsSync } from 'fs';

// var express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/:page', (req: Request, res: Response, next: NextFunction) => {
  const dir = path.dirname(__dirname);
  const url = path.join(dir, 'pages', req.params.page);

  if (existsSync(url)) res.status(200).sendFile(url);
  else res.status(404).sendFile(path.join(dir, 'pages', 'notFound.html'));
});

// module.exports = router;
export default router;
