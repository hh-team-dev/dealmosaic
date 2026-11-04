import {describe,it,expect} from 'vitest';
import {eligibleTickerOffers,tickerDiscountLabel,tickerOfferPath} from '../src/lib/ticker';
import type {CouponView} from '../src/lib/coupons-api';
const now=Date.parse('2026-11-04T00:00:00Z');
const offer={id:'one',title:'A real listed offer',platformSlug:'shop',trustState:'listed',code:'SAVE',discountType:'percent',discountValue:20,statedPercent:20,percentIsCap:true,expiresAt:null,startsAt:null} as CouponView;
describe('persistent ticker honesty',()=>{
 it('keeps one valid offer instead of hiding the strip below a made-up three-offer minimum',()=>expect(eligibleTickerOffers([offer],now)).toEqual([offer]));
 it('excludes expired, rejected, future and malformed-dated offers',()=>{expect(eligibleTickerOffers([{...offer,trustState:'rejected'},{...offer,expiresAt:new Date(now).toISOString()},{...offer,expiresAt:'invalid'},{...offer,startsAt:new Date(now+1).toISOString()},{...offer,startsAt:'invalid'}],now)).toEqual([]);});
 it('deduplicates and bounds the strip to fourteen real offers',()=>{expect(eligibleTickerOffers([offer,offer],now)).toHaveLength(1);expect(eligibleTickerOffers(Array.from({length:30},(_,i)=>({...offer,id:String(i)})),now)).toHaveLength(14);});
 it('preserves up-to qualifiers',()=>expect(tickerDiscountLabel(offer)).toBe('up to 20% off'));
 it('never presents future cashback as a checkout discount',()=>expect(tickerDiscountLabel({...offer,discountType:'cashback',discountValue:50})).toBe('₹50 cashback'));
 it('does not fabricate zero percent savings for a code-only offer',()=>expect(tickerDiscountLabel({...offer,discountValue:0,statedPercent:null})).toBe('Code available'));
 it('preserves the clicked offer context with encoded merchant and title',()=>{const c={...offer,title:'Save 20% & more / today?'};const url=new URL(tickerOfferPath(c),'https://example.test');expect(url.pathname).toBe('/deals');expect(url.searchParams.get('platform')).toBe('shop');expect(url.searchParams.get('q')).toBe(c.title);});
});
