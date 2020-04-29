import express from "express";
import multer from "multer";
import { Authorization } from "../../util/util";
import {
   downloadFile,
   getFileInfo,
   getFilesInDirectory,
   getParent,
   postFile,
   postFolder,
   putFile,
   viewFile
} from "./rangerController";

// var express = require('express');
const ranger = express.Router();
const upload = multer({ dest: "temp/" });

/* GET files listing. */
ranger.get('/', Authorization, getFilesInDirectory);
// ranger.get('/test', test);
ranger.get('/:ino', Authorization, getFileInfo);
ranger.get('/:ino/watch', Authorization, viewFile);
ranger.get('/:ino/download', Authorization, downloadFile);
ranger.get('/:ino/files', Authorization, getFilesInDirectory);
ranger.get('/:ino/peers', Authorization, getFilesInDirectory);
ranger.get('/:ino/parent', Authorization, getParent);

/* POST a file */
ranger.post('/:ino', Authorization, upload.single('file'), postFile);
ranger.post('/:ino/folder', Authorization, postFolder);

/* PUT a file */
ranger.put('/:ino', Authorization, putFile);

// ranger.get('/:id', Authorization, getUsers);
// ranger.get('/:usuario/questions', getUserQuestions);
// ranger.get('/', Authorization, getUsers);


export default ranger;