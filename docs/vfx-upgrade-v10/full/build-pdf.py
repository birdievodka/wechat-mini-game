"""Package existing concept images in a review PDF; never alter source PNGs."""
from pathlib import Path
from io import BytesIO
import json, re, argparse, math
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image

HERE=Path(__file__).resolve().parent
OUTPUT=HERE.parents[2]/'output/pdf'
QA=HERE.parents[2]/'tmp/pdfs/vfx-full-review'
M=json.loads((HERE/'manifest.json').read_text()); ITEMS=M['items']; GROUPS=list(M['counts'])
pdfmetrics.registerFont(TTFont('Chinese','/Library/Fonts/Arial Unicode.ttf'))
JADE=HexColor('#173c2c'); PAPER=HexColor('#fff2d5'); GOLD=HexColor('#dcba72'); MUTED=HexColor('#b9c9b1'); INK=HexColor('#253c30')
W,H=1200,1100
ap=argparse.ArgumentParser();ap.add_argument('--partial',action='store_true');ap.add_argument('--qa-only',action='store_true');args=ap.parse_args()
ready=[x for x in ITEMS if (HERE/x['image']).exists()]
if not args.partial and len(ready)!=len(ITEMS):raise SystemExit(f'Incomplete images: {len(ready)}/{len(ITEMS)}')

def wrapped(s,width,size):
    lines=[];line=''
    for ch in s:
        if ch=='\n':lines.append(line);line='';continue
        if pdfmetrics.stringWidth(line+ch,'Chinese',size)>width:lines.append(line);line=ch
        else:line+=ch
    if line:lines.append(line)
    return lines

def text(c,s,x,y,width,size=13,color=INK,leading=None,maxlines=None):
    c.setFillColor(color);c.setFont('Chinese',size);lines=wrapped(s,width,size)
    if maxlines is not None and len(lines)>maxlines:lines=lines[:maxlines-1]+[lines[maxlines-1][:-1]+'…']
    for line in lines:c.drawString(x,y,line);y-=leading or size*1.55
    return y

def image(c,path,x,y,w,h,quality=84):
    # JPEG encoding is solely the PDF container representation; source art is unchanged.
    with Image.open(path) as im:
        out=BytesIO();im.convert('RGB').save(out,format='JPEG',quality=quality,optimize=True,subsampling=2);out.seek(0)
        c.drawImage(ImageReader(out),x,y,w,h,preserveAspectRatio=True,anchor='c',mask='auto')

def footer(c,label):
    c.setStrokeColor(HexColor('#d8c8a8'));c.line(40,38,W-40,38)
    text(c,label,42,21,W-120,9,HexColor('#7b806e'));c.drawRightString(W-42,21,str(c.getPageNumber()))

