import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@e-mirim\.hs\.kr$/, {
    message: '미림마이스터고 이메일 형식이어야 합니다.',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  nickname?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @Length(8, 16)
  @Matches(/^.{8,}$/, {
    message: '비밀번호는 최소 8자리 이상이어야 합니다.',
  })
  newPassword?: string;
}
