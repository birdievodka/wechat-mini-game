"""Build the non-runtime design handoff and local image catalogue; no game changes."""
from pathlib import Path
import json, html, hashlib

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
M=json.loads((HERE/'manifest.json').read_text())
ITEMS=M['items']
GROUPS=list(M['counts'])

def esc(v):return html.escape(str(v),quote=True)
def pipeline(x):
    c=x['category']
    if c=='武器':return 'GameBootstrap实际武器出手/追加段/命中 → combat-effects与原武器trail → 公共主体/轨迹/接触层'
    if c=='主动技能':return 'CommonSkillRuntime真实任务/命中 → CommonSkillEffects → skill-vfx-art / sweep-effects及新材质层'
    if c in ['Boss招式','中Boss变体']:return '首领/精英状态机 → 实际危险物/弹体/随从 → boss-effects / lvbu-effects / 共享危险提示'
    if c=='小兵攻击':return 'updateChronicleEnemy真实attack → NpcActionRig原抬手/出手/收招 → enemy-action-effects / enemy-spell-effects'
    if c=='灵宠':return 'PetRuntime真实strike/shot/impact → pet-art与共享材质；不新增可受击实体'
    if c in ['本命连招','坐骑冲刺']:return '个人成长状态/当前本命标记/实际位移 → growth-effects/原trail；不改武器槽/位移/充能'
    return '既有确认的命中/出生/死亡/格挡/拾取/状态事件 → 对应共享反馈槽；渲染失败不改结算'

def family(x):
    t=x['name']+x['visual']
    if any(k in t for k in ['水淹','水浪']):return '水体：深蓝青背面 #17687C / 青蓝水体 #24BBD1 / 薄青透光 #94EDDE / 暖白浪冠 #FFF9DF'
    if any(k in t for k in ['火','爆竹','爆破','火箭','震天雷']):return '火焰：低亮赤底 #8F3029 / 橙红主体 #EF5C2E / 金橙翻焰 #FFB63C / 短白热芯 #FFF6CB'
    if any(k in t for k in ['雷','电']):return '雷能：紫色背晕 #754DC2 / 紫白雷芯 #F8ECFF / 青紫短游电 #B39FFF；张角主体另用金白黄符'
    if any(k in t for k in ['青玉','青龙','风羽','飞剑','小青蛟']):return '青玉：细暗背沿 #226F6E / 实体玉青 #42CDB2 / 流纹 #A3F2D3 / 白玉锋面 #FFF9DE'
    if any(k in t for k in ['赤兔','吕布','朱红','虎豹']):return '赤锋：暗朱背面 #A53331 / 鲜朱主体 #F25D47 / 金色旋纹 #FFC45E / 白热前锋 #FFF5D2'
    if any(k in t for k in ['桃','粉']):return '桃花：浅粉薄面 #FFC0CF / 桃红背面 #DB6C93 / 白粉高光 #FFF2E9 / 玉绿辅助 #79C493'
    return '金属/实体：细赭金背沿 #997139 / 金白主体 #F4C56D / 象牙白锋面 #FFF5DA；黑白棋/铜印/木器保留实体本色'

