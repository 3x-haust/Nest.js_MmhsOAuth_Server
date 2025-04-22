import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import { RedisService } from 'src/redis/redis.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OAuthConsent } from './entities/oauth-consent.entity';

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    @InjectRepository(OAuthConsent)
    private readonly consentRepository: Repository<OAuthConsent>,
    private responseStrategy: ResponseStrategy,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  async generateAuthorizationCode(user: User, clientId: string, state: string) {
    const client = await this.clientRepository.findOne({ where: { clientId } });
    if (!client) {
      return this.responseStrategy.badRequest(
        '유효하지 않은 클라이언트 ID입니다',
      );
    }

    if (!user.email.endsWith('@e-mirim.hs.kr')) {
      return this.responseStrategy.badRequest(
        '미림마이스터고 학교 이메일 계정만 접근 가능합니다.',
      );
    }

    if (
      client.allowedUserType !== 'all' &&
      user.role !== client.allowedUserType
    ) {
      return this.responseStrategy.forbidden('권한이 없습니다.');
    }

    const code = uuidv4();
    const data = JSON.stringify({
      userId: user.id,
      clientId,
      state,
    });

    await this.redisService.set(`auth_code:${code}`, data, 600);
    return code;
  }

  async validateRedirectUri(
    clientId: string,
    redirectUri: string,
  ): Promise<boolean> {
    const client = await this.clientRepository.findOne({ where: { clientId } });
    if (!client) {
      throw new Error('유효하지 않은 클라이언트 ID입니다');
    }
    return client.redirectUris.includes(redirectUri);
  }

  async getClientInfo(clientId: string) {
    const client = await this.clientRepository.findOne({ where: { clientId } });
    if (!client) {
      return null;
    }

    return {
      id: client.id,
      clientId: client.clientId,
      serviceName: client.serviceName,
      serviceDomain: client.serviceDomain,
      scope: client.scope,
      allowedUserType: client.allowedUserType,
    };
  }

  async checkUserConsent(userId: number, clientId: string): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: { userId, clientId },
    });
    return !!consent;
  }

  async saveUserConsent(
    userId: number,
    clientId: string,
    scope: string,
  ): Promise<void> {
    let consent = await this.consentRepository.findOne({
      where: { userId, clientId },
    });

    if (consent) {
      consent.scope = scope;
      await this.consentRepository.save(consent);
    } else {
      consent = this.consentRepository.create({
        userId,
        clientId,
        scope,
        grantedAt: new Date(),
      });
      await this.consentRepository.save(consent);
    }
  }

  async exchangeAuthorizationCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    state: string,
    scopes: string,
  ) {
    const client = await this.clientRepository.findOne({
      where: { clientId, clientSecret },
    });

    if (!client) {
      return this.responseStrategy.badRequest(
        '클라이언트 인증에 실패했습니다.',
      );
    }

    const key = `auth_code:${code}`;
    const authDataStr = await this.redisService.get(key);
    if (!authDataStr) {
      return this.responseStrategy.badRequest(
        '유효하지 않거나 만료된 승인 코드입니다.',
      );
    }

    const authData = JSON.parse(authDataStr);
    if (authData.clientId !== clientId) {
      return this.responseStrategy.badRequest(
        '클라이언트 정보가 일치하지 않습니다.',
      );
    }

    if (authData.state !== state) {
      return this.responseStrategy.badRequest('state 값이 일치하지 않습니다.');
    }
    await this.redisService.del(key);

    const user = await this.userRepository.findOne({
      where: { id: authData.userId },
    });
    if (!user) {
      return this.responseStrategy.badRequest('사용자를 찾을 수 없습니다.');
    }

    if (
      client.allowedUserType !== 'all' &&
      user.role !== client.allowedUserType
    ) {
      return this.responseStrategy.forbidden('권한이 없습니다.');
    }

    const requestedScopes = scopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowedScopes = client.scope
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const invalidScopes = requestedScopes.filter(
      (scope) => !allowedScopes.includes(scope),
    );

    if (invalidScopes.length > 0) {
      return this.responseStrategy.badRequest(
        `다음 스코프는 허용되지 않습니다: ${invalidScopes.join(', ')}`,
      );
    }

    const accessToken = this.jwtService.sign(
      { id: user.id, scopes: requestedScopes, clientId },
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { id: user.id, scopes: requestedScopes, clientId },
      { expiresIn: '7d' },
    );

    await this.redisService.set(
      `access_token:${accessToken}`,
      JSON.stringify({
        userId: user.id,
        clientId,
        scopes: requestedScopes,
      }),
      15 * 60,
    );

    await this.redisService.set(
      `refresh_token:${refreshToken}`,
      JSON.stringify({
        userId: user.id,
        clientId,
        scopes: requestedScopes,
      }),
      7 * 24 * 60 * 60,
    );

    const allowedFields = {};
    for (const field of requestedScopes) {
      switch (field) {
        case 'email':
          allowedFields['email'] = user.email;
          break;
        case 'nickname':
          allowedFields['nickname'] = user.nickname;
          break;
        case 'role':
          allowedFields['role'] = user.role;
          break;
        case 'major':
          allowedFields['major'] = user.major;
          break;
        case 'admission':
          allowedFields['admission'] = user.admission;
          break;
        case 'generation':
          allowedFields['generation'] = user.generation;
          break;
        case 'isGraduated':
          allowedFields['isGraduated'] = user.isGraduated;
          break;
      }
    }

    const data = {
      user: allowedFields,
      token_type: 'Bearer',
      expires_in: 15 * 60,
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    return data;
  }

  async revokeToken(token: string, clientId: string, clientSecret: string) {
    const client = await this.clientRepository.findOne({
      where: { clientId, clientSecret },
    });

    if (!client) {
      return this.responseStrategy.badRequest(
        '클라이언트 인증에 실패했습니다.',
      );
    }

    let tokenData = await this.redisService.get(`access_token:${token}`);
    let isAccessToken = true;

    if (!tokenData) {
      tokenData = await this.redisService.get(`refresh_token:${token}`);
      isAccessToken = false;

      if (!tokenData) {
        return this.responseStrategy.badRequest('유효하지 않은 토큰입니다.');
      }
    }

    const parsedData = JSON.parse(tokenData);

    if (parsedData.clientId !== clientId) {
      return this.responseStrategy.badRequest(
        '토큰이 해당 클라이언트에 속하지 않습니다.',
      );
    }

    if (isAccessToken) {
      await this.redisService.del(`access_token:${token}`);
    } else {
      await this.redisService.del(`refresh_token:${token}`);
    }

    return this.responseStrategy.success('토큰이 성공적으로 무효화되었습니다.');
  }
}
