import { isAbsolute, join, resolve } from 'path';

const normalizePublicPath = (value: string) => {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/uploads';
};

export const getUploadsDirectory = () => {
  const configured = process.env.UPLOADS_DIR?.trim();
  if (!configured) {
    return join(process.cwd(), 'uploads');
  }

  if (isAbsolute(configured)) {
    return configured;
  }

  return resolve(process.cwd(), configured);
};

export const getUploadsPublicPath = () => {
  const configured = process.env.UPLOADS_PUBLIC_PATH?.trim();
  if (!configured) {
    return '/uploads';
  }

  return normalizePublicPath(configured);
};

export const getAvatarDirectory = () => {
  return join(getUploadsDirectory(), 'avatars');
};

export const getAvatarPublicPrefix = () => {
  return `${getUploadsPublicPath()}/avatars`;
};

export const getNoticeImageDirectory = () => {
  return join(getUploadsDirectory(), 'notices');
};

export const getNoticeImagePublicPrefix = () => {
  return `${getUploadsPublicPath()}/notices`;
};
