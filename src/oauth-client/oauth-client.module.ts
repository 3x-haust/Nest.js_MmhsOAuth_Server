import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthClient } from './entities/oauth-client.entity';
import { OAuthClientService } from './oauth-client.service';
import { OAuthClientController } from './oauth-client.controller';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([OAuthClient])],
  controllers: [OAuthClientController],
  providers: [OAuthClientService, ResponseStrategy],
})
export class OAuthClientModule {}
