import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entities/user.entity';
import { SignUpDto } from 'src/user/dto/sign-up.dto';
import { EmailService } from 'src/email/email.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { LoginDto } from 'src/user/dto/login.dto';
import { OAuthConsent } from 'src/oauth/entities/oauth-consent.entity';
import { RequestPasswordResetDto } from 'src/user/dto/request-password-reset.dto';
import { FindNicknameDto } from 'src/user/dto/find-nickname.dto';
import { ResetPasswordTokenDto } from 'src/user/dto/reset-password-token.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(OAuthConsent)
    private oauthConsentRepository: Repository<OAuthConsent>,
    private emailService: EmailService,
    private jwtService: JwtService,
    private responseStrategy: ResponseStrategy,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password, nickname, code } = signUpDto;

    if (!email.endsWith('@e-mirim.hs.kr')) {
      return this.responseStrategy.badRequest(
        '미림마이스터고 학교 이메일 주소가 아닙니다.',
      );
    }

    const studentNumber = email.split('@')[0];
    const role = /^[sdw]\d{4}$/.test(studentNumber) ? 'student' : 'teacher';
    const major =
      role === 'student'
        ? studentNumber[0] === 's'
          ? 'software'
          : studentNumber[0] === 'd'
            ? 'design'
            : 'web'
        : 'software';

    const admission =
      role === 'student' ? Number('20' + studentNumber.slice(1, 3)) : undefined;
    const generation = admission ? admission - 2009 : undefined;
    const isGraduated = admission
      ? new Date().getFullYear() - admission >= 3
      : undefined;

    if (await this.userRepository.findOne({ where: { email } })) {
      return this.responseStrategy.badRequest('이메일이 이미 존재합니다.');
    }

    if (await this.userRepository.findOne({ where: { nickname } })) {
      return this.responseStrategy.badRequest('닉네임이 이미 존재합니다.');
    }

    const isValidCode = await this.emailService.verifyCode(email, code);
    if (!isValidCode)
      return this.responseStrategy.badRequest('유효하지 않은 인증 코드입니다.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nickname,
      role,
      major,
      admission,
      generation,
      isGraduated,
      isVerified: true,
    });
    return this.responseStrategy.success(
      '회원가입을 성공했습니다.',
      await this.userRepository.save(user),
    );
  }

  async login(loginDto: LoginDto, scope?: string) {
    const { nickname, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { nickname } });
    if (!user)
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return this.responseStrategy.unauthorized(
        '비밀번호가 일치하지 않습니다.',
      );

    const scopes = scope ? scope.split(',').filter(Boolean) : [];

    const tokenPayload: any = {
      id: user.id,
      scopes: 'email,nickname,major,isGraduated,admission,role,generation',
    };

    if (scopes.length > 0) {
      tokenPayload.scopes = scopes;
    }

    const accessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: '30d',
    });

    return this.responseStrategy.success('로그인을 성공했습니다.', {
      accessToken,
      refreshToken,
    });
  }

  async logout(refreshToken: string, user: User) {
    if (!user) {
      return this.responseStrategy.unauthorized('권한이 없습니다.');
    }

    if (!refreshToken) {
      return this.responseStrategy.unauthorized(
        '리프레시 토큰이 존재하지 않습니다.',
      );
    }
    return this.responseStrategy.success('로그아웃을 성공했습니다.');
  }

  async refresh(refreshToken: string) {
    try {
      if (!refreshToken) {
        return this.responseStrategy.unauthorized(
          '리프레시 토큰이 존재하지 않습니다.',
        );
      }

      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.id },
      });
      const revokedList = await this.oauthConsentRepository.find({
        where: { userId: payload.id, revokedAt: Not(IsNull()) },
      });

      if (!user) {
        return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
      }

      if (revokedList.length > 0) {
        return this.responseStrategy.unauthorized('토큰이 만료되었습니다.');
      }

      const tokenPayload: any = {
        id: user.id,
        nickname: user.nickname,
      };

      if (payload.scopes) {
        tokenPayload.scopes = payload.scopes;
      }

      if (payload.clientId) {
        tokenPayload.clientId = payload.clientId;
      }

      const newAccessToken = this.jwtService.sign(tokenPayload, {
        expiresIn: '15m',
      });

      return this.responseStrategy.success(
        '새로운 액세스 토큰 발급에 성공했습니다.',
        {
          accessToken: newAccessToken,
        },
      );
    } catch {
      return this.responseStrategy.unauthorized(
        '유효하지 않은 리프레시 토큰입니다.',
      );
    }
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
    const { email } = requestPasswordResetDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return this.responseStrategy.notFound(
        '등록된 이메일을 찾을 수 없습니다.',
      );
    }

    const result = await this.emailService.sendPasswordResetLink(email);
    return result;
  }

  async resetPasswordWithToken(resetPasswordTokenDto: ResetPasswordTokenDto) {
    const { token, newPassword } = resetPasswordTokenDto;

    const email = await this.emailService.verifyPasswordResetToken(token);

    if (!email) {
      return this.responseStrategy.badRequest(
        '유효하지 않거나 만료된 토큰입니다.',
      );
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await this.userRepository.save(user);

    await this.emailService.invalidatePasswordResetToken(token);

    return this.responseStrategy.success(
      '비밀번호가 성공적으로 재설정되었습니다.',
    );
  }

  async verifyPasswordResetToken(token: string) {
    const email = await this.emailService.verifyPasswordResetToken(token);
    if (!email) {
      return this.responseStrategy.badRequest(
        '유효하지 않거나 만료된 토큰입니다.',
      );
    }

    return this.responseStrategy.success('유효한 토큰입니다.');
  }

  async findNickname(findNicknameDto: FindNicknameDto) {
    const { email } = findNicknameDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return this.responseStrategy.notFound(
        '등록된 이메일을 찾을 수 없습니다.',
      );
    }

    const result = await this.emailService.sendNicknameRecoveryEmail(
      email,
      user.nickname,
    );
    return result;
  }
}
