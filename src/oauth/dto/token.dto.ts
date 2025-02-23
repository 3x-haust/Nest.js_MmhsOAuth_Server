import { IsString } from 'class-validator';

export class TokenDto {
  @IsString()
  code: string;

  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;

  @IsString()
  state: string;
}
