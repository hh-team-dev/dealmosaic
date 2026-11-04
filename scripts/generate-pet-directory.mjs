/** Editorial export only: no crawling, account data, rates, or fabricated venues. */
import {readFileSync,writeFileSync} from 'node:fs';
const rows=JSON.parse(readFileSync('apps/web/src/data/pet-venues.json','utf8')).filter(v=>v.status==='listed');
const headers=['Name','Destination ID','Type','Area','Policy summary (reconfirm)','Species explicitly mentioned','Pet fee (reconfirm)','Limits','Access','Caution','Source review date','Source URLs','Evidence method'];
const quote=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
const values=rows.map(v=>[v.name,v.city,v.kind,v.area,v.summary,v.species.join('; '),v.fee,v.limits,v.access,v.caution,v.reviewedAt,v.sources.map(s=>`[${s.ref}] ${s.url}`).join(' | '),v.sources.map(s=>`${s.type}; ${s.method==='page'?'page text reviewed':'indexed excerpt only'}`).join(' | ')]);
writeFileSync('apps/web/public/pet-friendly-directory.csv','\uFEFF'+[headers,...values].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n');
console.log(`Exported ${rows.length} sourced entries; not a comprehensive/live inventory.`);
