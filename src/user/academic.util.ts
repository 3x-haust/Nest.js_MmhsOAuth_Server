import { User } from './entities/user.entity';

export interface AcademicInfo {
  grade?: number;
  isGraduated?: boolean;
  graduationYear?: number;
}

export const calculateAcademicInfo = (
  user: Pick<User, 'role' | 'admission' | 'isGraduated'>,
  now: Date = new Date(),
): AcademicInfo => {
  if (user.role === 'teacher' || !user.admission) {
    return { isGraduated: user.isGraduated ?? undefined };
  }

  const currentYear = now.getFullYear();
  const graduationYear = user.admission + 3;
  const isGraduated = currentYear >= graduationYear;
  const rawGrade = currentYear - user.admission + 1;
  const grade = isGraduated ? undefined : Math.min(Math.max(rawGrade, 1), 3);

  return { grade, isGraduated, graduationYear };
};
