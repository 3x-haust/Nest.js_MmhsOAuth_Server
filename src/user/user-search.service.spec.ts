import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UserSearchService } from './user-search.service';

const createUser = (id: number, nickname: string, role: User['role']): User =>
  Object.assign(new User(), {
    id,
    email: `${nickname}@e-mirim.hs.kr`,
    nickname,
    password: 'hashed-password',
    role,
    major: 'software',
    isVerified: true,
    generation: null,
    admission: role === 'student' ? 2024 : null,
    isGraduated: false,
    isAdmin: false,
    profileImageUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const originalElasticsearchNode = process.env.ELASTICSEARCH_NODE;
const originalEsNode = process.env.ES_NODE;

const restoreEnv = (key: 'ELASTICSEARCH_NODE' | 'ES_NODE', value?: string) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
};

describe('UserSearchService', () => {
  beforeEach(() => {
    delete process.env.ELASTICSEARCH_NODE;
    delete process.env.ES_NODE;
  });

  afterEach(() => {
    restoreEnv('ELASTICSEARCH_NODE', originalElasticsearchNode);
    restoreEnv('ES_NODE', originalEsNode);
  });

  it('returns student and teacher users when query is empty', async () => {
    // Given: the repository contains both student and teacher accounts.
    const users = [
      createUser(1, 'student-user', 'student'),
      createUser(2, 'teacher-user', 'teacher'),
    ];
    const find = jest.fn().mockResolvedValue(users);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserSearchService,
        {
          provide: getRepositoryToken(User),
          useValue: { find },
        },
      ],
    }).compile();
    const service = moduleRef.get(UserSearchService);

    // When: user search runs with an empty query.
    const result = await service.searchUsers('');

    // Then: the search returns all user roles through the DB fallback.
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        where: undefined,
      }),
    );
    expect(result.map((user) => user.role)).toEqual(['student', 'teacher']);
  });

  it('omits teacher major from search results', async () => {
    // Given: the repository contains a teacher account with a stored major.
    const teacher = createUser(2, 'teacher-user', 'teacher');
    const find = jest.fn().mockResolvedValue([teacher]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserSearchService,
        {
          provide: getRepositoryToken(User),
          useValue: { find },
        },
      ],
    }).compile();
    const service = moduleRef.get(UserSearchService);

    // When: user search returns the teacher.
    const result = await service.searchUsers('teacher');

    // Then: the teacher search payload does not expose major.
    expect(result).toEqual([
      expect.not.objectContaining({
        major: teacher.major,
      }),
    ]);
  });
});
