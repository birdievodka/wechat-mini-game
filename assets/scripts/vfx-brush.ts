import {Color,Graphics} from 'cc';
import {material,VfxMaterial} from './vfx-materials';

/** Shared, synchronous scratch geometry. No per-object Graphics, frame arrays, RNG or game state. */
export type VfxStyle='gold'|'jade'|'silver'|'crimson'|'violet'|'peach'|'earth';
const T=Math.PI*2,N=24;
const HEX=['#a5762d','#f5c357','#fff7d8','#175c4d','#48dcb3','#eefff2','#315c83','#81e7ed','#f6ffff','#842b26','#ff7045','#ffe99c','#492471','#ba83ff','#fff0ff','#8e355c','#ffa4cf','#fff0ed','#6d4731','#c19663','#f2d3a0'];
const COLORS=HEX.map(hex=>Array.from({length:33},(_,i)=>{const c=new Color(hex);c.a=Math.round(i*255/32);return c;}));
const BASE:Record<VfxStyle,number>={gold:0,jade:3,silver:6,crimson:9,violet:12,peach:15,earth:18};
const MAT:Record<VfxStyle,VfxMaterial>={gold:'gold',jade:'jade',silver:'silver',crimson:'crimson',violet:'lightning',peach:'petals',earth:'dust'};
const OX=new Float32Array(N+1),OY=new Float32Array(N+1),IX=new Float32Array(N+1),IY=new Float32Array(N+1);
const SHAPE=Array.from({length:N+1},(_,i)=>Math.sin(i*Math.PI/N)**.72);
export const clampVfx=(x:number)=>Math.max(0,Math.min(1,x));
const ink=(i:number,a:number)=>COLORS[i][Math.max(0,Math.min(32,Math.round(a*32)))];
export function stroke(g:Graphics,x:number,y:number,tx:number,ty:number,width:number,style:VfxStyle,alpha:number,light=1):void {if(alpha<=0||width<=0)return;g.strokeColor=ink(BASE[style]+light,alpha);g.lineWidth=width;g.moveTo(x,y);g.lineTo(tx,ty);g.stroke();}
function drop(g:Graphics,x:number,y:number,a:number,length:number,width:number,index:number,f:number):void {
 if(f<=0||length<=0)return;const c=Math.cos(a),s=Math.sin(a);g.fillColor=ink(index,f);g.moveTo(x-c*length,y-s*length);
 g.bezierCurveTo(x-c*length*.45-s*width,y-s*length*.45+c*width,x-s*width,y+c*width,x+c*length*.12,y+s*length*.12);
 g.bezierCurveTo(x+s*width,y-c*width,x-c*length*.45+s*width,y-s*length*.45-c*width,x-c*length,y-s*length);g.close();g.fill();
}
export function stream(g:Graphics,x:number,y:number,a:number,length:number,width:number,style:VfxStyle,alpha=1):void {
 const b=BASE[style];drop(g,x,y,a,length,width,b,alpha*.45);drop(g,x,y,a,length*.88,width*.75,b+1,alpha*.9);drop(g,x,y,a,length*.66,width*.25,b+2,alpha);
 for(let i=0;i<2;i++){const d=(i?1:-1)*width*.8,c=Math.cos(a),s=Math.sin(a);drop(g,x-c*length*.3-s*d,y-s*length*.3+c*d,a,length*.4,width*.08,b+2,alpha*.45);}
}
function ribbon(ground:Graphics,air:Graphics,x:number,y:number,a:number,r:number,span:number,w:number,index:number,f:number):void {
 if(f<=0||r<=1||span<=.01)return;const steps=r<120||span<1?12:N;
 for(let i=0;i<=steps;i++){const b=a-span*.5+span*i/steps,c=Math.cos(b),s=Math.sin(b),rr=r*(1+Math.sin(i*2.1)*.002);OX[i]=x+c*rr;OY[i]=y+s*rr;IX[i]=x+c*(rr-w*SHAPE[i*N/steps]);IY[i]=y+s*(rr-w*SHAPE[i*N/steps]);}
 // Small convex strips avoid concave-polygon diagonals in the native Graphics triangulator.
 for(let i=0;i<steps;i++){const g=(OY[i]+OY[i+1])*.5<y?air:ground;g.fillColor=ink(index,f);g.moveTo(OX[i],OY[i]);g.lineTo(OX[i+1],OY[i+1]);g.lineTo(IX[i+1],IY[i+1]);g.lineTo(IX[i],IY[i]);g.close();g.fill();}

}
/** Tangible moving edge with two broken tails. Span/radius supplied by actual attack, not a preset hoop. */
export function blade(ground:Graphics,air:Graphics,x:number,y:number,a:number,r:number,span:number,t:number,alpha:number,style:VfxStyle='gold',weight=1):void {
 const b=BASE[style],p=clampVfx(t),f=alpha*Math.min(1,p*15+.5),head=a,width=Math.min(r*.29,44)*weight;
 const painted=(style==='gold'||style==='jade'||style==='silver'||style==='crimson')&&material(air,style,x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.6,r*.8,Math.max(r*.7,2*r*Math.sin(Math.min(Math.PI,span)/2)),a,f*.95);
 const body=painted?.23:1;
 ribbon(ground,air,x,y,head-.17,r*.86,span*.81,width*.48,b+1,f*.24);
 ribbon(ground,air,x,y,head-.07,r*.94,span*.92,width*.7,b+1,f*.40);
 ribbon(ground,air,x,y,head,r,span,width,b,f*.72*body);
 ribbon(ground,air,x,y,head+.012,r*.993,span*.985,width*.82,b+1,f*body);
 ribbon(ground,air,x,y,head+.025,r*.989,span*.94,width*.26,b+2,f*body);
 for(let i=0;i<3;i++){const at=head-span*.36+i*span*.34,rr=r*(.77+i*.055);stream(Math.sin(at)>0?ground:air,x+Math.cos(at)*rr,y+Math.sin(at)*rr,at+Math.PI/2,13+i*3,1.3,style,f*.68);}
}
export function contact(g:Graphics,x:number,y:number,a:number,r:number,t:number,style:VfxStyle='gold',alpha=1):void {
 const p=clampVfx(t),f=(1-p)**1.6*alpha,b=BASE[style];if(f<=0)return;
 material(g,style==='peach'?'petals':style==='violet'?'lightning':'impact',x,y,r*3,r*3,a,f*.8);
 for(let i=0;i<5;i++){const at=a+(i-2)*.8,len=r*(i===2?1.35:.7)*(1+p*.6),c=Math.cos(at),s=Math.sin(at);drop(g,x+c*p*r*.6,y+s*p*r*.6,at+Math.PI,len,len*.13,b+1,f);drop(g,x+c*p*r*.6,y+s*p*r*.6,at+Math.PI,len*.72,len*.045,b+2,f);}
}
export function dust(g:Graphics,x:number,y:number,r:number,t:number,alpha=1,style:VfxStyle='earth'):void {
 const b=BASE[style],p=clampVfx(t),f=(1-p)*alpha;
 material(g,'dust',x,y+7,r*2.2,r*1.15,p*.12,f*.6);
 for(let i=0;i<4;i++){const a=i*2.399,rr=r*(.2+.6*p),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.45+Math.sin(p*Math.PI)*8;g.fillColor=ink(b+1,f*.18);g.ellipse(xx,yy,5+r*p*.13,3+r*p*.06);g.fill();}
}
export function shock(ground:Graphics,air:Graphics,x:number,y:number,r:number,t:number,style:VfxStyle,alpha=1):void {
 const p=clampVfx(t),f=(1-p)*alpha,rr=r*(.32+.68*(1-(1-p)**3));
 for(let i=0;i<6;i++)ribbon(ground,air,x,y,i*T/6+p*.13,rr,.72,Math.max(2,r*.10*(1-p)),BASE[style]+1,f*.75);
}
export function flame(ground:Graphics,air:Graphics,x:number,y:number,r:number,clock:number,alpha:number,hostile=false):void {
 if(alpha<=0)return;
 ground.fillColor=ink(9,alpha*.20);ground.ellipse(x,y,r,r*.72);ground.fill();
 for(let i=0;i<3;i++){
  const xx=x+(i-1)*r*.52,yy=y+Math.sin(i*2.4)*r*.16,p=clock*10+i*1.7,w=r*.36,h=r*(1.1+Math.sin(p)*.15)+(i%2)*10;
  const g=i%2?ground:air,painted=material(g,'flame',xx,yy+h*.48,w*3,h*1.42,Math.sin(p)*.07,alpha,hostile?1:0);
  for(let j=0;j<(painted?1:2);j++){const ww=w*(1-j*.29),hh=h*(1-j*.2),sway=Math.sin(p+j*.2)*w*.5;g.fillColor=ink(9+j,alpha*(painted?.2:j===0?.6:.9));g.moveTo(xx-ww,yy);g.bezierCurveTo(xx-ww*1.4,yy+hh*.3,xx+sway-ww*.2,yy+hh*.72,xx+sway,yy+hh);g.bezierCurveTo(xx+ww,yy+hh*.55,xx+ww*1.3,yy+hh*.1,xx+ww,yy);g.close();g.fill();}
 }

}
export function wave(ground:Graphics,air:Graphics,x:number,y:number,r:number,t:number,alpha=1):void {
 if(r<2||alpha<=0)return;
 const thickness=Math.min(65,r*.26);
 // One continuous annulus with a definite moving front; foam crests rise out of this shared body.
 for(let j=0;j<3;j++)for(let i=0;i<32;i++){
  const a=i*T/32,aa=(i+1)*T/32,g=Math.sin(a+T/64)>0?ground:air,outer=r-j*2,inner=outer-(j===2?3:thickness*(j===0?1:.8));
  g.fillColor=ink(6+j,alpha*(j===0?.13:j===1?.23:.55));g.moveTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer);g.lineTo(x+Math.cos(aa)*outer,y+Math.sin(aa)*outer);g.lineTo(x+Math.cos(aa)*inner,y+Math.sin(aa)*inner);g.lineTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner);g.close();g.fill();
 }
 for(let i=0;i<7;i++){
  const at=i*T/7+.17+.025*Math.sin(t*5+i),g=Math.sin(at)>0?ground:air,xx=x+Math.cos(at)*(r-thickness*.3),yy=y+Math.sin(at)*(r-thickness*.3);
  material(g,'wave',xx,yy+10,Math.min(205,r*.94),Math.min(160,r*.70),at,alpha,1);
  const c=Math.cos(at),s=Math.sin(at),px=xx+c*6,py=yy+s*6;g.strokeColor=ink(8,alpha);g.lineWidth=4;g.moveTo(px-c*18,py-s*18);g.bezierCurveTo(px-s*23,py+c*23,px+c*27+s*14,py+s*27-c*14,px+c*12,py+s*12);g.stroke();
 }
}

