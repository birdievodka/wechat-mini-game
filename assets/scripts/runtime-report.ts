export interface ClipboardHost {
 setClipboardData?:(options:{data:string;success:()=>void;fail:(error?:unknown)=>void})=>void;
}
export interface CopyResult {ok:boolean;error?:string;}
function message(error:unknown):string {
 const value=error as {errMsg?:string;message?:string;errCode?:number}|undefined;
 return String(value?.errMsg||value?.message||(value?.errCode!==undefined?'errCode='+value.errCode:typeof error==='string'?error:'未知错误')).slice(0,120);
}
/** User-triggered write only; never reads a clipboard or uploads a report. */
export function copyRuntimeReport(data:string,host:ClipboardHost|undefined,done:(result:CopyResult)=>void,browserWrite?:()=>Promise<void>):void {
 let settled=false;const finish=(result:CopyResult)=>{if(settled)return;settled=true;done(result);};
 if(!data){finish({ok:false,error:'诊断内容为空，请查看摘要'});return;}
 try{
  if(host?.setClipboardData){host.setClipboardData({data,success:()=>finish({ok:true}),fail:error=>finish({ok:false,error:message(error)})});return;}
  if(browserWrite){void browserWrite().then(()=>finish({ok:true}),error=>finish({ok:false,error:message(error)}));return;}
  finish({ok:false,error:'当前环境没有剪贴板接口'});
 }catch(error){finish({ok:false,error:message(error)});}
}
interface Session {version?:string;savedAt?:number;snapshot?:Record<string,unknown>;events?:{type:string;count?:number;detail?:string}[];peak?:Record<string,number>;recent?:{at:number;state:Record<string,unknown>}[];battleSnapshot?:Record<string,unknown>;battleSavedAt?:number;persistence?:{failures:number;lastError?:string;lastSuccessAt?:number};}
const text=(value:unknown)=>value===undefined||value===null?'—':String(value);
const mib=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?(value/1048576).toFixed(1):'—';
const count=(s:Session,type:string)=>(s.events||[]).filter(e=>e.type===type).reduce((n,e)=>n+(e.count||1),0);
function sessionSummary(s:Session):string {
 const v=s.snapshot||{},render=v.render as {unavailable?:number}|undefined;
 const mode=v.mode==='endless'?'无尽':v.mode==='stage'?'闯关':v.mode==='training'?'演武':text(v.mode);
 const at=typeof s.savedAt==='number'&&s.savedAt>0?new Date(s.savedAt).toLocaleString():'时间未记录';
 const weapons=Array.isArray(v.weapons)?v.weapons.map(text).join(' / '):'未记录';
 return [at+'  '+text(s.version),mode+' · '+(v.trainingView==='config'?'配置':v.trainingView==='field'?'战场':text(v.phase))+' · 战斗 '+text(v.seconds)+'s · 轮次 '+text(v.endlessTier??v.wave),
  '英雄 '+text(v.hero)+' · 技能 '+text(v.skill)+(typeof v.trainingCasts==='number'?' · 施放 '+v.trainingCasts+' 次':''),
  '敌兵 '+text(v.alive)+' / 池 '+text(v.enemyNodes)+' · 粒子 '+text(v.particles),
  '友弹 '+text(v.activeProjectiles)+' / 池 '+text(v.projectileNodes)+' · 敌弹 '+text(v.activeEnemyShots)+' / 池 '+text(v.enemyShotNodes),
  '缓冲 '+mib(v.gfxBuffers)+' MiB · 纹理 '+mib(v.gfxTextures)+' MiB',
  '内存告警 '+count(s,'memory-warning')+' · JS异常 '+(count(s,'error')+count(s,'unhandled-rejection'))+(render?.unavailable?' · 部分绘图指标不可用':''),
  '武器 '+weapons.slice(0,150)].join('\n');
}
/** Small pages can be photographed even when WeChat rejects clipboard access. */
export function runtimeReportPages(data:string):{title:string;body:string}[] {
 try{
  const report=JSON.parse(data) as Session&{previous?:Session;exportError?:string};
  const pages:{title:string;body:string}[]=[];
  if(report.previous)pages.push({title:'上一局摘要',body:sessionSummary(report.previous)});
  pages.push({title:'当前会话',body:sessionSummary(report)});
  if(report.battleSnapshot&&report.snapshot?.phase!=='battle')pages.push({title:'本次最近战斗',body:sessionSummary({...report,snapshot:report.battleSnapshot,savedAt:report.battleSavedAt})});
  for(const [label,s]of [['上局',report.previous],['本次',report]] as const){
   if(!s)continue;const peak=s.peak||{},v=s.snapshot||{},p=s.persistence;
   const render=v.render as {nodes?:number;graphics?:number;models?:number;bufferBytes?:number;top?:{name:string;bytes:number}[]}|undefined;
   if((s.recent?.length||0)>0||p?.failures){
    const lines=['峰值缓冲 '+mib(peak.gfxBuffers)+' MiB · 纹理 '+mib(peak.gfxTextures)+' MiB',
     '峰值敌池 '+text(peak.enemyNodes)+' · 友弹池 '+text(peak.projectileNodes)+' · 敌弹池 '+text(peak.enemyShotNodes),
     '材质 '+text(v.vfxQuads)+' / 池 '+text(v.vfxAllocated)+' · 音源 '+text(v.sfxVoices),
     '节点 '+text(render?.nodes)+' · Graphics '+text(render?.graphics)+' · 模型 '+text(render?.models)];
    if(p)lines.push('写盘失败 '+p.failures+(p.lastError?' · '+p.lastError.slice(0,90):''));
    for(const entry of render?.top||[])lines.push(entry.name+'  '+mib(entry.bytes)+' MiB');
    for(let i=0;i<lines.length;i+=7)pages.push({title:label+'资源详情',body:lines.slice(i,i+7).join('\n')});
   }
   const samples=(s.recent||[]).slice(-18);
   for(let i=0;i<samples.length;i+=6)pages.push({title:label+'末段趋势',body:['秒数 / 状态 / 敌兵 / 友弹 / 缓冲MiB / 纹理MiB',...samples.slice(i,i+6).map(({state:v})=>text(v.seconds)+'s '+text(v.phase)+'  '+text(v.alive)+' / '+text(v.activeProjectiles)+'  '+mib(v.gfxBuffers)+' / '+mib(v.gfxTextures))].join('\n')});
  }
  const errors:string[]=[];
  for(const [label,s]of [['上一局',report.previous],['当前',report]] as const){if(!s)continue;
   if(s.snapshot?.snapshotError)errors.push(label+'采集异常：'+text(s.snapshot.snapshotError).slice(0,200));
   for(const e of s.events||[])if(e.detail&&['error','unhandled-rejection','memory-warning','audio-error'].includes(e.type))errors.push(label+' '+e.type+' ×'+(e.count||1)+'：'+e.detail.slice(0,180));
  }
  if(report.exportError)errors.unshift('导出异常：'+report.exportError);
  for(let i=0;i<errors.length;i+=2)pages.push({title:'异常详情',body:errors.slice(i,i+2).join('\n\n')});
  return pages;
 }catch(error){return [{title:'诊断内容不可解析',body:message(error)+'\n已有记录不会被清空。'}];}
}
