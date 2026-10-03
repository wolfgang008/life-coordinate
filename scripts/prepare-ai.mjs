import {readFile,writeFile,rename} from 'node:fs/promises';
import {aiConfig} from '../src/ai.mjs';

const root=new URL('../',import.meta.url);
class PreparationError extends Error {}
async function prepare(){
  let raw;
  try{raw=await readFile(new URL('.local/relay.json',root),'utf8');}
  catch{throw new PreparationError('未找到本地私密配置 .local/relay.json。请在私密配置中提供 apiKey 和 apiBase。');}
  let config;
  try{config=JSON.parse(raw.replace(/^\uFEFF/,''));}
  catch{throw new PreparationError('本地私密配置不是有效 JSON。未输出原始内容。');}
  const apiKey=typeof config.apiKey==='string'?config.apiKey.trim():'';
  if(apiKey.length<20||apiKey.length>500||/[\s\x00-\x1f\x7f]/.test(apiKey))throw new PreparationError('apiKey 缺失或格式不正确。未输出密钥。');
  let base;
  try{base=new URL(config.apiBase);}
  catch{throw new PreparationError('apiBase 缺失或格式不正确。');}
  if(base.protocol!=='https:'||base.hostname!=='api.openai-next.com'||base.port||base.username||base.password||base.search||base.hash||!['','/','/v1','/v1/'].includes(base.pathname))throw new PreparationError('apiBase 必须是用户指定网关的 HTTPS 根地址或 /v1 地址。');
  const apiBase='https://api.openai-next.com/v1';
  const ignore=await readFile(new URL('.gitignore',root),'utf8');
  if(!ignore.split(/\r?\n/).some(line=>['.dev.vars*','.dev.vars'].includes(line.trim())))throw new PreparationError('.dev.vars 尚未加入忽略规则，未写入凭据。');
  let previous='';
  try{previous=await readFile(new URL('.dev.vars',root),'utf8');}
  catch(error){if(error.code!=='ENOENT')throw new PreparationError('无法读取现有 .dev.vars，未覆盖配置。');}
  const retained=previous.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>!/^\s*(?:export\s+)?API_(KEY|BASE)\s*=/.test(line)).join('\n').trimEnd();
  const content=(retained?retained+'\n':'')+'API_BASE='+JSON.stringify(apiBase)+'\nAPI_KEY='+JSON.stringify(apiKey)+'\n';
  const temporary=new URL('.dev.vars.tmp',root);
  await writeFile(temporary,content,{encoding:'utf8',mode:0o600});
  await rename(temporary,new URL('.dev.vars',root));
  const ready=aiConfig({API_KEY:apiKey,API_BASE:apiBase}).ready;
  console.log(JSON.stringify({prepared:true,gatewayHost:base.hostname,apiBase,privateSource:'.local/relay.json',wranglerConfig:'.dev.vars',localModelConfigReady:ready,networkRequested:false,secretsPrinted:false}));
}
prepare().catch(error=>{console.error(error instanceof PreparationError?error.message:'AI 配置准备未完成。请检查私密配置文件的读写权限；凭据未输出。');process.exitCode=1;});
