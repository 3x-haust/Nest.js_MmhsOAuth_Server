import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordTokenDto {
  @IsNotEmpty()
  token: string;

  @MinLength(8)
  newPassword: string;
}
