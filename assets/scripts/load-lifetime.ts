/** A real-time, one-shot operation. Cancellation and late/duplicate results are explicit. */
export function boundedCall<T>(start:(done:(error:Error|null,value?:T)=>void)=>void,
 done:(error:Error|null,value?:T)=>void,ms=18000,late?:(value:T)=>void):()=>void {
 let settled=false,accepted:T|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 const finish=(error:Error|null,value?:T)=>{
  if(settled){if(value!==undefined&&value!==accepted)late?.(value);return;}
  settled=true;accepted=value;if(timer!==undefined)clearTimeout(timer);done(error,value);
 };
 if(typeof setTimeout==='function')timer=setTimeout(()=>finish(new Error('资源加载超时，请重试')),ms);
 try{start(finish);}catch(error){if(!settled)finish(error instanceof Error?error:new Error(String(error)));else console.warn('资源完成回调异常',error);}
 return ()=>finish(new Error('已取消资源请求'));
}
export function notifySafely(action:()=>void):void {try{action();}catch(error){console.warn('资源订阅者异常',error);}}
