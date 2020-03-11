#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from "../app";
import { cwd, setDirectory } from "../routes/files/rangerController";
import http from "http";
import debugModule from "debug";
const debug = debugModule('cloudster:server');
// const http = require('http');

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '1234');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string) {
   const localPort = parseInt(val, 10);

   if (isNaN(localPort)) {
      // named pipe
      return val;
   }

   if (localPort >= 0) {
      // localPort number
      return localPort;
   }

   return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
   if (error.syscall !== 'listen') {
      throw error;
   }

   const bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

   // handle specific listen errors with friendly messages
   switch (error.code) {
      case 'EACCES':
         // console.error(bind + ' requires elevated privileges');
         process.exit(1);
         break;
      case 'EADDRINUSE':
         // console.error(bind + ' is already in use');
         process.exit(1);
         break;
      default:
         throw error;
   }
}

// console.clear();

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
   const addr = server.address();
   const bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr?.port;
   // debug('Listening on ' + bind);
}
