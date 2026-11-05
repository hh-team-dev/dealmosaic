import { describe, expect, it } from 'vitest';
import { merchantHome } from '../src/lib/merchant-home.js';
const track = (destination: string) => `https://linksredirect.com/?cid=123&url=${encodeURIComponent(destination)}`;
describe('explicit direct-store recovery', () => {
  it('requires campaign/domain agreement and strips path, query and fragment', () => {
    expect(merchantHome('www.croma.com', track('https://www.croma.com/item?affiliate=abc#offer'))).toBe('https://www.croma.com/');
    expect(merchantHome('https://croma.com', track('https://shop.croma.com/item'))).toBe('https://croma.com/');
  });
  it.each([null, '', 'javascript:alert(1)', 'https://u:p@croma.com', 'http://127.0.0.1', 'localhost', 'https://[::1]', 'merchant.local', 'https://croma.com:8443', 'linksredirect.com', 'www.cuelinks.com', 'xn--fake.com'])('refuses unsafe or absent domain %s', domain => {
    expect(merchantHome(domain, track('https://croma.com'))).toBeNull();
  });
  it.each(['https://croma.com.attacker.com', 'https://notcroma.com', 'javascript:alert(1)', 'https://u:p@croma.com', 'http://127.0.0.1', 'https://croma.com:8443'])('refuses an unconfirmed nested destination %s', target => {
    expect(merchantHome('croma.com', track(target))).toBeNull();
  });
  it('never invents a replacement tracking hostname or decodes a nested URL twice', () => {
    expect(merchantHome('croma.com', 'https://linksredirect.com/?url=' + encodeURIComponent(encodeURIComponent('https://croma.com')))).toBeNull();
    expect(merchantHome('croma.com', 'https://linksredirect.com/?cid=123')).toBeNull();
    expect(merchantHome('croma.com', 'http://linksredirect.com/?url=https://croma.com')).toBeNull();
  });
});
