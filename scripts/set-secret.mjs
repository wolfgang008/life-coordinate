import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {officialBase} from '../src/ai.mjs';
// Local live-test consent does not authorize publishing secrets.
if(!process.argv.includes('--production-approved'))throw Error('写入线上 Secret 前需要用户授权；确认后显式传入 --production-approved。');
try{
 const cfg=JSON.parse((await readFile(new URL('../.local/deepseek.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
 officialBase(cfg.apiBase);
 if(typeof cfg.apiKey!=='string'||!/^sk-[A-Za-z0-9_-]{20,200}$/.test(cfg.apiKey))throw Error();
 const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','put','API_KEY'],{cwd:new URL('../',import.meta.url),stdio:['pipe','pipe','pipe'],windowsHide:true});
 child.stdout.resume();child.stderr.resume();child.stdin.on('error',()=>{});child.stdin.end(cfg.apiKey+'\n');
 child.on('error',()=>{console.error('线上 Secret 写入未完成，凭据未输出。');process.exitCode=1;});
 child.on('exit',code=>{console.log(code===0?'线上 Secret 已写入。':'线上 Secret 写入失败，凭据未输出。');process.exitCode=code||0;});
}catch{console.error('请检查本地官方密钥配置。凭据未输出，未写入线上。');process.exitCode=1;}
