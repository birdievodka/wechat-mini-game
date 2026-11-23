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
  private gain=-1;private repeat=true;private path='';private lastError=-Infinity;
  private operation='init';private errorCount=0;
  private readonly started=()=>{if(this.closed||!this.wanted||this.failedSource)return;this.audible=true;this.onStarted?.();};
  private readonly stopped=()=>{this.audible=false;};
  private readonly canplay=()=>{if(this.closed||this.ready)return;this.ready=true;this.seek();if(this.wanted&&!this.audible)this.startPlayback();};
  private readonly failed=(event?:unknown)=>{
    if(this.closed)return;const wanted=this.wanted,ready=this.ready;this.audible=false;this.ready=false;this.wanted=false;this.failedSource=true;
    this.errorCount++;const now=Date.now(),error=event as {errCode?:unknown;code?:unknown;errMsg?:unknown;message?:unknown}|undefined;
    if(now-this.lastError>=1000){this.lastError=now;this.report(('native-music op='+this.operation+' assigned='+!!this.path+' wanted='+wanted+' ready='+ready+' code='+String(error?.errCode??error?.code??'unknown')+' '+String(error?.errMsg||error?.message||(typeof event==='string'?event:'empty host error'))).slice(0,240));}
    this.onPlaybackError?.();
  };
  static create(host:NativeSoundHost|undefined,report:(message:string)=>void,onPlaybackError?:()=>void,onStarted?:()=>void):NativeMusic|undefined {
    if(!host?.createInnerAudioContext)return;let player:NativeMusic|undefined,context:Context|undefined;
    try{context=host.createInnerAudioContext();player=new NativeMusic(context,report,onPlaybackError,onStarted);player.init();return player;}
    catch(_){if(player)player.destroy();else try{context?.destroy();}catch(_){}report('native-music initialization failed');return;}
  }
  private constructor(private context:Context,private report:(message:string)=>void,private onPlaybackError?:()=>void,private onStarted?:()=>void){}
  private init():void {const c=this.context;c.autoplay=false;c.loop=true;c.volume=0;this.gain=0;c.onPlay?.(this.started);c.onPause?.(this.stopped);c.onStop?.(this.stopped);c.onError?.(this.failed);c.onCanplay?.(this.canplay);}
  get src():string{return this.path;}
  set src(value:string){if(this.closed||value===this.path&&!this.failedSource)return;this.stop();this.path=value;this.ready=false;this.failedSource=false;this.targetTime=0;this.operation='source';try{this.context.src=value;}catch(error){this.failed(error);}}
  get diagnostic():object{return {operation:this.operation,assigned:!!this.path,ready:this.ready,wanted:this.wanted,audible:this.audible,errors:this.errorCount};}
  get loop():boolean{return this.repeat;}
  set loop(value:boolean){if(this.closed||value===this.repeat)return;this.repeat=value;this.context.loop=value;}
  get volume():number{return Math.max(0,this.gain);}
  set volume(value:number){const gain=Math.round(Math.max(0,Math.min(1,value))*1000)/1000;if(this.closed||gain===this.gain)return;this.gain=gain;this.context.volume=gain;}
  get currentTime():number{return this.context.currentTime||this.targetTime;}
  set currentTime(value:number){if(this.closed)return;this.targetTime=Math.max(0,value);if(this.ready)this.seek();}
  private seek():void {try{this.context.seek?.(this.targetTime);}catch(_){/* first canplay retries a pre-ready seek */}}
  get playing():boolean{return this.audible;}
  get duration():number{return this.context.duration||0;}
  private startPlayback():void {if(!this.path)return;this.operation='play';try{this.context.play();}catch(error){this.failed(error);}}
  play():void {if(this.closed)return;this.wanted=true;this.startPlayback();}
  pause():void {if(this.closed)return;this.wanted=false;this.audible=false;if(this.path){this.operation='pause';this.context.pause?.();}}
  stop():void {if(this.closed)return;this.wanted=false;this.audible=false;this.targetTime=0;if(this.path){this.operation='stop';try{this.context.stop();}catch(_){/* a failed stop must not block destruction */}}}
  destroy():void {if(this.closed)return;this.stop();this.closed=true;
    for(const [off,fn] of [['offPlay',this.started],['offPause',this.stopped],['offStop',this.stopped],['offError',this.failed],['offCanplay',this.canplay]] as const)try{(this.context[off] as ((fn:any)=>void)|undefined)?.call(this.context,fn);}catch(_){/* independent native listeners */}
    try{this.context.destroy();}catch(_){/* host already closing */}
  }
}
