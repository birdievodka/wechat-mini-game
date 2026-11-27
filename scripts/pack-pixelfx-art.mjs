import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const revision='5294518ce7c72e48b6100a744596e0acf57f2826';
if(!process.argv[2])throw Error('Usage: node scripts/pack-pixelfx-art.mjs /path/to/pixelfx');
const upstream=resolve(process.argv[2]);
if(execFileSync('git',['-C',upstream,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==revision)throw Error('Use pinned PixelFX '+revision);
const source=path=>join(upstream,'src',path);
const {createFrame,clearFrame,composite,createFx}=await import(pathToFileURL(source('core/index.js')).href);
const gilt=['#604129','#ae6e43','#e9a955','#ffe1a1','#fff9e2'];
const jade=['#294946','#448276','#75b69b','#b7ecd1','#effdf1'];
const cold=['#30454e','#508296','#88bccc','#d0f4ff','#f7fcfe'];
const violet=['#39204f','#65468f','#a37eea','#d3b3fa','#faf0ff'];
const crimson=['#582c3b','#a14743','#e47759','#ffb982','#fff1c6'];
const earth=['#44362b','#7a5540','#b2845b','#d9b689','#f4ddb4'];
const pale=['#4a473b','#8e8361','#d4c49b','#f5e8bd','#fff9e9'];
const motifs=[
 ['hit','impacts/hit-spark',[.10,.23],gilt,{height:7}],
 ['block','impacts/shield-block',[.12,.26],jade],
 ['dirt','explosions/dirt-explosion',[.21,.44],earth],
 ['thrust','melee/thrust',[.17,.26],crimson],
 ['flame','fire/flame-pillar',[.70,1.14],crimson,{height:85}],
 ['whorl','fire/fire-tornado',[.84,1.34],crimson,{height:84}],
 ['wave','water/wave-crash',[1.07,1.37],jade],
 ['splash','water/splash',[.24,.47],jade],
 ['rune','arcane/rune-circle',[.89,1.63],jade],
 ['purpleRune','arcane/rune-circle',[.89,1.63],violet],
 ['charge','arcane/spell-charge',[.50,.84],crimson],
 ['lightning','lightning/lightning-strike',[1.13,1.29],violet],
 ['cloud','lightning/storm-cloud',[.85,1.41],violet],
 ['meteor','fire/meteor',[.89,1.14],violet],
 ['goldMeteor','fire/meteor',[.89,1.14],gilt],
 ['portal','arcane/portal',[1.02,1.58],violet],
 ['jadePortal','arcane/portal',[1.02,1.58],jade],
 ['spirit','fire/spirit-flame',[.83,1.22],violet],
 ['burst','arcane/mana-burst',[.24,.52],gilt],
 ['petals','nature/healing-bloom',[.73,1.12],['#663b47','#ad5874','#df8297','#ffcad6','#fff5e8']],
 ['heal','nature/healing-bloom',[.73,1.12],jade],
 ['feather','holy/feather-burst',[.45,.65],pale],
 ['vortex','explosions/implosion',[.60,.92],violet],
 ['leaf','nature/leaf-storm',[.72,1.10],jade],
 ['slash','melee/sword-slash',[.20,.30],jade],
 ['claw','melee/claw-swipe',[.19,.27],jade],
 ['ash','spawn/shatter-death',[.28],pale],
 ['smoke','explosions/small-explosion',[.21,.39],crimson],
 ['arrowWhite','projectiles/arrow',[.12],pale],
 ['arrowBlue','projectiles/arrow',[.16],cold],
 ['arrowPurple','projectiles/arrow',[.20],violet],
 ['arrowGold','projectiles/arrow',[.25],gilt],
 ['arrowGreen','projectiles/arrow',[.30],jade],
 ['arrowRed','projectiles/arrow',[.35],crimson],
 ['wind','lightning/spark-arc',[.37],jade],
 ['fireRing','fire/fire-ring',[.28,.46],crimson],
];
const frameKeys=[],layouts={},parts=[],manifest=[];
for(const [key,id,times,palette,extra] of motifs){
 const file=source('fx/'+id+'.js'),mod=await import(pathToFileURL(file).href);
 const [w,h]=mod.meta.size,[ox,oy]=mod.meta.origin;
 const options={x:ox,y:oy,seed:12,light:.75,palette,...extra};
 if(id==='projectiles/arrow'){options.wind=palette[2];options.steel=[palette[0],palette[1],palette[2],palette[4]];}
 const frames=[];let l=w,r=-1,u=h,b=-1;
 for(const time of times){
  const frame=createFrame(w,h),pixels=Buffer.alloc(w*h*4);
  const effect=createFx(mod,options);
  effect.update(time);effect.draw(clearFrame(frame));composite(frame,pixels);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   if(pixels[(y*w+x)*4+3]<12||id==='projectiles/arrow'&&x<ox-56)continue;
   l=Math.min(l,x);r=Math.max(r,x);u=Math.min(u,y);b=Math.max(b,y);
  }
  frames.push(pixels);
 }
 if(r<l||b<u)throw Error('No visible samples '+id+' ('+key+')');
 const bw=r-l+1,bh=b-u+1,scale=Math.min(60/bw,60/bh,2);
 const width=Math.max(1,Math.round(bw*scale)),height=Math.max(1,Math.round(bh*scale));
 const keys=[];
 for(const [i,pixels] of frames.entries()){
  const left=frameKeys.length%8*64+2,top=Math.floor(frameKeys.length/8)*64+2;
  const input=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).extract({left:l,top:u,width:bw,height:bh}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
  parts.push({input,left,top});keys.push('pixel-'+key+'-'+i);frameKeys.push([keys[i],left,top,width,height]);
 }
 layouts[key]=[...(keys.length===1?[keys[0],keys[0]]:keys),Number(((ox-l)/bw).toFixed(4)),Number(((oy-u)/bh).toFixed(4)),Number((bh/bw).toFixed(4))];
 manifest.push({key,source:'src/fx/'+id+'.js',times,seed:12,palette,options:extra||{},sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
}
if(parts.length>64)throw Error('Exceeded the 512² atlas');
const image='assets/presentation/pixelfx.png';
const output=await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite(parts).png({compressionLevel:9}).toBuffer();
await writeFile(image,output);
const json=value=>JSON.stringify(value,null,2);
const ts='// Generated by scripts/pack-pixelfx-art.mjs.\nexport const PIXEL_RECTS = [\n'+frameKeys.map(v=>' '+JSON.stringify(v)).join(',\n')+'\n] as const;\nexport const PIXEL_MOTIFS = {\n'+Object.entries(layouts).map(([k,v])=>' '+k+':'+JSON.stringify(v)).join(',\n')+'\n} as const;\n';
await writeFile('assets/scripts/pixelfx-layout.ts',ts);
await writeFile('art/runtime-pixelfx/manifest.json',json({revision,image,sha256:createHash('sha256').update(output).digest('hex'),width:512,height:512,decodedBytes:1048576,frames:parts.length,motifs:manifest})+'\n');
for(const name of ['LICENSE','NOTICE.md'])await writeFile('art/runtime-pixelfx/'+name,await readFile(join(upstream,name)));
console.log(parts.length+' frames, '+output.length+' bytes');
