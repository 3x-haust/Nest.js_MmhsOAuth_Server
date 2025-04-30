import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  Query,
  Get,
  Param,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from 'src/user/dto/sign-up.dto';
import { EmailService } from 'src/email/email.service';
import { LoginDto } from 'src/user/dto/login.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RequestWithUser } from 'src/oauth/oauth.controller';
import { RequestPasswordResetDto } from 'src/user/dto/request-password-reset.dto';
import { FindNicknameDto } from 'src/user/dto/find-nickname.dto';
import { ResetPasswordTokenDto } from 'src/user/dto/reset-password-token.dto';

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
    return res.status(response.status).json(response);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    const response = await this.authService.refresh(refreshToken);
    return res.status(response.status).json(response);
  }

  @Post('request-password-reset')
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
    @Res() res: Response,
  ) {
    const response = await this.authService.requestPasswordReset(
      requestPasswordResetDto,
    );
    return res.status(response.status).json(response);
  }

  @Post('reset-password-with-token')
  async resetPasswordWithToken(
    @Body() resetPasswordTokenDto: ResetPasswordTokenDto,
    @Res() res: Response,
  ) {
    const response = await this.authService.resetPasswordWithToken(
      resetPasswordTokenDto,
    );
    return res.status(response.status).json(response);
  }

  @Get('verify-reset-token/:token')
  async verifyPasswordResetToken(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const response = await this.authService.verifyPasswordResetToken(token);
    return res.status(response.status).json(response);
  }

  @Post('find-nickname')
  async findNickname(
    @Body() findNicknameDto: FindNicknameDto,
    @Res() res: Response,
  ) {
    const response = await this.authService.findNickname(findNicknameDto);
    return res.status(response.status).json(response);
  }
}
