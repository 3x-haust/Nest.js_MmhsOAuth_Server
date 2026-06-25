import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import { RedisService } from 'src/redis/redis.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { PermissionHistory } from 'src/user/entities/permission-history.entity';
import { User } from 'src/user/entities/user.entity';
import { OAuthConsent } from './entities/oauth-consent.entity';
import { OAuthService } from './oauth.service';

const fixedDate = new Date('2026-01-01T00:00:00.000Z');

const createUser = (): User =>
  Object.assign(new User(), {
    id: 1,
    email: 'student@e-mirim.hs.kr',
    personalEmail: 'student.personal@example.com',
    personalEmailVerifiedAt: fixedDate,
    nickname: 'student',
    password: 'hashed-password',
    role: 'student',
    major: 'software',
    admission: 2024,
    generation: 30,
    isGraduated: false,
    isAdmin: false,
    isVerified: true,
    profileImageUrl: null,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  });

const createClient = (): OAuthClient =>
  Object.assign(new OAuthClient(), {
    id: 1,
    clientId: 'client-id',
    clientSecret: 'client-secret',
    serviceName: '테스트 앱',
    serviceDomain: 'example.com',
    redirectUris: ['https://example.com/callback'],
    scope: 'email,schoolEmail,personalEmail,primaryEmail',
    allowedUserType: 'all',
    createdAt: fixedDate,
    updatedAt: fixedDate,
  });

const createService = async (user: User, client: OAuthClient) => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OAuthService,
      {
        provide: getRepositoryToken(User),
        useValue: { findOne: jest.fn().mockResolvedValue(user) },
      },
      {
        provide: getRepositoryToken(OAuthClient),
        useValue: { findOne: jest.fn().mockResolvedValue(client) },
      },
      {
        provide: getRepositoryToken(OAuthConsent),
        useValue: {},
      },
      {
        provide: getRepositoryToken(PermissionHistory),
        useValue: {},
      },
      {
        provide: ResponseStrategy,
        useValue: {
          badRequest: jest.fn(),
          unauthorized: jest.fn(),
        },
      },
      {
        provide: RedisService,
        useValue: {
          get: jest.fn().mockResolvedValue(
            JSON.stringify({
              userId: user.id,
              clientId: client.clientId,
              state: 'state-value',
            }),
          ),
          set: jest.fn().mockResolvedValue(undefined),
          del: jest.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: JwtService,
        useValue: {
          sign: jest
            .fn()
            .mockReturnValueOnce('access-token')
            .mockReturnValueOnce('refresh-token'),
        },
      },
    ],
  }).compile();

  return moduleRef.get(OAuthService);
};

describe('OAuthService email scopes', () => {
  it('keeps email as school email and exposes personal email through new scopes', async () => {
    // Given: an OAuth client is allowed to request every email scope.
    const user = createUser();
    const client = createClient();
    const service = await createService(user, client);

    // When: the authorization code is exchanged with email scopes.
    const result = await service.exchangeAuthorizationCodeForToken(
      'auth-code',
      client.clientId,
      client.clientSecret,
      'state-value',
      'email,schoolEmail,personalEmail,primaryEmail',
    );

    // Then: backward-compatible email stays school email and primary follows personal email.
    expect(result.user).toEqual({
      email: user.email,
      schoolEmail: user.email,
      personalEmail: user.personalEmail,
      primaryEmail: user.personalEmail,
    });
  });
});
