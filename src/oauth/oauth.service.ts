import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import { RedisService } from 'src/redis/redis.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    private responseStrategy: ResponseStrategy,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  async generateAuthorizationCode(user: User, clientId: string, state: string) {
    if (!this.clientRepository.findOne({ where: { clientId } })) {
      return this.responseStrategy.badRequest(
        '유효하지 않은 클라이언트 ID입니다',
      );
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

  async exchangeAuthorizationCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    state: string,
  ) {
    const clientConfig = this.clientRepository.findOne({
      where: { clientId, clientSecret },
    });
    if (!clientConfig) {
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
      (await clientConfig).allowedUserType !== 'all' &&
      user.role !== (await clientConfig).allowedUserType
    ) {
      return this.responseStrategy.forbidden('권한이 없습니다.');
    }

    const accessToken = this.jwtService.sign(
      { id: user.id, nickname: user.nickname },
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { id: user.id, nickname: user.nickname },
      { expiresIn: '7d' },
    );

    const fields = (await clientConfig).scope.split(',');
    const allowedFields = {};
    for (const field of fields) {
      switch (field.trim()) {
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
}
