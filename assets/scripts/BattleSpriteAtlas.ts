import {Color,Graphics,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {WEAPONS,TIER_COLORS} from './weapons';
import {drawWeaponArt} from './weapon-art';
import {drawSkillIcon} from './skill-vfx-art';

const CELL=128,COLUMNS=8;
const UI_PILLS=['#fff0d2','#355e40','#c94d2e','#d3c9b2'];
interface Cell {frame:SpriteFrame;x:number;y:number;width:number;height:number;}
/** Canvas adapter for the existing procedural drawings. Bake once, keep identical grip coordinates. */
export class CanvasDrawing {
  fillColor=new Color('#ffffff');strokeColor=new Color('#ffffff');lineWidth=1;
  private finished=false;
  constructor(private c:CanvasRenderingContext2D){c.beginPath();}
  private path():void{if(this.finished){this.c.beginPath();this.finished=false;}}
  clear():void{this.c.clearRect(-64,-48,CELL,CELL);this.c.beginPath();this.finished=false;}
  moveTo(x:number,y:number):void{this.path();this.c.moveTo(x,y);}
  lineTo(x:number,y:number):void{this.path();this.c.lineTo(x,y);}
  bezierCurveTo(a:number,b:number,c:number,d:number,e:number,f:number):void{this.path();this.c.bezierCurveTo(a,b,c,d,e,f);}
  close():void{this.c.closePath();}
  rect(x:number,y:number,w:number,h:number):void{this.path();this.c.rect(x,y,w,h);}
  roundRect(x:number,y:number,w:number,h:number,r:number):void{
    this.path();const c=this.c;c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
  }
  circle(x:number,y:number,r:number):void{this.ellipse(x,y,r,r);}
  ellipse(x:number,y:number,rx:number,ry:number):void{this.path();const c=this.c;c.save();c.translate(x,y);c.scale(rx,ry);c.moveTo(1,0);c.arc(0,0,1,0,Math.PI*2);c.restore();}
  fill():void{const a=this.fillColor;this.c.fillStyle=`rgba(${a.r},${a.g},${a.b},${a.a/255})`;this.c.fill();this.finished=true;}
  stroke():void{const a=this.strokeColor;this.c.strokeStyle=`rgba(${a.r},${a.g},${a.b},${a.a/255})`;this.c.lineWidth=this.lineWidth;this.c.stroke();this.finished=true;}
}
/** Replaces hundreds of independently allocated Graphics meshes. No downloaded asset or engine internals. */
export class BattleSpriteAtlas {
  private texture?:Texture2D;
  private cells:Record<string,Cell>={};
  get ready():boolean{return !!this.texture;}
  constructor(){try{this.bake();}catch(error){this.destroy();console.warn('战斗图形缓存不可用，回退矢量绘制',error);}}
  private bake():void {
    // Cocos' browser/WeChat document adapter creates an offscreen 2D canvas here.
    if(typeof document==='undefined')return;
    const keys=WEAPONS.map(w=>'weapon-'+w.id).concat(['coin','coin-shadow','birth-ring','birth-dot','enemy-arrow','enemy-bullet','enemy-poison','enemy-knife','enemy-axe','enemy-coin','skill-24','skill-25',...Array.from({length:5},(_,i)=>'hud-slot-'+i),...UI_PILLS.map(c=>'ui-pill-'+c),...Array.from({length:5},(_,i)=>'ui-slot-'+i)]);
    const canvas=document.createElement('canvas');canvas.width=CELL*COLUMNS;canvas.height=CELL*Math.ceil(keys.length/COLUMNS);
    const ctx=canvas.getContext('2d');if(!ctx)return;
    for(let i=0;i<keys.length;i++){
      ctx.save();ctx.beginPath();ctx.rect(i%COLUMNS*CELL,Math.floor(i/COLUMNS)*CELL,CELL,CELL);ctx.clip();ctx.translate(i%COLUMNS*CELL+64,Math.floor(i/COLUMNS)*CELL+80);ctx.scale(1,-1);
      const g=new CanvasDrawing(ctx),key=keys[i];
      if(i<WEAPONS.length)drawWeaponArt(g as unknown as Graphics,WEAPONS[i].id,1,true);
      else if(key.indexOf('skill-')===0)drawSkillIcon(g as unknown as Graphics,Number(key.slice(6)));
      else if(key.indexOf('hud-slot-')===0){
        const tier=Number(key.slice(9));g.fillColor=tier?new Color(255,239,205,235):new Color(40,61,42,180);g.strokeColor=new Color(tier?TIER_COLORS[tier-1]:'#80916c');g.lineWidth=tier?2.5:1.5;g.roundRect(-33,-29,66,58,10);g.fill();g.stroke();
      }
      else if(key.indexOf('ui-pill-')===0){
        g.fillColor=new Color('#392a20');g.roundRect(-26,-29,52,52,18);g.fill();
        g.fillColor=new Color(key.slice(8));g.strokeColor=new Color('#432d1d');g.lineWidth=2;g.roundRect(-26,-26,52,52,18);g.fill();g.stroke();
      }
      else if(key.indexOf('ui-slot-')===0){
        const tier=Number(key.slice(8));g.fillColor=new Color(26,47,35,230);g.strokeColor=new Color(tier?TIER_COLORS[tier-1]:'#6b8065');g.lineWidth=1.5;g.roundRect(-29,-29,58,58,10);g.fill();g.stroke();
      }
      else if(key.indexOf('enemy-')===0){
        g.lineWidth=2;g.strokeColor=new Color('#6f392b');g.fillColor=new Color('#ffe5af');
        if(key==='enemy-coin'){g.fillColor=new Color('#f7c35b');g.circle(0,0,9);g.fill();g.stroke();g.strokeColor=new Color('#a8752e');g.rect(-3,-3,6,6);g.stroke();}
        else if(key==='enemy-bullet'){g.strokeColor=new Color('#f2c767');g.lineWidth=3;g.moveTo(-15,0);g.lineTo(0,0);g.stroke();g.fillColor=new Color('#fff0a5');g.ellipse(4,0,8,4);g.fill();}
        else if(key==='enemy-poison'){g.fillColor=new Color('#c1d67a');g.circle(2,0,4);g.fill();g.stroke();}
        else if(key==='enemy-knife'){g.fillColor=new Color('#e4edf0');g.moveTo(17,0);g.lineTo(-6,6);g.lineTo(-2,0);g.lineTo(-6,-4);g.close();g.fill();g.stroke();g.strokeColor=new Color('#8c4d30');g.lineWidth=4;g.moveTo(-12,0);g.lineTo(-3,0);g.stroke();}
        else if(key==='enemy-axe'){g.strokeColor=new Color('#915c35');g.lineWidth=4;g.moveTo(-12,0);g.lineTo(8,0);g.stroke();g.fillColor=new Color('#d7e1de');g.moveTo(5,0);g.lineTo(2,12);g.lineTo(16,8);g.lineTo(16,-8);g.close();g.fill();g.stroke();}
        else{g.moveTo(-18,0);g.lineTo(15,0);g.stroke();g.moveTo(22,0);g.lineTo(11,5);g.lineTo(11,-5);g.close();g.fill();g.stroke();}
      }else if(key==='coin'){
        g.fillColor=new Color('#efb938');g.strokeColor=new Color('#97601f');g.lineWidth=2;g.circle(0,0,11);g.fill();g.stroke();g.strokeColor=new Color('#ffe799');g.circle(0,0,7.5);g.stroke();g.fillColor=new Color('#97601f');g.rect(-3,-3,6,6);g.fill();
      }else if(key==='coin-shadow'){g.fillColor=new Color(74,64,24,55);g.ellipse(0,-3,10,3);g.fill();}
      else if(key==='birth-ring'){g.strokeColor=new Color('#ffffff');g.lineWidth=1;g.circle(0,0,10);g.stroke();}
      else {g.fillColor=new Color('#ffffff');g.circle(0,0,10);g.fill();}
      ctx.restore();
    }
    const image=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=new Uint8Array(image.data.buffer,image.data.byteOffset,image.data.byteLength);
    this.texture=new Texture2D();this.texture.reset({width:canvas.width,height:canvas.height});this.texture.uploadData(pixels);
    for(let i=0;i<keys.length;i++){
      const tx=i%COLUMNS*CELL,ty=Math.floor(i/COLUMNS)*CELL;
      if(keys[i].indexOf('ui-')===0){const frame=new SpriteFrame();frame.texture=this.texture;frame.rect=new Rect(tx+32,ty+48,64,64);const inset=keys[i].indexOf('ui-pill-')===0?24:14;frame.insetLeft=frame.insetRight=frame.insetTop=frame.insetBottom=inset;this.cells[keys[i]]={frame,width:64,height:64,x:0,y:0};continue;}
      let left=CELL,top=CELL,right=-1,bottom=-1;
      for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++)if(pixels[((ty+y)*canvas.width+tx+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(right<left)continue;left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(CELL-1,right+2);bottom=Math.min(CELL-1,bottom+2);
      const width=right-left+1,height=bottom-top+1,frame=new SpriteFrame();frame.texture=this.texture;frame.rect=new Rect(tx+left,ty+top,width,height);
      this.cells[keys[i]]={frame,width,height,x:left+width/2-64,y:80-top-height/2};
    }
    canvas.width=canvas.height=0;
  }
  copyFrame(key:string):SpriteFrame|undefined{
    const cell=this.cells[key];if(!cell)return;const f=new SpriteFrame();f.texture=cell.frame.texture;const r=cell.frame.rect;f.rect=new Rect(r.x,r.y,r.width,r.height);return f;
  }
  add(parent:Node,key:string):Sprite|undefined{
    const cell=this.cells[key];if(!cell)return;
    const n=new Node('CachedBattleSprite');n.layer=parent.layer;parent.addChild(n);const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;this.set(sprite,key);return sprite;
  }
  addSliced(parent:Node,key:string,width:number,height:number,padding:number):Sprite|undefined{
    const sprite=this.add(parent,key);if(!sprite)return;
    sprite.type=Sprite.Type.SLICED;sprite.node.getComponent(UITransform)!.setContentSize(width+padding,height+padding);return sprite;
  }
  set(sprite:Sprite,key:string):boolean {
    const cell=this.cells[key];if(!cell)return false;sprite.spriteFrame=cell.frame;sprite.node.getComponent(UITransform)!.setContentSize(cell.width,cell.height);sprite.node.setPosition(cell.x,cell.y);return true;
  }
  destroy():void{for(const key of Object.keys(this.cells))this.cells[key].frame.destroy();this.texture?.destroy();this.texture=undefined;this.cells={};}
}
