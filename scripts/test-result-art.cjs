const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const file=fs.readFileSync('assets/results/portraits.png'),w=file.readUInt32BE(16),h=file.readUInt32BE(20);
assert.equal(file[24],8);assert.equal(file[25],6,'失败角色图集必须包含真实alpha');assert.equal(w*2,h*3,'3×2选人/哭泣方格，不得切到相邻角色');
assert.ok(w<=2048&&h<=2048,'运行贴图不超2048，避免低端设备纹理尺寸问题');
const idat=[];for(let at=8;at<file.length;){const size=file.readUInt32BE(at),type=file.toString('ascii',at+4,at+8);if(type==='IDAT')idat.push(file.subarray(at+8,at+8+size));at+=size+12;}
const bytes=zlib.inflateSync(Buffer.concat(idat)),stride=w*4+1;
assert.equal(bytes.length,stride*h);
let prev=new Uint8Array(w),transparent=0,visible=0;
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
for(let y=0;y<h;y++){
 const row=new Uint8Array(w),filter=bytes[y*stride];
 for(let x=0;x<w;x++){
  const a=x?row[x-1]:0,b=prev[x],c=x?prev[x-1]:0,raw=bytes[y*stride+1+x*4+3];
  const prediction=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;
  assert.ok(Number.isFinite(prediction));row[x]=(raw+prediction)&255;
  if(row[x]===0)transparent++;else visible++;
  if(x===0||x===w/3||x===w/3*2||x===w-1||y===0||y===h/2||y===h-1)assert.ok(row[x]<=1,'分格保持视觉透明；只允许1/255的matte噪点，不能裁断身体/武器');
 }prev=row;
}
assert.ok(transparent>w*h*.15&&visible>w*h*.2,'必须为独立透明角色，不能是空图或实底假透明');
assert.equal(JSON.parse(fs.readFileSync('assets/results.meta')).userData.bundleName,'results');
assert.ok(file.length<4*1024*1024);
console.log('通过：选人/哭泣图集3×2方格、真实透明像素、边缘/分格留白、独立分包与源码体积');
