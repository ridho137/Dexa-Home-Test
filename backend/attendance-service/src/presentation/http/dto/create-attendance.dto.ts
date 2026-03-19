import { IsIn } from 'class-validator';

export class CreateAttendanceDto {
  @IsIn(['IN', 'OUT'])
  status!: 'IN' | 'OUT';
}
