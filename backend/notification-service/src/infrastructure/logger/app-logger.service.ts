import { Injectable, LoggerService } from '@nestjs/common';
import { env } from '../../config/env';

type LogLevel = 'DEBUG' | 'WARN' | 'ERROR';

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  WARN: 1,
  ERROR: 2,
};

@Injectable()
export class AppLogger implements LoggerService {
  private readonly level: LogLevel = env.logLevel;

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.level];
  }

  private format(level: LogLevel, message: string, optionalParams: unknown[]) {
    const ts = new Date().toLocaleString('sv-SE', { hour12: false });
    const logObject: Record<string, unknown> = {
      timestamp: ts,
      level,
      message,
    };

    if (optionalParams && optionalParams.length > 0) {
      logObject.meta =
        optionalParams.length === 1 ? optionalParams[0] : optionalParams;
    }

    return JSON.stringify(logObject);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    if (!this.shouldLog('DEBUG')) return;
    console.debug(this.format('DEBUG', message, optionalParams));
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    if (!this.shouldLog('WARN')) return;
    console.warn(this.format('WARN', message, optionalParams));
  }

  error(message: string, ...optionalParams: unknown[]): void {
    if (!this.shouldLog('ERROR')) return;
    console.error(this.format('ERROR', message, optionalParams));
  }

  log(message: string, ...optionalParams: unknown[]): void {
    this.debug(message, ...optionalParams);
  }
}
