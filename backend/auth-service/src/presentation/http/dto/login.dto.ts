import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must be at least 8 characters, include upper and lower case letters, a number, and a symbol',
  })
  password!: string;
}
