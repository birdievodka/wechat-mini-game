// Review artifact only: execute current skill code and rasterize its Graphics paths.
// No game assets, balancing or runtime behavior are modified.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const assert = require('node:assert/strict');
const OUT = path.resolve('docs/skill-review');
const notes = {
 G01:['厚实体青白枪锋与双侧断笔尾迹','','方向突进，路径伤害。',.16],
 G08:['金色战弓与八支实体红羽箭','','每箭.22S；同敌最多4箭，命中有飞行过程。',.25],
 G03:['A金锋回旋实体厚刃与双拖尾','','原机制和渲染基线保持。',.08],
 G07:['赤色战旗、红金战气与出手拖尾','','5秒攻击频率达到5倍，单次伤害不变。',.18],
 G10:['水平连续火线、四层卷焰与焦痕','','480×80，3秒四次灼烧。',.5],
 G12:['深浅厚浪墙与断续白沫','','扩散经过才命中与减速。',.35],
 G25:['四柄实体青剑与三枚格挡星印','','6秒、三次格挡；耗尽防御后仍可攻击。',.3],
 G18:['八方实体门印与接触锁链','','固定阵地，入阵一次伤害。',.3],
 G26:['金色断续冲击波与敌军头顶旋转星星','','半径400眩晕5秒，包含Boss。',.14],
 G19:['雷印预表现、粗雷柱与分叉冲击','','四雷每处先亮印再结算。',.18],
 G22:['覆盖圆形区域的四批实体箭雨','','半径400，四轮.22S。',.18],
 G20:['实体岩核流星、金紫焰尾与碎石冲击','','先下落.35秒，再结算伤害。',.43],
};
class Color { constructor(r=0,g=0,b=0,a=255){Object.assign(this,{r,g,b,a});} }
const cache={};
function load(name){
 if(cache[name])return cache[name];const out=cache[name]={};
 const code=ts.transpileModule(fs.readFileSync(`assets/scripts/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports:out,require:id=>id==='cc'?{Color}:load(id.replace('./','')),Math,console});return out;
}
const rgba=c=>`rgba(${c.r},${c.g},${c.b},${c.a/255})`;
const n=x=>Number(x.toFixed(3));
class GraphicsSVG {
 constructor(){this.parts=[];this.p='';this.done=false;this.fillColor=new Color();this.strokeColor=new Color();this.lineWidth=1;}
 begin(){if(this.done){this.p='';this.done=false;}}
 moveTo(x,y){this.begin();this.p+=`M${n(x)} ${n(y)} `;}
 lineTo(x,y){this.p+=`L${n(x)} ${n(y)} `;}
 bezierCurveTo(a,b,c,d,x,y){this.p+=`C${n(a)} ${n(b)} ${n(c)} ${n(d)} ${n(x)} ${n(y)} `;}
 close(){this.p+='Z ';}
 ellipse(x,y,rx,ry){this.begin();this.p+=`M${n(x-rx)} ${n(y)} a${n(rx)} ${n(ry)} 0 1 0 ${n(rx*2)} 0 a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx*2)} 0 Z `;}
 circle(x,y,r){this.ellipse(x,y,r,r);}
 rect(x,y,w,h){this.roundRect(x,y,w,h,0);}
 roundRect(x,y,w,h,r){this.begin();this.p+=`M${n(x+r)} ${n(y)} h${n(w-2*r)} q${r} 0 ${r} ${r} v${n(h-2*r)} q0 ${r} ${-r} ${r} h${n(-w+2*r)} q${-r} 0 ${-r} ${-r} v${n(-h+2*r)} q0 ${-r} ${r} ${-r} Z `;}
 arc(x,y,r,start,end,ccw){this.begin();let diff=end-start;while(ccw&&diff>0)diff-=Math.PI*2;while(!ccw&&diff<0)diff+=Math.PI*2;const count=Math.max(3,Math.ceil(Math.abs(diff)*10));for(let i=0;i<=count;i++){const a=start+diff*i/count,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(!i)this.p+=`M${n(px)} ${n(py)} `;else this.lineTo(px,py);}}
 fill(){this.parts.push(`<path d="${this.p}" fill="${rgba(this.fillColor)}"/>`);this.done=true;}
 stroke(){this.parts.push(`<path d="${this.p}" fill="none" stroke="${rgba(this.strokeColor)}" stroke-width="${this.lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`);this.done=true;}
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const image=(url,x,y,w,h)=>`<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const png=async(file,box)=>'data:image/png;base64,'+(await sharp(file).extract(box).png().toBuffer()).toString('base64');
const text=(str,x,y,size=24,color='#f9edd0',weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" font-family="Heiti SC,STHeiti,PingFang SC,sans-serif">${esc(str)}</text>`;
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const VERSION=load('survival').SURVIVAL_VERSION;
 const skills=Array.from(load('common-skills').COMMON_SKILLS);assert.equal(skills.length,12);
 const {CommonSkillRuntime}=load('CommonSkillRuntime'),{CommonSkillEffects}=load('CommonSkillEffects'),{CombatEffects}=load('combat-effects');
 const head=await png('assets/presentation/heroes.png',{left:40,top:29,width:379,height:363});
 const body=await png('assets/presentation/heroes.png',{left:66,top:939,width:310,height:232});
 const enemy=await png('assets/chronicle-units/troops-a-front.png',{left:0,top:0,width:128,height:128});
 const ground='data:image/jpeg;base64,'+(await sharp('assets/meadow/ground.png').resize(720,720).jpeg({quality:85}).toBuffer()).toString('base64');
 const cards=[],records=[];
 for(const s of skills){
  const [visual,issue,detail,time]=notes[s.id];assert.ok(visual);
  const fx=new CombatEffects(),effects=new CommonSkillEffects(fx.particles);
  const enemies=Array.from({length:6},(_,i)=>({id:i,x:[170,260,-190,180,300,-140][i],y:[20,120,-45,-140,-90,155][i],hp:999,kind:'soldier',born:0,attack:-1,attackCooldown:1}));
  const host={x:0,y:0,angle:0,age:0,enemies:()=>enemies,move(dx,dy){this.x+=dx;this.y+=dy;},protect(){},clearSlow(){},hit(e,a,d,k,style){e.hp-=d;fx.hit(style,e.x,e.y+34,a,false);},canHeal:()=>true,heal(){},sound(){}};
  const runtime=new CommonSkillRuntime(host,effects);assert.ok(runtime.cast(s.id,100));
  for(let i=0;i<Math.round(time*120);i++){host.age+=1/120;runtime.update(1/120);fx.update(1/120);}
  const g=new GraphicsSVG(),a=new GraphicsSVG();effects.draw(g,a,0,0,1500,1500,host.x,host.y);fx.draw(g,a,0,0,1500,1500,false);
  assert.ok(g.parts.length+a.parts.length>0,`${s.id} has visible effects`);
  let icon;
  if(s.icon<24)icon=await png('assets/chronicle-ui/skills.png',{left:s.icon%6*96,top:Math.floor(s.icon/6)*96,width:96,height:96});
  else{const ig=new GraphicsSVG();load('skill-vfx-art').drawSkillIcon(ig,s.icon);icon='data:image/png;base64,'+(await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><g transform="translate(48 80) scale(.9 -.9)">${ig.parts.join('')}</g></svg>`)).png().toBuffer()).toString('base64');}
  // Consistent scale and viewport across all skills; target troops stand still for comparison.
  const sprite=(url,x,y,w,h)=>image(url,x-w/2,-y-h,w,h);
  const hero=`<ellipse cx="${host.x}" cy="${-host.y+10}" rx="34" ry="10" fill="#35442a" opacity=".28"/>`+sprite(body,host.x,host.y-22,63,47)+`<circle cx="${host.x-31}" cy="${-host.y-20}" r="10" fill="#eec48b" stroke="#553526" stroke-width="3"/><circle cx="${host.x+31}" cy="${-host.y-20}" r="10" fill="#eec48b" stroke="#553526" stroke-width="3"/>`+sprite(head,host.x,host.y+16,100,96);
  const troops=enemies.map(e=>sprite(enemy,e.x,e.y-10,76,76)).join('');
  const scene=`<defs><clipPath id="scene"><rect x="16" y="76" width="688" height="284" rx="16"/></clipPath></defs><g clip-path="url(#scene)">${image(ground,16,76,688,688)}<rect x="16" y="76" width="688" height="284" fill="#334525" opacity=".14"/><g transform="translate(335 252) scale(.5)"><g transform="scale(1 -1)">${g.parts.join('')}</g>${troops}${hero}<g transform="scale(1 -1)">${a.parts.join('')}</g></g></g>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="450"><rect width="720" height="450" rx="22" fill="#273d32"/>${image(icon,20,11,54,54)}${text(`${String(s.powerRank).padStart(2,'0')}  ${s.name}`,86,46,28,'#fff0c8',600)}${text(`${s.killCharge}击杀`,592,44,23,'#f0c56d',600)}${scene}${text(visual,22,397,22)}${text(`威力 ${['I','II','III','IV','V','VI'][s.powerTier-1]}  ·  ${s.damage}  ·  ${s.duration}`,22,432,20,'#b6c7ae')}</svg>`;
  cards.push(await sharp(Buffer.from(svg)).png().toBuffer());
  records.push({...s,visual,issue,detail,previewSeconds:time});
 }
 const compose=async(files,cols,width,height,header,target)=>{
  const rows=Math.ceil(files.length/cols),w=cols*720+(cols-1)*20+64,h=rows*450+(rows-1)*20+header+32;
  let base=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#152b25"/>${text(width||'桃园小英雄 当前技能总览',32,58,40,'#ffe3a2',600)}${text(height||`${skills.length}项通用技能 · 综合威力升序 · 基础击杀充能`,32,101,25,'#c4d1b8')}${text('当前代码定帧预览  ·  统一缩放  ·  静态参照兵  ·  非微信实机截图',32,135,20,'#9eaf99')}</svg>`;
  await sharp(Buffer.from(base)).composite(files.map((input,i)=>({input,left:32+i%cols*740,top:header+Math.floor(i/cols)*470}))).png().toFile(target);
 };
 await compose(cards,4,'','',165,path.join(OUT,'技能总览.png'));
 const data={version:VERSION,date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}),preview:'执行当前Runtime与Effects后将Graphics路径转为SVG并栅格化，保留粒子；固定缩放与静态参照兵。非实机截图，不是重设计方案。',skills:records};
 fs.writeFileSync(path.join(OUT,'skills.json'),JSON.stringify(data,null,2)+'\n');
 const cloudPath=path.join(OUT,'feishu-document.json'),cloud=fs.existsSync(cloudPath)?JSON.parse(fs.readFileSync(cloudPath,'utf8')):undefined;
 const cloudLine=cloud?`飞书评审文档：${cloud.doc_url}（云端为先前评审快照，本次本地清理未修改云文档）。\n\n`:'';
 fs.writeFileSync(path.join(OUT,'README.md'),`# 桃园小英雄当前技能评审\n\n版本 ${VERSION}，${data.date}。\n\n${cloudLine}共${records.length}项全部开放。本目录只保留当前代码生成的汇总；横扫六合已采用A金锋回旋。\n\n[整体预览](技能总览.png) · [结构化数据](skills.json)\n\n预览执行当前 CommonSkillRuntime / CommonSkillEffects / CombatEffects，在固定场景取代表帧，Graphics路径经SVG栅格化。兵与英雄为静态参照，背景使用当前草地。与Cocos的抗锯齿和动态表现有差异，不能当作微信实机截图；一帧不能展示完整的多段攻击或受击反馈。\n\nS为施法时已装备武器的理论单目标DPS合计乘技能伤害加成，不是单武器攻击力。威力阶是综合效用顺序，不是严格DPS或实测胜率。\n\n|顺序|技能|阶|基础击杀|数值|范围|描述|\n|---|---|---|---|---|---|---|\n`+records.map(s=>`|${s.powerRank}|${s.name}|${s.powerTier}|${s.killCharge}|${s.damage}|${s.range}|${s.effect} ${s.detail}|`).join('\n')+'\n\n## 当前表现\n\n'+records.map(s=>`### ${s.name}\n\n现有效果：${s.visual}。\n`).join('\n'));
 console.log(JSON.stringify({output:OUT,skills:records.length,skillsRendered:cards.length,intermediateFiles:0}));
}
module.exports={load,GraphicsSVG};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
