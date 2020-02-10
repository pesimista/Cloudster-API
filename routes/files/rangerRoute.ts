import express, { Request, Response, NextFunction } from "express";
import { Authorization } from "../../util/util";
import { getFilesInDirectory, getFileInfo, test, postFile, putFile } from "./rangerController";
import multer from "multer";

// var express = require('express');
const ranger = express.Router();
const upload = multer({ dest: "temp/" });

/* GET files listing. */
ranger.get('/', Authorization, getFilesInDirectory);
ranger.get('/test', Authorization, test);
ranger.get('/:ino', Authorization, getFileInfo);
ranger.get('/:ino/files', Authorization, getFilesInDirectory);

/* POST a file */
ranger.post('/:ino', upload.single('file'), postFile);

/* PUT a file */
ranger.put('/:ino', putFile);

// ranger.get('/:id', Authorization, getUsers);
// ranger.get('/:usuario/questions', getUserQuestions);
// ranger.get('/', Authorization, getUsers);


export default ranger;