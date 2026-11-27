import {MusicSource} from './battle-music';
import {NativeSoundContext,NativeSoundHost} from './native-sfx';
interface Context extends NativeSoundContext {
  readonly currentTime?:number;readonly duration?:number;readonly paused?:boolean;
  pause?():void;seek?(seconds:number):void;
  onCanplay?(fn:()=>void):void;offCanplay?(fn:()=>void):void;
  onPause?(fn:()=>void):void;offPause?(fn:()=>void):void;
  onStop?(fn:()=>void):void;offStop?(fn:()=>void):void;
}
const START_TIMEOUT = 3000;
/** One music context for the entire game session, not a new metadata/player pair per scene. */
export class NativeMusic implements MusicSource {
  private closed=false;private audible=false;private ready=false;private targetTime=0;private wanted=false;private failedSource=false;
  private gain=-1;private volumeRetryAt=0;private repeat=true;private path='';private lastError=-Infinity;
  private operation='init';private errorCount=0;
  private issuedPlay=false;
  private pendingSeek=false;
  private startTimer?:ReturnType<typeof setTimeout>;
  private readonly started=()=>{
    if(this.closed||!this.wanted||this.failedSource||this.audible)return;
    this.audible=true;this.clearStartCheck();this.applySeek();
    if(this.audible)this.onStarted?.();
  };
  private readonly stopped=()=>{
    this.audible=false;
    if(this.wanted&&!this.failedSource)this.armStartCheck();
  };
  private readonly canplay=()=>{
    if(this.closed||!this.path||this.ready||this.failedSource)return;
    this.ready=true;
    if(this.wanted&&!this.audible)this.startPlayback();
  };
  private readonly failed=(event?:unknown)=>{
    if(this.closed||!this.path||this.failedSource||this.operation==='stop')return;
    const wanted=this.wanted,ready=this.ready;
    this.clearStartCheck();this.audible=false;this.ready=false;this.wanted=false;this.failedSource=true;
    this.noteFailure(this.operation,event,wanted,ready);
    this.onPlaybackError?.();
  };
  private readonly checkStart=()=>{
    this.startTimer=undefined;
    if(this.closed||!this.wanted||this.audible||this.failedSource)return;
    if(this.hostPlaying()){this.started();return;}
    this.failed({errCode:'start-timeout',errMsg:'playback did not start'});
  };
  private armStartCheck():void {
    if(this.startTimer===undefined&&typeof setTimeout==='function')this.startTimer=setTimeout(this.checkStart,START_TIMEOUT);
  }
  private clearStartCheck():void {
    if(this.startTimer!==undefined){clearTimeout(this.startTimer);this.startTimer=undefined;}
  }
  private hostPlaying():boolean {
    try{return this.context.paused===false&&(this.context.currentTime??0)>0;}
    catch(_){return false;}
  }
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
  set src(value:string){if(this.closed||value===this.path&&!this.failedSource)return;this.stop();this.path=value;this.ready=false;this.failedSource=false;this.volumeRetryAt=0;this.operation='source';try{this.context.src=value;}catch(error){this.failed(error);}}
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
  get currentTime():number{try{return this.context.currentTime??this.targetTime;}catch(error){this.noteFailure('currentTime',error);return this.targetTime;}}
  set currentTime(value:number){if(this.closed)return;this.targetTime=Math.max(0,value);this.pendingSeek=true;this.applySeek();}
  private applySeek():void {
    // Some hosts reject seek while a file is only buffered or a resume is still pending.
    if(!this.audible||!this.pendingSeek)return;
    this.pendingSeek=false;
    try{
      if(Math.abs((this.context.currentTime??0)-this.targetTime)>=.18)this.context.seek?.(this.targetTime);
    }catch(error){this.noteFailure('seek',error);}
  }
  get playing():boolean{return this.audible;}
  get duration():number{try{return this.context.duration||0;}catch(error){this.noteFailure('duration',error);return 0;}}
  private startPlayback():void {
    if(!this.path||this.failedSource)return;
    this.operation='play';this.issuedPlay=true;this.armStartCheck();
    try{this.context.play();}catch(error){this.failed(error);}
  }
  play():void {
    if(this.closed||!this.path||this.failedSource)return;
    const alreadyRequested=this.wanted;this.wanted=true;
    if(!this.audible&&alreadyRequested&&this.hostPlaying()){this.started();return;}
    if(!this.audible)this.startPlayback();
  }
  pause():void {
    if(this.closed)return;
    this.wanted=false;this.audible=false;this.clearStartCheck();if(!this.issuedPlay)return;
    this.operation='pause';
    try{if(this.context.pause){this.context.pause();return;}}
    catch(error){this.noteFailure('pause',error);}
    this.stopNative();
  }
  private stopNative():void {this.issuedPlay=false;this.operation='stop';try{this.context.stop();}catch(error){this.noteFailure('stop',error);}}
  stop():void {
    if(this.closed)return;
    this.wanted=false;this.audible=false;this.targetTime=0;this.pendingSeek=false;this.clearStartCheck();
    if(this.issuedPlay)this.stopNative();
  }
  destroy():void {if(this.closed)return;this.stop();this.closed=true;
    for(const [off,fn] of [['offPlay',this.started],['offPause',this.stopped],['offStop',this.stopped],['offError',this.failed],['offCanplay',this.canplay]] as const)try{(this.context[off] as ((fn:any)=>void)|undefined)?.call(this.context,fn);}catch(_){/* independent native listeners */}
    try{this.context.destroy();}catch(_){/* host already closing */}
  }
}
