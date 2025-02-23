import { IsArray, IsString } from 'class-validator';
import { AllowedUserType } from '../entities/oauth-client.entity';

export class OAuthClientDto {
  @IsString()
  serviceName: string;

  @IsString()
  serviceDomain: string;

  @IsString()
  allowedUserType: AllowedUserType;

  @IsArray()
  redirectUris: string[];

  @IsString()
  scope: string;
}
