import express from 'express';
import { Authorization } from '../../util/util';
import {
  checkUser,
  checkUserQuestions,
  deleteUser,
  getUserQuestions,
  getUsers,
  login,
  register,
  updateUserData,
  getFilesByUser,
} from './usersController';

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/token', Authorization, checkUser);
router.get('/:id/files', Authorization, getFilesByUser);
router.get('/:id', Authorization, (req, res) => getUsers(req, res));
router.get('/:usuario/questions', getUserQuestions);
router.get('/', Authorization, (req, res) => getUsers(req, res));

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
