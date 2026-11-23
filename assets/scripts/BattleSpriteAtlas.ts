import {drawWorldProp,WORLD_PROPS,WorldProp} from './world-prop-art';
import {Color,Graphics,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {WEAPONS,TIER_COLORS} from './weapons';
import {drawWeaponArt} from './weapon-art';
import {drawSkillIcon} from './skill-vfx-art';

const CELL=128,COLUMNS=8;
export const NUMBER_CHARACTERS='0123456789-+/';
const NUMBER_FONT=39,NUMBER_SCALE=21/NUMBER_FONT,NUMBER_WIDTH=25,NUMBER_HEIGHT=42;
export interface NumberGlyph {frame:SpriteFrame;advance:number;width:number;height:number;left:number;}
const UI_PILLS=['#fff0d2','#355e40','#c94d2e','#d3c9b2'];
const SHOP_SKINS=['ui-solid','ui-jade-raised','ui-jade-flat',...Array.from({length:6},(_,i)=>'ui-shop-card-'+i),...Array.from({length:4},(_,i)=>'ui-tier-'+(i+1)),'tier-pip-small','tier-pip','passive-badge','shop-bun'];
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
  readonly numberGlyphs:NumberGlyph[]=[];
  get ready():boolean{return !!this.texture;}
  constructor(){try{this.bake();}catch(error){this.destroy();console.warn('战斗图形缓存不可用，回退矢量绘制',error);}}
  private bake():void {
    // Cocos' browser/WeChat document adapter creates an offscreen 2D canvas here.
    if(typeof document==='undefined')return;
    const keys=WEAPONS.map(w=>'weapon-'+w.id).concat(['coin','coin-shadow','birth-ring','birth-dot','enemy-arrow','enemy-bullet','enemy-poison','enemy-knife','enemy-axe','enemy-coin','skill-24','skill-25',...Array.from({length:5},(_,i)=>'hud-slot-'+i),...UI_PILLS.map(c=>'ui-pill-'+c),...Array.from({length:5},(_,i)=>'ui-slot-'+i),'ui-close',...WORLD_PROPS.map(id=>'prop-'+id)],SHOP_SKINS,['damage-digits']);
    const numberAdvances:number[]=[];
    const canvas=document.createElement('canvas');canvas.width=CELL*COLUMNS;canvas.height=CELL*Math.ceil(keys.length/COLUMNS);
    const ctx=canvas.getContext('2d');if(!ctx)return;
    for(let i=0;i<keys.length;i++){
      ctx.save();ctx.beginPath();ctx.rect(i%COLUMNS*CELL,Math.floor(i/COLUMNS)*CELL,CELL,CELL);ctx.clip();ctx.translate(i%COLUMNS*CELL+64,Math.floor(i/COLUMNS)*CELL+80);ctx.scale(1,-1);
      const g=new CanvasDrawing(ctx),key=keys[i];
      if(i<WEAPONS.length){
        // Use the same cell at 2x density for the small shoe's red straps/braid.
        // Logical grip/size are restored below; no extra atlas or draw per projectile.
        if(key==='weapon-sandal'){ctx.scale(2,2);ctx.translate(0,-4);}
        drawWeaponArt(g as unknown as Graphics,WEAPONS[i].id,1,true);
      }
      else if(key==='damage-digits'){
        // 13 glyphs in the formerly empty 88th cell. Same texture dimensions;
        // rasterized at 39px for crisp 21px feedback, no per-hit canvas/Label cache.
        ctx.scale(1,-1);
        try{ctx.font=NUMBER_FONT+'px Arial';ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.textBaseline='alphabetic';
          for(let n=0;n<NUMBER_CHARACTERS.length;n++){const char=NUMBER_CHARACTERS[n],advance=ctx.measureText(char).width*NUMBER_SCALE;if(!Number.isFinite(advance)||advance<=0)throw new Error('数字字宽不可用');ctx.fillText(char,-63+n%5*NUMBER_WIDTH,-46+Math.floor(n/5)*NUMBER_HEIGHT);numberAdvances.push(advance);}
        }catch(_){numberAdvances.length=0;ctx.clearRect(-64,-80,CELL,CELL);console.warn('数字缓存不可用，伤害文字保留Label；原战斗图集继续可用');}
      }
      else if(key==='ui-solid'){g.fillColor=new Color('#ffffff');g.rect(-32,-32,64,64);g.fill();}
      else if(key.indexOf('ui-jade-')===0){
        const raised=key==='ui-jade-raised';if(raised){g.fillColor=new Color(14,26,20,130);g.roundRect(-26,-32,52,52,25);g.fill();}
        g.fillColor=new Color(30,55,42,raised?237:145);g.strokeColor=new Color(210,199,140,raised?210:95);g.lineWidth=raised?2:1;g.roundRect(-26,-26,52,52,raised?24:14);g.fill();g.stroke();
        if(raised){g.strokeColor=new Color(198,210,168,50);g.lineWidth=1;g.roundRect(-20,-20,40,40,19);g.stroke();}
      }
      else if(key.indexOf('ui-shop-card-')===0){
        const tier=Number(key.slice(13)),weapon=tier>=1&&tier<=4,color=weapon?TIER_COLORS[tier-1]:tier===5?'#e8bb65':'#b8afdc';
        g.fillColor=new Color(48,84,62,230);g.strokeColor=new Color(color);g.lineWidth=weapon?2+tier*.65:2;g.roundRect(-26,-26,52,52,19);g.fill();g.stroke();
        if(weapon){const wash=new Color(color);wash.a=tier===1?10:22;g.fillColor=wash;g.roundRect(-20,-20,40,40,15);g.fill();}
      }
      else if(key.indexOf('ui-tier-')===0){
        const tier=Number(key.slice(8));g.fillColor=new Color('#2f2418');g.roundRect(-26,-21,52,42,12);g.fill();g.fillColor=new Color(TIER_COLORS[tier-1]);g.strokeColor=new Color('#432d1d');g.lineWidth=2;g.roundRect(-26,-18,52,42,12);g.fill();g.stroke();
        if(tier>=3){g.strokeColor=new Color('#ffe6a8');g.lineWidth=1.5;g.roundRect(-22,-14,44,34,9);g.stroke();}
      }
      else if(key==='tier-pip'||key==='tier-pip-small'){
        const r=key==='tier-pip-small'?4:5;g.fillColor=new Color('#ffe3a1');g.strokeColor=new Color('#2f2418');g.lineWidth=1.2;g.moveTo(0,r+1);g.lineTo(r,0);g.lineTo(0,-r-1);g.lineTo(-r,0);g.close();g.fill();g.stroke();
      }
      else if(key==='passive-badge'){g.fillColor=new Color('#ffffff');g.circle(0,0,12);g.fill();}
      else if(key==='shop-bun'){g.fillColor=new Color('#f5dba1');g.strokeColor=new Color('#9a7144');g.lineWidth=3;g.ellipse(0,0,32,25);g.fill();g.stroke();g.moveTo(-10,19);g.lineTo(0,9);g.lineTo(10,19);g.stroke();}
      else if(key.indexOf('prop-')===0)drawWorldProp(g as unknown as Graphics,key.slice(5) as WorldProp);
      else if(key.indexOf('skill-')===0)drawSkillIcon(g as unknown as Graphics,Number(key.slice(6)));
      else if(key.indexOf('hud-slot-')===0){
        const tier=Number(key.slice(9));g.fillColor=tier?new Color(255,239,205,235):new Color(40,61,42,180);g.strokeColor=new Color(tier?TIER_COLORS[tier-1]:'#80916c');g.lineWidth=tier?2.5:1.5;g.roundRect(-33,-29,66,58,10);g.fill();g.stroke();
      }
      else if(key==='ui-close'){
        g.fillColor=new Color('#355e40');g.strokeColor=new Color('#d6be85');g.lineWidth=1.5;g.circle(0,0,23);g.fill();g.stroke();g.strokeColor=new Color('#fff0d2');g.lineWidth=2.5;g.moveTo(-6,-6);g.lineTo(6,6);g.moveTo(-6,6);g.lineTo(6,-6);g.stroke();
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
      if(keys[i]==='damage-digits'){
        if(numberAdvances.length!==NUMBER_CHARACTERS.length)continue;
        for(let n=0;n<NUMBER_CHARACTERS.length;n++){const frame=new SpriteFrame();frame.texture=this.texture;frame.rect=new Rect(tx+n%5*NUMBER_WIDTH,ty+Math.floor(n/5)*NUMBER_HEIGHT,NUMBER_WIDTH,NUMBER_HEIGHT);this.numberGlyphs.push({frame,advance:numberAdvances[n],width:NUMBER_WIDTH*NUMBER_SCALE,height:NUMBER_HEIGHT*NUMBER_SCALE,left:NUMBER_SCALE});}continue;
      }
      if(keys[i].indexOf('ui-')===0){const frame=new SpriteFrame(),key=keys[i],jade=key.indexOf('ui-jade-')===0,size=jade?80:64;frame.texture=this.texture;frame.rect=new Rect(tx+(CELL-size)/2,ty+80-size/2,size,size);const inset=jade?(key==='ui-jade-raised'?39:32):key.indexOf('ui-shop-card-')===0?28:key.indexOf('ui-tier-')===0?22:key.indexOf('ui-pill-')===0?24:14;frame.insetLeft=frame.insetRight=frame.insetTop=frame.insetBottom=inset;this.cells[key]={frame,width:size,height:size,x:0,y:0};continue;}
      let left=CELL,top=CELL,right=-1,bottom=-1;
      for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++)if(pixels[((ty+y)*canvas.width+tx+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(right<left)continue;left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(CELL-1,right+2);bottom=Math.min(CELL-1,bottom+2);
      const width=right-left+1,height=bottom-top+1,frame=new SpriteFrame();frame.texture=this.texture;frame.rect=new Rect(tx+left,ty+top,width,height);
      const shoe=keys[i]==='weapon-sandal',density=shoe?2:1;
      this.cells[keys[i]]={frame,width:width/density,height:height/density,x:(left+width/2-64)/density,y:(80-top-height/2)/density+(shoe?4:0)};
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
  destroy():void{for(const key of Object.keys(this.cells))this.cells[key].frame.destroy();for(const glyph of this.numberGlyphs)glyph.frame.destroy();this.numberGlyphs.length=0;this.texture?.destroy();this.texture=undefined;this.cells={};}
}
