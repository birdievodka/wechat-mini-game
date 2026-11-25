import {Node,Sprite,SpriteFrame,UITransform,Color,Rect,Layers} from 'cc';
import {enemyActionSpec,createActionPose,sampleEnemyAction,readableWindup} from './enemy-actions';
import {NPC_GEAR_BOUNDS} from './npc-art-layout';
import type {Enemy} from './GameBootstrap';
interface NpcView {
 key:string; body:SpriteFrame; sleeve:SpriteFrame; fist:SpriteFrame; gear:SpriteFrame; shield:SpriteFrame;
 bodyParts?:SpriteFrame[];
}

/** Scene-owned views. All actors of a species and direction share its three cropped frames. */
export class NpcRigAtlas {
 private readonly views=new Map<string,NpcView[]>();

 bind(frames:Record<string,SpriteFrame>,ids:readonly string[]):void {
  for(const id of ids){
   const pair:NpcView[]=[];
   for(const side of ['front','back']){
    const suffix=id+'-'+side;
    pair.push({key:'enemy-'+suffix,body:frames['npc-body-'+suffix],gear:frames['npc-gear-'+suffix],
     sleeve:frames['npc-sleeve-'+suffix],fist:frames['npc-fist-'+suffix],shield:frames['npc-shield-'+suffix]});
   }
   this.views.set(id,pair);
  }
 }

 get(id:string,back:boolean,machine:boolean):NpcView|undefined {
  const view=this.views.get(id)?.[Number(back)];
  if(!view?.body)return;
  if(!view.bodyParts){
   const cut=machine?.65:.84,r=view.body.rect;
   view.bodyParts=[0,1,2].map(i=>{
    const f=new SpriteFrame();
    f.texture=view.body.texture;
    f.rect=new Rect(r.x+(i===2?.5:0)*r.width,r.y+(i?cut:0)*r.height,(i?.5:1)*r.width,(i?1-cut:cut)*r.height);
    return f;
   });
  }
  return view;
 }

 releaseInto(owned:Set<SpriteFrame>):void {
  for(const pair of this.views.values())for(const view of pair)for(const frame of view.bodyParts||[])owned.add(frame);
  this.views.clear();
 }
}

