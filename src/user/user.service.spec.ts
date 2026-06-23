import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import type { ExtendedUser } from 'src/oauth/oauth.controller';
import { RedisService } from 'src/redis/redis.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { OAuthConsent } from 'src/oauth/entities/oauth-consent.entity';
import { PermissionHistory } from './entities/permission-history.entity';
import { UserSearchHistory } from './entities/user-search-history.entity';
import { User } from './entities/user.entity';
import { UserSearchService } from './user-search.service';
import { UserService } from './user.service';

const fixedDate = new Date('2026-01-01T00:00:00.000Z');

const createTeacher = (): User =>
  Object.assign(new User(), {
    id: 1,
    email: 'teacher@e-mirim.hs.kr',
    nickname: 'teacher',
    password: 'hashed-password',
    role: 'teacher',
    major: 'software',
    admission: null,
    generation: null,
    isGraduated: null,
    isAdmin: false,
    isVerified: true,
    profileImageUrl: null,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  });

const createRequestUser = (user: User, scopes?: string[]): ExtendedUser =>
  Object.assign(new User(), user, { scopes });

const createUserService = async (user: User) => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      UserService,
      {
        provide: getRepositoryToken(User),
        useValue: {
          findOne: jest.fn().mockResolvedValue(user),
        },
      },
      {
        provide: getRepositoryToken(OAuthConsent),
        useValue: {},
      },
      {
        provide: getRepositoryToken(OAuthClient),
        useValue: {},
      },
      {
        provide: getRepositoryToken(PermissionHistory),
        useValue: {},
      },
      {
        provide: getRepositoryToken(UserSearchHistory),
        useValue: {},
      },
      {
        provide: UserSearchService,
        useValue: {},
      },
      {
        provide: RedisService,
        useValue: {},
      },
      ResponseStrategy,
    ],
  }).compile();

  return moduleRef.get(UserService);
};

describe('UserService', () => {
  it('omits teacher major from scoped user profile responses', async () => {
    // Given: a teacher account has a stored major value.
    const teacher = createTeacher();
    const service = await createUserService(teacher);

    // When: the profile endpoint response is scoped to include major.
    const result = await service.getUserById(
      createRequestUser(teacher, ['email', 'nickname', 'role', 'major']),
    );

    // Then: major is not present in the teacher profile payload.
    expect(result.data).toEqual({
      email: teacher.email,
      nickname: teacher.nickname,
      role: teacher.role,
      id: teacher.id,
      isAdmin: teacher.isAdmin,
    });
  });

  it('omits teacher major from the dedicated major response', async () => {
    // Given: a teacher account has a stored major value.
    const teacher = createTeacher();
    const service = await createUserService(teacher);

    // When: the dedicated major endpoint is requested.
    const result = await service.getUserMajor(createRequestUser(teacher));

    // Then: the teacher response does not expose major.
    expect(result.data).toEqual({ id: teacher.id });
  });
});
