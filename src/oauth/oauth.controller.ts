import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { OAuthService } from './oauth.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { TokenDto } from './dto/token.dto';
import { User } from '../user/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

interface RequestWithUser extends Request {
  user?: User;
}
@Controller('api/v1/oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private responseStrategy: ResponseStrategy,
    private configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('authorize')
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    if (responseType !== 'code') {
      return this.responseStrategy.badRequest(
        'response_type이 올바르지 않습니다',
      );
    }

    const user = req.user;
    const client =
      this.configService.get('CLIENT_URL') || 'https://localhost:5173';
    if (!user) {
      return res.redirect(
        `${client}/oauth-login?redirect=${encodeURIComponent(req.originalUrl)}`,
      );
    }

    const code = await this.oauthService.generateAuthorizationCode(
      user,
      clientId,
      redirectUri,
      scope,
      state,
    );
    const redirectUrl = `${redirectUri}?code=${code}&state=${state}`;
    return res.json({ url: redirectUrl });
  }

  @Post('token')
  async token(@Body() tokenDto: TokenDto, @Res() res: Response) {
    const { code, clientId, clientSecret, state } = tokenDto;
    const token = await this.oauthService.exchangeAuthorizationCodeForToken(
      code,
      clientId,
      clientSecret,
      state,
    );

    if (token.status !== 200 && token.status) {
      return res.status(token.status).json(token);
    }

    const response = this.responseStrategy.success(
      '토큰을 성공적으로 발급했습니다.',
      token,
    );
    return res.status(response.status).json(response);
  }
}
