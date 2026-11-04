import { afterEach, describe, expect, it, vi } from 'vitest';
import { keepOrderAccess, readOrderAccess } from '../src/lib/order-access';
afterEach(()=>vi.unstubAllGlobals());
describe('private order storage fallback',()=>{
  it('keeps the same idempotency/access key when browser storage is blocked',()=>{
    vi.stubGlobal('sessionStorage',{getItem:()=>{throw new Error('blocked')},setItem:()=>{throw new Error('blocked')}});
    expect(readOrderAccess('isolated-blocked')).toBeNull();
    keepOrderAccess('isolated-blocked','isolated-token');
    expect(readOrderAccess('isolated-blocked')).toBe('isolated-token');
  });
  it('stores only in sessionStorage when available',()=>{
    const store=new Map<string,string>();vi.stubGlobal('sessionStorage',{getItem:(key:string)=>store.get(key),setItem:(key:string,value:string)=>store.set(key,value)});
    keepOrderAccess('isolated-persisted','session-token');
    expect(store.get('isolated-persisted')).toBe('session-token');
    expect(readOrderAccess('isolated-persisted')).toBe('session-token');
  });
});
