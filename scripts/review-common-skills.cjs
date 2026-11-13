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
 G15:['绿色加速箭头与脚下细环','与伤害和攻速增益共用上箭头造型，缺少疾跑轨迹。','加速按基础移速的30%增加，最终不超过基础的2.2倍。',.3],
 G02:['后方金白细枪线与箭头','直刺主要是线条，缺少长枪实体和收招。','没有位移和免伤。',.1],
 G01:['青白双轨与突进箭头','更像指向线，角色起步和终点冲击缺少层次。','按移动方向冲刺，保护0.25秒。',.16],
 G16:['绿白六边形与金色刻线','与其他防护技能轮廓相似，净化瞬间不突出。','仅清除减速；一挡或2秒先到即结束。',.3],
 G08:['三段金白箭线','当前为窄线命中与短箭迹，缺少明确的飞行过程。','单敌最多0.80S；无目标时不消耗施法。',.18],
 G03:['金白厚刃月牙与双层错位拖尾','已实现A金锋回旋；手绘笔触的细腻度仍可继续打磨。','单次最多10敌一次；真实命中才有楔形火花。',.08],
 G05:['紫色纸替身与闪避残迹','替身外形过于几何化，闪避与诱敌关联不强。','前移220并保护0.2秒；仅吸引420内普通步兵。',.35],
 G06:['橙色纸替身与延时火焰爆点','替身与金蝉相似，等待爆炸的节奏提示较弱。','3秒后爆炸；仅吸引普通步兵，不误导骑兵弓兵或Boss。',.5],
 G04:['青色双盾板与六边护环','双盾具备剪影，但抵挡剩余次数缺少明确反馈。','两挡或1.5秒先到即结束；抵挡后保护0.18秒。',.3],
 G07:['橙色战旗与三个上箭头','与加速增益相似，伤害增强没有持续冲击反馈。','全部实际伤害乘1.25；同名不叠加。',.3],
 G09:['金旗箭头与额外双盾外观','与背水一战容易混淆，攻速提升难以直接辨认。','攻速持续6秒，附加一挡只持续3秒。',.3],
 G14:['三名绕身纸兵与小箭','三角纸兵偏简化，攻击姿态和命中反馈不足。','每个纸兵各4次攻击；单敌最多0.90S。',.45],
 G11:['木船白帆与四支装饰箭','船体有辨识度，但箭数不反映实际吸收数量。','最多收4箭；每箭一敌，单敌最多0.60S；不挡Boss地面伤害。',.4],
 G10:['三处橙黄火焰依次展开','火苗较细碎，主爆点与燃烧层次不清晰。','三处位置施法时锁定，间隔0.4秒；单敌最多1.10S。',.48],
 G12:['青色扩散水环与白色浪沫','范围清楚，但水浪体积和推进力度较弱。','0.55秒扩散，普通兵减速30%两秒，Boss10%。',.35],
 G13:['绿金八边结界与白色内环','与净心诀和护盾区分不足，结界缺少独特符纹。','附近减速普通兵25%、Boss10%；抵挡耗尽后结界提前结束。',.3],
 G17:['粉绿花瓣与白色回复十字','回复语义清楚，但缺少桃园主题的记忆点。','每章一次；满心不释放、不消耗充能。',.3],
 G18:['固定双八角阵与八座小门','阵型清楚但线条薄，门与锁阵缺少开合过程。','入阵一次0.90S；减速普通兵25%、Boss10%，命中后维持2秒。',.3],
 G23:['金白扇形声浪与虎面','虎面已有特色，但轮廓与声浪的衔接较平。','100度扇区，普通兵硬直0.15秒，Boss不硬直。',.22],
 G21:['后撤双轨与紫白前向刃波','后退与刃波是两段简单线条，缺少鲜明终结动作。','先后退200再推出380长、80宽刃波；保护0.2秒。',.34],
 G19:['紫白多层雷柱与分叉电弧','单点雷柱较醒目，四次落雷的层次与余波不足。','四处位置施法时锁定，间隔0.3秒；单敌最多1.40S。',.38],
 G24:['四面紫旗与向内移动的圆形音符','军旗与其他增益旗帜相似，压制含义不直观。','一次伤害；3秒内延长下一次攻击间隔，普通兵20%、Boss10%。',.3],
 G22:['十二道扇面穿透箭迹','覆盖面大，但箭体偏细，缺少齐射爆发感。','120度扇面，每箭最多穿3敌；单敌最多0.88S。',.24],
 G20:['紫色坠星金焰与五角落地冲击','坠落有阶段，但落地冲击偏符号化，重量感不足。','五点间隔0.28秒，每点下落0.35秒后伤害；单敌最多1.65S。',.48],
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
 const skills=Array.from(load('common-skills').COMMON_SKILLS);assert.equal(skills.length,24);
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
  const icon=await png('assets/chronicle-ui/skills.png',{left:s.icon%6*96,top:Math.floor(s.icon/6)*96,width:96,height:96});
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
  let base=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#152b25"/>${text(width||'桃园乱斗 当前技能总览',32,58,40,'#ffe3a2',600)}${text(height||'24项通用技能 · 综合威力升序 · 基础击杀充能',32,101,25,'#c4d1b8')}${text('当前代码定帧预览  ·  统一缩放  ·  静态参照兵  ·  非微信实机截图',32,135,20,'#9eaf99')}</svg>`;
  await sharp(Buffer.from(base)).composite(files.map((input,i)=>({input,left:32+i%cols*740,top:header+Math.floor(i/cols)*470}))).png().toFile(target);
 };
 await compose(cards,4,'','',165,path.join(OUT,'技能总览.png'));
 const data={version:VERSION,date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}),preview:'执行当前Runtime与Effects后将Graphics路径转为SVG并栅格化，保留粒子；固定缩放与静态参照兵。非实机截图，不是重设计方案。',skills:records};
 fs.writeFileSync(path.join(OUT,'skills.json'),JSON.stringify(data,null,2)+'\n');
 const cloudPath=path.join(OUT,'feishu-document.json'),cloud=fs.existsSync(cloudPath)?JSON.parse(fs.readFileSync(cloudPath,'utf8')):undefined;
 const cloudLine=cloud?`飞书评审文档：${cloud.doc_url}（云端为先前评审快照，本次本地清理未修改云文档）。\n\n`:'';
 fs.writeFileSync(path.join(OUT,'README.md'),`# 桃园乱斗当前技能评审\n\n版本 ${VERSION}，${data.date}。\n\n${cloudLine}共24项全部开放。本目录只保留当前代码生成的汇总；横扫六合已采用A金锋回旋。\n\n[整体预览](技能总览.png) · [结构化数据](skills.json)\n\n预览执行当前 CommonSkillRuntime / CommonSkillEffects / CombatEffects，在固定场景取代表帧，Graphics路径经SVG栅格化。兵与英雄为静态参照，背景使用当前草地。与Cocos的抗锯齿和动态表现有差异，不能当作微信实机截图；一帧不能展示完整的多段攻击或受击反馈。\n\nS为施法时已装备武器的理论单目标DPS合计乘技能伤害加成，不是单武器攻击力。威力阶是综合效用顺序，不是严格DPS或实测胜率。\n\n|顺序|技能|阶|基础击杀|数值|范围|描述|\n|---|---|---|---|---|---|---|\n`+records.map(s=>`|${s.powerRank}|${s.name}|${s.powerTier}|${s.killCharge}|${s.damage}|${s.range}|${s.effect} ${s.detail}|`).join('\n')+'\n\n## 当前表现评审\n\n'+records.map(s=>`### ${s.name}\n\n现有效果：${s.visual}。\n\n重做重点：${s.issue}\n`).join('\n'));
 console.log(JSON.stringify({output:OUT,skills:records.length,skillsRendered:cards.length,intermediateFiles:0}));
}
module.exports={load,GraphicsSVG};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
