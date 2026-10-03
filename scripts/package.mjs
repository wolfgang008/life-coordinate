import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),delivery=new URL('../交付包_人生坐标_v5/',root);await mkdir(delivery,{recursive:true});
const copy=async(from,to)=>{await mkdir(new URL('.',to),{recursive:true});await copyFile(from,to);};
for(const dir of ['public','src','migrations']){await mkdir(new URL(dir+'/',delivery),{recursive:true});for(const name of await readdir(new URL(dir+'/',root)))await copy(new URL(dir+'/'+name,root),new URL(dir+'/'+name,delivery));}
for(const name of ['package.json','wrangler.toml','.gitignore','README.md','deploy.cmd','test.cmd','start-local.cmd','start-ai.cmd'])await copy(new URL(name,root),new URL(name,delivery));
await copy(new URL('../人生坐标_最终重构执行方案.md',root),new URL('文档/最终重构执行方案.md',delivery));
await copy(new URL('../docs/原始产品规划.md',root),new URL('文档/原始产品规划.md',delivery));
const deliveryReadme=(await readFile(new URL('README.md',root),'utf8')).replace('../人生坐标_最终重构执行方案.md','文档/最终重构执行方案.md').replace(/历史材料已集中到\[恢复归档\]\([^\n]+/,'历史材料位于原工作区 archive 目录，内含源码恢复位置与校验清单；此交付包不携带历史归档。旧部署说明和检查结果只适用于历史版本。');
await writeFile(new URL('README.md',delivery),deliveryReadme);
await mkdir(new URL('build/',delivery),{recursive:true});await copy(new URL('build/worker.js',root),new URL('build/worker.js',delivery));await copy(new URL('build/worker.js',root),new URL('worker.js',delivery));
await mkdir(new URL('scripts/',delivery),{recursive:true});for(const name of ['build.mjs','server.test.mjs','regression.test.mjs','test.mjs','preview.mjs','prepare-ai.mjs'])await copy(new URL('scripts/'+name,root),new URL('scripts/'+name,delivery));
await mkdir(new URL('验收报告/',delivery),{recursive:true});for(const name of await readdir(new URL('qa/',root))){if(['当前状态与整理记录.md','重构验收记录.md'].includes(name))await copy(new URL('qa/'+name,root),new URL('验收报告/'+name,delivery));}
const manifest=[];async function inspect(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name==='文件校验清单.json')continue;const name=prefix+entry.name,path=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())await inspect(path,name+'/');else{const b=await readFile(path);manifest.push({file:name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}await inspect(delivery);
for(const f of manifest){const b=await readFile(new URL(f.file,delivery));if(/sk-[A-Za-z0-9_-]{24,}/.test(b.toString('utf8')))throw Error('交付文件含疑似密钥：'+f.file);if(/(?:^|\/)(?:\.local|\.wrangler|node_modules|\.dev\.vars)/.test(f.file))throw Error('不允许的交付文件。');}
await writeFile(new URL('文件校验清单.json',delivery),JSON.stringify({product:'人生坐标',version:'5.0.0',deployment:'https://life.wolfx.top',deploymentRecord:'主项目 qa/当前状态与整理记录.md',checked:new Date().toISOString(),secretsIncluded:false,files:manifest},null,2));console.log('完整 Workers 交付包已准备：'+manifest.length+' 个文件；密钥扫描通过。');console.log(fileURLToPath(delivery));


