import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { OAuthModule } from './oauth/oauth.module';
import { OAuthClientModule } from './oauth-client/oauth-client.module';
import { NoticeModule } from './notice/notice.module';
import { AdminModule } from './admin/admin.module';
import { DeveloperDocModule } from './developer-doc/developer-doc.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 3,
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      migrations: ['dist/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          auth: {
            type: 'login',
            user: configService.get('MAIL_USERNAME'),
            pass: configService.get('MAIL_PASSWORD'),
          },
        },
      }),
    }),
    UserModule,
    AuthModule,
    OAuthModule,
    OAuthClientModule,
    NoticeModule,
    AdminModule,
    DeveloperDocModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
