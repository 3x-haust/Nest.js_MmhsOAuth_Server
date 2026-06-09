import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import { RedisService } from 'src/redis/redis.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { User } from 'src/user/entities/user.entity';
import { PermissionHistory } from 'src/user/entities/permission-history.entity';
import { getDefaultProfileImageUrl } from 'src/user/default-avatar.util';
import { OAuthConsent } from './entities/oauth-consent.entity';
import { OAuthService } from './oauth.service';

const createUser = (
  profileImageUrl: string | null = '/uploads/avatars/student.png',
): User =>
  Object.assign(new User(), {
    id: 1,
    email: 'student@e-mirim.hs.kr',
    nickname: 'student',
    password: 'hashed-password',
    role: 'student',
    major: 'software',
    admission: 2024,
    generation: 30,
    isGraduated: false,
    isAdmin: false,
    isVerified: true,
    profileImageUrl,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const createClient = (): OAuthClient =>
  Object.assign(new OAuthClient(), {
    id: 1,
    clientId: 'client-id',
    clientSecret: 'client-secret',
    serviceName: '테스트 앱',
    serviceDomain: 'example.com',
    redirectUris: ['https://example.com/callback'],
    scope: 'email,profileImageUrl',
    allowedUserType: 'all',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

describe('OAuthService', () => {
  it('returns profile image URL when the profileImageUrl scope is requested', async () => {
    // Given: an OAuth client is allowed to request profileImageUrl.
    const user = createUser();
    const client = createClient();
    const userFindOne = jest.fn().mockResolvedValue(user);
    const clientFindOne = jest.fn().mockResolvedValue(client);
    const redisGet = jest.fn().mockResolvedValue(
      JSON.stringify({
        userId: user.id,
        clientId: client.clientId,
        state: 'state-value',
      }),
    );
    const redisSet = jest.fn().mockResolvedValue(undefined);
    const redisDel = jest.fn().mockResolvedValue(undefined);
    const jwtSign = jest
      .fn()
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: userFindOne },
        },
        {
          provide: getRepositoryToken(OAuthClient),
          useValue: { findOne: clientFindOne },
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
            get: redisGet,
            set: redisSet,
            del: redisDel,
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jwtSign },
        },
      ],
    }).compile();
    const service = moduleRef.get(OAuthService);

    // When: the authorization code is exchanged with that scope.
    const result = await service.exchangeAuthorizationCodeForToken(
      'auth-code',
      client.clientId,
      client.clientSecret,
      'state-value',
      'email,profileImageUrl',
    );

    // Then: the user payload includes the scoped profile image URL.
    expect(result.user).toEqual(
      expect.objectContaining({
        email: user.email,
        profileImageUrl: user.profileImageUrl,
      }),
    );
  });

  it('returns a default profile image URL when no uploaded image exists', async () => {
    // Given: an OAuth client requests profileImageUrl for a user without an upload.
    const user = createUser(null);
    const client = createClient();
    const userFindOne = jest.fn().mockResolvedValue(user);
    const clientFindOne = jest.fn().mockResolvedValue(client);
    const redisGet = jest.fn().mockResolvedValue(
      JSON.stringify({
        userId: user.id,
        clientId: client.clientId,
        state: 'state-value',
      }),
    );
    const redisSet = jest.fn().mockResolvedValue(undefined);
    const redisDel = jest.fn().mockResolvedValue(undefined);
    const jwtSign = jest
      .fn()
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: userFindOne },
        },
        {
          provide: getRepositoryToken(OAuthClient),
          useValue: { findOne: clientFindOne },
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
            get: redisGet,
            set: redisSet,
            del: redisDel,
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jwtSign },
        },
      ],
    }).compile();
    const service = moduleRef.get(OAuthService);

    // When: the authorization code is exchanged with the profile image scope.
    const result = await service.exchangeAuthorizationCodeForToken(
      'auth-code',
      client.clientId,
      client.clientSecret,
      'state-value',
      'profileImageUrl',
    );

    // Then: the user payload includes the generated Mirim Badge URL.
    expect(result.user).toEqual({
      profileImageUrl: getDefaultProfileImageUrl(user.id),
    });
  });
});
