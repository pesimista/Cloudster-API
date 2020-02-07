"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// var express = require('express');
const router = express_1.default.Router();
/* GET home page. */
router.get('/', (req, res, next) => {
    res.send("This is a message from the back end!");
});
router.get('/users', (req, res, next) => {
    res.send([
        {
            Name: "Denu",
            Contact: 12345678
        },
        {
            Name: "Avicci",
            Contact: 147258369
        },
        {
            Name: "Zedd",
            Contact: 748159263
        },
        {
            Name: "Denu",
            Contact: 362951847
        }
    ]);
});
// module.exports = router;
exports.default = router;
//# sourceMappingURL=index.route.js.map