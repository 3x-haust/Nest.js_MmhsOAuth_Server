import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { OAuthConsent } from 'src/oauth/entities/oauth-consent.entity';
import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import { RedisService } from 'src/redis/redis.service';
import { PermissionHistory } from './entities/permission-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      OAuthConsent,
      OAuthClient,
      PermissionHistory,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, ResponseStrategy, RedisService],
  exports: [UserService, TypeOrmModule, RedisService],
})
export class UserModule {}