/** One pooled sprite rig, all parts share the troop texture. No Graphics or combat mutation. */
export class NpcActionRig {
 readonly parts:Sprite[]=[];private pose=createActionPose();private identity='';private back=false;private rigKey='';private number=0;private spec=enemyActionSpec('E01');private colors:Record<string,Color>={};private states:{transform:UITransform;x?:number;y?:number;w?:number;h?:number;ax?:number;ay?:number;angle?:number;tint?:string}[]=[];
 constructor(private parent:Node,private atlas:NpcRigAtlas){for(let i=0;i<9;i++){const n=new Node('NpcPart'+i);n.layer=Layers.Enum.UI_2D;parent.addChild(n);const transform=n.addComponent(UITransform);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;this.parts.push(s);this.states.push({transform});n.setScale(1,1,1);}this.parts[5].node.setSiblingIndex(8);this.parts[6].node.setSiblingIndex(8);}
 hide(){for(const s of this.parts)if(s.node.active)s.node.active=false;}
 draw(e:Enemy,windup:number,stage:number,age:number):boolean {
  const id=e.archetype!,back=e.direction===2;
  if(this.identity!==id||this.back!==back){
   const number=Number(id.slice(1)),view=this.atlas.get(id,back,number>=35&&number<=38);
   if(!view)return false;
   this.identity=id;this.back=back;this.rigKey=view.key;this.number=number;this.spec=enemyActionSpec(id);
   for(let i=0;i<3;i++)this.parts[i].spriteFrame=view.bodyParts![i];
   this.parts[3].spriteFrame=this.parts[4].spriteFrame=view.sleeve;
   this.parts[5].spriteFrame=this.parts[6].spriteFrame=view.fist;
   this.parts[7].spriteFrame=view.gear;
   this.parts[8].spriteFrame=this.spec.shield?view.shield:view.gear;
  }
  const spec=this.spec,num=this.number,machine=num>=35&&num<=38,size=machine||spec.mounted?100:78,face=e.direction===3?-1:1,n=size/96;
  const localAngle=Math.atan2(Math.sin(e.attackAngle),Math.cos(e.attackAngle)*face),ch=e.miniCharge;
  let cp=ch?.phase==='hunt'?'':ch?.phase||'',ct=ch?.time||0;
  if(spec.kind==='charge'&&!ch&&e.attack>=0&&(!e.miniBoss||stage===4||stage===5&&(e.miniPhase||0)%2===1)){const w=e.miniBoss?.9:windup,dur=e.miniBoss?.72:num===25?.9:num===20?.75:num===21?.6:num===24?.45:.62;cp=e.attack<w?'windup':e.attack<w+dur?'dash':'recover';ct=cp==='windup'?e.attack:cp==='dash'?e.attack-w:e.attack-w-dur;}
  const p=sampleEnemyAction(this.pose,spec,e.attack,readableWindup(id,windup),localAngle,size,e.walk,!!e.moving,e.miniBoss?stage:0,e.miniPhase||0,cp,ct);
  const hit=e.flash>0,tint=hit?'#ffb3a3':e.object==='clone'?'#a6bcc4':'#ffffff',color=(s:string)=>this.colors[s]||(this.colors[s]=new Color(s));
  for(let i=0;i<this.parts.length;i++){
   const sp=this.parts[i],visible=i<3||!machine&&(i<8||spec.dual||spec.shield&&!(back&&num===4));
   if(sp.node.active!==visible)sp.node.active=visible;
   const finalTint=(i===3||i===4)&&!hit?spec.sleeve:tint;if(visible&&this.states[i].tint!==finalTint){sp.color=color(finalTint);this.states[i].tint=finalTint;}
  }
  const set=(i:number,x:number,y:number,w:number,h:number,ax=.5,ay=.5,angle=0)=>{const sp=this.parts[i],state=this.states[i],t=state.transform;
   if(state.ax!==ax||state.ay!==ay){t.setAnchorPoint(ax,ay);state.ax=ax;state.ay=ay;}
   if(state.w!==w||state.h!==h){t.setContentSize(w,h);state.w=w;state.h=h;}
   if(state.x!==x||state.y!==y){sp.node.setPosition(x,y);state.x=x;state.y=y;}
   if(state.angle!==angle){sp.node.angle=angle;state.angle=angle;}
  };

  const cut=machine?.65:.84,step=e.moving?Math.sin(e.walk*Math.PI):0;
  if(!machine)set(0,0,(1-cut-.06)*size,size,size*cut,.5,0,p.bodyAngle*.35);
  for(let i=1;i<3;i++)set(i,(i===1?-.25:.25)*size,-.06*size+Math.max(0,step*(i===1?1:-1))*(spec.mounted?1:2.5),size*.5,size*(1-cut),.5,0);
  if(machine)set(0,-Math.cos(localAngle)*p.release*7,(1-cut-.06)*size+p.wind*3,size,size*cut,.5,0,-p.release*7);
  else {
   for(let hand=0;hand<2;hand++){const hx=hand?p.leftX:p.rightX,hy=hand?p.leftY:p.rightY,sx=(hand?-15:15)*n,sy=(spec.mounted?60:30)*n,dx=hx-sx,dy=hy-sy;set(3+hand,(hx+sx)/2,(hy+sy)/2,10*n,Math.max(5*n,Math.hypot(dx,dy)),.5,.5,Math.atan2(dy,dx)*180/Math.PI-90);set(5+hand,hx,hy,15*n,13*n);}
   const equip=(i:number,idx:number,x:number,y:number,a:number,scale=.75)=>{const b=NPC_GEAR_BOUNDS[idx];set(i,x,y,b[2]*n*scale,b[3]*n*scale,(48-b[0])/b[2],(b[1]+b[3]-64)/b[3],a);};
   equip(7,num-1,p.rightX,p.rightY,p.weaponAngle);if(spec.dual)equip(8,num-1,p.leftX,p.leftY,p.offAngle);else if(spec.shield&&!(back&&num===4))equip(8,42,p.leftX,p.leftY,p.offAngle,.8);
   // Hands cover the grip, while the blade/bow remains readable.

  }
  this.parent.setPosition(p.bodyX,p.bodyY+(!e.moving&&p.phase===0?Math.sin(age*2+num)*.45:0));this.parent.setScale(face*(1+p.squash),1-p.squash,1);this.parent.angle=p.bodyAngle*.5;
  e.rigKey=this.rigKey;e.rigSize=size;return true;
 }
}
