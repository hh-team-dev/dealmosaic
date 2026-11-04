/** Build the additive PWA or a network-only rollback from the SAME application tree. */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const root = 'apps/web/dist';
const mode = process.env.VITE_PWA_MODE === 'classic' ? 'classic' : 'pwa';
const version = JSON.parse(readFileSync('package.json','utf8')).version;
const shellPath = join(root, 'pwa-shell.html');
let shell = readFileSync(join(root, 'index.html'), 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>DealMosaic — reconnect or open saved deals</title>')
  .replace(/<meta\s+name="robots"[^>]*>/, '<meta name="robots" content="noindex,nofollow">')
  .replace(/<link rel="canonical"[^>]*>/, '')
  .replace('<div id="root"></div>', '<div id="root"><h1>Opening DealMosaic</h1><p>Your saved list can be read offline after this app is prepared. Live prices, checkout, account changes and owner controls need a connection. No order or payment is queued. Reconnect to retrieve current information.</p></div>')
  .replace('</head>', '<script>window.__DM_OFFLINE_SHELL__=true;</script></head>');
writeFileSync(shellPath, shell);
mkdirSync(join(root, 'install'), { recursive: true });
writeFileSync(join(root, 'install/index.html'), readFileSync(join(root, 'index.html'), 'utf8')
 .replace(/<title>[\s\S]*?<\/title>/, '<title>Install DealMosaic · app settings</title>')
 .replace(/<meta\s+name="robots"[^>]*>/, '<meta name="robots" content="noindex,follow">')
 .replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="https://dealmosaic.pages.dev/install">')
 .replace('<div id="root"></div>', '<div id="root"><main><h1>Add DealMosaic to your home screen</h1><p>The same website and account, one tap away. In Safari on iPhone or iPad, choose Share, Add to Home Screen, and Open as Web App when available. On Android, look for Install app or Add to Home screen in the browser menu. Live prices, shipping, checkout and account changes need a connection. Installation does not enable push notifications.</p></main></div>')); 
const assets = ['/pwa-shell.html', ...readdirSync(join(root,'assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'/assets/'+f),
  '/fonts/Outfit.woff2','/fonts/Plus-Jakarta-Sans.woff2','/favicon.svg', '/apple-touch-icon.png',
  '/brand/dm-icon-192.png','/brand/dm-icon-512.png','/brand/dm-icon-maskable-512.png'];
const bytes = assets.reduce((n,path)=>n+statSync(join(root,path)).size,0);
if(bytes>4*1024*1024) throw new Error('Offline release exceeds the 4 MiB budget');
const workerTemplate=readFileSync(mode==='classic'?'apps/web/pwa/classic-worker.js':'apps/web/pwa/worker.js','utf8');
const hash=createHash('sha256');hash.update(mode).update(version).update(workerTemplate);for(const path of assets) hash.update(path).update(readFileSync(join(root,path)));
const build=version+'-'+hash.digest('hex').slice(0,12);
const config={version,build,mode,assets,precacheBytes:bytes,cachePolicy:'static-only; API/network-only; no mutation replay'};
const worker = mode==='classic' ? readFileSync('apps/web/pwa/classic-worker.js','utf8') : readFileSync('apps/web/pwa/worker.js','utf8').replace('__DM_PWA_CONFIG__',JSON.stringify(config));
writeFileSync(join(root,'sw.js'),worker);
writeFileSync(join(root,'pwa-release.json'),JSON.stringify(config,null,2)+'\n');
if(mode==='classic') {
 const manifest=JSON.parse(readFileSync(join(root,'manifest.webmanifest'),'utf8'));manifest.display='browser';writeFileSync(join(root,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
}
console.log(`PWA ${version}: ${mode}, ${assets.length} static assets, ${bytes} bytes, build ${build}`);
