import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  oldPassword!: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)/, {
    message:
      'password must contain at least 1 uppercase, 1 lowercase, 1 number and 1 symbol',
  })
  newPassword!: string;
}
