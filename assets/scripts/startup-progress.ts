export const CAMPAIGN_ART = ['poster','liubei','guanyu','zhangfei','guanyu_body','zhangfei_body','items','camp-background','camp-paper','camp-stats','camp-titles'];
export const ENEMY_ART = [['spearman','archer-actions'],['cavalry','cavalry-actions'],['chief','zhangjiao-actions']] as const;
export const STARTUP_TASKS=['chronicles','battle','soldier:sickle','soldier:hoe','liubei-body','campaign',...CAMPAIGN_ART.map(id=>'campaign:'+id),'enemies',...ENEMY_ART.map(([id])=>'enemy:'+id),'results','results:portraits','presentation','presentation:icons','presentation:weapon-revision','presentation:butcher-knife','presentation:heroes','hero-menu','menu:background','menu:atlas','menu:logo'];
export interface StartupBridge { progress:number; image?:HTMLImageElement; ended?:boolean; }
declare const GameGlobal: {__taoyuanStartup?:StartupBridge}|undefined;
export function startupBridge():StartupBridge|undefined {
  return (globalThis as unknown as {__taoyuanStartup?:StartupBridge}).__taoyuanStartup
    ||(typeof window!=='undefined'?(window as unknown as {__taoyuanStartup?:StartupBridge}).__taoyuanStartup:undefined)
    ||(typeof GameGlobal!=='undefined'?GameGlobal?.__taoyuanStartup:undefined);
}
/** Resource completion, not a timer or a claimed network-byte percentage. */
export class StartupProgress {
  private done=new Set<string>();
  private floor=.22;
  private finished=false;
  error='';
  constructor(initial=.22){this.floor=Math.max(.22,Math.min(.98,initial));}
  get value():number {return this.finished?1:Math.max(this.floor,.22+.76*this.done.size/STARTUP_TASKS.length);}
  get allSettled():boolean {return this.done.size===STARTUP_TASKS.length;}
  mark(id:string):void {if(STARTUP_TASKS.indexOf(id)<0)throw Error('未知启动资源：'+id);this.done.add(id);}
  skipMenuArt():void {for(const id of ['hero-menu','menu:background','menu:atlas','menu:logo'])this.mark(id);}
  fail(message:string):void {this.error=message;}
  complete():void {if(!this.error&&this.allSettled)this.finished=true;}
}
