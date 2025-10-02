import { Injectable, CanActivate, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: any): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      
      // Extract token from handshake auth or query
      const token = this.extractTokenFromClient(client);
      
      if (!token) {
        this.logger.warn(`Connection attempt without token from ${client.id}`);
        throw new WsException('Authentication token required');
      }

      // Verify and decode the JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Validate that the user still exists
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        this.logger.warn(`Token valid but user ${payload.sub} no longer exists`);
        throw new WsException('User not found');
      }

      // Attach user information to the client
      client['user'] = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
      };

      this.logger.debug(`WebSocket authentication successful for user ${payload.sub}`);
      return true;
    } catch (error) {
      this.logger.error(`WebSocket authentication failed: ${error.message}`);
      
      if (error.name === 'TokenExpiredError') {
        throw new WsException('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new WsException('Invalid token');
      } else {
        throw new WsException('Authentication failed');
      }
    }
  }

  private extractTokenFromClient(client: Socket): string | null {
    // Try to get token from handshake auth
    const authToken = client.handshake?.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Try to get token from query parameters
    const queryToken = client.handshake?.query?.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Try to get token from Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
