/** Small local flight recorder. It observes failures; it never catches/continues broken combat. */
interface RealtimeLogger {
  info(payload:object):void;
  error(payload:object):void;
}
export interface HealthHost {
  getRealtimeLogManager?:()=>RealtimeLogger;
  onMemoryWarning?:(fn:(event:unknown)=>void)=>void; offMemoryWarning?:(fn:(event:unknown)=>void)=>void;
  onError?:(fn:(event:unknown)=>void)=>void; offError?:(fn:(event:unknown)=>void)=>void;
  onUnhandledRejection?:(fn:(event:unknown)=>void)=>void; offUnhandledRejection?:(fn:(event:unknown)=>void)=>void;
}
interface Storage { getItem(key:string):string|null; setItem(key:string,value:string):void; }
type Handler=(event:unknown)=>void;
function listenToHealth(host:HealthHost|undefined,memory:Handler,error:Handler,rejection:Handler):(()=>void)[] {
  const detach:(()=>void)[]=[];
  for(const [on,off,fn] of [['onMemoryWarning','offMemoryWarning',memory],['onError','offError',error],['onUnhandledRejection','offUnhandledRejection',rejection]] as const){
    try{if(host?.[on]){host[on]!(fn);detach.push(()=>host[off]?.(fn));}}catch(_){/* each optional host hook is independent */}
  }
  return detach;
}
function eventDetail(event:unknown):string {
  let detail='';
  try{
    const value=event as {message?:unknown;stack?:unknown;errMsg?:unknown;reason?:unknown;level?:unknown}|undefined;
    const reason=value?.reason as {message?:unknown;stack?:unknown}|undefined;
    const message=typeof event==='string'?event:value?.stack??value?.message??value?.errMsg??reason?.stack??reason?.message??value?.reason;
    detail=(typeof message==='string'?message:typeof value?.level==='number'?'level='+value.level:'').slice(0,1000);
  }catch(_){detail='unreadable';}
  return detail;
}

export const RELEASE_MARKER_KEY='taoyuan-release-checkpoint';
type ReleaseEvent='error'|'unhandled-rejection'|'memory-warning'|'webgl-context-lost'|'resource-failed';
type ReleaseStep='start'|'wave'|'mini-boss'|'boss'|'victory'|'defeat';
interface ReleaseContext { mode:'stage'|'endless'|'menu'; phase:string; stage:number; wave:number; }

/** Release and trial use only host events and committed game transitions. */
export class ReleaseHealth {
  private logger?:RealtimeLogger;
  private detach:(()=>void)[];
  private closed=false;
  private reporting=false;
  private readonly sent=new Map<string,number>();

  constructor(host:HealthHost,private storage:Storage,private version:string,
    private context:()=>ReleaseContext,pressure:()=>void){
    try{this.logger=host.getRealtimeLogManager?.();}catch(_){/* optional host capability */}
    this.detach=listenToHealth(host,event=>{
      if(this.closed)return;
      try{pressure();}finally{this.record('memory-warning',event);}
    },event=>this.record('error',event),event=>this.record('unhandled-rejection',event));
  }

  checkpoint(step:ReleaseStep):void {
    if(this.closed)return;
    const entry={version:this.version,at:Date.now(),step,...this.context()};
    try{this.storage.setItem(RELEASE_MARKER_KEY,JSON.stringify(entry));}catch(_){/* independent of remote log */}
    try{this.logger?.info(entry);}catch(_){/* logging must never interrupt admission or settlement */}
  }