export function bolt(ground:Graphics,air:Graphics,x:number,y:number,r:number,t:number,style:VfxStyle='violet'):void {
 const p=clampVfx(t),f=1-p,b=BASE[style];if(f<=0)return;
 const h=Math.min(285,140+r),flash=Math.max(0,1-p*3);
 material(air,'lightning',x,y+h*.45,Math.min(135,r*1.7),h*1.15,0,flash*.8,1);
 for(let layer=0;layer<3;layer++){air.strokeColor=ink(b+layer,f*(layer===0?.35:1));air.lineWidth=layer===0?18:layer===1?8:2.5;for(let i=0;i<8;i++){const xx=x+(i===7?0:Math.sin(i*7.3+Math.floor(t*14))*13),yy=y+h*(1-i/7);if(!i)air.moveTo(xx,yy);else air.lineTo(xx,yy);}air.stroke();}
 for(let i=0;i<3;i++){const a=i*T/3+.3;stroke(ground,x,y,x+Math.cos(a)*r*.85,y+Math.sin(a)*r*.85,2,style,f*.65,1);}
 contact(air,x,y,Math.PI/2,Math.min(32,r*.4),p,style);shock(ground,air,x,y,r,p,style,.7);
}
export function petals(g:Graphics,x:number,y:number,r:number,t:number,alpha=1):void {
 const f=(1-clampVfx(t))*alpha;material(g,'petals',x,y,r*1.6,r*1.6,t*.6,f);
 for(let i=0;i<7;i++){const a=i*2.399+t,d=r*(.15+.75*t),xx=x+Math.cos(a)*d,yy=y+Math.sin(a)*d;drop(g,xx,yy,a+1.3,7+3*(i%2),4,16,f);drop(g,xx+1,yy+1,a+1.3,4,1.2,17,f);}
}
export function warning(g:Graphics,x:number,y:number,r:number,p:number,style:VfxStyle='crimson'):void {
 const b=BASE[style];g.fillColor=ink(b,.065+.045*p);g.circle(x,y,r);g.fill();g.strokeColor=ink(b+1,.65+.3*p);g.lineWidth=2;g.circle(x,y,r);g.stroke();
 g.strokeColor=ink(b+2,.5+.4*p);g.lineWidth=2;
 for(let i=0;i<12;i++){const a=i*T/12,c=Math.cos(a),s=Math.sin(a);g.moveTo(x+c*(r-7),y+s*(r-7));g.lineTo(x+c*r,y+s*r);}g.stroke();
}
export function meteor(ground:Graphics,air:Graphics,x:number,y:number,r:number,t:number,falling:boolean):void {
 const p=clampVfx(t),f=1-p;
 if(falling){const left=1-p*p,xx=x-left*145,yy=y+left*320;stream(air,xx,yy,-1.14,115,25,'crimson');material(air,'meteor',xx-8,yy+12,112,135,0,1,1);ground.fillColor=ink(9,.12+p*.1);ground.ellipse(x,y,r*.65,r*.35);ground.fill();}
 else {material(air,'stone',x,y+12,r*2,r*1.6,0,f,1);shock(ground,air,x,y,r,p,'gold');contact(air,x,y,Math.PI/2,r*.45,p,'crimson');dust(ground,x,y,r,p);}
}
export function mount(g:Graphics,id:string,x:number,y:number,a:number,t:number,alpha=1):void {
 const style:VfxStyle=id==='guanyu'?'jade':id==='zhangfei'?'crimson':'silver',c=Math.cos(a),s=Math.sin(a),f=alpha;
 stream(g,x+c*36,y+25+s*36,a,110+Math.sin(t*18)*6,23,style,f*.85);
 for(let i=0;i<2;i++){const d=(i?1:-1)*24;stream(g,x-c*20-s*d,y+18-s*20+c*d,a,115,6,style,f*.65);}
 material(g,id==='zhangfei'?'dust':'wind',x-c*55,y+12-s*55,140,64,a,f*.65);
}

