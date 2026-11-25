import {MusicSource} from './battle-music';
import {NativeSoundContext,NativeSoundHost} from './native-sfx';
interface Context extends NativeSoundContext {
  readonly currentTime?:number;readonly duration?:number;
  pause?():void;seek?(seconds:number):void;
  onCanplay?(fn:()=>void):void;offCanplay?(fn:()=>void):void;
  onPause?(fn:()=>void):void;offPause?(fn:()=>void):void;
  onStop?(fn:()=>void):void;offStop?(fn:()=>void):void;
}
/** One music context for the entire game session, not a new metadata/player pair per scene. */
export class NativeMusic implements MusicSource {
  private closed=false;private audible=false;private ready=false;private targetTime=0;private wanted=false;private failedSource=false;
  private gain=-1;private volumeRetryAt=0;private repeat=true;private path='';private lastError=-Infinity;
  private operation='init';private errorCount=0;
  private readonly started=()=>{if(this.closed||!this.wanted||this.failedSource)return;this.audible=true;this.onStarted?.();};
  private readonly stopped=()=>{this.audible=false;};
  private readonly canplay=()=>{if(this.closed||this.ready)return;this.ready=true;this.seek();if(this.wanted&&!this.audible)this.startPlayback();};
  private readonly failed=(event?:unknown)=>{
    if(this.closed)return;const wanted=this.wanted,ready=this.ready;this.audible=false;this.ready=false;this.wanted=false;this.failedSource=true;
    this.noteFailure(this.operation,event,wanted,ready);
    this.onPlaybackError?.();
  };
  private noteFailure(operation:string,event:unknown,wanted=this.wanted,ready=this.ready):void {
    this.errorCount++;const now=Date.now(),error=event as {errCode?:unknown;code?:unknown;errMsg?:unknown;message?:unknown}|undefined;
    if(now-this.lastError>=1000){this.lastError=now;this.report(('native-music op='+operation+' assigned='+!!this.path+' wanted='+wanted+' ready='+ready+' code='+String(error?.errCode??error?.code??'unknown')+' '+String(error?.errMsg||error?.message||(typeof event==='string'?event:'empty host error'))).slice(0,240));}
  }
  static create(host:NativeSoundHost|undefined,report:(message:string)=>void,onPlaybackError?:()=>void,onStarted?:()=>void):NativeMusic|undefined {
    if(!host?.createInnerAudioContext)return;let player:NativeMusic|undefined,context:Context|undefined;
    try{context=host.createInnerAudioContext();player=new NativeMusic(context,report,onPlaybackError,onStarted);player.init();return player;}
    catch(_){if(player)player.destroy();else try{context?.destroy();}catch(_){}report('native-music initialization failed');return;}
  }
  private constructor(private context:Context,private report:(message:string)=>void,private onPlaybackError?:()=>void,private onStarted?:()=>void){}
  private init():void {const c=this.context;c.autoplay=false;c.loop=true;c.volume=0;this.gain=0;c.onPlay?.(this.started);c.onPause?.(this.stopped);c.onStop?.(this.stopped);c.onError?.(this.failed);c.onCanplay?.(this.canplay);}
  get src():string{return this.path;}
  set src(value:string){if(this.closed||value===this.path&&!this.failedSource)return;this.stop();this.path=value;this.ready=false;this.failedSource=false;this.targetTime=0;this.volumeRetryAt=0;this.operation='source';try{this.context.src=value;}catch(error){this.failed(error);}}
  get diagnostic():object{return {operation:this.operation,assigned:!!this.path,ready:this.ready,wanted:this.wanted,audible:this.audible,errors:this.errorCount};}
  get loop():boolean{return this.repeat;}
  set loop(value:boolean){if(this.closed||value===this.repeat)return;try{this.context.loop=value;this.repeat=value;}catch(error){this.noteFailure('loop',error);}}
  get volume():number{return Math.max(0,this.gain);}
  set volume(value:number){
    const gain=Math.round(Math.max(0,Math.min(1,value))*1000)/1000;
    if(this.closed||gain===this.gain||this.volumeRetryAt>0&&Date.now()<this.volumeRetryAt)return;
    try{this.context.volume=gain;this.gain=gain;this.volumeRetryAt=0;}
    catch(error){this.volumeRetryAt=Date.now()+1000;this.noteFailure('volume',error);}
  }
  get currentTime():number{try{return this.context.currentTime||this.targetTime;}catch(error){this.noteFailure('currentTime',error);return this.targetTime;}}
  set currentTime(value:number){if(this.closed)return;this.targetTime=Math.max(0,value);if(this.ready)this.seek();}
  private seek():void {try{this.context.seek?.(this.targetTime);}catch(error){this.noteFailure('seek',error);}}
  get playing():boolean{return this.audible;}
  get duration():number{try{return this.context.duration||0;}catch(error){this.noteFailure('duration',error);return 0;}}
  private startPlayback():void {if(!this.path)return;this.operation='play';try{this.context.play();}catch(error){this.failed(error);}}
  play():void {if(this.closed)return;this.wanted=true;this.startPlayback();}
  pause():void {
    if(this.closed)return;this.wanted=false;this.audible=false;if(!this.path)return;
    this.operation='pause';
    try{if(this.context.pause){this.context.pause();return;}}
    catch(error){this.noteFailure('pause',error);}
    this.stopNative();
  }
  private stopNative():void {this.operation='stop';try{this.context.stop();}catch(error){this.noteFailure('stop',error);}}
  stop():void {if(this.closed)return;this.wanted=false;this.audible=false;this.targetTime=0;if(this.path)this.stopNative();}
  destroy():void {if(this.closed)return;this.stop();this.closed=true;
    for(const [off,fn] of [['offPlay',this.started],['offPause',this.stopped],['offStop',this.stopped],['offError',this.failed],['offCanplay',this.canplay]] as const)try{(this.context[off] as ((fn:any)=>void)|undefined)?.call(this.context,fn);}catch(_){/* independent native listeners */}
    try{this.context.destroy();}catch(_){/* host already closing */}
  }
}
