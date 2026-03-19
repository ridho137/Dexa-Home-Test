import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  photoUrl?: string;
}
