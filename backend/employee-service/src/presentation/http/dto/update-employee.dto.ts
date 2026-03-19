import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phoneNumber?: string;
}
