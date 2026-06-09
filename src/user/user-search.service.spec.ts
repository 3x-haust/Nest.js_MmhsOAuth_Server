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

describe('UserSearchService', () => {
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
});
