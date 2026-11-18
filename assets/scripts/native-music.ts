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
  private closed=false;private audible=false;private ready=false;private targetTime=0;
  private gain=-1;private repeat=true;private path='';private lastError=-Infinity;
  private readonly started=()=>{if(!this.closed)this.audible=true;};
  private readonly stopped=()=>{this.audible=false;};
  private readonly canplay=()=>{if(this.closed)return;this.ready=true;this.seek();};
  private readonly failed=()=>{this.audible=false;const now=Date.now();if(!this.closed&&now-this.lastError>=1000){this.lastError=now;this.report('native-music playback error');}};
  static create(host:NativeSoundHost|undefined,report:(message:string)=>void):NativeMusic|undefined {
    if(!host?.createInnerAudioContext)return;let player:NativeMusic|undefined,context:Context|undefined;
    try{context=host.createInnerAudioContext();player=new NativeMusic(context,report);player.init();return player;}
    catch(_){if(player)player.destroy();else try{context?.destroy();}catch(_){}report('native-music initialization failed');return;}
  }
  private constructor(private context:Context,private report:(message:string)=>void){}
  private init():void {const c=this.context;c.autoplay=false;c.loop=true;c.volume=0;this.gain=0;c.onPlay?.(this.started);c.onPause?.(this.stopped);c.onStop?.(this.stopped);c.onError?.(this.failed);c.onCanplay?.(this.canplay);}
  get src():string{return this.path;}
  set src(value:string){if(this.closed||value===this.path)return;this.stop();this.path=value;this.ready=false;this.targetTime=0;this.context.src=value;}
  get loop():boolean{return this.repeat;}
  set loop(value:boolean){if(this.closed||value===this.repeat)return;this.repeat=value;this.context.loop=value;}
  get volume():number{return Math.max(0,this.gain);}
  set volume(value:number){const gain=Math.round(Math.max(0,Math.min(1,value))*1000)/1000;if(this.closed||gain===this.gain)return;this.gain=gain;this.context.volume=gain;}
  get currentTime():number{return this.context.currentTime||this.targetTime;}
  set currentTime(value:number){if(this.closed)return;this.targetTime=Math.max(0,value);if(this.ready)this.seek();}
  private seek():void {try{this.context.seek?.(this.targetTime);}catch(_){/* first canplay retries a pre-ready seek */}}
  get playing():boolean{return this.audible;}
  get duration():number{return this.context.duration||0;}
  play():void {if(!this.closed)this.context.play();}
  pause():void {if(this.closed)return;this.audible=false;this.context.pause?.();}
  stop():void {if(this.closed)return;this.audible=false;this.targetTime=0;try{this.context.stop();}catch(_){/* a failed stop must not block destruction */}}
  destroy():void {if(this.closed)return;this.stop();this.closed=true;
    for(const [off,fn] of [['offPlay',this.started],['offPause',this.stopped],['offStop',this.stopped],['offError',this.failed],['offCanplay',this.canplay]] as const)try{(this.context[off] as ((fn:any)=>void)|undefined)?.call(this.context,fn);}catch(_){/* independent native listeners */}
    try{this.context.destroy();}catch(_){/* host already closing */}
  }
}
