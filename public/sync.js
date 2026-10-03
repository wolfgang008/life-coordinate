// Each route has its own debounce slot; requests run serially for revision safety.
export function createWorkQueue(send,onError,delay=650){
 const timers=new Map();let chain=Promise.resolve();
 function run(key,args){clearTimeout(timers.get(key)?.timer);timers.delete(key);chain=chain.then(()=>send(...args)).catch(onError);return chain;}
 return {
  enqueue(id,routeId){const key=id+':'+routeId;clearTimeout(timers.get(key)?.timer);const args=[id,routeId];timers.set(key,{args,timer:setTimeout(()=>run(key,args),delay)});},
  flush(){for(const [key,{args}] of [...timers])run(key,args);return chain;},
  cancel(){for(const {timer} of timers.values())clearTimeout(timer);timers.clear();},
  idle(){return chain;}
 };
}
