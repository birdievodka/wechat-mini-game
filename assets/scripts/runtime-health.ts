/** Small local flight recorder. It observes failures; it never catches/continues broken combat. */
export interface HealthHost {
  onMemoryWarning?:(fn:(event:unknown)=>void)=>void; offMemoryWarning?:(fn:(event:unknown)=>void)=>void;
  onError?:(fn:(event:unknown)=>void)=>void; offError?:(fn:(event:unknown)=>void)=>void;
  onUnhandledRejection?:(fn:(event:unknown)=>void)=>void; offUnhandledRejection?:(fn:(event:unknown)=>void)=>void;
}
interface Storage { getItem(key:string):string|null; setItem(key:string,value:string):void; }
type Snapshot=Record<string,unknown>;
interface Sample {at:number;state:Snapshot;}
const TREND_KEYS=['phase','mode','endlessTier','seconds','sessionSeconds','enemyNodes','alive','projectileNodes','activeProjectiles','enemyShotNodes','activeEnemyShots','particles','gfxBuffers','gfxTextures','drawCalls','triangles','bossAtlases','bossActions','sfxErrors','nativeFiles','vfxQuads','vfxAllocated','trainingView','trainingCasts','skillVisuals'] as const;
export const HEALTH_KEY='taoyuan-runtime-health';
export class RuntimeHealth {
  private seconds=0;
  private events:{type:string;at:number;lastAt:number;detail:string;first:string;count:number}[]=[];
  private frames=0;private slowFrames=0;private maxFrameMs=0;private previous:unknown;
  private dirty=false;private writing=false;private closed=false;private lastSave=-Infinity;
  private flushTimer:ReturnType<typeof setTimeout>|undefined;
  private readonly startedAt=Date.now();private savedAt=0;
  private recent:Sample[]=[];private peak:Record<string,number>={};
  private lastSnapshot:Snapshot={};private battleSnapshot:Snapshot|undefined;private battleSavedAt=0;
  private persistence={failures:0,lastError:'',lastSuccessAt:0};
  private detach:(()=>void)[]=[];
  private readonly memory=(event:unknown):void=>{try{this.pressure();}finally{this.record('memory-warning',event);}};
  private readonly error=(event:unknown):void=>this.record('error',event);
  private readonly rejection=(event:unknown):void=>this.record('unhandled-rejection',event);
  constructor(private host:HealthHost|undefined,private storage:Storage,private version:string,
    private snapshot:()=>object,private pressure:()=>void) {
    try{const text=storage.getItem(HEALTH_KEY)||'null';const old=text.length<64000?JSON.parse(text):null;
      // Reopening only to inspect settings must not overwrite the last battle record.
      const source=old&&(old.battleSnapshot?.phase==='battle'||old.snapshot?.phase==='battle'||old.peak?.battleSeconds>0||old.snapshot?.seconds>0||!old.previous?old:old.previous);
      if(source)this.previous={version:source.version,startedAt:source.startedAt,savedAt:source.battleSavedAt||source.savedAt,snapshot:source.battleSnapshot||source.snapshot,events:source.events,frames:source.frames,slowFrames:source.slowFrames,maxFrameMs:source.maxFrameMs,recent:source.recent,peak:source.peak,persistence:source.persistence};
    }catch(_){/* optional persistence */}
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
    try{const snapshot=this.safeSnapshot();this.savedAt=this.lastSave;
      for(const key of ['gfxBuffers','gfxTextures','enemyNodes','projectileNodes','enemyShotNodes','drawCalls','triangles']){const n=snapshot[key];if(typeof n==='number'&&Number.isFinite(n))this.peak[key]=Math.max(this.peak[key]||0,n);}
      if(snapshot.phase==='battle'&&typeof snapshot.seconds==='number'){this.peak.battleSeconds=Math.max(this.peak.battleSeconds||0,snapshot.seconds);this.battleSnapshot=snapshot;this.battleSavedAt=this.savedAt;}
      if(force){const state:Snapshot={};for(const key of TREND_KEYS)if(snapshot[key]!==undefined)state[key]=snapshot[key];this.recent.push({at:this.savedAt,state});if(this.recent.length>18)this.recent.shift();}
      this.storage.setItem(HEALTH_KEY,JSON.stringify(this.payload(snapshot)));this.persistence.lastSuccessAt=this.savedAt;this.dirty=false;
    }catch(error){this.dirty=true;this.persistence.failures++;try{this.persistence.lastError=String(error).slice(0,180);}catch(_){this.persistence.lastError='存储写入失败';}}finally{this.writing=false;}
  }
  private payload(snapshot:object):object{return {version:this.version,startedAt:this.startedAt,savedAt:this.savedAt,snapshot,frames:this.frames,slowFrames:this.slowFrames,maxFrameMs:Math.round(this.maxFrameMs),events:this.events,recent:this.recent,peak:this.peak,battleSnapshot:this.battleSnapshot,battleSavedAt:this.battleSavedAt,persistence:this.persistence,previous:this.previous};}
  private safeSnapshot():Snapshot {
    try{return this.lastSnapshot=this.snapshot() as Snapshot;}
    catch(error){return {...this.lastSnapshot,snapshotError:String(error).slice(0,240)};}
  }
  /** Local, bounded observations; an interrupted session is not proof of a crash. */
  report():string {
    try{return JSON.stringify({format:'taoyuan-health-1',...this.payload(this.safeSnapshot())});}
    catch(error){return JSON.stringify({format:'taoyuan-health-1',version:this.version,exportError:String(error).slice(0,240),previous:this.previous});}
  }
  destroy():void {if(this.closed)return;this.flush();this.closed=true;if(this.flushTimer!==undefined)clearTimeout(this.flushTimer);this.flushTimer=undefined;for(const off of this.detach)try{off();}catch(_){/* one failed off must not block remaining cleanup */}this.detach=[];}
}