/** Tapered asymmetric face and one lit bevel. Coordinates follow the attack tangent. */
export function nib(g:Graphics,x:number,y:number,a:number,length:number,width:number,style:VfxStyle,f=1):void {
 if(length<1||width<.25||f<.025)return;
 const c=Math.cos(a),s=Math.sin(a),u=c*length,v=s*length,n=-s*width,m=c*width,b=BASE[style];
 g.fillColor=ink(b,f);g.moveTo(x-u*.64,y-v*.64);g.lineTo(x+n,y+m);
 g.lineTo(x+u*.48,y+v*.48);g.lineTo(x-n*.88,y-m*.88);g.close();g.fill();
 g.fillColor=ink(b+1,f);g.moveTo(x-u*.49,y-v*.49);g.lineTo(x+n*.82,y+m*.82);
 g.lineTo(x+u*.42,y+v*.42);g.close();g.fill();
 stroke(g,x+n*.6,y+m*.6,x+u*.39,y+v*.39,Math.max(1,width*.19),style,f,2);
}

/** A strip with pointed ends. Each cubic spans at most ~75 degrees. */
export function crescent(g:Graphics,x:number,y:number,r:number,a:number,span:number,w:number,style:VfxStyle,f:number,light=1):void {
 if(r<2||w<.25||span<=.01||f<.025)return;
 const c=Math.cos(a),s=Math.sin(a),h=span*.5,cs=Math.cos(h),sn=Math.sin(h);
 const end=r*sn,mid=r*cs,depth=(r-mid)*4/3;
 const x0=x+c*mid+s*end,y0=y+s*mid-c*end,x1=x+c*mid-s*end,y1=y+s*mid+c*end;
 g.fillColor=ink(BASE[style]+light,f);g.moveTo(x0,y0);
 g.bezierCurveTo(x0+c*depth-s*end*.6,y0+s*depth+c*end*.6,x1+c*depth+s*end*.6,y1+s*depth-c*end*.6,x1,y1);
 const inner=depth-w*1.33;
 g.bezierCurveTo(x1+c*inner+s*end*.6,y1+s*inner-c*end*.6,x0+c*inner-s*end*.6,y0+s*inner+c*end*.6,x0,y0);
 g.close();g.fill();
}

