import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=new URL('../',import.meta.url),mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',json:'application/json; charset=utf-8'};
const assets={};
async function collect(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){const name=prefix+entry.name;if(entry.isDirectory())await collect(new URL(entry.name+'/',dir),name+'/');else{const content=await readFile(new URL(entry.name,dir),'utf8');assets['/'+name]={content,type:mime[name.split('.').at(-1)]||'text/plain',etag:'"'+createHash('sha256').update(content).digest('hex').slice(0,24)+'"'};}}}
await collect(new URL('public/',root));await mkdir(new URL('build/',root),{recursive:true});
const bundled=await build({entryPoints:[fileURLToPath(new URL('src/worker.mjs',root))],bundle:true,write:false,format:'esm',target:'es2022',platform:'browser'});
await writeFile(new URL('build/worker.js',root),bundled.outputFiles[0].text.replace('__EMBEDDED_ASSETS__',JSON.stringify(assets)));
console.log('Workers 完整依赖与 '+Object.keys(assets).length+' 项递归静态资源已构建。');
