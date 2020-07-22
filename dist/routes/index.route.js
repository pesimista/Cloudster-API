"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
// var express = require('express');
const router = express_1.default.Router();
/* GET home page. */
router.get('/:page', (req, res, next) => {
    const dir = path_1.default.dirname(__dirname);
    const url = path_1.default.join(dir, 'pages', req.params.page);
    if (fs_1.existsSync(url))
        res.status(200).sendFile(url);
    else
        res.status(404).sendFile(path_1.default.join(dir, 'pages', 'notFound.html'));
});
// module.exports = router;
exports.default = router;
//# sourceMappingURL=index.route.js.map