/** Main moving edge over the angular interval reached so far; no raster stamp. */
export function sweepEdge(back:Graphics,front:Graphics,x:number,y:number,a:number,r:number,arc:number,t:number,style:VfxStyle,weight:number,f:number):void {
 const p=clampVfx(t),travel=Math.min(1,p*2.7+.10),tip=a-arc*.5+arc*travel;
 const span=Math.min(1.23,arc*travel),mid=tip-span*.5,w=Math.min(42,r*.26)*weight;
 // The inner slipstream opens a strip of grass between the broad blade and its trailing echo.
 const echoSpan=Math.min(1.17,span*.9),echoMid=tip-span*.66;
 if(echoMid-echoSpan*.5>a-arc*.5){
  const tail=Math.sin(echoMid)>0?back:front;
  crescent(tail,x,y,r*.76,echoMid,echoSpan,w*.4,style,f*.78);
  crescent(tail,x,y,r*.79,echoMid+.02,echoSpan*.82,w*.09,style,f,2);
 }
 const layer=Math.sin(mid)>0?back:front;
 crescent(layer,x,y,r,mid,span,w,style,f,0);
 crescent(layer,x,y,r-1,mid+.015,span*.97,w*.74,style,f);
 crescent(layer,x,y,r,mid+.04,span*.82,Math.max(2,w*.16),style,f,2);
 crescent(layer,x,y,r*.91,mid-span*.34,span*.79,w*.28,style,f*.61);
}

