import {afterEach,describe,it,expect,vi} from 'vitest';
import {readSaved,readViewed} from '../src/lib/saved';
const note={id:'test',title:'Test note',merchant:'Test merchant',merchantSlug:'test',code:null,statedPriceMinor:10000,statedPriceKind:'exact',statedPercent:null,percentIsCap:false,expiresAt:null,outboundUrl:null,savedAt:'2026-11-04T00:00:00.000Z',group:'other'};
const stored=(value:unknown)=>vi.stubGlobal('window',{localStorage:{getItem:()=>JSON.stringify(value)}});
afterEach(()=>vi.unstubAllGlobals());
describe('offline saved-note integrity',()=>{
 it('keeps a valid historical note without altering its price',()=>{stored([note]);expect(readSaved()).toEqual([note]);});
 it('ignores null, scalar and incomplete entries instead of crashing offline',()=>{stored([null,1,'bad',{}, {...note,savedAt:7},note]);expect(readSaved()).toEqual([note]);});
 it('rejects malformed prices and object-valued rendered fields',()=>{stored([{...note,statedPriceMinor:'10000'},{...note,title:{}},{...note,code:{}},{...note,statedPercent:{}}]);expect(readSaved()).toEqual([]);});
 it('bounds old or corrupted lists to sixty records',()=>{stored(Array.from({length:100},(_,i)=>({...note,id:String(i)})));expect(readSaved()).toHaveLength(60);});
 it('handles blocked storage and malformed viewed records',()=>{vi.stubGlobal('window',{localStorage:{getItem:()=>{throw new Error('blocked');}}});expect(readSaved()).toEqual([]);stored([null,{}, {id:'v',title:'Viewed',merchant:'Store',merchantSlug:'s',statedPriceMinor:null,statedPercent:null,percentIsCap:false,viewedAt:'2026-11-04T00:00:00Z'}]);expect(readViewed()).toHaveLength(1);});
});