def main():
    OUTPUT.mkdir(parents=True,exist_ok=True)
    output=OUTPUT/'桃园小英雄-全量特效设计册.pdf' if not args.partial else QA/'预排版.pdf'
    output.parent.mkdir(parents=True,exist_ok=True)
    c=canvas.Canvas(str(output),pagesize=(W,H),pageCompression=1)
    c.setTitle('桃园小英雄 · 全量战斗特效设计册');c.setAuthor('桃园小英雄项目');c.setSubject('133项独立概念稿与机制交接；静态设计，待审')
    c.setFillColor(JADE);c.rect(0,0,W,H,fill=1,stroke=0)
    text(c,'桃园小英雄',60,1010,1080,40,PAPER)
    text(c,'战斗特效全量设计册',60,938,1080,54,PAPER)
    text(c,'133项独立稿 / 36武器 · 12主动 · 21Boss招式 · 40兵种 · 24补充效果',64,864,1080,18,GOLD)
    text(c,'沿用已认可的青玉刃面、翻卷水浪和朱红冲锋。每项提供峰值、阶段关键帧、机制约束与实施说明。',64,815,1050,17,MUTED)
    for n,name in enumerate(['01-guandao.png','02-flood.png','03-lvbu.png']):image(c,HERE.parent/'concepts'/name,60+n*365,448,350,234)
    text(c,'设计范围',64,385,1000,22,GOLD)
    text(c,'全量普通攻击、技能、首领、精英、成长、坐骑、宠物及通用反馈。人物身份与现有机制保留，材质、运动和接触过程全面升级。',64,342,1050,18,PAPER)
    text(c,'阅读说明',64,244,1000,22,GOLD)
    text(c,'内置image_gen静态概念稿，待审；不是连续动画、Cocos截图或手机性能证明。武器I–IV机制在各页附表，透视与夸张受力姿态不作为判定依据。本轮未改游戏代码。',64,202,1050,16,MUTED)
    text(c,'2026-11-20  /  运行基线 stage-v9.22-battle-text',64,76,1050,12,GOLD);c.showPage()
    c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
    text(c,'目录与制作原则',50,1034,1100,32)
    y=966
    for g in GROUPS:
        first=next((i for i,x in enumerate(ready) if x['category']==g),None)
        text(c,f'{g}   {M["counts"][g]}稿',60,y,850,20)
        if first is not None:c.linkRect('',g,(55,y-8,W-55,y+24),relative=0,thickness=0)
        y-=52
    text(c,'本册完整的源路径、提示词、品质数值、层级、实现映射与逐项验收见同目录“完整设计方案.md”和manifest.json。图册HTML可搜索、分类、放大。',60,438,1080,17)
    text(c,'执行顺序：六个真实动态样板 → 全玩家构筑 → 七Boss及40兵 → 原设备长局验收。美术需拆主体、尾迹、接触、余波和地面，不能把整张概念海报塞进运行包。',60,332,1080,17)
    text(c,'性能目标：公共两图＋当前主动一图＋至多双Boss，新增RGBA纹理最坏约20MiB。复用现有池，不因华丽效果增加物理弹或旧新整套双播；危险提示、真实接触与角色面部优先保留。目标仍待样板实测。',60,221,1080,16)
    footer(c,'静态概念设计 · 新稿待审 · 文档不参与运行包');c.showPage()
    seen=set()
    for x in ready:
        if x['category'] not in seen:c.bookmarkPage(x['category']);c.addOutlineEntry(x['category'],x['category'],level=0);seen.add(x['category'])
        c.bookmarkPage(x['id']);c.addOutlineEntry(x['name'],x['id'],level=1)
        c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
        text(c,x['category']+' / '+x['id'],42,1065,1100,12,HexColor('#637963'))
        text(c,x['name'],42,1025,1100,27)
        image(c,HERE/x['image'],40,280,1120,720)
        y=text(c,'视觉：'+x['visual'],44,260,1110,12,leading=17)
        y=text(c,'机制：'+x['contract'],44,y-5,1110,12,leading=17)
        if x['tiers']:
            y-=4
            for t in x['tiers']:
                y=text(c,f"{t['tier']}档  伤害{t['damage']:.3g} / {t['interval']:.3g}秒 / 射程{t['range']:.3g}：{t['mechanics']}",44,y,1110,10,leading=14)
        if y<48:raise ValueError(f'Text overflow: {x["id"]} y={y}')
        footer(c,'静态概念，飞行/接触可同版示意 · 接触与判定以真实事件为准 · 新稿待审');c.showPage()
    c.save();print(str(output))

def qa():
    dest=QA;dest.mkdir(parents=True,exist_ok=True)
    out=dest/'全稿缩略核对.pdf';c=canvas.Canvas(str(out),pagesize=(1500,1200),pageCompression=1)
    for page in range(math.ceil(len(ready)/9)):
        c.setFillColor(JADE);c.rect(0,0,1500,1200,fill=1,stroke=0)
        text(c,f'全量特效 · 视觉核对 {page+1} / {math.ceil(len(ready)/9)}',28,1166,1400,22,PAPER)
        for j,x in enumerate(ready[page*9:page*9+9]):
            col=j%3;row=j//3;xx=25+col*495;yy=805-row*375
            image(c,HERE/x['image'],xx,yy,465,310,84)
            text(c,x['id']+' · '+x['name'],xx,yy-23,465,16,GOLD)
        c.showPage()
    c.save();print(str(out))

if not args.qa_only:main()
qa()
