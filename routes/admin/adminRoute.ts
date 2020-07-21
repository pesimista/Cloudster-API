import express from 'express';
import { Authorization, AdminAuth } from '../../util/util';
import {
  getFiles,
  getUsers,
  getFilesDetails,
  generateFileReport,
  getUsersDetails,
  getGenericReport,
  getLogReport,
} from './adminController';

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/users', Authorization, AdminAuth, (req, res) =>
  getUsers(req, res)
);
router.get('/users/activity', Authorization, AdminAuth, getLogReport);
router.get('/files', Authorization, AdminAuth, getFiles);
router.get('/files/details', Authorization, AdminAuth, getFilesDetails);
router.get('/users/details', Authorization, AdminAuth, getUsersDetails);
router.get('/files/report', Authorization, AdminAuth, generateFileReport);
router.get('/files/:accion', Authorization, AdminAuth, getGenericReport);
// module.exports = router;
export default router;
