import http from 'node:http';
import {readFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
let runtime;try{runtime=await import('miniflare');}catch{throw Error('本地预览需要依赖，请先安装本项目依赖后重试。');}
const {Miniflare}=runtime,convertV4MiniflareOptions=runtime.convertV4MiniflareOptions||((options)=>options);
const root=new URL('../',import.meta.url);await mkdir(new URL('.local/',root),{recursive:true});
const previewPort=Number(process.env.PREVIEW_PORT||8788);if(!Number.isInteger(previewPort)||previewPort<1024||previewPort>65535)throw Error('预览端口无效。');const previewURL='http://127.0.0.1:'+previewPort;
let privateConfig={};if(process.env.ENABLE_LIVE_AI==='1'){try{privateConfig=JSON.parse((await readFile(new URL('../.local/relay.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));}catch{}}
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:fileURLToPath(new URL('build/worker.js',root)),compatibilityDate:'2026-10-02',d1Databases:['DB'],d1Persist:fileURLToPath(new URL('.local/d1',root)),resourcePersistencePath:fileURLToPath(new URL('.local/runtime',root)),bindings:{API_KEY:process.env.ENABLE_LIVE_AI==='1'?(process.env.API_KEY||privateConfig.apiKey||''):'',API_BASE:process.env.API_BASE||privateConfig.apiBase||'https://api.openai-next.com/v1'}}));
const db=await mf.getD1Database('DB');for(const name of (await readdir(new URL('migrations/',root))).sort()){const sql=await readFile(new URL('migrations/'+name,root),'utf8');for(const stmt of sql.split(';').map(s=>s.trim()).filter(Boolean))if(!stmt.startsWith('PRAGMA'))await db.prepare(stmt).run();}
const server=http.createServer(async(req,res)=>{try{const parts=[];for await(const c of req)parts.push(c);const body=Buffer.concat(parts);const response=await mf.dispatchFetch(previewURL+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )});res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body){const reader=response.body.getReader();res.on('close',()=>{if(!res.writableEnded)reader.cancel().catch(()=>{});});for(;;){const r=await reader.read();if(r.done)break;if(res.destroyed)break;res.write(Buffer.from(r.value));}}res.end();}catch{if(!res.headersSent)res.writeHead(500);res.end('预览暂未完成。');}});
server.listen(previewPort,'127.0.0.1',()=>console.log('人生坐标本地预览：'+previewURL+(process.env.ENABLE_LIVE_AI==='1'&&(process.env.API_KEY||privateConfig.apiKey)?'（真实 AI 入口已启用，页面确认后调用）':'（当前使用本地规则预览）')));
process.on('SIGINT',async()=>{server.close();await mf.dispose();process.exit();});

