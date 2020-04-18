'use strict';
import WebSocket from "ws";
import { Server } from "http";

export const onconnection = (ws: WebSocket) => {
   ws.send(JSON.stringify({ name: 'Gary', surname: 'Nadir' }));

   ws.on('message', (data) => onmessage(ws, data))
   ws.on('close', onclose);

   console.log('cliente connecnted ')
}

const onclose = (ws: WebSocket, code: number, reason: string) => {
   console.log('user has disconnected');
}

const onmessage = (ws: WebSocket, data: WebSocket.Data) => {
   console.log(data);
   ws.send(JSON.stringify({ message: data }));
}