/** Contact progresses from a bright core to airborne fragments to a receding ground rim. */
export function groundStrike(back:Graphics,front:Graphics,x:number,y:number,r:number,t:number,style:VfxStyle,rotation=0):void {
 const p=clampVfx(t),f=1-p;if(f<.025)return;
 const wave=r*(.18+.81*(1-f*f*f)),flash=Math.max(0,1-2.8*p),width=Math.min(13,r*.13);
 back.fillColor=ink(BASE[style],.26*f);back.ellipse(x,y,r*(.17+.08*p),r*.12);back.fill();
 for(let i=0;i<5;i++){
  const a=i*T/5+rotation,c=Math.cos(a),s=Math.sin(a),layer=s>0?back:front;
  crescent(layer,x,y,wave,a,.83,width*f,style,f*.92);
  crescent(layer,x,y,wave,a+.05,.68,Math.min(3,width*.31)*f,style,f,2);
  const d=r*(.16+.49*p),hop=Math.sin(Math.PI*p)*Math.min(26,r*.32);
  nib(front,x+c*d,y+s*d+hop,a+.83*p,Math.min(17,r*.23)*f,Math.min(5,r*.07)*f,style,f);
 }
 if(flash>0){
  const size=Math.min(49,r*.65);
  nib(front,x,y+5,1.1,size*(.8+.3*p),size*.20,style,flash);
  nib(front,x,y+4,2.61,size*.75,size*.12,'gold',flash);
 }
}

