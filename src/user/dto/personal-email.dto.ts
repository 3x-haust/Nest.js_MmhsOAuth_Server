import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

const personalEmailMessage =
  '개인 이메일은 학교 이메일(@e-mirim.hs.kr)이 아닌 주소를 사용해주세요.';

export class RequestPersonalEmailCodeDto {
  @IsEmail()
  @Matches(/^(?!.*@e-mirim\.hs\.kr$).+$/i, {
    message: personalEmailMessage,
  })
  personalEmail: string;
}

export class VerifyPersonalEmailDto extends RequestPersonalEmailCodeDto {
  @IsNotEmpty()
  code: string;
}
