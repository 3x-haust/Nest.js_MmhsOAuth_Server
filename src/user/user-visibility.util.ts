import { User } from './entities/user.entity';

type UserMajorVisibility = {
  readonly role: User['role'];
  readonly major?: User['major'] | null;
};

export const getVisibleMajor = (
  user: UserMajorVisibility,
): Partial<Pick<User, 'major'>> =>
  user.role === 'student' && user.major ? { major: user.major } : {};
