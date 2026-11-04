/** Fails release packaging if the two flavors drift in identity or commerce code. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.argv[2]||'/tmp/dealmosaic-pwa-packages';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
for(const mode of ['pwa','classic']) {
 const dir=join(root,mode),release=JSON.parse(readFileSync(join(dir,'pwa-release.json'),'utf8'));
 const hash=createHash('sha256').update(mode).update(version).update(readFileSync(mode==='classic'?'apps/web/pwa/classic-worker.js':'apps/web/pwa/worker.js'));for(const path of release.assets)hash.update(path).update(readFileSync(join(dir,path)));assert.equal(release.build,version+'-'+hash.digest('hex').slice(0,12),'Worker logic must participate in cache identity');
 assert.equal(release.mode,mode);assert.equal(release.version,version);assert.ok(release.precacheBytes<=4*1024*1024);
 for(const path of release.assets){assert.ok(/^\/(pwa-shell\.html|assets\/[^/]+\.(js|css)|fonts\/[^/]+\.woff2|brand\/dm-icon[^/]*\.png|favicon\.svg|apple-touch-icon\.png)$/.test(path),`Unsafe precache entry ${path}`);assert.ok(existsSync(join(dir,path)));}
 const shell=readFileSync(join(dir,'pwa-shell.html'),'utf8');assert.ok(shell.includes('window.__DM_OFFLINE_SHELL__=true'));assert.ok(shell.includes('noindex,nofollow'));
 assert.ok(existsSync(join(dir,'install/index.html')));assert.ok(existsSync(join(dir,'_worker.js')));
}
const manifests=['pwa','classic'].map(mode=>JSON.parse(readFileSync(join(root,mode,'manifest.webmanifest'),'utf8')));
assert.equal(manifests[0].display,'standalone');assert.equal(manifests[1].display,'browser');delete manifests[0].display;delete manifests[1].display;assert.deepEqual(manifests[0],manifests[1]);
for(const prefix of ['DirectShop-','ShopControl-']) {
 const normalized=[];
 for(const mode of ['pwa','classic']) {const dir=join(root,mode,'assets');const names=readdirSync(dir).filter(name=>name.startsWith(prefix));assert.ok(names.length>0);for(const name of names)normalized.push(readFileSync(join(dir,name),'utf8').replace(/index-[a-zA-Z0-9_-]+\.js/g,'index-SHARED.js'));}
 assert.equal(new Set(normalized).size,1,`Commerce implementation drift in ${prefix}`);
}
assert.equal(readFileSync(join(root,'classic/sw.js'),'utf8'),readFileSync('apps/web/pwa/classic-worker.js','utf8'));
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
for(const file of walk('apps/web/src').filter(f=>/\.(ts|tsx)$/.test(f))){if(/PWA_MODE|PWA_ENABLED/.test(readFileSync(file,'utf8')))assert.ok(['apps/web/src/lib/pwa.ts','apps/web/src/routes/Install.tsx'].includes(file),`Business code must not fork by app flavor: ${file}`);}
console.log('PWA/classic parity verified: shared identity, source-flavor boundary, identical commerce logic, safe static list, complete files and real cleanup worker.');
