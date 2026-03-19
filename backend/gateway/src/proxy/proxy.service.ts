import { Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { resolveService } from '../config/service-map';
import { AppLogger } from '../infrastructure/logger/app-logger.service';

@Injectable()
export class ProxyService {
  constructor(private readonly logger: AppLogger) {}

  async forward(
    req: Request,
    extraHeaders: Record<string, string> = {},
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: any;
  }> {
    const target = resolveService(req.path);
    if (!target) {
      this.logger.warn('ProxyService: no target for path', { path: req.path });
      throw new NotFoundException('ROUTE_NOT_MAPPED');
    }

    const queryString = req.originalUrl?.includes('?')
      ? '?' + req.originalUrl.slice(req.originalUrl.indexOf('?') + 1)
      : '';
    const url = `${target.baseUrl}${target.targetPath}${queryString}`;

    this.logger.debug('ProxyService: forwarding request', {
      method: req.method,
      url,
    });

    const headers: Record<string, string> = {};
    // Copy incoming headers (string-only), but drop content-length so it
    // can be recalculated for the new body size.
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value !== 'string') continue;
      const lower = key.toLowerCase();
      if (lower === 'content-length') continue;
      headers[lower] = value;
    }

    // Merge extra headers (for example, user credentials from gateway)
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key.toLowerCase()] = value;
    }

    // Prepare body (only for non-GET/HEAD)
    let body: string | Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const contentTypeHeader = req.headers['content-type'];
      const contentType =
        typeof contentTypeHeader === 'string' ? contentTypeHeader : '';

      if (contentType.startsWith('multipart/form-data')) {
        // For multipart, stream raw body so form-data (including boundary)
        // is preserved end-to-end.
        body = await this.readRawBody(req);
      } else if (req.is('application/json') && typeof req.body === 'object') {
        body = JSON.stringify(req.body);
        headers['content-type'] = 'application/json';
      } else if (typeof req.body === 'string') {
        body = req.body;
      }
    }

    const res = await fetch(url, {
      method: req.method,
      headers,
      body: body as any,
    });

    const resText = await res.text();
    const contentType = res.headers.get('content-type') ?? '';

    let parsedBody: any = resText;
    if (contentType.includes('application/json')) {
      try {
        parsedBody = JSON.parse(resText);
      } catch {
        // Keep as plain text if JSON parsing fails
      }
    }

    const outHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });

    return {
      status: res.status,
      headers: outHeaders,
      body: parsedBody,
    };
  }

  private readRawBody(req: Request): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: any) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      req.on('error', (err) => {
        this.logger.error('ProxyService: error reading request body', { err });
        reject(err);
      });
    });
  }
}
