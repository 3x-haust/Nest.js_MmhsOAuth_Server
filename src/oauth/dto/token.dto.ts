import { IsString, IsOptional } from 'class-validator';

export class TokenDto {
  @IsString()
  code: string;

  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;

  @IsString()
  state: string;

  @IsString()
  @IsOptional()
  redirectUri: string;

  @IsString()
  scopes: string;
}
