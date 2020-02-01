import express, { Request, Response, NextFunction } from "express";

// var express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
   res.send('respond with a resource');
});

// module.exports = router;
export default router;