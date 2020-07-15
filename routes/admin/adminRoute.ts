import express from 'express';
import { Authorization, AdminAuth } from '../../util/util';
import { getFiles, getUsers } from './adminController';

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/users', Authorization, AdminAuth, (req, res) =>
  getUsers(req, res)
);
router.get('/files', Authorization, AdminAuth, getFiles);

// module.exports = router;
export default router;
