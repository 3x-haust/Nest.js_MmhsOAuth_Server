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

export interface ExtendedUser extends User {
  scopes?: string[];
  clientId?: string;
}

export interface RequestWithUser extends Request {
  user?: ExtendedUser;
  originalUrl: string;
  cookies: { [key: string]: string };
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
    @Query('response_type') responseType: string,
    @Query('state') state: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    if (responseType !== 'code') {
      const response = this.responseStrategy.badRequest(
        'response_type이 올바르지 않습니다',
      );
      return res.status(response.status).json(response);
    }

    const isValidRedirectUri = await this.oauthService.validateRedirectUri(
      clientId,
      redirectUri,
    );
    if (!isValidRedirectUri) {
      const response = this.responseStrategy.badRequest(
        '유효하지 않은 리다이렉트 URI입니다.',
      );
      return res.status(response.status).json(response);
    }

    const user = req.user;
    const client =
      this.configService.get('CLIENT_URL') || 'https://localhost:5173';

    if (!user) {
      const authParams = new URLSearchParams();
      authParams.append('client_id', clientId);
      authParams.append('response_type', responseType);
      authParams.append('state', state);
      authParams.append('redirect_uri', redirectUri);
      if (scope) authParams.append('scope', scope);

      return res.redirect(
        `${client}/login?redirect=/oauth/consent?${authParams.toString()}`,
      );
    }

    const clientInfo = await this.oauthService.getClientInfo(clientId);
    if (!clientInfo) {
      const response = this.responseStrategy.badRequest(
        '유효하지 않은 클라이언트 ID입니다.',
      );
      return res.status(response.status).json(response);
    }

    const hasConsent = await this.oauthService.checkUserConsent(
      user.id,
      clientId,
    );

    if (hasConsent) {
      const code = await this.oauthService.generateAuthorizationCode(
        user,
        clientId,
        state,
      );

      if (typeof code === 'string') {
        const redirectUrl = `${redirectUri}?code=${code}&state=${state}`;
        return res.json({ url: redirectUrl });
      } else {
        return res.status(code.status).json(code);
      }
    }

    const consentUrl = `${client}/oauth/consent?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}&response_type=code`;
    return res.json({ url: consentUrl, requiresConsent: true, clientInfo });
  }

  @UseGuards(JwtAuthGuard)
  @Post('consent')
  async consent(
    @Body('client_id') clientId: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('state') state: string,
    @Body('approved') approved: boolean,
    @Body('scope') scope: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user) {
      const response =
        this.responseStrategy.unauthorized('로그인이 필요합니다.');
      return res.status(response.status).json(response);
    }

    if (!approved) {
      const response =
        this.responseStrategy.badRequest('사용자가 승인을 거부했습니다.');
      return res.status(response.status).json(response);
    }

    const clientInfo = await this.oauthService.getClientInfo(clientId);
    if (!clientInfo) {
      const response = this.responseStrategy.badRequest(
        '유효하지 않은 클라이언트 ID입니다.',
      );
      return res.status(response.status).json(response);
    }

    const requestedScopes = scope
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowedScopes = clientInfo.scope
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const invalidScopes = requestedScopes.filter(
      (s) => !allowedScopes.includes(s),
    );

    if (invalidScopes.length > 0) {
      const response = this.responseStrategy.badRequest(
        `다음 스코프는 허용되지 않습니다: ${invalidScopes.join(', ')}`,
      );
      return res.status(response.status).json(response);
    }

    await this.oauthService.saveUserConsent(user.id, clientId, scope);

    const code = await this.oauthService.generateAuthorizationCode(
      user,
      clientId,
      state,
    );

    if (typeof code === 'string') {
      const redirectUrl = `${redirectUri}?code=${code}&state=${state}`;
      const response = this.responseStrategy.success(
        '사용자 승인이 완료되었습니다.',
        { url: redirectUrl },
      );

      return res.status(response.status).json(response);
    } else {
      return res.status(code.status).json(code);
    }
  }

  @Post('token')
  async token(@Body() tokenDto: TokenDto, @Res() res: Response) {
    const { code, clientId, clientSecret, state, redirectUri, scopes } =
      tokenDto;

    if (redirectUri) {
      const isValidRedirectUri = await this.oauthService.validateRedirectUri(
        clientId,
        redirectUri,
      );

      if (!isValidRedirectUri) {
        const response = this.responseStrategy.badRequest(
          '유효하지 않은 리다이렉트 URI입니다.',
        );
        return res.status(response.status).json(response);
      }
    }

    const token = await this.oauthService.exchangeAuthorizationCodeForToken(
      code,
      clientId,
      clientSecret,
      state,
      scopes,
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

  @Post('revoke')
  async revokeToken(
    @Body('token') token: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
    @Res() res: Response,
  ) {
    const result = await this.oauthService.revokeToken(
      token,
      clientId,
      clientSecret,
    );
    return res.status(result.status).json(result);
  }
}
