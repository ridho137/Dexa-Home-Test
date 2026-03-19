import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class ListEmployeesQueryDto {
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
  @Transform(({ value }) =>
    value === '' || (typeof value === 'string' && !value.trim())
      ? undefined
      : value,
  )
  @IsString()
  @IsIn(['EMPLOYEE', 'ADMIN_HR'])
  role?: 'EMPLOYEE' | 'ADMIN_HR';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export function toListFilters(dto: ListEmployeesQueryDto): {
  page: number;
  limit: number;
  role?: 'EMPLOYEE' | 'ADMIN_HR' | null;
  search?: string | null;
} {
  const page = dto.page ?? DEFAULT_PAGE;
  const limit = dto.limit ?? DEFAULT_LIMIT;
  const role =
    dto.role && typeof dto.role === 'string' && dto.role.trim()
      ? (dto.role.trim() as 'EMPLOYEE' | 'ADMIN_HR')
      : null;
  return {
    page: page < 1 ? 1 : page,
    limit: limit < 1 ? DEFAULT_LIMIT : limit > MAX_LIMIT ? MAX_LIMIT : limit,
    role,
    search: dto.search?.trim() || null,
  };
}
