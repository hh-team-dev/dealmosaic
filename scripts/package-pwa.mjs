/** Two deployable flavors, one source revision. Never delete/replace the backend. */
import {execFileSync} from 'node:child_process';
import {mkdirSync,cpSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
const destination=process.env.PWA_RELEASE_DIR||`/home/user/releases/dealmosaic-${version}`;
const staging='/tmp/dealmosaic-pwa-packages';
rmSync(staging,{recursive:true,force:true});mkdirSync(staging,{recursive:true});mkdirSync(destination,{recursive:true});
for(const mode of ['pwa','classic']) {
 execFileSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,VITE_PWA_MODE:mode}});
 cpSync('apps/web/dist',`${staging}/${mode}`,{recursive:true});
}
// Retain both flavors' immutable chunks: already-open windows can finish their task.
cpSync(`${staging}/pwa/assets`,`${staging}/classic/assets`,{recursive:true});
cpSync(`${staging}/classic/assets`,`${staging}/pwa/assets`,{recursive:true});
execFileSync('node',['scripts/verify-pwa-parity.mjs',staging],{stdio:'inherit'});
const files=[];
for(const mode of ['pwa','classic']) {
 const path=`${destination}/dealmosaic-${version}-${mode}.tar.gz`;
 execFileSync('tar',['-czf',path,'-C',`${staging}/${mode}`,'.']);
 files.push({mode,file:path.split('/').pop(),sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),release:JSON.parse(readFileSync(`${staging}/${mode}/pwa-release.json`,'utf8'))});
}
const metadata={version,createdAt:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeChanged:Boolean(execFileSync('git',['status','--porcelain','--','.',':!apps/web/tsconfig.tsbuildinfo'],{encoding:'utf8'}).trim()),files};
writeFileSync(`${destination}/release.json`,JSON.stringify(metadata,null,2)+'\n');
writeFileSync(`${destination}/SHA256SUMS`,files.map(f=>`${f.sha256}  ${f.file}`).join('\n')+'\n');
writeFileSync(`${destination}/README.txt`,`DealMosaic ${version}: website and PWA from one source tree.\n\nPWA archive: installable app + website, safe static-only offline access.\nClassic archive: identical customer/owner features, network-only; /sw.js removes older DealMosaic workers and app caches. Keep it served at the same origin and path.\n\nVerify SHA256SUMS before deploying. Extract the selected archive into an empty folder and deploy that folder to the existing Cloudflare Pages project. Keep API_ORIGIN unchanged. No backend rollback or database reset is required.\n\nOpen windows are not force-reloaded. Online clients need to fetch the replacement worker; offline clients cannot be recalled instantly. Close/reopen or reload after the switch. Account data and saved-list storage are not cleared. Browser/installed-app storage may be separate on some platforms.\n\nUse docs/35-pwa-handover.md for full deployment, device checks and source recovery. Do not restore only pre-PWA website files after an app release: use the classic archive or publish its tombstone /sw.js too.\n`);
rmSync('apps/web/dist',{recursive:true,force:true});cpSync(`${staging}/pwa`,'apps/web/dist',{recursive:true});
console.log(`Both release flavors packaged in ${destination}; PWA restored as the deployment directory. Staging retained only for local fallback tests.`);
