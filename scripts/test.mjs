import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
for(const args of [['scripts/build.mjs'],['--test','scripts/server.test.mjs','scripts/regression.test.mjs','scripts/profiling.test.mjs','scripts/interview-choice.test.mjs']]){
 const result=spawnSync(process.execPath,args,{cwd,stdio:'inherit'});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status||1);
}
