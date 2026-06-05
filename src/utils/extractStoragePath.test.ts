import { describe, it, expect } from '@jest/globals';
import { extractStoragePath } from './extractStoragePath';

const BUCKET = 'charity-attestations';

describe('extractStoragePath', () => {
  it('extracts path from a Supabase public URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/charity-attestations/charity-123/doc.pdf';
    expect(extractStoragePath(url, BUCKET)).toBe('charity-123/doc.pdf');
  });

  it('extracts path from a Supabase signed URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/sign/charity-attestations/charity-456/attestation.pdf?token=abc123';
    expect(extractStoragePath(url, BUCKET)).toBe('charity-456/attestation.pdf');
  });

  it('extracts path from a relative URL containing the bucket name', () => {
    const url = '/storage/v1/object/public/charity-attestations/profile-789/file.png';
    expect(extractStoragePath(url, BUCKET)).toBe('profile-789/file.png');
  });

  it('handles deeply nested paths', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/charity-attestations/org/sub/deep/file.pdf';
    expect(extractStoragePath(url, BUCKET)).toBe('org/sub/deep/file.pdf');
  });

  it('falls back to full string when bucket name is not in URL', () => {
    const url = 'some-random-path/file.pdf';
    expect(extractStoragePath(url, BUCKET)).toBe('some-random-path/file.pdf');
  });

  it('strips query parameters from fallback path', () => {
    const url = 'charity-attestations/charity-123/doc.pdf?token=xyz';
    expect(extractStoragePath(url, BUCKET)).toBe('charity-123/doc.pdf');
  });

  it('handles URL with only bucket name and single file', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/charity-attestations/file.pdf';
    expect(extractStoragePath(url, BUCKET)).toBe('file.pdf');
  });

  it('returns empty path portion correctly when bucket is last segment', () => {
    const url = 'charity-attestations/';
    expect(extractStoragePath(url, BUCKET)).toBe('');
  });
});
