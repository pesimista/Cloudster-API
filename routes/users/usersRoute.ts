import express from "express";
import {
   login
   , getUsers
   , register
   , updateUserData
   , getUserQuestions
   , deleteUser
   , checkUserQuestions
   , checkUser
} from "./usersController";
import { Authorization } from "../../util/util";

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/token', Authorization, checkUser);
router.get('/:id', Authorization, getUsers);
router.get('/:usuario/questions', getUserQuestions);
router.get('/', Authorization, getUsers);

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