for x in ITEMS:
    p=HERE/x['image']
    if p.exists():
        x['sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
        x['bytes']=p.stat().st_size
        if x['status']=='pending':x['status']='concept-ready-awaiting-review'
    x['palette']=family(x)
    x['pipeline']=pipeline(x)
    x['source']=[s.replace('assets/scripts/yellow-charge.ts','assets/scripts/yellow-chargers.ts') for s in x['source']]
(HERE/'manifest.json').write_text(json.dumps(M,ensure_ascii=False,indent=2))

intro='''# 《桃园小英雄》全量战斗特效设计册

2026-11-20。用户已认可三张先导稿的材质和风格方向，本册将该方向扩展为133项独立设计。它们是美术概念与实施交接，不是运行素材、引擎截图或连续动画；新稿逐项待审。本轮不写战斗代码、不修改数值、不构建或发布。

## 设计目标与范围

人物保持少年Q版、暖色粗轮廓、小脚豆比例；七Boss和40兵沿用各自身份。特效以实体刃面、通透流纹、卷起浪冠、翻焰、粗细雷芯和有重量的实体道具建立质感。画面明亮、局部高光集中，攻击主体可辨、人物脸和危险缺口可见。

每张图上方为主效果峰值，下方为同一效果的三个关键阶段。本命连招下方特指第一/二/三击，不代表同一次出手结算三次。武器品质机制在逐项四档表中给出，主图只示一个代表性瞬间，不能据图猜弹数/伤害/世界半径。

| 类别 | 独立稿数 | 覆盖 |
| --- | --- | --- |
| 武器 | 36 | 全目录，含6预留；每把一稿及I–IV机制表，不开放预留资格 |
| 通用主动 | 12 | 全部现存技能，统一15真实普通兵击杀充能 |
| Boss招式 | 21 | 七Boss各三招；吕布正式小Boss仍只开两招 |
| 普通兵攻击 | 40 | 逐兵抬手/主体/接触/收招；农兵两外观同稿 |
| 本命连招/坐骑/灵宠 | 9 | 三英雄各一连招、一冲刺、一宠物攻击 |
| 通用反馈 | 8 | 受伤、出生、退场、格挡、回血、穿透弹射、桃花次生爆散、控制减速 |
| 中Boss变体 | 7 | 黄巾三将、河北戟将、虎豹先锋、象兵两招、军师两棋阵；吕布复用对应Boss稿 |

## 统一表现规则

**完整过程：动作聚能 → 主体释放 → 实际接触 → 余波回收。**

- 刀锋：实体刃面与透明尾分开，锋口最实最亮，尾部变窄、变薄，不用一圈同粗光环代替横扫。
- 弹体：头部位置与真实弹体一致，尾迹从历史运动路径生成。加速、弹射、穿透分别读得到；连续命中只在真实接触处亮起。
- 火：暗赤底、橙金翻焰、局部白芯、碎纸/碎石、薄烟分段衰减。烟不能常态遮住战场，熄火残迹明显低亮且无伤害。
- 水：连续青蓝厚水体、卷起的白浪冠、通透水裙和局部水花。前后层交错，中心留白；实际扩散前缘与命中同源。
- 雷：雷芯有粗细和分叉，地面电冠、游电、纸灰与焦痕错开结束；不能整屏蒙白。
- 法阵/实体：门印、棋子、金印有正侧面与落影；阵纹只在局部按节拍流动，安全缺口不被高亮图案填平。
- 角色：叠加短拧身、压身、手腕随动、马匹蓄势/刹停。只偏移表现层，不改变碰撞、朝向、握持关系或英雄身份。
- 受击：来自确认命中；空放无接触爆点。概念中的夸张退姿/离地轮廓不授权增加击飞、眩晕或额外伤害。
- 敌我：友方普通攻击紧凑，主动负责高潮；敌方保留薄朱红危险边和收紧刻度，Boss主体可保留金/紫/红身份。已取消的长瞄准线和冲锋路框不恢复。

## 节奏与机制保真

| 家族 | 起手 | 主体/接触 | 收尾 |
| --- | --- | --- | --- |
| 普通近战 | 在原attack内压身/收械，不能新增攻击延迟 | 瞬发伤害帧先有锋闪，运动刃尾装饰；逐角度判伤则刀锋同步扫角 | 短收尖尾、定向碎屑、回正，不多结算一次 |
| 飞行武器 | 原出手时刻短枪口/弦/符口聚能 | 主体/历史尾轨/实际接触共用位置 | 到期/碰撞立即停主体，接触碎屑短衰减 |
| 扩散/地面持续 | 原预告时钟内增加材质与阶段 | 实际半径、锁点、tick、轮次和次数上限驱动表现 | 失去判定后残迹降亮，不能假装继续有伤 |
| 增益/控制/防御 | 短而明确启动峰值 | 低亮持续身份；格挡剩余次数、控制结束按真实状态 | 到期撤印/撤星/撤流纹，不拖成永久罩 |
| 骑乘冲锋 | 原蓄势内压身/刨地/前锋聚能 | 主体头部贴真实危险位置，尾部随身后路径伸缩 | 真实刹停时向前尘翻、能量尾回收 |

现有机制优先级：实际Runtime调用 > 当前导出字段 > 旧描述文字。核对中发现E06/E07目录旧描述R100/R130与当前调用R85/R95不同，本册使用当前调用；普通E40两雷区与第六关精英三子/十字棋阵分开列稿。司马懿当前招式名为“阴阳双龙”“五丈星劫”，不沿用早期提案别名。未借本轮设计擅自修战斗或调整数值。

## 四品质与成长

I档也有完整主体/接触/收尾；II增加细边与流纹；III在真实特殊触发上强调；IV提升短高潮的轮廓和材质。不能只将白/蓝/紫/红品质色直接套满攻击，也不能为没有追加攻击的品质伪造多次命中。

逐项表数值为无英雄/道具修正的武器品质快照，实际战斗用最终Stats。三英雄本命成长覆盖对应品质额外攻击规则；商店普通副本仍走各自品质机制。其他五件环绕武器不因本命连招同时接管姿态或重复触发。

60被动与9天命依真实事件增强原效果，数值型增益不新增常驻特效；分裂/弹射/穿透/爆散等复用对应武器与8类反馈，不为每层被动新增发射器。金币拾取继续静音，音频复用现有6音效＋1音乐与分类限频，不能为每粒碎屑播放声音。

## 制作交接与性能目标

美术交付按主体、尾迹、接触、余波、地面与角色配合拆层；另给锚点、透明Alpha、尺寸、色板、帧序与时间曲线。短火焰/爆点可用局部序列帧，长弧/浪墙/剑气由连续轨迹与UV材质组织。透明纹理在浅/深六主题都检查边缘；全图概念板不直接入包。

建议公共材质最多两张1024²、当前主动一张、每位Boss一张、无尽最多两位Boss；无mipmap的RGBA纹理增量最坏约20MiB，准备峰值争取24MiB以内。这是待动态样板实测的目标，不是批准后的保证。现有武器实体形状继续复用原图集，整套133张概念图仅留文档，不参与运行加载。

保留80敌、160友弹、80敌方移动物、6危险区、4主招、280粒子及现有有界视觉池；不为每个攻击/敌人新建Graphics。替换旧表现时逐项退役，不能旧新整套双播。新增装饰片建议常态64/短峰96以内，优先级保留主体、落点和真实危险边界；远处尾屑、二级晕光、余烟先降。绘制调用增量普通20/爆发35仅为初始目标。

加载/暂停/购物/后台/死亡/重开/取消及迟到发布沿项目租约统一回收。按关/当前技能从CDN准备，预热后绑定素材，不在命中时下载/创建Canvas/生成文本纹理；伤害数字保留共享Sprite。纹理、缓冲、帧时间在跨商店长局中必须形成有界平台。现有原生JSC闪退没有据本设计被确诊或修复。

实施仍先做青龙刀、火箭筒、水淹七军、横扫六合、张角定雷、吕布冲锋六个真实Cocos动态样板，校准后全量铺开。验收包含四向/斜向、空放/实命中、坐骑/六武器、五倍攻速、双Boss、各主题、边缘/遮挡/打断与跨商店循环；原iPhone15ProMax做15/30分钟检查。静态图只能验美术，不证明60fps或手机稳定性。

## 逐项设计

以下每项均有独立稿、设计说明、机制约束、层级、源路径及实施映射。原始提示与参考在manifest.json，图像为内置image_gen产出；三张先导稿沿用用户认可版本，新稿待逐项审阅。

'''
parts=[intro]
for group in GROUPS:
    parts.append('\n## '+group+'\n')
    for x in [i for i in ITEMS if i['category']==group]:
        parts.append(f"\n### {x['id']} · {x['name']}\n\n![{x['name']}]({x['image']})\n\n**视觉设计：** {x['visual']}\n\n**材料色板：** {x['palette']}\n\n**动作阶段：** {x['stages']}\n\n**机制与判定：** {x['contract']}\n\n**层级：** {x['layers']}\n\n**实现映射：** {x['pipeline']}。\n\n**源码核对：** "+'、'.join('`'+s+'`' for s in x['source'])+'。\n')
        if x['tiers']:
            parts.append('\n| 品质 | 基础显示伤害 | 间隔秒 | 射程 | 爆散半径 | 实际机制 |\n| --- | --- | --- | --- | --- | --- |\n')
            for t in x['tiers']:parts.append(f"| {t['tier']} | {t['damage']:.3g} | {t['interval']:.3g} | {t['range']:.3g} | {t['area']:.3g} | {t['mechanics']} |\n")
        parts.append('\n**逐项验收：** 先检查主体轮廓与原身份，再按本条真实范围/时钟检查起手、峰值、接触和收尾；范围外无伪命中、暂停不推进、清场无残影，密集叠加仍看清危险。概念透视/夸张退姿不作为判伤或新增控制依据。\n')
(HERE/'完整设计方案.md').write_text(''.join(parts))

cards=''.join(f'<button class="card" data-id="{esc(x["id"])}"><img loading="lazy" decoding="async" src="{esc(x["image"])}" alt="{esc(x["name"])}"><span class="meta">{esc(x["id"])} · {esc(x["category"])}</span><strong>{esc(x["name"])}</strong></button>' for x in ITEMS)
tabs='<button class="tab selected" data-cat="全部">全部 <small>133</small></button>'+''.join(f'<button class="tab" data-cat="{g}">{g} <small>{M["counts"][g]}</small></button>' for g in GROUPS)
data=json.dumps([{k:x[k] for k in ['id','name','category','visual','contract','stages','palette','pipeline','image','tiers']} for x in ITEMS],ensure_ascii=False).replace('</','<\\/')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>桃园小英雄 · 全量特效设计册</title><style>
:root{--bg:#142a23;--paper:#f9edce;--muted:#b5c5a9;--gold:#e3bd6d;--green:#294c3b}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--paper);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}header{max-width:1440px;margin:auto;padding:52px 32px 24px}header .kicker{color:var(--gold);letter-spacing:3px;font-size:12px}h1{font-size:38px;margin:14px 0}header p{color:var(--muted);line-height:1.8;max-width:900px}a{color:var(--gold)}.tools{position:sticky;top:0;z-index:2;background:#142a23f2;backdrop-filter:blur(10px);padding:16px 32px;border-block:1px solid #e3bd6d30}.tools>div{max-width:1376px;margin:auto}.tabs{display:flex;gap:8px;flex-wrap:wrap}.tab{border:1px solid #e3bd6d35;color:var(--paper);background:transparent;border-radius:22px;padding:10px 14px;font-size:13px;cursor:pointer}.tab.selected{background:var(--gold);color:var(--bg)}small{opacity:.65;margin-left:4px}input{margin-top:14px;border:1px solid #e3bd6d40;border-radius:9px;background:#213c30;color:var(--paper);padding:11px 15px;width:min(440px,100%);font-size:14px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;max-width:1440px;margin:0 auto;padding:28px 32px 64px}.card{text-align:left;padding:0 0 18px;background:#244434;border:1px solid #e3bd6d30;border-radius:12px;overflow:hidden;cursor:pointer;color:var(--paper);transition:transform .15s,border-color .15s}.card:hover{transform:translateY(-3px);border-color:var(--gold)}.card img{width:100%;aspect-ratio:1.5;object-fit:contain;background:#12281e;display:block}.meta{display:block;color:var(--muted);font-size:11px;padding:15px 18px 7px}.card strong{display:block;font-size:19px;padding:0 18px}.count{float:right;color:var(--muted);font-size:12px;padding-top:12px}dialog{width:min(1440px,96vw);max-height:96vh;padding:0;border:1px solid #b48e4e;background:#19352a;color:var(--paper);border-radius:12px}dialog::backdrop{background:#071710e8}.modalbar{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #e3bd6d30;position:sticky;top:0;background:#19352af5;z-index:1}.modalbar h2{margin:0;flex:1;font-size:20px}.modalbar button{border:1px solid #e3bd6d60;border-radius:20px;background:#2d503d;color:var(--paper);padding:9px 16px;cursor:pointer}.large{width:100%;height:auto;display:block}.detail{padding:20px 28px 32px;font-size:14px;line-height:1.9}.detail b{color:var(--gold)}.detail p{margin:8px 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{text-align:left;padding:9px;border-bottom:1px solid #e3bd6d30}footer{max-width:1440px;margin:auto;padding:0 32px 36px;color:var(--muted);font-size:12px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:20px}.tools{padding:12px 20px}header{padding:30px 20px}h1{font-size:28px}}@media(max-width:540px){.grid{grid-template-columns:1fr}.card strong{font-size:18px}.count{display:none}.tab{padding:8px 10px}.modalbar h2{font-size:16px}.modalbar button{padding:8px 10px}.detail{padding:16px}}
</style><header><div class="kicker">TAOYUAN LITTLE HEROES / VFX ART DIRECTION</div><h1>桃园小英雄 · 全量特效设计册</h1><p>133项独立设计，以已认可的青玉刃面、翻卷水浪、朱红冲锋为统一标准。点击图片查看完整关键帧、机制约束和武器四品级。所有图像均为静态美术概念，待审；未改游戏代码。</p><a href="完整设计方案.md">完整文字交接</a> · <a href="../方案.md">升级总方案</a> · <a href="manifest.json">来源与生成提示</a></header><section class="tools"><div><div class="tabs">TABS</div><span class="count" id="count"></span><input id="search" type="search" placeholder="搜索名称、ID、Boss或效果特征" aria-label="搜索特效"></div></section><main class="grid">CARDS</main><footer>2026-11-20 · 内置 image_gen 概念稿 · 原PNG保留 · 概念尺寸/退姿不授权新增范围、击飞或伤害 · Esc关闭，← →切换设计稿</footer><dialog id="viewer"><div class="modalbar"><h2 id="title"></h2><button id="prev" aria-label="上一张">←</button><button id="next" aria-label="下一张">→</button><button id="close">关闭 ×</button></div><img class="large" id="large" alt=""><div class="detail" id="detail"></div></dialog><script>
const items=DATA, viewer=document.querySelector('#viewer'), byId=new Map(items.map(x=>[x.id,x]));let category='全部',filtered=items,current;const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function filter(){let q=document.querySelector('#search').value.trim().toLowerCase();filtered=items.filter(x=>(category==='全部'||x.category===category)&&(!q||[x.id,x.name,x.visual,x.contract].join(' ').toLowerCase().includes(q)));let ids=new Set(filtered.map(x=>x.id));document.querySelectorAll('.card').forEach(c=>c.hidden=!ids.has(c.dataset.id));document.querySelector('#count').textContent=`显示 ${filtered.length} / ${items.length}`;}
function openItem(id){const x=byId.get(id);current=id;document.querySelector('#title').textContent=x.id+' · '+x.name;let img=document.querySelector('#large');img.src=x.image;img.alt=x.name;let content=[['视觉设计',x.visual],['动作阶段',x.stages],['机制约束',x.contract],['材料与配色',x.palette],['实施映射',x.pipeline]].map(([k,v])=>`<b>${k}</b><p>${E(v)}</p>`).join('');if(x.tiers.length)content+='<b>品质机制 · 无英雄/道具修正</b><table><thead><tr><th>品质</th><th>伤害</th><th>间隔</th><th>射程</th><th>机制</th></tr></thead><tbody>'+x.tiers.map(t=>`<tr><td>${t.tier}</td><td>${t.damage}</td><td>${t.interval}</td><td>${t.range}</td><td>${E(t.mechanics)}</td></tr>`).join('')+'</tbody></table>';document.querySelector('#detail').innerHTML=content;if(!viewer.open)viewer.showModal();viewer.scrollTop=0;}
function step(n){const i=filtered.findIndex(x=>x.id===current);if(filtered.length)openItem(filtered[(i+n+filtered.length)%filtered.length].id);}document.querySelectorAll('.card').forEach(c=>c.addEventListener('click',()=>openItem(c.dataset.id)));document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{category=t.dataset.cat;document.querySelectorAll('.tab').forEach(v=>v.classList.toggle('selected',v===t));filter();}));document.querySelector('#search').addEventListener('input',filter);document.querySelector('#close').onclick=()=>viewer.close();document.querySelector('#prev').onclick=()=>step(-1);document.querySelector('#next').onclick=()=>step(1);document.addEventListener('keydown',e=>{if(viewer.open&&e.key==='ArrowRight'){e.preventDefault();step(1);}if(viewer.open&&e.key==='ArrowLeft'){e.preventDefault();step(-1);}});filter();
</script></html>'''
page=page.replace('TABS',tabs).replace('CARDS',cards).replace('const items=DATA,','const items='+data+',')
(HERE/'图册.html').write_text(page)
print(json.dumps({'items':len(ITEMS),'ready':sum((HERE/x['image']).exists() for x in ITEMS),'groups':M['counts']},ensure_ascii=False))
