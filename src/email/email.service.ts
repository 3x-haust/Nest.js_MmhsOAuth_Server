import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  constructor(
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
    private readonly responseStrategy: ResponseStrategy,
  ) {}

  private async renderTemplate(
    templateName: string,
    data: Record<string, string>,
  ): Promise<string> {
    const templatePath = path.join(
      process.cwd(),
      'src/template/email',
      `${templateName}.html`,
    );

    let templateContent = fs.readFileSync(templatePath, 'utf8');

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      templateContent = templateContent.replace(regex, value);
    });

    return templateContent;
  }

  async sendVerificationCode(email: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(`verify:${email}`, code, 300);

    const html = await this.renderTemplate('verification-code', { code });

    await this.mailerService.sendMail({
      from: process.env.MAIL_USERNAME,
      to: email,
      subject: '미림마이스터고 OAuth 이메일 인증 코드',
      html,
      text: `인증 코드: ${code}\n이 인증 코드는 5분 후에 만료됩니다.`,
    });

    return this.responseStrategy.success('인증 코드 전송을 완료했습니다.');
  }

  async sendPasswordResetLink(email: string) {
    const token = crypto.randomBytes(32).toString('hex');

    await this.redisService.set(`password-reset-token:${token}`, email, 86400);

    const resetLink = `${process.env.FRONTEND_URL || 'https://localhost:5173'}/reset-password/${token}`;

    const html = await this.renderTemplate('password-reset-link', {
      resetLink,
    });

    await this.mailerService.sendMail({
      from: process.env.MAIL_USERNAME,
      to: email,
      subject: '미림마이스터고 OAuth 비밀번호 재설정',
      html,
      text: `비밀번호 재설정 링크: ${resetLink}\n\n이 링크는 24시간 동안 유효합니다.`,
    });

    return this.responseStrategy.success(
      '비밀번호 재설정 링크를 이메일로 전송했습니다.',
    );
  }

  async verifyPasswordResetToken(token: string): Promise<string | null> {
    return this.redisService.get(`password-reset-token:${token}`);
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    await this.redisService.del(`password-reset-token:${token}`);
  }

  async sendNicknameRecoveryEmail(email: string, nickname: string) {
    const html = await this.renderTemplate('nickname-recovery', { nickname });

    await this.mailerService.sendMail({
      from: process.env.MAIL_USERNAME,
      to: email,
      subject: '미림마이스터고 OAuth 닉네임 정보',
      html,
      text: `회원님의 닉네임은 ${nickname} 입니다.`,
    });

    return this.responseStrategy.success(
      '닉네임 정보를 이메일로 전송했습니다.',
    );
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const storedCode = await this.redisService.get(`verify:${email}`);
    return storedCode === code;
  }
}
