"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const util_1 = require("../../util/util");
const usersController_1 = require("./usersController");
// var express = require('express');
const router = express_1.default.Router();
/* GET users listing. */
router.get('/token', util_1.Authorization, usersController_1.checkUser);
router.get('/:id/files', util_1.Authorization, usersController_1.getFilesByUser);
router.get('/:id', util_1.Authorization, (req, res) => usersController_1.getUsers(req, res));
router.get('/:usuario/questions', usersController_1.getUserQuestions);
router.get('/', util_1.Authorization, (req, res) => usersController_1.getUsers(req, res));
/* POST a new user. */
router.post('/:id/questions', usersController_1.checkUserQuestions);
router.post('/login', usersController_1.login);
router.post('/', usersController_1.register);
/* PUT users changes. */
router.put('/:id', usersController_1.updateUserData);
/* DELETE users delete. */
router.delete('/:id', usersController_1.deleteUser);
// module.exports = router;
exports.default = router;
//# sourceMappingURL=usersRoute.js.map