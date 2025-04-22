import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from 'src/user/dto/sign-up.dto';
import { EmailService } from 'src/email/email.service';
import { LoginDto } from 'src/user/dto/login.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RequestWithUser } from 'src/oauth/oauth.controller';

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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: RequestWithUser, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    const response = await this.authService.logout(refreshToken, req.user);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'none',
      secure: process.env.NODE_ENV === 'production',
    });
    return res.status(response.status).json(response);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Query('scope') scope?: string,
  ) {
    const response = await this.authService.login(loginDto, scope);

    if (!response.data) {
      return res.status(response.status).json(response);
    }

    const { refreshToken } = response.data;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(response.status).json(response);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    const response = await this.authService.refresh(refreshToken);
    return res.status(response.status).json(response);
  }
}
