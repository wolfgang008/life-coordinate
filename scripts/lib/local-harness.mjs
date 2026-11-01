// Isolated in-memory D1 adapter for regression and authorized local live verification.
// Never connects to the project's persistent or production database.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../../build/worker.js';
export async function localHarness(bindings={}){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const name of (await readdir(new URL('../../migrations/',import.meta.url))).sort())sql.exec(await readFile(new URL('../../migrations/'+name,import.meta.url),'utf8'));
 const db={sql,prepare(query){return {args:[],bind(...args){this.args=args;return this;},async run(){const r=sql.prepare(query).run(...this.args);return {meta:{changes:Number(r.changes)},success:true};},async first(){return sql.prepare(query).get(...this.args)||null;},async all(){return {results:sql.prepare(query).all(...this.args)};}};},async batch(statements){sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const env={DB:db,...bindings},tasks=[];let cookie='';
 return {db,env,async request(path,body){const response=await worker.fetch(new Request('http://127.0.0.1:8788'+path,{method:body?'POST':'GET',headers:{Origin:'http://127.0.0.1:8788','Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{waitUntil:p=>tasks.push(p)});if(response.headers.get('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];return response;},async close(){await Promise.allSettled(tasks);sql.close();}};
}
export async function readEvents(response){
 const value=await response.text();
 if(!response.ok)throw Error('Local API '+response.status);
 if(response.headers.get('content-type')?.includes('application/json'))return [JSON.parse(value)];
 return value.trim().split('\n').filter(Boolean).map(JSON.parse);
}
