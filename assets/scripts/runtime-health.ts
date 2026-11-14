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
  private events:{type:string;at:number;detail:string}[]=[];
  private frames=0;
  private slowFrames=0;
  private maxFrameMs=0;
  private previous:unknown;
  private readonly memory=(event:unknown):void=>{this.pressure();this.record('memory-warning',event);};
  private readonly error=(event:unknown):void=>this.record('error',event);
  private readonly rejection=(event:unknown):void=>this.record('unhandled-rejection',event);
  constructor(private host:HealthHost|undefined,private storage:Storage,private version:string,
    private snapshot:()=>object,private pressure:()=>void) {
    try{const old=JSON.parse(storage.getItem(HEALTH_KEY)||'null');if(old)this.previous={version:old.version,snapshot:old.snapshot,events:old.events,frames:old.frames,slowFrames:old.slowFrames,maxFrameMs:old.maxFrameMs};}catch(_){/* optional persistence */}
    host?.onMemoryWarning?.(this.memory);host?.onError?.(this.error);host?.onUnhandledRejection?.(this.rejection);
  }
  frame(seconds:number):void {
    if(!Number.isFinite(seconds)||seconds<0)return;
    this.frames++;if(seconds>1/30)this.slowFrames++;this.maxFrameMs=Math.max(this.maxFrameMs,seconds*1000);
    this.seconds+=seconds;if(this.seconds>=5){this.seconds%=5;this.save();}
  }
  record(type:string,event?:unknown):void {
    let detail='';
    try{
      const value=event as {message?:unknown;stack?:unknown;errMsg?:unknown;reason?:unknown;level?:unknown}|undefined;
      const reason=value?.reason as {message?:unknown;stack?:unknown}|undefined;
      const message=typeof event==='string'?event:value?.stack??value?.message??value?.errMsg??reason?.stack??reason?.message??value?.reason;
      // Never serialize a whole Promise/native error graph under memory pressure.
      detail=(typeof message==='string'?message:typeof value?.level==='number'?'level='+value.level:'').slice(0,1000);
    }catch(_){detail='unreadable';}
    this.events.push({type,at:Date.now(),detail});if(this.events.length>8)this.events.shift();this.save();
  }
  private save():void {
    try{this.storage.setItem(HEALTH_KEY,JSON.stringify({version:this.version,snapshot:this.snapshot(),frames:this.frames,
      slowFrames:this.slowFrames,maxFrameMs:Math.round(this.maxFrameMs),events:this.events,previous:this.previous}));}catch(_){/* diagnostics must never break the game */}
  }
  destroy():void {this.host?.offMemoryWarning?.(this.memory);this.host?.offError?.(this.error);this.host?.offUnhandledRejection?.(this.rejection);}
}
