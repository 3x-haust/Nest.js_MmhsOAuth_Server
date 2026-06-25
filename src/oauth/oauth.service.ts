import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import { RedisService } from 'src/redis/redis.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { User } from 'src/user/entities/user.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OAuthConsent } from './entities/oauth-consent.entity';
import { PermissionHistory } from 'src/user/entities/permission-history.entity';
import { calculateAcademicInfo } from 'src/user/academic.util';
import { resolveProfileImageUrl } from 'src/user/default-avatar.util';
import { getPrimaryEmail } from 'src/user/user-email.util';
import { getVisibleMajor } from 'src/user/user-visibility.util';

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    @InjectRepository(OAuthConsent)
    private readonly consentRepository: Repository<OAuthConsent>,
    @InjectRepository(PermissionHistory)
    private readonly permissionHistoryRepository: Repository<PermissionHistory>,
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
      return this.responseStrategy.unauthorized('권한이 없습니다.');
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
      return false;
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
      consent.grantedAt = new Date();
      consent.revokedAt = null;
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

    const client = await this.clientRepository.findOne({ where: { clientId } });
    if (client) {
      const historyEntry = this.permissionHistoryRepository.create({
        userId,
        clientId,
        applicationName: client.serviceName,
        applicationDomain: client.serviceDomain,
        permissionScopes: scope,
        timestamp: new Date(),
        status: 'active',
      });

      await this.permissionHistoryRepository.save(historyEntry);
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
      return this.responseStrategy.unauthorized('권한이 없습니다.');
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
      { expiresIn: '30d' },
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
      30 * 24 * 60 * 60,
    );

    const academicInfo = calculateAcademicInfo(user);
    const allowedFields = {};
    for (const field of requestedScopes) {
      switch (field) {
        case 'email':
          allowedFields['email'] = user.email;
          break;
        case 'schoolEmail':
          allowedFields['schoolEmail'] = user.email;
          break;
        case 'personalEmail':
          allowedFields['personalEmail'] = user.personalEmail;
          break;
        case 'primaryEmail':
          allowedFields['primaryEmail'] = getPrimaryEmail(user);
          break;
        case 'nickname':
          allowedFields['nickname'] = user.nickname;
          break;
        case 'role':
          allowedFields['role'] = user.role;
          break;
        case 'major':
          Object.assign(allowedFields, getVisibleMajor(user));
          break;
        case 'admission':
          allowedFields['admission'] = user.admission;
          break;
        case 'grade':
          allowedFields['grade'] = academicInfo.grade;
          allowedFields['graduationYear'] = academicInfo.graduationYear;
          break;
        case 'generation':
          allowedFields['generation'] = user.generation;
          break;
        case 'isGraduated':
          allowedFields['isGraduated'] = academicInfo.isGraduated;
          allowedFields['graduationYear'] = academicInfo.graduationYear;
          break;
        case 'profileImageUrl':
          allowedFields['profileImageUrl'] = resolveProfileImageUrl(user);
          break;
      }
    }

    const data = {
      user: allowedFields,
      token_type: 'Bearer',
      expires_in_accessToken: 15 * 60,
      expires_in_refreshToken: 30 * 24 * 60 * 60,
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

  async verifyAccessToken(token: string) {
    if (!token) {
      return this.responseStrategy.badRequest('토큰을 입력해주세요.');
    }

    try {
      const payload = this.jwtService.verify<{
        id: number;
        scopes?: string[];
        clientId?: string;
        exp?: number;
        iat?: number;
      }>(token);

      const tokenData = await this.redisService.get(`access_token:${token}`);
      if (!tokenData) {
        return this.responseStrategy.unauthorized(
          '유효하지 않거나 폐기된 토큰입니다.',
        );
      }

      const parsedTokenData = JSON.parse(tokenData);
      if (
        parsedTokenData.userId !== payload.id ||
        parsedTokenData.clientId !== payload.clientId
      ) {
        return this.responseStrategy.unauthorized(
          '토큰 정보가 일치하지 않습니다.',
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.id },
      });
      if (!user) {
        return this.responseStrategy.unauthorized('사용자를 찾을 수 없습니다.');
      }

      if (payload.clientId) {
        const client = await this.clientRepository.findOne({
          where: { clientId: payload.clientId },
        });
        if (!client) {
          return this.responseStrategy.unauthorized(
            '유효하지 않은 클라이언트입니다.',
          );
        }

        const revokedConsent = await this.consentRepository.findOne({
          where: {
            userId: payload.id,
            clientId: payload.clientId,
            revokedAt: Not(IsNull()),
          },
        });
        if (revokedConsent) {
          return this.responseStrategy.unauthorized('TOKEN_EXPIRED');
        }
      }

      return this.responseStrategy.success('유효한 토큰입니다.', {
        active: true,
        token_type: 'Bearer',
        userId: payload.id,
        clientId: payload.clientId,
        scopes: payload.scopes ?? [],
        issuedAt: payload.iat
          ? new Date(payload.iat * 1000).toISOString()
          : null,
        expiresAt: payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : null,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'TokenExpiredError'
          ? 'TOKEN_EXPIRED'
          : '유효하지 않은 토큰입니다.';
      return this.responseStrategy.unauthorized(message);
    }
  }

  async revokeUserConsent(userId: number, clientId: string) {
    const consent = await this.consentRepository.findOne({
      where: { userId, clientId },
    });

    if (!consent) {
      return this.responseStrategy.badRequest(
        '연결된 어플리케이션을 찾을 수 없습니다.',
      );
    }

    await this.consentRepository.remove(consent);

    const tokens = await this.redisService.keys(`*_token:*`);

    for (const tokenKey of tokens) {
      const tokenData = await this.redisService.get(tokenKey);
      if (tokenData) {
        try {
          const parsedData = JSON.parse(tokenData);
          if (
            parsedData.userId === userId &&
            parsedData.clientId === clientId
          ) {
            await this.redisService.del(tokenKey);
          }
        } catch {
          continue;
        }
      }
    }

    return this.responseStrategy.success(
      '어플리케이션 연결이 성공적으로 해제되었습니다.',
    );
  }
}
