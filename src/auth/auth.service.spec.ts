import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

import { EmailService } from 'src/email/email.service';
import { OAuthConsent } from 'src/oauth/entities/oauth-consent.entity';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { User } from 'src/user/entities/user.entity';
import { AuthService } from './auth.service';

type UserWhere = Partial<Pick<User, 'email' | 'id' | 'nickname'>>;
type FindOneInput = { readonly where: UserWhere | readonly UserWhere[] };

const fixedDate = new Date('2026-01-01T00:00:00.000Z');

const matchesWhere = (user: User, where: UserWhere): boolean => {
  if (where.email !== undefined && user.email !== where.email) return false;
  if (where.id !== undefined && user.id !== where.id) return false;
  if (where.nickname !== undefined && user.nickname !== where.nickname) {
    return false;
  }

  return true;
};

const createUserRepository = () => {
  const users: User[] = [];
  let nextId = 1;

  return {
    create: jest.fn((attributes: Partial<User>) =>
      Object.assign(new User(), {
        id: nextId++,
        isAdmin: false,
        profileImageUrl: null,
        createdAt: fixedDate,
        updatedAt: fixedDate,
        ...attributes,
      }),
    ),
    findOne: jest.fn(async ({ where }: FindOneInput) => {
      const clauses = Array.isArray(where) ? where : [where];

      return (
        users.find((user) =>
          clauses.some((clause) => matchesWhere(user, clause)),
        ) ?? null
      );
    }),
    save: jest.fn(async (user: User) => {
      users.push(user);
      return user;
    }),
  };
};

const createAuthService = async () => {
  const userRepository = createUserRepository();
  const jwtSign = jest
    .fn()
    .mockReturnValueOnce('access-token')
    .mockReturnValueOnce('refresh-token');

  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      {
        provide: getRepositoryToken(User),
        useValue: userRepository,
      },
      {
        provide: getRepositoryToken(OAuthConsent),
        useValue: {},
      },
      {
        provide: EmailService,
        useValue: {
          verifyCode: jest.fn().mockResolvedValue(true),
        },
      },
      {
        provide: JwtService,
        useValue: { sign: jwtSign },
      },
      ResponseStrategy,
    ],
  }).compile();

  return {
    service: moduleRef.get(AuthService),
    userRepository,
  };
};

describe('AuthService', () => {
  it('logs in a newly signed up user with their school email identifier', async () => {
    // Given: a user has just completed school email signup.
    const { service, userRepository } = await createAuthService();
    const password = 'password123';

    const signUpResult = await service.signUp({
      email: 's2401@e-mirim.hs.kr',
      nickname: 'new-student',
      password,
      code: '123456',
    });

    expect(signUpResult.status).toBe(200);
    expect(userRepository.save).toHaveBeenCalledTimes(1);

    // When: they log in with the email they just verified.
    const loginResult = await service.login({
      nickname: 's2401@e-mirim.hs.kr',
      password,
    });

    // Then: the login succeeds instead of reporting that the user is missing.
    expect(loginResult.status).toBe(200);
    expect(loginResult.data).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});
