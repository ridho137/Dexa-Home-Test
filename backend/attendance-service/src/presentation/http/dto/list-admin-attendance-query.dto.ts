import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  Matches,
} from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class ListAdminAttendanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'INVALID_DATE_FORMAT',
  })
  startDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'INVALID_DATE_FORMAT',
  })
  endDate?: string;

  // Optional: admin can filter by a specific employee id
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  employeeId?: string;
}
