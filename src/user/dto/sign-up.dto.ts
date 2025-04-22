import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  @Matches(/@e-mirim\.hs\.kr$/, {
    message: '학교 이메일(@e-mirim.hs.kr)만 사용 가능합니다.',
  })
  email: string;

  @MinLength(8)
  password: string;

  @IsNotEmpty()
  nickname: string;

  @IsNotEmpty()
  code: string;
}
