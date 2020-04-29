import express from "express";
import { Authorization, AdminAuth } from "../../util/util";
import {
   checkUser,
   checkUserQuestions,
   deleteUser,
   getUserQuestions,
   login,
   register,
   updateUserData,
   getFiles
} from "./adminController";
import { getUsers } from "../users/usersController";

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/users', Authorization, AdminAuth, (req,res) => getUsers(req, res));
router.get('/files',  Authorization, AdminAuth, getFiles);
router.get('/:usuario/questions',  Authorization, AdminAuth, getUserQuestions);
router.get('/',  Authorization, AdminAuth, (req,res) => getUsers(req, res));

/* POST a new user. */
router.post('/:id/questions', checkUserQuestions);
router.post('/login', login);
router.post('/', register);

/* PUT users changes. */
router.put('/:id', updateUserData);

/* DELETE users delete. */
router.delete('/:id', deleteUser);

// module.exports = router;
export default router;