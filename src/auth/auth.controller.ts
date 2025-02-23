import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from 'src/user/dto/sign-up.dto';
import { EmailService } from 'src/email/email.service';
import { LoginDto } from 'src/user/dto/login.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  @Post('send-code')
  async sendCode(@Body('email') email: string, @Res() res: Response) {
    const response = await this.emailService.sendVerificationCode(email);
    return res.status(response.status).json(response);
  }

  @Post('signup')
  async signUp(@Body() signUpDto: SignUpDto, @Res() res: Response) {
    const response = await this.authService.signUp(signUpDto);
    return res.status(response.status).json(response);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const response = await this.authService.login(loginDto);
    const { refreshToken } = response.data;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(response.status).json(response);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: '리프레시 토큰이 존재하지 않습니다' });
    }

    const response = await this.authService.refresh(refreshToken);
    return res.status(response.status).json(response);
  }
}
