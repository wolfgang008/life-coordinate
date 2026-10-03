import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const cfg=JSON.parse((await readFile(new URL('../.local/relay.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','put','API_KEY'],{cwd:new URL('../',import.meta.url),stdio:['pipe','pipe','pipe'],windowsHide:true});
child.stdin.end(cfg.apiKey+'\n');child.stdout.on('data',c=>process.stdout.write(c));child.stderr.on('data',c=>process.stderr.write(c));child.on('exit',code=>{process.exitCode=code||0;});
