import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/;

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, {
    message:
      'password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, 1 symbol',
  })
  password!: string;

  @IsString()
  @MaxLength(100)
  position!: string;

  @IsOptional()
  @IsString()
  @IsIn(['EMPLOYEE', 'ADMIN_HR'])
  role?: 'EMPLOYEE' | 'ADMIN_HR';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phoneNumber?: string;
}
