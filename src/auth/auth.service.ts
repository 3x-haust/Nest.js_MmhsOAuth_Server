import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entities/user.entity';
import { SignUpDto } from 'src/user/dto/sign-up.dto';
import { EmailService } from 'src/email/email.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { LoginDto } from 'src/user/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
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

    const admission = Number('20' + studentNumber.slice(1, 3));
    const generation = admission - 2009;
    const isGraduated = new Date().getFullYear() - admission >= 3;

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

  async login(loginDto: LoginDto) {
    const { nickname, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { nickname } });
    if (!user)
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return this.responseStrategy.unauthorized(
        '비밀번호가 일치하지 않습니다.',
      );

    const accessToken = this.jwtService.sign(
      { id: user.id, nickname: user.nickname },
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { id: user.id, nickname: user.nickname },
      { expiresIn: '7d' },
    );

    return this.responseStrategy.success('로그인을 성공했습니다.', {
      accessToken,
      refreshToken,
    });
  }

  async logout(refreshToken: string) {
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
      if (!user) {
        return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
      }
      const newAccessToken = this.jwtService.sign(
        { id: user.id, nickname: user.nickname },
        { expiresIn: '15m' },
      );
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
}
