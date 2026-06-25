import type { User } from './entities/user.entity';

type UserEmailFields = Pick<
  User,
  'email' | 'personalEmail' | 'personalEmailVerifiedAt'
>;

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const isSchoolEmail = (email: string): boolean =>
  normalizeEmail(email).endsWith('@e-mirim.hs.kr');

export const getPrimaryEmail = (user: UserEmailFields): string =>
  user.personalEmail && user.personalEmailVerifiedAt
    ? user.personalEmail
    : user.email;

export const getUserEmailFields = (user: UserEmailFields) => ({
  schoolEmail: user.email,
  personalEmail: user.personalEmail,
  personalEmailVerifiedAt: user.personalEmailVerifiedAt,
  primaryEmail: getPrimaryEmail(user),
  requiresPersonalEmail: !user.personalEmail || !user.personalEmailVerifiedAt,
});
