import express from "express";
import {
   login
   , getUsers
   , register
   , updateUserData
   , getUserQuestions
   , deleteUser
   , checkUserQuestions
} from "./usersController";
import { Authorization } from "../../util/util";

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/:id', Authorization, getUsers);
router.get('/:usuario/questions', getUserQuestions);
router.get('/', Authorization, getUsers);

/* POST users listing. */
router.post('/:id/questions', checkUserQuestions);
router.post('/login', login);
router.post('/', register);

/* PUT users changes. */
router.put('/:id', updateUserData);

/* DELETE users delete. */
router.delete('/:id', deleteUser);

// module.exports = router;
export default router;