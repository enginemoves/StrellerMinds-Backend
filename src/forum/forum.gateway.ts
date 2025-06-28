/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class ForumGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('newReply')
  handleNewReply(@MessageBody() data: any) {
    this.server.emit(`thread_${data.threadId}_updates`, data);
  }
}
