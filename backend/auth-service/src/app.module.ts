import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth.module';
import { AppLogger } from './infrastructure/logger/app-logger.service';
import { SessionCleanupService } from './sessions/session-cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule],
  providers: [AppLogger, SessionCleanupService],
  exports: [AppLogger],
})
export class AppModule {}
