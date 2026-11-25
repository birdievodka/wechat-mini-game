import {boundedCall} from './load-lifetime';
/** Fixed native voices. Loading an AudioClip must not retain one extra player per cue. */
export interface NativeSoundContext {
  src:string;volume:number;loop:boolean;autoplay:boolean;
  play():void;stop():void;destroy():void;
  onPlay?(fn:()=>void):void;offPlay?(fn:()=>void):void;
  onError?(fn:(event:unknown)=>void):void;offError?(fn:(event:unknown)=>void):void;
}
export interface NativeSoundHost {createInnerAudioContext?:()=>NativeSoundContext;}
export class NativeSfx {
  private closed=false;private reportedAt=-Infinity;private errorCount=0;
  private voices:NativeSoundContext[]=[];
  private sourceWrites=0;
  private gainWrites=0;
  private stopCalls=0;
  get sourceAssignments():number{return this.sourceWrites;}
  get volumeAssignments():number{return this.gainWrites;}
  get stops():number{return this.stopCalls;}
  private paths:(string|undefined)[]=[];
  private gains:(number|undefined)[]=[];
  private needsStop:boolean[]=[];
  private errors:((event:unknown)=>void)[]=[];private starts:(()=>void)[]=[];private playedCount=0;
  static create(host:NativeSoundHost|undefined,count:number,report:(message:string)=>void):NativeSfx|undefined {
    if(!host?.createInnerAudioContext)return;
    const pool=new NativeSfx(report);
    try{for(let i=0;i<count;i++){
      const voice=host.createInnerAudioContext();pool.voices.push(voice);
      voice.autoplay=false;voice.loop=false;voice.volume=0;
      const error=(event:unknown)=>{if(pool.closed)return;pool.paths[i]=undefined;pool.gains[i]=undefined;pool.report('native-sfx '+String((event as {errMsg?:unknown})?.errMsg||'playback error').slice(0,180));};
      pool.errors.push(error);voice.onError?.(error);const started=()=>{if(!pool.closed)pool.playedCount++};pool.starts.push(started);voice.onPlay?.(started);
    }return pool;}catch(_){pool.destroy();report('native-sfx initialization failed');return;}
  }
  private constructor(private diagnostic:(message:string)=>void){}
  private report(message:string):void {if(this.closed)return;this.errorCount++;const now=Date.now();if(now-this.reportedAt<1000)return;this.reportedAt=now;this.diagnostic(message);}
  get failures():number{return this.errorCount;}
  get played():number{return this.playedCount;}
  get size():number{return this.voices.length;}
  play(index:number,url:string,volume:number):void {
    const voice=this.voices[index];if(this.closed||!voice||!url)return;
    // Some hosts normalize src on read. Compare our assigned path, otherwise an
    // unchanged cue can unnecessarily reload its decoder on every hit.
    try{
      this.stopIfStarted(index,voice);
      if(this.paths[index]!==url){
        this.paths[index]=url;
        this.gains[index]=undefined;
        voice.src=url;
        this.sourceWrites++;
        if(this.paths[index]!==url)return;
      }
      this.applyVolume(index,voice,volume);
      if(this.paths[index]!==url)return;
      // The host may start playback before returning, even if the call throws.
      this.needsStop[index]=true;
      voice.play();
    }catch(_){this.paths[index]=undefined;this.gains[index]=undefined;this.report('native-sfx play failed');}
  }
  private applyVolume(index:number,voice:NativeSoundContext,volume:number):void {
    const gain=Math.max(0,Math.min(1,volume));
    if(this.gains[index]===gain)return;
    const path=this.paths[index];
    voice.volume=gain;
    if(this.paths[index]===path)this.gains[index]=gain;
    this.gainWrites++;
  }
  private stopIfStarted(index:number,voice:NativeSoundContext):void {
    if(!this.needsStop[index])return;
    voice.stop();
    this.needsStop[index]=false;
    this.stopCalls++;
  }
  setVolume(index:number,volume:number):void {
    const voice=this.voices[index];
    if(!this.closed&&voice)try{this.applyVolume(index,voice,volume);}catch(_){this.gains[index]=undefined;}
  }
  stopVoice(index:number):void {
    const voice=this.voices[index];
    if(voice)try{this.stopIfStarted(index,voice);}catch(_){/* native host may already be closing */}
  }
  stopAll():void {for(let i=0;i<this.voices.length;i++)this.stopVoice(i);}
  destroy():void {
    if(this.closed)return;this.closed=true;
    this.voices.forEach((voice,i)=>{
      try{voice.offPlay?.(this.starts[i]);}catch(_){/* optional host listener */}
      try{voice.offError?.(this.errors[i]);}catch(_){/* some hosts reject detached listeners */}
      this.stopVoice(i);
      try{voice.destroy();}catch(_){/* host may already have closed this player */}
    });
    this.voices.length=0;this.paths.length=0;this.errors.length=0;this.starts.length=0;
    this.gains.length=0;this.needsStop.length=0;
  }
}

/** Bound file/download work independently of the six playback voices. */
export class AudioLoadQueue {
  private jobs:((done:()=>void,alive:()=>boolean)=>void)[]=[];
  private cancels=new Set<()=>void>();
  private active=0;private closed=false;private draining=false;
  constructor(private limit=1){}
  get loading():number{return this.active;}
  get waiting():number{return this.jobs.length;}
  enqueue(job:(done:()=>void,alive:()=>boolean)=>void):void {if(this.closed)return;this.jobs.push(job);this.drain();}
  private drain():void {
    if(this.closed||this.draining)return;this.draining=true;
    try{while(!this.closed&&this.active<this.limit&&this.jobs.length){
      const job=this.jobs.shift()!;this.active++;let finished=false,cancel:()=>void;
      cancel=boundedCall<void>(complete=>job(()=>complete(null),()=>!finished&&!this.closed),()=>{if(finished)return;finished=true;this.cancels.delete(cancel);this.active--;this.drain();},30000);
      if(!finished)this.cancels.add(cancel);
    }}finally{this.draining=false;}
  }
  destroy():void {this.closed=true;this.jobs.length=0;for(const cancel of Array.from(this.cancels))cancel();this.cancels.clear();}
}
