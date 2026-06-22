import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  nickname: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
