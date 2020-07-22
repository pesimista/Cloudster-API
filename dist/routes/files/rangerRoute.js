"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const util_1 = require("../../util/util");
const rangerController_1 = require("./rangerController");
// var express = require('express');
const ranger = express_1.default.Router();
const upload = multer_1.default({ dest: 'temp/' });
/* GET files listing. */
ranger.get('/', util_1.Authorization, rangerController_1.getFilesInDirectory);
ranger.get('/:ino', util_1.Authorization, rangerController_1.getFileInfo);
ranger.get('/:ino/watch', util_1.Authorization, rangerController_1.viewFile);
ranger.get('/:ino/download', util_1.Authorization, rangerController_1.downloadFile);
ranger.get('/:ino/files', util_1.Authorization, rangerController_1.getFilesInDirectory);
ranger.get('/:ino/peers', util_1.Authorization, rangerController_1.getFilesInDirectory);
ranger.get('/:ino/parent', util_1.Authorization, rangerController_1.getParent);
/* POST a file */
ranger.post('/:ino', util_1.Authorization, upload.single('file'), rangerController_1.postFile);
ranger.post('/:ino/folder', util_1.Authorization, rangerController_1.postFolder);
/* PUT a file */
ranger.put('/:ino', util_1.Authorization, rangerController_1.putFile);
ranger.put('/:folder/:ino', util_1.Authorization, rangerController_1.moveFile);
/** DELETE a file */
ranger.delete('/:ino', util_1.Authorization, rangerController_1.removeFile);
exports.default = ranger;
//# sourceMappingURL=rangerRoute.js.map