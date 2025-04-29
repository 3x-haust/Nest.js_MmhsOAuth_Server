import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { OAuthConsent } from 'src/oauth/entities/oauth-consent.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(OAuthConsent)
    private oauthConsentRepository: Repository<OAuthConsent>,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    id: number;
    scopes?: string[];
    clientId?: string;
  }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.id },
    });

    if (payload.clientId) {
      const revokedConsent = await this.oauthConsentRepository.findOne({
        where: {
          userId: payload.id,
          clientId: payload.clientId,
          revokedAt: Not(IsNull()),
        },
      });

      if (revokedConsent) {
        throw new UnauthorizedException('TOKEN_EXPIRED');
      }

      user['clientId'] = payload.clientId;
    }

    if (!user) throw new UnauthorizedException('사용자를 찾을 수 없습니다.');

    if (payload.scopes) {
      user['scopes'] = payload.scopes;
    }

    return user;
  }
}
