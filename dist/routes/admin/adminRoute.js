"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const util_1 = require("../../util/util");
const adminController_1 = require("./adminController");
// var express = require('express');
const router = express_1.default.Router();
/* GET users listing. */
router.get('/users', util_1.Authorization, util_1.AdminAuth, (req, res) => adminController_1.getUsers(req, res));
router.get('/users/activity', util_1.Authorization, util_1.AdminAuth, adminController_1.getLogReport);
router.get('/files', util_1.Authorization, util_1.AdminAuth, adminController_1.getFiles);
router.get('/files/details', util_1.Authorization, util_1.AdminAuth, adminController_1.getFilesDetails);
router.get('/users/details', util_1.Authorization, util_1.AdminAuth, adminController_1.getUsersDetails);
router.get('/files/report', util_1.Authorization, util_1.AdminAuth, adminController_1.generateFileReport);
router.get('/files/:accion', util_1.Authorization, util_1.AdminAuth, adminController_1.getGenericReport);
// module.exports = router;
exports.default = router;
//# sourceMappingURL=adminRoute.js.map