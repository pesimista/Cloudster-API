import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { _ } from "../util/util";
import { existsSync } from "fs";

// var express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/:page', (req: Request, res: Response, next: NextFunction) => {
   const dir = path.dirname(__dirname) ;
   const url = `${dir}${_}pages${_}${req.params.page}`;

   if(existsSync(url))
      res.status(200).sendFile(url);

   else
      res.status(404).sendFile(`${dir}${_}pages${_}notFound.html`);


});

router.get

// module.exports = router;
export default router;
