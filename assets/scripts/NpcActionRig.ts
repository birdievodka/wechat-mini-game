import {Node,Sprite,SpriteFrame,UITransform,Color,Rect,Layers} from 'cc';
import {enemyActionSpec,createActionPose,sampleEnemyAction,readableWindup} from './enemy-actions';
import {NPC_GEAR_BOUNDS} from './npc-art-layout';
import type {Enemy} from './GameBootstrap';
/** One pooled sprite rig, all parts share the troop texture. No Graphics or combat mutation. */
export class NpcActionRig {
 readonly parts:Sprite[]=[];private pose=createActionPose();private key='';private colors:Record<string,Color>={};
 constructor(private parent:Node,private frames:Record<string,SpriteFrame>){for(let i=0;i<9;i++){const n=new Node('NpcPart'+i);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;this.parts.push(s);}this.parts[5].node.setSiblingIndex(8);this.parts[6].node.setSiblingIndex(8);}
 hide(){for(const s of this.parts)s.node.active=false;}
 draw(e:Enemy,windup:number,stage:number,age:number):boolean {
  const id=e.archetype!,back=e.direction===2,view=back?'back':'front',body=this.frames['npc-body-'+id+'-'+view];if(!body)return false;
  const spec=enemyActionSpec(id),num=Number(id.slice(1)),machine=num>=35&&num<=38,size=machine||spec.mounted?100:78,face=e.direction===3?-1:1,n=size/96;
  const localAngle=Math.atan2(Math.sin(e.attackAngle),Math.cos(e.attackAngle)*face),ch=e.miniCharge;
  let cp=ch?.phase==='hunt'?'':ch?.phase||'',ct=ch?.time||0;
  if(spec.kind==='charge'&&!ch&&e.attack>=0&&(!e.miniBoss||stage===4||stage===5&&(e.miniPhase||0)%2===1)){const w=e.miniBoss?.9:windup,dur=e.miniBoss?.72:num===25?.9:num===20?.75:num===21?.6:num===24?.45:.62;cp=e.attack<w?'windup':e.attack<w+dur?'dash':'recover';ct=cp==='windup'?e.attack:cp==='dash'?e.attack-w:e.attack-w-dur;}
  const p=sampleEnemyAction(this.pose,spec,e.attack,readableWindup(id,windup),localAngle,size,e.walk,!!e.moving,e.miniBoss?stage:0,e.miniPhase||0,cp,ct);
  const key=id+'-'+view;
  if(this.key!==key){this.key=key;const r=body.rect,cut=machine?.65:.84;for(let i=0;i<3;i++){const k='npc-cut-'+key+'-'+i;let f=this.frames[k];if(!f){f=new SpriteFrame();f.texture=body.texture;f.rect=new Rect(r.x+(i===2?.5:0)*r.width,r.y+(i?cut:0)*r.height,(i?.5:1)*r.width,(i?1-cut:cut)*r.height);this.frames[k]=f;}this.parts[i].spriteFrame=f;}
   for(const i of [3,4])this.parts[i].spriteFrame=this.frames['npc-sleeve-'+key];for(const i of [5,6])this.parts[i].spriteFrame=this.frames['npc-fist-'+key];this.parts[7].spriteFrame=this.frames['npc-gear-'+key];this.parts[8].spriteFrame=spec.shield?this.frames['npc-shield-'+key]:this.frames['npc-gear-'+key];}
  const hit=e.flash>0,tint=hit?'#ffb3a3':e.object==='clone'?'#a6bcc4':'#ffffff',color=(s:string)=>this.colors[s]||(this.colors[s]=new Color(s));
  for(const s of this.parts){s.node.active=true;s.color=color(tint);s.node.angle=0;s.node.setScale(1,1,1);}
  const set=(i:number,x:number,y:number,w:number,h:number,ax=.5,ay=.5,angle=0)=>{const s=this.parts[i],t=s.node.getComponent(UITransform)!;t.setAnchorPoint(ax,ay);t.setContentSize(w,h);s.node.setPosition(x,y);s.node.angle=angle;};
  const cut=machine?.65:.84,step=e.moving?Math.sin(e.walk*Math.PI):0;
  set(0,0,(1-cut-.06)*size,size,size*cut,.5,0,machine?-p.release*7:p.bodyAngle*.35);
  for(let i=1;i<3;i++)set(i,(i===1?-.25:.25)*size,-.06*size+Math.max(0,step*(i===1?1:-1))*(spec.mounted?1:2.5),size*.5,size*(1-cut),.5,0);
  if(machine){for(let i=3;i<9;i++)this.parts[i].node.active=false;this.parts[0].node.setPosition(-Math.cos(localAngle)*p.release*7,(1-cut-.06)*size+p.wind*3);}
  else {
   for(let hand=0;hand<2;hand++){const hx=hand?p.leftX:p.rightX,hy=hand?p.leftY:p.rightY,sx=(hand?-15:15)*n,sy=(spec.mounted?60:30)*n,dx=hx-sx,dy=hy-sy;set(3+hand,(hx+sx)/2,(hy+sy)/2,10*n,Math.max(5*n,Math.hypot(dx,dy)),.5,.5,Math.atan2(dy,dx)*180/Math.PI-90);this.parts[3+hand].color=color(hit?tint:spec.sleeve);set(5+hand,hx,hy,15*n,13*n);}
   const equip=(i:number,idx:number,x:number,y:number,a:number,scale=.75)=>{const b=NPC_GEAR_BOUNDS[idx];set(i,x,y,b[2]*n*scale,b[3]*n*scale,(48-b[0])/b[2],(b[1]+b[3]-64)/b[3],a);};
   equip(7,num-1,p.rightX,p.rightY,p.weaponAngle);if(spec.dual)equip(8,num-1,p.leftX,p.leftY,p.offAngle);else if(spec.shield&&!(back&&num===4))equip(8,42,p.leftX,p.leftY,p.offAngle,.8);else this.parts[8].node.active=false;
   // Hands cover the grip, while the blade/bow remains readable.

  }
  this.parent.setPosition(p.bodyX,p.bodyY+(!e.moving&&p.phase===0?Math.sin(age*2+num)*.45:0));this.parent.setScale(face*(1+p.squash),1-p.squash,1);this.parent.angle=p.bodyAngle*.5;
  e.rigKey='enemy-'+key;e.rigSize=size;return true;
 }
}
