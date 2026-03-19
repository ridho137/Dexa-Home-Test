import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AttendanceRepository } from '../domain/repositories/attendance.repository';
import { AppLogger } from '../infrastructure/logger/app-logger.service';

@Injectable()
export class AttendanceAutoClockoutScheduler {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly logger: AppLogger,
  ) {}

  // Run every day at 00:00 server time.
  // This closes previous-day attendance that still ends with IN.
  @Cron('0 0 * * *')
  async autoClockOutPreviousDayOpenSessions() {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    try {
      const affected = await this.attendanceRepository.autoClockOutMissingForDate(
        targetDate,
      );
      this.logger.debug(
        `AttendanceAutoClockoutScheduler: auto clock-out created ${affected} rows for ${targetDate.toISOString().slice(0, 10)}`,
      );
    } catch (err) {
      this.logger.error(
        'AttendanceAutoClockoutScheduler: auto clock-out failed',
        err,
      );
    }
  }
}
