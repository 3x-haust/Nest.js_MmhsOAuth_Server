import { IsEmail } from 'class-validator';

export class FindNicknameDto {
  @IsEmail()
  email: string;
}
