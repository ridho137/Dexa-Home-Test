import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  IsString,
} from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class ListMyAttendanceQueryDto {
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
}
