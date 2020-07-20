import express from 'express';
import { Authorization, AdminAuth } from '../../util/util';
import {
  getFiles,
  getUsers,
  getFilesDetails,
  generateFileReport,
  getUsersDetails,
} from './adminController';

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/users', Authorization, AdminAuth, (req, res) =>
  getUsers(req, res)
);
router.get('/files', Authorization, AdminAuth, getFiles);
router.get('/files/details', Authorization, AdminAuth, getFilesDetails);
router.get('/users/details', Authorization, AdminAuth, getUsersDetails);
router.get('/', generateFileReport);
// module.exports = router;
export default router;
