import {
  generateMirimBadgeSvg,
  getDefaultProfileImageUrl,
  resolveProfileImageUrl,
} from './default-avatar.util';

describe('default avatar utilities', () => {
  it('creates a stable profile image URL for a user id', () => {
    // Given: a user has no uploaded profile image.
    const user = { id: 42, profileImageUrl: null };

    // When: the profile image URL is resolved.
    const result = resolveProfileImageUrl(user);

    // Then: the URL points to the deterministic default SVG endpoint.
    expect(result).toBe('/api/v1/user/default-profile-image/42.svg');
    expect(getDefaultProfileImageUrl(42)).toBe(result);
  });

  it('keeps an uploaded profile image URL when present', () => {
    // Given: a user already uploaded a profile image.
    const user = { id: 42, profileImageUrl: '/uploads/avatars/custom.webp' };

    // When: the profile image URL is resolved.
    const result = resolveProfileImageUrl(user);

    // Then: the uploaded image URL remains the visible profile image.
    expect(result).toBe('/uploads/avatars/custom.webp');
  });

  it('generates the same Mirim Badge SVG for the same seed', () => {
    // Given: the same seed is used twice.
    const seed = '42';

    // When: two badges are generated.
    const first = generateMirimBadgeSvg(seed);
    const second = generateMirimBadgeSvg(seed);

    // Then: the badge is stable and renderable as SVG.
    expect(first).toBe(second);
    expect(first).toContain('<svg');
    expect(first).toContain('Mirim Badge');
  });
});
