import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { OAuthClient } from 'src/oauth-client/entities/oauth-client.entity';
import type { ExtendedUser } from 'src/oauth/oauth.controller';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';
import { ResponseStrategy } from 'src/shared/strategies/response.strategy';
import { OAuthConsent } from 'src/oauth/entities/oauth-consent.entity';
import { PermissionHistory } from './entities/permission-history.entity';
import { UserSearchHistory } from './entities/user-search-history.entity';
import { User } from './entities/user.entity';
import { UserSearchService } from './user-search.service';
import { UserService } from './user.service';

const fixedDate = new Date('2026-01-01T00:00:00.000Z');

type UserWhere = Partial<
  Pick<User, 'email' | 'id' | 'nickname' | 'personalEmail'>
>;
type FindOneInput = { readonly where: UserWhere | readonly UserWhere[] };

const matchesWhere = (user: User, where: UserWhere): boolean => {
  if (where.email !== undefined && user.email !== where.email) return false;
  if (where.id !== undefined && user.id !== where.id) return false;
  if (where.nickname !== undefined && user.nickname !== where.nickname) {
    return false;
  }
  if (
    where.personalEmail !== undefined &&
    user.personalEmail !== where.personalEmail
  ) {
    return false;
  }

  return true;
};

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

const createStudent = (): User =>
  Object.assign(new User(), {
    id: 2,
    email: 's2401@e-mirim.hs.kr',
    personalEmail: null,
    personalEmailVerifiedAt: null,
    nickname: 'student',
    password: 'hashed-password',
    role: 'student',
    major: 'software',
    admission: 2024,
    generation: 15,
    isGraduated: false,
    isAdmin: false,
    isVerified: true,
    profileImageUrl: null,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  });

const createRequestUser = (user: User, scopes?: string[]): ExtendedUser =>
  Object.assign(new User(), user, { scopes });

const createUserService = async (user: User) => {
  const repository = {
    findOne: jest.fn(async ({ where }: FindOneInput) => {
      const clauses = Array.isArray(where) ? where : [where];
      return clauses.some((clause) => matchesWhere(user, clause)) ? user : null;
    }),
    update: jest.fn(async (_id: number, updates: Partial<User>) => {
      Object.assign(user, updates);
    }),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      UserService,
      {
        provide: getRepositoryToken(User),
        useValue: repository,
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
      {
        provide: EmailService,
        useValue: {
          sendVerificationCode: jest
            .fn()
            .mockResolvedValue({ status: 200, message: 'sent' }),
          verifyCode: jest.fn().mockResolvedValue(true),
        },
      },
      ResponseStrategy,
    ],
  }).compile();

  return {
    service: moduleRef.get(UserService),
    emailService: moduleRef.get(EmailService),
    repository,
    user,
  };
};

describe('UserService', () => {
  it('omits teacher major from scoped user profile responses', async () => {
    // Given: a teacher account has a stored major value.
    const teacher = createTeacher();
    const { service } = await createUserService(teacher);

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
    const { service } = await createUserService(teacher);

    // When: the dedicated major endpoint is requested.
    const result = await service.getUserMajor(createRequestUser(teacher));

    // Then: the teacher response does not expose major.
    expect(result.data).toEqual({ id: teacher.id });
  });

  it('returns primary email fallback until personal email is registered', async () => {
    // Given: an existing student has only a school email.
    const student = createStudent();
    const { service } = await createUserService(student);

    // When: the app loads the full profile.
    const result = await service.getUserById(createRequestUser(student));

    // Then: the school email remains the primary email and registration is required.
    expect(result.data).toEqual(
      expect.objectContaining({
        email: student.email,
        schoolEmail: student.email,
        personalEmail: null,
        personalEmailVerifiedAt: null,
        primaryEmail: student.email,
        requiresPersonalEmail: true,
      }),
    );
  });

  it('returns personal email registration state for default scoped profile responses', async () => {
    // Given: a normal login token requests the default profile fields.
    const student = createStudent();
    const { service } = await createUserService(student);

    // When: the app fetches the profile with default login scopes.
    const result = await service.getUserById(
      createRequestUser(student, [
        'email',
        'schoolEmail',
        'personalEmail',
        'personalEmailVerifiedAt',
        'primaryEmail',
        'requiresPersonalEmail',
        'nickname',
      ]),
    );

    // Then: existing users still receive the prompt-driving registration state.
    expect(result.data).toEqual(
      expect.objectContaining({
        email: student.email,
        schoolEmail: student.email,
        personalEmail: null,
        personalEmailVerifiedAt: null,
        primaryEmail: student.email,
        requiresPersonalEmail: true,
        nickname: student.nickname,
      }),
    );
  });

  it('registers a verified personal email as the primary email', async () => {
    // Given: a student received a personal email verification code.
    const student = createStudent();
    const { service, emailService, user } = await createUserService(student);

    // When: they verify the personal email code.
    const result = await service.verifyPersonalEmail(
      createRequestUser(student),
      {
        personalEmail: 'student.personal@example.com',
        code: '123456',
      },
    );

    // Then: the personal email is stored and becomes the primary email.
    expect(result.status).toBe(200);
    expect(emailService.verifyCode).toHaveBeenCalledWith(
      'student.personal@example.com',
      '123456',
    );
    expect(user.personalEmail).toBe('student.personal@example.com');
    expect(user.personalEmailVerifiedAt).toBeInstanceOf(Date);
    expect(result.data).toEqual(
      expect.objectContaining({
        personalEmail: 'student.personal@example.com',
        primaryEmail: 'student.personal@example.com',
        requiresPersonalEmail: false,
      }),
    );
  });
});
