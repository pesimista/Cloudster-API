import express from "express";
import { Authorization } from "../../util/util";
import { checkUser, checkUserQuestions, deleteUser, getUserQuestions, getUsers, login, register, updateUserData } from "./usersController";

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