// A large flame folds back over itself, opens a hollow, then sheds a detached spark.
export function firePlume(g:Graphics,x:number,y:number,w:number,h:number,phase:number,color:Color):void {
 const sway=Math.sin(phase)*w*.47;
 g.fillColor=color;g.moveTo(x-w,y);
 g.bezierCurveTo(x-w*1.23,y+h*.28,x+w*.18,y+h*.40,x-w*.17,y+h*.66);
 g.bezierCurveTo(x-w*.42,y+h*.85,x+sway,y+h*.94,x+w*.54+sway,y+h);
 g.bezierCurveTo(x+w*.16+sway,y+h*.76,x+w*.93,y+h*.74,x+w*.53,y+h*.47);
 g.bezierCurveTo(x+w*1.08,y+h*.49,x+w*1.20,y+h*.59,x+w*1.17,y+h*.70);
 g.bezierCurveTo(x+w*1.73,y+h*.34,x+w*.83,y+h*.03,x+w*.49,y);
 g.bezierCurveTo(x+w*.31,y+h*.15,x+w*.53,y+h*.30,x+w*.25,y+h*.38);
 g.bezierCurveTo(x+w*.29,y+h*.23,x-w*.41,y+h*.11,x-w*.48,y);g.close();g.fill();
}


/** Local wind-blown flames for a pool or an explosion, with the same folded contour as the hero fireline. */
export function fireCrown(back:Graphics,front:Graphics,x:number,y:number,r:number,clock:number,f:number):void {
 if(r<1||f<.03)return;
 back.fillColor=ink(9,.42*f);back.ellipse(x,y,r*.92,r*.58);back.fill();
 for(let i=0;i<5;i++){
  const a=i*T/5+.32,s=Math.sin(a),xx=x+Math.cos(a)*r*.59,yy=y+s*r*.40;
  const phase=clock*8+i*2.3,h=r*(.58+.19*Math.sin(phase)+.10*(i%2)),w=r*(i%2?.18:.23);
  const layer=s>0?back:front;
  firePlume(layer,xx,yy,w,h,phase,ink(9,.94*f));
  firePlume(layer,xx+2,yy,w*.76,h*.81,phase+.25,ink(10,f));
  firePlume(layer,xx+3,yy,w*.39,h*.53,phase+.45,ink(11,f));
 }
}

/** Bowed, tapering current with two joined tips. Sign of bend gives the current its handedness. */
export function current(g:Graphics,x:number,y:number,tx:number,ty:number,bend:number,width:number,style:VfxStyle,f:number,light=1):void {
 const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy);
 if(length<1||width<.25||f<.025)return;
 const nx=-dy/length,ny=dx/length;
 g.fillColor=ink(BASE[style]+light,f);g.moveTo(x,y);
 g.bezierCurveTo(x+dx*.24+nx*(bend-width),y+dy*.24+ny*(bend-width),x+dx*.74+nx*(bend-width),y+dy*.74+ny*(bend-width),tx,ty);
 g.bezierCurveTo(x+dx*.76+nx*(bend+width),y+dy*.76+ny*(bend+width),x+dx*.25+nx*bend,y+dy*.25+ny*bend,x,y);
 g.close();g.fill();
}

/** Split pressure wake. Grows along the actual locked charge, entirely behind the moving body. */
export function chargeWake(g:Graphics,x:number,y:number,a:number,length:number,width:number,style:VfxStyle,f:number):void {
 const c=Math.cos(a),s=Math.sin(a);
 for(let side=-1;side<=1;side+=2){
  const nx=-s*side,ny=c*side,tx=x-c*length+nx*width*1.4,ty=y-s*length+ny*width*1.4;
  current(g,x+nx*width*.44,y+ny*width*.44,tx,ty,side*width*.45,width*.34,style,f,0);
  current(g,x+nx*width*.52,y+ny*width*.52,tx,ty,side*width*.36,width*.17,style,f,1);
 }
}
