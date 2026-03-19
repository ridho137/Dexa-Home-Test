import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  JwtService,
  TokenExpiredError,
  JsonWebTokenError,
} from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';

import { env } from '../../config/env';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

export type AdminNotificationPayload = {
  type: 'EMPLOYEE_UPDATED' | 'EMPLOYEE_PASSWORD_CHANGED';
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  /** Set by notification-service or FE; publisher sends occurredAtIso */
  createdAtIso?: string;
  /** Sent by employee-service (RabbitMQ payload) */
  occurredAtIso?: string;
  meta?: Record<string, unknown>;
};

@WebSocketGateway({
  namespace: '/admin',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class AdminNotificationGateway
  implements OnGatewayInit, OnGatewayConnection
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly logger: AppLogger,
  ) {}

  afterInit(server?: Server) {
    // no-op for now; reserved for future subscriptions
    void server;
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = this.extractToken(client);
    const tokenSource = this.getTokenSource(client);

    this.logger.debug('AdminNotificationGateway: handshake', {
      socketId: client.id,
      namespace: client.nsp.name,
      hasToken: !!token,
      tokenSource: tokenSource ?? null,
      queryKeys: Object.keys(client.handshake.query || {}),
      authKeys: Object.keys(client.handshake.auth || {}),
    });

    try {
      if (!token) {
        this.logger.warn('AdminNotificationGateway: handshake rejected', {
          socketId: client.id,
          reason: 'MISSING_TOKEN',
        });
        throw new UnauthorizedException('MISSING_TOKEN');
      }

      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        {
          secret: env.jwt.secret,
          ignoreExpiration: false,
        },
      );

      const role = payload.role;
      if (role !== 'ADMIN_HR') {
        console.warn('AdminNotificationGateway: handshake rejected', {
          socketId: client.id,
          reason: 'FORBIDDEN',
          role: role ?? null,
        });
        throw new UnauthorizedException('FORBIDDEN');
      }

      client.data.user = {
        userId: payload.sub,
        sessionId: payload.sid,
        email: payload.email,
        role: payload.role,
      };

      client.join('admin');

      this.logger.debug('AdminNotificationGateway: handshake ok', {
        socketId: client.id,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    } catch (err) {
      const reason = this.normalizeRejectReason(err);
      this.logger.warn('AdminNotificationGateway: handshake failed', {
        socketId: client.id,
        reason,
      });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('admin:ping')
  handleAdminPing(@ConnectedSocket() client: Socket) {
    // If authenticated, echo back.
    if (client.data?.user) return { ok: true };
    client.disconnect(true);
    return { ok: false };
  }

  // This method is called by the (future) RabbitMQ consumer.
  broadcastToAdmins(payload: AdminNotificationPayload) {
    this.server.to('admin').emit('admin:notification', payload);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim() !== '') {
      return authToken;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim() !== '') {
      return queryToken;
    }

    const headerAuth = client.handshake.headers?.authorization;
    if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
      return headerAuth.slice('Bearer '.length);
    }

    return null;
  }

  private normalizeRejectReason(err: unknown): string {
    if (err instanceof UnauthorizedException) {
      return (
        (err.getResponse() as { message?: string })?.message ?? 'UNAUTHORIZED'
      );
    }
    if (err instanceof TokenExpiredError) {
      return 'JWT_EXPIRED';
    }
    if (err instanceof JsonWebTokenError) {
      return 'JWT_INVALID';
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'UNKNOWN';
  }

  private getTokenSource(
    client: Socket,
  ): 'auth' | 'query' | 'authorization' | null {
    if (
      typeof client.handshake.auth?.token === 'string' &&
      client.handshake.auth.token.trim() !== ''
    ) {
      return 'auth';
    }
    if (
      typeof client.handshake.query?.token === 'string' &&
      (client.handshake.query.token as string).trim() !== ''
    ) {
      return 'query';
    }
    const h = client.handshake.headers?.authorization;
    if (typeof h === 'string' && h.startsWith('Bearer ')) {
      return 'authorization';
    }
    return null;
  }
}