  record(type:ReleaseEvent,event?:unknown):void {
    if(this.closed||this.reporting||!this.logger)return;
    this.reporting=true;
    try{
      const now=Date.now();
      this.sent.forEach((at,key)=>{if(now-at>=60000||now<at)this.sent.delete(key);});
      if(this.sent.size>=8)return;
      const detail=eventDetail(event).slice(0,800)
        .replace(/(?:https?:|wxfile:)\/\/[^\s)]+/gi,'[url]')
        .replace(/([?&](?:token|openid|access_token|session_key)=)[^&\s)]+/gi,'$1[redacted]');
      const key=type+' '+detail;
      if(this.sent.has(key))return;
      this.sent.set(key,now);
      this.logger.error({version:this.version,at:now,type,detail,...this.context()});
    }catch(_){/* unsupported or failing logger must not trigger a retry loop */}
    finally{this.reporting=false;}
  }

  destroy():void {
    this.closed=true;
    for(const off of this.detach)try{off();}catch(_){/* independent listeners */}
    this.detach=[];this.sent.clear();this.logger=undefined;
  }
}
type Snapshot=Record<string,unknown>;
interface Sample {at:number;state:Snapshot;}
const TREND_KEYS=['phase','mode','endlessTier','seconds','sessionSeconds','enemyNodes','alive','projectileNodes','activeProjectiles','enemyShotNodes','activeEnemyShots','particles','gfxBuffers','gfxTextures','drawCalls','triangles','bossAtlases','bossActions','bossAreas','bossShots','sfxPlayed','sfxSourceWrites','sfxVolumeWrites','sfxStops','sfxErrors','nativeFiles','vfxQuads','vfxAllocated','trainingView','trainingCasts','skillVisuals'] as const;
export const HEALTH_KEY='taoyuan-runtime-health';
export const SUPPLY_TRACE_KEY='taoyuan-supply-trace';
export type SupplyStep='open'|'refresh'|'buy'|'manage'|'normal'|'continue'|'shop-drawn'|'battle-drawn'|'declined';
export interface SupplyTrace {
  version:string;
  steps:{at:number;step:SupplyStep;mode:'stage'|'endless';round:number}[];
}
const SUPPLY_TRACE_LIMIT=8;
const FRAME_BUCKET_MS=[8,12,17,20,25,34,50,75,100,150,250,500,1000,Infinity];
type FrameMode='stage'|'endless'|'training'|'shop'|'other';
export class RuntimeHealth {
  private readonly frameBuckets:Partial<Record<FrameMode,Uint32Array>>={};
  private framePercentiles(){
    const result:Record<string,object>={};
    for(const [mode,buckets] of Object.entries(this.frameBuckets)){
      const count=buckets.reduce((a,b)=>a+b,0);
      const percentile=(fraction:number)=>{
        let seen=0;
        for(let i=0;i<buckets.length;i++)if((seen+=buckets[i])>=Math.ceil(count*fraction))return FRAME_BUCKET_MS[i]===Infinity?'>1000':FRAME_BUCKET_MS[i];
      };
      result[mode]={count,p95UpperMs:percentile(.95),p99UpperMs:percentile(.99)};
    }
    return result;
  }
  private seconds=0;
  private events:{type:string;at:number;lastAt:number;detail:string;first:string;count:number}[]=[];
  private frames=0;private slowFrames=0;private maxFrameMs=0;private previous:unknown;
  private dirty=false;private writing=false;private closed=false;private lastSave=-Infinity;
  private flushTimer:ReturnType<typeof setTimeout>|undefined;
  private periodicQueued=false;
  private readonly startedAt=Date.now();private savedAt=0;
  private recent:Sample[]=[];private peak:Record<string,number>={};
  private supply?:SupplyTrace;
  private previousSupply?:SupplyTrace;
  private lastSnapshot:Snapshot={};private battleSnapshot:Snapshot|undefined;private battleSavedAt=0;
  private persistence={failures:0,lastError:'',lastSuccessAt:0};
  private detach:(()=>void)[]=[];
  private readonly memory=(event:unknown):void=>{try{this.pressure();}finally{this.record('memory-warning',event);}};
  private readonly error=(event:unknown):void=>this.record('error',event);
  private readonly rejection=(event:unknown):void=>this.record('unhandled-rejection',event);
  constructor(private host:HealthHost|undefined,private storage:Storage,private version:string,
    private snapshot:()=>object,private pressure:()=>void,private deferRoutineWrites=false) {
    try{const text=storage.getItem(HEALTH_KEY)||'null';const old=text.length<64000?JSON.parse(text):null;
      // Reopening only to inspect settings must not overwrite the last battle record.
      const source=old&&(old.battleSnapshot?.phase==='battle'||old.snapshot?.phase==='battle'||old.peak?.battleSeconds>0||old.snapshot?.seconds>0||!old.previous?old:old.previous);
      if(source)this.previous={version:source.version,startedAt:source.startedAt,savedAt:source.battleSavedAt||source.savedAt,snapshot:source.battleSnapshot||source.snapshot,events:source.events,frames:source.frames,slowFrames:source.slowFrames,maxFrameMs:source.maxFrameMs,frameTimes:source.frameTimes,recent:source.recent,peak:source.peak,persistence:source.persistence};
    }catch(_){/* optional persistence */}
    try{
      const raw=storage.getItem(SUPPLY_TRACE_KEY);
      const trace:SupplyTrace|undefined=raw&&raw.length<2048?JSON.parse(raw):undefined;
      if(typeof trace?.version==='string'&&Array.isArray(trace.steps)&&trace.steps.length<=SUPPLY_TRACE_LIMIT)this.previousSupply=trace;
    }catch(_){/* the main runtime report remains available */}
    this.detach=listenToHealth(host,this.memory,this.error,this.rejection);
  }
  markSupply(step:SupplyStep,mode:'stage'|'endless',round:number):void {
    if(this.closed)return;
    const trace=this.supply??={version:this.version,steps:[]};
    trace.steps.push({at:Date.now(),step,mode,round});
    if(trace.steps.length>SUPPLY_TRACE_LIMIT)trace.steps.shift();
    // Save the handoff even when the process exits before the next five-second census.
    try{this.storage.setItem(SUPPLY_TRACE_KEY,JSON.stringify(trace));}catch(_){/* diagnostic only */}
  }
  frame(seconds:number,mode:FrameMode='other'):void {
    if(this.closed||!Number.isFinite(seconds)||seconds<0)return;
    const buckets=this.frameBuckets[mode]||(this.frameBuckets[mode]=new Uint32Array(FRAME_BUCKET_MS.length));
    let bucket=0;while(seconds*1000>FRAME_BUCKET_MS[bucket])bucket++;buckets[bucket]++;
    this.frames++;if(seconds>1/30)this.slowFrames++;this.maxFrameMs=Math.max(this.maxFrameMs,seconds*1000);
    this.seconds+=seconds;
    if(this.seconds>=5){
      this.seconds%=5;
      if(this.deferRoutineWrites&&typeof setTimeout==='function'){
        if(!this.periodicQueued){this.periodicQueued=true;this.scheduleFlush(0,true);}
      }else this.flush(true);
    }
  }
  record(type:string,event?:unknown):void {
    if(this.closed||this.writing)return;const detail=eventDetail(event);
    const now=Date.now(),old=this.events.find(e=>e.type===type);
    if(old){old.lastAt=now;old.detail=detail;old.count++;}else{this.events.push({type:type.slice(0,80),at:now,lastAt:now,detail,first:detail,count:1});if(this.events.length>8)this.events.shift();}
    this.dirty=true;
    const urgent=!old&&['error','unhandled-rejection','memory-warning','webgl-context-lost'].includes(type);
    if(urgent||((!this.deferRoutineWrites||typeof setTimeout!=='function')&&now-this.lastSave>=1000))this.flush();
    else this.scheduleFlush(Math.max(0,Math.min(1000,1000-(now-this.lastSave))));
  }
  private scheduleFlush(delay:number,replace=false):void {
    if(typeof setTimeout!=='function')return;
    if(this.flushTimer!==undefined){if(!replace)return;clearTimeout(this.flushTimer);}
    this.flushTimer=setTimeout(()=>{this.flushTimer=undefined;this.flush();},delay);
  }
  flush(force=false):void {
    force=force||this.periodicQueued;
    if(this.writing||(!this.dirty&&!force))return;this.writing=true;this.lastSave=Date.now();
    this.periodicQueued=false;
    if(this.flushTimer!==undefined){clearTimeout(this.flushTimer);this.flushTimer=undefined;}
    try{const snapshot=this.safeSnapshot();this.savedAt=this.lastSave;
      for(const key of ['gfxBuffers','gfxTextures','enemyNodes','projectileNodes','enemyShotNodes','drawCalls','triangles']){const n=snapshot[key];if(typeof n==='number'&&Number.isFinite(n))this.peak[key]=Math.max(this.peak[key]||0,n);}
      if(snapshot.phase==='battle'&&typeof snapshot.seconds==='number'){this.peak.battleSeconds=Math.max(this.peak.battleSeconds||0,snapshot.seconds);this.battleSnapshot=snapshot;this.battleSavedAt=this.savedAt;}
      if(force){const state:Snapshot={};for(const key of TREND_KEYS)if(snapshot[key]!==undefined)state[key]=snapshot[key];this.recent.push({at:this.savedAt,state});if(this.recent.length>18)this.recent.shift();}
      // In battle the current snapshot already contains the same data.
      this.storage.setItem(HEALTH_KEY,JSON.stringify(this.payload(snapshot,this.battleSnapshot!==snapshot)));this.persistence.lastSuccessAt=this.savedAt;this.dirty=false;
    }catch(error){this.dirty=true;this.persistence.failures++;try{this.persistence.lastError=String(error).slice(0,180);}catch(_){this.persistence.lastError='存储写入失败';}}finally{this.writing=false;}
  }
  private payload(snapshot:object,includeBattleSnapshot=true):object{return {version:this.version,startedAt:this.startedAt,savedAt:this.savedAt,snapshot,frames:this.frames,slowFrames:this.slowFrames,maxFrameMs:Math.round(this.maxFrameMs),frameTimes:this.framePercentiles(),events:this.events,recent:this.recent,peak:this.peak,battleSnapshot:includeBattleSnapshot?this.battleSnapshot:undefined,battleSavedAt:this.battleSavedAt,persistence:this.persistence,previous:this.previous};}
  private safeSnapshot():Snapshot {
    try{return this.lastSnapshot=this.snapshot() as Snapshot;}
    catch(error){return {...this.lastSnapshot,snapshotError:String(error).slice(0,240)};}
  }
  /** Local, bounded observations; an interrupted session is not proof of a crash. */
  report(uiFontFaces?:string):string {
    const traces={previousSupply:this.previousSupply,supply:this.supply};
    try{
      const snapshot=this.safeSnapshot();
      return JSON.stringify({format:'taoyuan-health-1',...this.payload(uiFontFaces?{...snapshot,uiFontFaces}:snapshot),...traces});
    }
    catch(error){return JSON.stringify({format:'taoyuan-health-1',version:this.version,exportError:String(error).slice(0,240),previous:this.previous,...traces});}
  }
  destroy():void {if(this.closed)return;this.flush();this.closed=true;if(this.flushTimer!==undefined)clearTimeout(this.flushTimer);this.flushTimer=undefined;for(const off of this.detach)try{off();}catch(_){/* one failed off must not block remaining cleanup */}this.detach=[];}
}
