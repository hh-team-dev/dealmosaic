/** Local-only test backend and production frontend. Never proxies production APIs. */
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const port=Number(process.env.PORT||5173);
const api='http://127.0.0.1:8787';
const health=await(await fetch(api+'/api/health')).json();
if(health.environment!=='test') throw new Error('Refusing a non-test backend');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain'};
createServer(async(req,res)=>{
 try {
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')) {
   const data=[];for await(const part of req)data.push(part);
   const headers={...req.headers,'x-forwarded-host':req.headers.host};delete headers.host;delete headers.connection; // Node fetch rewrites Host; preserve the browser-facing origin explicitly.
   const response=await fetch(api+url.pathname+url.search,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(data),redirect:'manual'});
   res.writeHead(response.status,Object.fromEntries([...response.headers].filter(([key])=>!['content-encoding','content-length','transfer-encoding'].includes(key))));res.end(Buffer.from(await response.arrayBuffer()));return;
 }
 const selected=existsSync('/tmp/dm-pwa-serve-root')?readFileSync('/tmp/dm-pwa-serve-root','utf8').trim():'apps/web/dist';
 const root=resolve(selected);let path=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 if(url.pathname==='/sw.js'&&existsSync('/tmp/dm-pwa-worker-override.js'))path='/tmp/dm-pwa-worker-override.js';
 if(existsSync(path)&&statSync(path).isDirectory())path+='/index.html';
 if(!existsSync(path)) {
  if(extname(url.pathname)){res.writeHead(404);res.end('Not found');return;}
  path=root+'/index.html';
 }
 res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','cache-control':'no-store','service-worker-allowed':'/'});res.end(readFileSync(path));
 } catch {res.writeHead(502);res.end('Isolated test server error');}
}).listen(port,'0.0.0.0',()=>console.log('Production PWA test preview on '+port+' with isolated test API'));
