import {Color,Graphics} from 'cc';
/** Deterministic small hand-painted-style silhouettes, baked into the troop atlases. Grip=(0,0). */
export function drawNpcEquipment(g:Graphics,key:string):void {
 g.clear();g.lineWidth=2;g.strokeColor=new Color('#4d3326');g.fillColor=new Color('#c4d0cd');
 const stroke=(x:number,y:number,tx:number,ty:number,color='#8d5c33',width=5)=>{g.strokeColor=new Color(color);g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();g.strokeColor=new Color('#4d3326');g.lineWidth=2;};
 const box=(x:number,y:number,w:number,h:number,color:string,r=3)=>{g.fillColor=new Color(color);g.roundRect(x,y,w,h,r);g.fill();g.stroke();};
 if(key==='sleeve'){box(-5,-12,10,24,'#ffffff',4);return;}
 if(key==='fist'){g.fillColor=new Color('#f4bd8c');g.ellipse(0,0,8,7);g.fill();g.stroke();g.moveTo(2,-4);g.lineTo(2,2);g.stroke();return;}
 if(key==='shield'){box(-17,-16,34,40,'#b8994d',8);g.strokeColor=new Color('#efcf71');g.lineWidth=3;g.moveTo(-12,-11);g.lineTo(-12,19);g.moveTo(0,-11);g.lineTo(0,19);g.moveTo(12,-11);g.lineTo(12,19);g.stroke();return;}
 if(['saber','dagger','spear','javelin','halberd','axe','hammer','staff','club','hoe'].includes(key)){
  const pole=['spear','halberd','staff','hoe'].includes(key),tip=pole?51:key==='javelin'?42:key==='dagger'?24:36;
  stroke(0,-14,0,tip-5,'#4d3326',6);stroke(0,-14,0,tip-5,'#98673b',3);
  g.fillColor=new Color('#bdcbc7');g.strokeColor=new Color('#4d3326');g.lineWidth=2;
  if(key==='saber'||key==='dagger'){g.moveTo(-4,5);g.lineTo(-4,tip-10);g.bezierCurveTo(-3,tip+4,6,tip+7,9,tip+10);g.lineTo(6,7);g.close();g.fill();g.stroke();box(-8,2,16,4,'#e4bd62',1);}
  else if(key==='spear'||key==='javelin'||key==='halberd'){g.moveTo(0,tip+8);g.lineTo(-6,tip-7);g.lineTo(0,tip-3);g.lineTo(6,tip-7);g.close();g.fill();g.stroke();if(key==='halberd'){g.moveTo(2,tip-6);g.bezierCurveTo(20,tip-14,15,tip-25,3,tip-21);g.close();g.fill();g.stroke();}stroke(-4,tip-7,6,tip-7,'#c94b38',4);}
  else if(key==='axe'||key==='hoe'){g.moveTo(0,tip-5);g.lineTo(19,tip+2);g.lineTo(18,tip-14);g.lineTo(0,tip-13);g.close();g.fill();g.stroke();}
  else if(key==='hammer')box(-17,tip-12,34,20,'#8e9aa0',4);
  else if(key==='club'){box(-10,8,20,tip,'#a47b38',9);g.fillColor=new Color('#eac464');for(const [x,y]of [[-5,17],[5,25],[-3,34]]){g.circle(x,y,3);g.fill();}}
  else {box(-7,tip-8,14,8,'#e3bb64',2);}return;
 }
 if(['bow','crossbow','repeater','heavy-crossbow','musket','triple-gun','blowgun'].includes(key)){
  if(key==='bow'){g.strokeColor=new Color('#805132');g.lineWidth=5;g.moveTo(2,-23);g.bezierCurveTo(28,-17,28,17,2,23);g.stroke();stroke(2,-23,2,23,'#f5ddb3',1);stroke(-7,0,32,0,'#e5d2a2',2);g.fillColor=new Color('#d8e4dc');g.moveTo(38,0);g.lineTo(29,4);g.lineTo(29,-4);g.close();g.fill();g.stroke();}
  else if(key==='blowgun'){box(-12,-3,48,6,'#9ba957',2);stroke(0,-3,0,3,'#5d713b',2);stroke(22,-3,22,3,'#5d713b',2);}
  else if(key==='musket'||key==='triple-gun'){box(-17,-7,29,13,'#956233',3);for(let i=0;i<(key==='triple-gun'?3:1);i++)box(2,-7+i*5,35,4,'#687b81',1);box(-5,-15,9,12,'#8c5930',2);}
  else {box(-14,-5,44,9,'#a7793f',3);stroke(15,-17,26,0,'#6d492d',5);stroke(26,0,15,17,'#6d492d',5);stroke(15,-17,15,17,'#ecd8ad',1);if(key==='repeater')box(-2,4,21,12,'#aa753d',2);if(key==='heavy-crossbow')box(1,-10,13,20,'#6c7678',2);}return;
 }
 if(key==='flag'){stroke(0,-15,0,56);g.fillColor=new Color('#edc158');g.moveTo(0,52);g.lineTo(30,47);g.lineTo(23,35);g.lineTo(0,39);g.close();g.fill();g.stroke();stroke(7,44,21,42,'#a05c30',2);return;}
 if(key==='medicine'){box(-16,-9,32,25,'#94683d',4);stroke(-6,16,6,16,'#5c4631',3);stroke(0,-3,0,10,'#fff0d4',4);stroke(-6,4,6,4,'#fff0d4',4);return;}
 if(key==='fan'){g.fillColor=new Color('#ecf0df');for(let i=0;i<5;i++){const x=(i-2)*5;g.moveTo(0,-4);g.bezierCurveTo(x-12,16,x-6,34,x,38-Math.abs(i-2)*3);g.bezierCurveTo(x+8,30,x+10,13,0,-4);g.fill();g.stroke();}stroke(0,-12,0,5,'#bf9b51',5);return;}
 if(key==='talisman'){box(-11,-5,22,39,'#efce64',2);stroke(-5,24,5,19,'#b74835',2);stroke(5,19,-4,12,'#b74835',2);stroke(-4,12,4,3,'#b74835',2);return;}
 if(key==='torch'){stroke(0,-14,0,24,'#825a32',7);g.fillColor=new Color('#e87435');g.moveTo(-10,21);g.bezierCurveTo(-19,36,0,42,0,56);g.bezierCurveTo(19,42,19,27,8,20);g.close();g.fill();g.stroke();g.fillColor=new Color('#ffe28a');g.ellipse(1,31,5,11);g.fill();return;}
 if(key==='firecracker'){for(const x of[-10,0,10])box(x-4,-8,8,30,'#cc5536',2);stroke(0,22,5,31,'#b89153',2);return;}
 g.fillColor=new Color(key==='bomb'?'#686668':'#a66d35');g.ellipse(0,6,15,18);g.fill();g.stroke();box(-7,19,14,7,'#d1ae60',2);stroke(0,26,9,34,'#9e793f',2);g.fillColor=new Color('#ffd980');g.circle(10,35,3);g.fill();
}
