/** Small local flight recorder. It observes failures; it never catches/continues broken combat. */
export interface HealthHost {
  onMemoryWarning?:(fn:(event:unknown)=>void)=>void; offMemoryWarning?:(fn:(event:unknown)=>void)=>void;
  onError?:(fn:(event:unknown)=>void)=>void; offError?:(fn:(event:unknown)=>void)=>void;
  onUnhandledRejection?:(fn:(event:unknown)=>void)=>void; offUnhandledRejection?:(fn:(event:unknown)=>void)=>void;
}
interface Storage { getItem(key:string):string|null; setItem(key:string,value:string):void; }
export const HEALTH_KEY='taoyuan-runtime-health';
export class RuntimeHealth {
  private seconds=0;
  private events:{type:string;at:number;lastAt:number;detail:string;first:string;count:number}[]=[];
  private frames=0;private slowFrames=0;private maxFrameMs=0;private previous:unknown;
  private dirty=false;private writing=false;private closed=false;private lastSave=-Infinity;
  private flushTimer:ReturnType<typeof setTimeout>|undefined;
  private detach:(()=>void)[]=[];
  private readonly memory=(event:unknown):void=>{try{this.pressure();}finally{this.record('memory-warning',event);}};
  private readonly error=(event:unknown):void=>this.record('error',event);
  private readonly rejection=(event:unknown):void=>this.record('unhandled-rejection',event);
  constructor(private host:HealthHost|undefined,private storage:Storage,private version:string,
    private snapshot:()=>object,private pressure:()=>void) {
    try{const text=storage.getItem(HEALTH_KEY)||'null';const old=text.length<64000?JSON.parse(text):null;if(old)this.previous={version:old.version,snapshot:old.snapshot,events:old.events,frames:old.frames,slowFrames:old.slowFrames,maxFrameMs:old.maxFrameMs};}catch(_){/* optional persistence */}
    for(const [on,off,fn] of [['onMemoryWarning','offMemoryWarning',this.memory],['onError','offError',this.error],['onUnhandledRejection','offUnhandledRejection',this.rejection]] as const){
      try{if(host?.[on]){host[on]!(fn);this.detach.push(()=>host[off]?.(fn));}}catch(_){/* each optional host hook is independent */}
    }
  }
  frame(seconds:number):void {
    if(this.closed||!Number.isFinite(seconds)||seconds<0)return;
    this.frames++;if(seconds>1/30)this.slowFrames++;this.maxFrameMs=Math.max(this.maxFrameMs,seconds*1000);
    this.seconds+=seconds;if(this.seconds>=5){this.seconds%=5;this.flush(true);}
  }
  record(type:string,event?:unknown):void {
    if(this.closed||this.writing)return;let detail='';
    try{
      const value=event as {message?:unknown;stack?:unknown;errMsg?:unknown;reason?:unknown;level?:unknown}|undefined;
      const reason=value?.reason as {message?:unknown;stack?:unknown}|undefined;
      const message=typeof event==='string'?event:value?.stack??value?.message??value?.errMsg??reason?.stack??reason?.message??value?.reason;
      detail=(typeof message==='string'?message:typeof value?.level==='number'?'level='+value.level:'').slice(0,1000);
    }catch(_){detail='unreadable';}
    const now=Date.now(),old=this.events.find(e=>e.type===type);
    if(old){old.lastAt=now;old.detail=detail;old.count++;}else{this.events.push({type:type.slice(0,80),at:now,lastAt:now,detail,first:detail,count:1});if(this.events.length>8)this.events.shift();}
    this.dirty=true;
    if((!old&&['error','unhandled-rejection','memory-warning'].includes(type))||now-this.lastSave>=1000)this.flush();
    else if(this.flushTimer===undefined&&typeof setTimeout==='function')this.flushTimer=setTimeout(()=>{this.flushTimer=undefined;this.flush();},1000);
  }
  flush(force=false):void {
    if(this.writing||(!this.dirty&&!force))return;this.writing=true;this.lastSave=Date.now();
    if(this.flushTimer!==undefined){clearTimeout(this.flushTimer);this.flushTimer=undefined;}
    try{this.storage.setItem(HEALTH_KEY,JSON.stringify({version:this.version,snapshot:this.snapshot(),frames:this.frames,
      slowFrames:this.slowFrames,maxFrameMs:Math.round(this.maxFrameMs),events:this.events,previous:this.previous}));this.dirty=false;}catch(_){/* diagnostics must never break the game */}finally{this.writing=false;}
  }
  destroy():void {if(this.closed)return;this.flush();this.closed=true;if(this.flushTimer!==undefined)clearTimeout(this.flushTimer);this.flushTimer=undefined;for(const off of this.detach)try{off();}catch(_){/* one failed off must not block remaining cleanup */}this.detach=[];}
}
