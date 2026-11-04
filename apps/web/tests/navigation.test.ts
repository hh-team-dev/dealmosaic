import { describe, expect, it } from 'vitest';
import { safeReturnPath } from '../src/lib/navigation';
describe('sign-in return paths', () => {
  it.each([null, '', 'https://example.com', '//example.com', '/\\example.com', '/\nexample', 'javascript:alert(1)'])('rejects non-local or ambiguous input %s', (value) => expect(safeReturnPath(value)).toBe('/'));
  it.each(['/admin?tab=shop', '/saved', '/search?q=milk'])('preserves local destination %s', (value) => expect(safeReturnPath(value)).toBe(value));
});
