import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SecurityConfig } from './config/security.config';
import {
  getAvatarDirectory,
  getNoticeImageDirectory,
  getUploadsDirectory,
  getUploadsPublicPath,
} from './config/upload.config';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadsDirectory = getUploadsDirectory();
  const avatarsDirectory = getAvatarDirectory();
  const noticeImagesDirectory = getNoticeImageDirectory();
  const uploadsPublicPath = getUploadsPublicPath();

  mkdirSync(avatarsDirectory, { recursive: true });
  mkdirSync(noticeImagesDirectory, { recursive: true });
  app.use(uploadsPublicPath, express.static(uploadsDirectory));

  app.use(
    rateLimit({
      windowMs: SecurityConfig.rateLimiting.ttl * 1000,
      max: SecurityConfig.rateLimiting.limit,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('MmhsOAuth API')
    .setDescription('The MmhsOAuth API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
