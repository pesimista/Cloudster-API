"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const usersController_1 = require("./usersController");
const util_1 = require("../../util/util");
// var express = require('express');
const router = express_1.default.Router();
/* GET users listing. */
router.get('/:id', util_1.Authorization, usersController_1.getUsers);
router.get('/:usuario/questions', usersController_1.getUserQuestions);
router.get('/', util_1.Authorization, usersController_1.getUsers);
/* POST users listing. */
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