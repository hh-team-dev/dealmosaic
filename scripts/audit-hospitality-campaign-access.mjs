/** Read-only publisher campaign audit. No applications, links, clicks or transactions created. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const env=Object.fromEntries(readFileSync('/home/user/.config/dealmosaic/deploy.env','utf8').split('\n').filter(x=>/^[A-Z_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));
const wanted=new Set([1715,42,5189,58550,5490]);const found=[],pages=[];
for(let page=1;page<=20;page++){
 if(page>1)await new Promise(r=>setTimeout(r,11000));
 const response=await fetch(`https://developers.cuelinks.com/pub_api/v3/campaigns?page=${page}&per_page=500&campaign_type=CPS`,{headers:{Authorization:`Token ${env.CUELINKS_API_KEY}`,Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 if(!response.ok){pages.push({page,status:response.status});break;}
 const body=await response.json();pages.push({page,rows:body.data?.length,meta:body.meta});
 for(const row of body.data||[])if(wanted.has(row.id)||/dineout|eazydiner|magicpin/i.test(row.name||'')){
  found.push(Object.fromEntries(['id','name','domain','access_status','campaign_type','payout_type','payout','payout_currency','deeplink_allowed','cookie_duration','status'].map(k=>[k,row[k]??null])));wanted.delete(row.id);
 }
 console.log(`Read-only campaign page ${page}: ${body.data?.length||0} rows; ${found.length} relevant records.`);
 if(!body.meta?.next_page||!wanted.size)break;
}
const dir='/home/user/research/hospitality-revenue-audit';mkdirSync(dir,{recursive:true});
writeFileSync(dir+'/campaign-access.json',JSON.stringify({at:new Date().toISOString(),scope:'Read-only network CPS campaign scan; approval does not establish a working link, conversion, earned commission or API inventory rights.',pages,found,unresolvedIds:[...wanted]},null,2)+'\n');
console.log(JSON.stringify({found,unresolvedIds:[...wanted]},null,2));
