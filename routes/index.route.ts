import express, { Request, Response, NextFunction } from "express";

// var express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
   res.send("This is a message from the back end!")
});

router.get('/users', (req: Request, res: Response, next: NextFunction) => {
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
   ])
});

// module.exports = router;
export default router;
