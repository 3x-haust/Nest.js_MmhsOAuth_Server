import { IsEmail, Matches } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  @Matches(/@e-mirim\.hs\.kr$/, {
    message: '학교 이메일(@e-mirim.hs.kr)만 사용 가능합니다.',
  })
  email: string;
}
