import { Color, Graphics } from 'cc';
import { Tier, TIER_COLORS, WeaponId } from './weapons';

/** Shared silhouettes for the loadout, shop and actual held weapons. Origin is the grip. */
export function drawWeaponArt(g: Graphics, id: WeaponId, tier: Tier = 1, projectile = false): void {
  g.clear(); g.lineWidth = 2.5; g.strokeColor = new Color('#493522');
  if (id === 'sandal') {
    g.fillColor = new Color('#eabc60'); g.roundRect(-14, -11, 28, 47, 12); g.fill(); g.stroke();
    g.strokeColor = new Color('#9a682b'); g.lineWidth = 2;
    for (let y = -4; y <= 28; y += 8) { g.moveTo(-10, y); g.lineTo(10, y); } g.stroke();
    g.strokeColor = new Color('#443424'); g.lineWidth = 3.5;
    g.moveTo(-10, 26); g.lineTo(0, 13); g.lineTo(10, 26); g.moveTo(0, 13); g.lineTo(0, -7); g.stroke();
  } else if (id === 'pole') {
    g.fillColor=new Color('#dca348');g.strokeColor=new Color('#5a3822');g.lineWidth=2.5;
    g.moveTo(-4,-47);g.bezierCurveTo(-10,-15,-7,29,0,65);g.lineTo(7,67);g.bezierCurveTo(0,25,-2,-18,3,-47);g.close();g.fill();g.stroke();
    g.strokeColor=new Color('#f6d68b');g.lineWidth=2;g.moveTo(-1,-39);g.bezierCurveTo(-4,0,-2,32,3,57);g.stroke();
    g.strokeColor=new Color('#bf4e35');g.lineWidth=6;for(const y of [-34,48]){g.moveTo(-5,y);g.lineTo(4,y+1);}g.stroke();
  } else if (id === 'peach') {
    // Hold the original peach branch; only the projectile is a single petal.
    if(!projectile){
      g.strokeColor=new Color('#714830');g.lineWidth=5;g.moveTo(0,-15);g.lineTo(0,25);g.lineTo(14,38);g.moveTo(0,15);g.lineTo(-12,26);g.stroke();
      g.fillColor=new Color('#f599bd');g.strokeColor=new Color('#b75c83');g.lineWidth=1.5;
      for(const [x,y]of [[12,36],[-11,26]]){for(let i=0;i<5;i++){const a=i*Math.PI*.4;g.circle(x+Math.cos(a)*4,y+Math.sin(a)*4,4);g.fill();g.stroke();}g.fillColor=new Color('#ffe39c');g.circle(x,y,2.5);g.fill();g.fillColor=new Color('#f599bd');}return;
    }
    g.fillColor=new Color('#f5a1bb');g.strokeColor=new Color('#a95778');g.lineWidth=2;
    g.moveTo(0,-12);g.bezierCurveTo(-18,2,-12,20,-3,25);g.bezierCurveTo(0,27,2,22,3,21);g.bezierCurveTo(18,28,21,5,0,-12);g.close();g.fill();g.stroke();
    g.strokeColor=new Color('#ffe7dc');g.lineWidth=2;g.moveTo(0,-7);g.bezierCurveTo(-3,4,0,12,3,18);g.stroke();
  } else if (id === 'cleaver') {
    g.fillColor=new Color('#77432b');g.roundRect(-4,-20,8,26,3);g.fill();g.stroke();
    g.fillColor=new Color('#bec9c6');g.moveTo(-5,3);g.lineTo(-5,33);g.lineTo(3,65);g.bezierCurveTo(14,37,14,18,6,3);g.close();g.fill();g.stroke();
    g.fillColor=new Color('#f3f5e5');g.moveTo(4,7);g.bezierCurveTo(10,26,8,44,3,65);g.bezierCurveTo(15,38,16,20,7,5);g.close();g.fill();
    g.fillColor=new Color('#e9bf64');g.roundRect(-6,0,14,5,2);g.fill();g.circle(0,-7,1.7);g.circle(0,-15,1.7);g.fill();
  } else if (id === 'firecracker') {
    for (const x of [-10, 0, 10]) {
      g.fillColor = new Color('#cf5139'); g.roundRect(x - 5, -9, 10, 37, 3); g.fill(); g.stroke();
      g.fillColor = new Color('#efc263'); g.rect(x - 4, 0, 8, 7); g.fill();
    }
    g.strokeColor = new Color('#785432'); g.lineWidth = 2; g.moveTo(0, 28); g.lineTo(7, 39); g.stroke();
    g.fillColor = new Color('#ffe08a'); g.circle(8, 40, 4); g.fill();
  }
  if (['smg','shotgun','rocket'].indexOf(id) >= 0) {
    if (projectile) {
      g.strokeColor = new Color(id === 'rocket' ? '#fbaf58' : '#ffe3a0'); g.lineWidth = id === 'rocket' ? 9 : 4; g.moveTo(0,-12); g.lineTo(0,10); g.stroke();
      g.fillColor = new Color(id === 'rocket' ? '#c85c3a' : '#fff5ca'); g.ellipse(0,10,id==='rocket'?6:3,7);g.fill();
    } else {
      g.fillColor=new Color('#b17a3d'); g.roundRect(-12,-22,24,48,5);g.fill();g.stroke();
      g.fillColor=new Color('#626d67');g.roundRect(-7,16,14,id==='rocket'?38:27,3);g.fill();g.stroke();
      g.fillColor=new Color('#eac35f');g.rect(-9,4,18,9);g.fill();
      g.fillColor=new Color('#ca5139');g.moveTo(2,0);g.lineTo(24,-13);g.lineTo(21,5);g.close();g.fill();g.stroke();
      if(id==='shotgun'){g.fillColor=new Color('#656960');g.rect(6,18,9,28);g.fill();g.stroke();}
      if(id==='rocket'){g.fillColor=new Color('#cb563c');g.moveTo(-11,43);g.lineTo(0,61);g.lineTo(11,43);g.close();g.fill();g.stroke();}
    }
  } else if (id === 'sword') {
    g.lineWidth=2;g.fillColor=new Color('#eafff7');g.strokeColor=new Color('#285b54');g.moveTo(-7,2);g.lineTo(-7,38);g.lineTo(0,62);g.lineTo(7,38);g.lineTo(7,2);g.close();g.fill();g.stroke();
    g.fillColor=new Color('#66c9b7');g.moveTo(0,5);g.lineTo(0,55);g.lineTo(5,36);g.lineTo(5,5);g.close();g.fill();
    g.fillColor=new Color('#e5ba50');g.roundRect(-16,-2,32,7,3);g.fill();g.stroke();g.rect(-4,-19,8,18);g.fill();g.stroke();
  } else if(id==='thunder') {
    g.fillColor=new Color('#f1ce61');g.roundRect(-15,-17,30,58,3);g.fill();g.stroke();g.strokeColor=new Color('#bb503a');g.lineWidth=3;g.moveTo(-6,29);g.lineTo(6,18);g.lineTo(-6,11);g.lineTo(6,1);g.lineTo(-3,-8);g.stroke();
  } else if(id==='gourd') {
    g.fillColor=new Color('#9364ae');g.ellipse(0,-6,18,23);g.ellipse(0,23,12,15);g.fill();g.stroke();g.fillColor=new Color('#e3bc56');g.roundRect(-9,32,18,10,3);g.fill();g.stroke();g.circle(0,-9,6);g.fill();
  }
  if (!projectile && tier > 1) {
    g.fillColor = new Color(TIER_COLORS[tier - 1]); g.strokeColor = new Color('#493522'); g.lineWidth = 1.5;
    g.roundRect(-8, -5, 16, 6, 2); g.fill(); g.stroke();
    for (let i = 0; i < tier - 1; i++) { g.circle(10 + i * 4, -9 - i * 4, 2.5); g.fill(); }
  }
}
