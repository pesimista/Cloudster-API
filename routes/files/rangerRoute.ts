import express, { Request, Response, NextFunction } from "express";
import { Authorization } from "../../util/util";
import { getFilesInDirectory, getFileInfo } from "./rangerController";

// var express = require('express');
const ranger = express.Router();

/* GET users listing. */
ranger.get('/', Authorization, getFilesInDirectory);
ranger.get('/:ino', Authorization, getFileInfo);
ranger.get('/:ino/files', Authorization, getFilesInDirectory);

// ranger.get('/:id', Authorization, getUsers);
// ranger.get('/:usuario/questions', getUserQuestions);
// ranger.get('/', Authorization, getUsers);


export default ranger;