import { Color, Graphics } from 'cc';
export interface ArmPoint { x:number; y:number; }
export const HERO_ARMS={shoulderX:17,shoulderY:4,heldX:35,heldY:-4,relaxedX:32,relaxedY:-7,meleeReach:18,rangedReach:10};
const INK='#493522';
const fistCache=new WeakMap<Graphics,string>();
// All five approved teenage faces use warm peach skin, including Guan Yu.
export const handSkin=(_hero:string):string=>'#f3c39b';
export function shoulderFor(side:number,bob=0):ArmPoint {return {x:side*HERO_ARMS.shoulderX,y:HERO_ARMS.shoulderY+bob};}
export function relaxedWrist(side:number,bob:number,breath:number,phase:number,walk:number):ArmPoint {
  return {x:side*(HERO_ARMS.relaxedX+Math.sin(phase)*walk),y:HERO_ARMS.relaxedY+bob+breath+Math.sin(phase+side)*walk*3};
}
/** A tucked shoulder, low elbow, puffy sleeve and a small cuff. Draw below the head. */
export function drawHeroSleeve(g:Graphics,side:number,wrist:ArmPoint,bob:number,robe:string,hero:string):void {
  const shoulder=shoulderFor(side,bob),elbow={x:side*27+(wrist.x-side*35)*.42,y:Math.min(shoulder.y-9,wrist.y-5)};
  const dx=wrist.x-elbow.x,dy=wrist.y-elbow.y,length=Math.max(.01,Math.hypot(dx,dy));
  const ux=dx/length,uy=dy/length,nx=-uy*side,ny=ux*side,cuff={x:wrist.x-ux*7,y:wrist.y-uy*7};
  // Filled curves rather than thick straight lines across the cheeks.
  g.lineWidth=2.2;g.strokeColor=new Color(INK);g.fillColor=new Color(robe);
  g.moveTo(shoulder.x-side*5,shoulder.y+5);
  g.bezierCurveTo(shoulder.x+side*10,shoulder.y+8,elbow.x+side*9,elbow.y+7,cuff.x+nx*6,cuff.y+ny*6);
  g.lineTo(cuff.x-nx*6,cuff.y-ny*6);
  g.bezierCurveTo(elbow.x+side*4,elbow.y-7,shoulder.x-side*3,shoulder.y-10,shoulder.x-side*5,shoulder.y+5);
  g.close();g.fill();g.stroke();
  // A narrow ivory cuff separates cloth from skin, and hides the joint seam.
  g.fillColor=new Color('#f6e6bb');
  g.moveTo(cuff.x+nx*6-ux*1.5,cuff.y+ny*6-uy*1.5);g.lineTo(cuff.x-nx*6-ux*1.5,cuff.y-ny*6-uy*1.5);
  g.lineTo(cuff.x-nx*6+ux*2,cuff.y-ny*6+uy*2);g.lineTo(cuff.x+nx*6+ux*2,cuff.y+ny*6+uy*2);g.close();g.fill();g.stroke();
  g.fillColor=new Color(handSkin(hero));
  g.moveTo(cuff.x+nx*4+ux*2,cuff.y+ny*4+uy*2);g.lineTo(wrist.x+nx*4,wrist.y+ny*4);
  g.lineTo(wrist.x-nx*4,wrist.y-ny*4);g.lineTo(cuff.x-nx*4+ux*2,cuff.y-ny*4+uy*2);g.close();g.fill();g.stroke();
}
/** Render after the held weapon so the thumb and curled fingers visibly wrap the grip. */
export function drawHeroFist(g:Graphics,hero:string,side:number,gripping:boolean):void {
  const key=hero+':'+side+':'+gripping;if(fistCache.get(g)===key)return;fistCache.set(g,key);
  g.clear();g.fillColor=new Color(handSkin(hero));g.strokeColor=new Color(INK);g.lineWidth=2;
  g.roundRect(-7,-6,14,13,5);g.fill();g.stroke();
  if(gripping){
    g.ellipse(-side*4,3,3.8,4);g.fill();g.stroke();
    g.strokeColor=new Color('#b77a57');g.lineWidth=1.1;
    for(const x of [-2.5,.5,3.5]){g.moveTo(x,-3);g.lineTo(x,-.7);}g.stroke();
  }else{
    g.strokeColor=new Color('#b77a57');g.lineWidth=1.1;g.moveTo(-2,-2);g.bezierCurveTo(-1,-.5,1,-.5,2,-2);g.stroke();
  }
}
