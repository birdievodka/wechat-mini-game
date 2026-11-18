import {Color,Graphics} from 'cc';
export const WORLD_PROPS=['chicken','rabbit','pig','tree','heart','peach','crown'] as const;
export type WorldProp=typeof WORLD_PROPS[number];
/** Existing procedural art, baked once by BattleSpriteAtlas; fallback uses the same paths. */
export function drawWorldProp(g:Graphics,kind:WorldProp):void {
 if(kind==='crown'){g.fillColor=new Color('#f6d279');g.strokeColor=new Color('#6c4929');g.lineWidth=1.5;g.moveTo(-15,0);g.lineTo(-18,15);g.lineTo(-7,9);g.lineTo(0,22);g.lineTo(7,9);g.lineTo(18,15);g.lineTo(15,0);g.close();g.fill();g.stroke();return;}
 if(kind==='tree'){g.strokeColor=new Color('#6e5132');g.lineWidth=9;g.moveTo(0,0);g.lineTo(0,36);g.stroke();g.fillColor=new Color('#83ad6b');g.circle(-16,37,20);g.circle(16,38,20);g.circle(0,53,18);g.fill();g.fillColor=new Color('#f0a1b8');for(const [x,y]of [[-17,39],[11,49],[16,32]]){g.circle(x,y,6);g.fill();}return;}
 if(kind==='heart'||kind==='peach'){
g.strokeColor=new Color('#fff1cf');g.lineWidth=2.5;
    if(kind==='peach'){
      g.fillColor=new Color('#f1a3b1');g.moveTo(0,1);g.bezierCurveTo(-27,9,-17,36,0,27);g.bezierCurveTo(17,36,27,9,0,1);g.close();g.fill();g.stroke();
      g.strokeColor=new Color('#d77c98');g.lineWidth=1.5;g.moveTo(0,5);g.bezierCurveTo(5,14,4,21,0,27);g.stroke();g.fillColor=new Color('#78ad60');g.moveTo(0,27);g.bezierCurveTo(0,39,14,40,17,36);g.bezierCurveTo(13,29,7,28,0,27);g.fill();
    }else{g.fillColor=new Color('#f17c75');g.moveTo(0,0);g.bezierCurveTo(-30,18,-10,42,0,26);g.bezierCurveTo(10,42,30,18,0,0);g.close();g.fill();g.stroke();}
return;}
g.lineWidth=2.5;g.strokeColor=new Color('#65513b');g.fillColor=new Color(kind==='pig'?'#efa5aa':'#fff3d3');
    g.ellipse(0,13,kind==='pig'?24:18,17);g.fill();g.stroke();g.circle(10,29,12);g.fill();g.stroke();
    if(kind==='chicken'){g.fillColor=new Color('#d45843');g.circle(6,42,5);g.circle(13,43,5);g.fill();g.fillColor=new Color('#dfad49');g.moveTo(21,32);g.lineTo(30,28);g.lineTo(21,25);g.close();g.fill();g.stroke();g.lineWidth=3;g.moveTo(-7,0);g.lineTo(-9,-7);g.moveTo(8,0);g.lineTo(10,-7);g.stroke();}
    else if(kind==='rabbit'){g.fillColor=new Color('#fff3d3');g.ellipse(6,47,5,15);g.ellipse(19,45,5,15);g.fill();g.stroke();g.fillColor=new Color('#edb9b7');g.ellipse(6,48,2,9);g.ellipse(19,46,2,9);g.fill();}
    else{g.fillColor=new Color('#e18b98');g.ellipse(22,25,9,7);g.fill();g.stroke();g.ellipse(-12,-1,6,5);g.ellipse(10,-1,6,5);g.fill();}
    g.fillColor=new Color('#493123');g.circle(14,33,2);g.fill();
}
