/** Pure shared action contract: anatomy, equipment and the actual release clock. */
export type EnemyActionKind='slash'|'thrust'|'heavy'|'bow'|'crossbow'|'throw'|'gun'|'cast'|'support'|'charge'|'machine';
export interface EnemyActionSpec {id:string;kind:EnemyActionKind;gear:string;sleeve:string;dual:boolean;shield:boolean;mounted:boolean;axis:number;}
const KINDS:EnemyActionKind[]=['slash','slash','thrust','slash','slash','heavy','heavy','slash','support','support','bow','crossbow','crossbow','crossbow','throw','throw','throw','throw','charge','charge','charge','bow','crossbow','charge','charge','heavy','slash','gun','throw','cast','gun','gun','throw','machine','machine','machine','machine','machine','cast','cast'];
const GEAR=['hoe','saber','spear','saber','dagger','axe','hammer','halberd','flag','medicine','bow','crossbow','repeater','heavy-crossbow','spear','javelin','dagger','axe','spear','spear','saber','bow','crossbow','saber','staff','club','saber','blowgun','oil','torch','musket','triple-gun','bomb','firecracker','crossbow','catapult','cannon','oil','talisman','fan'];
const SLEEVES=['#d8a349','#657445','#8c8b94','#3f5273','#4d4148','#ba4437','#89888f','#785195','#d7a148','#4d7347','#3c536b','#8c8d96','#744b89','#3a4662','#557840','#6b4b7c','#b4483d','#547244','#c8a158','#5e6172','#af4d40','#405879','#945b4c','#4f6f3e','#608557','#4e7044','#b89648','#50733d','#c84d36','#c34337','#388384','#405779','#b34532','#c58541','#856f3c','#81613d','#a97332','#765c3a','#d7b54d','#e4e9df'];
const SPECS=KINDS.map((kind,i):EnemyActionSpec=>({id:'E'+('0'+(i+1)).slice(-2),kind,gear:GEAR[i],sleeve:SLEEVES[i],dual:i===4,shield:i===3||i===26,mounted:i>=18&&i<=24,axis:['bow','crossbow','repeater','heavy-crossbow','musket','triple-gun','blowgun'].includes(GEAR[i])?0:90}));
export const enemyActionSpec=(id:string):EnemyActionSpec=>SPECS[Math.max(0,Math.min(39,Number(id.slice(1))-1))];
export function readableWindup(id:string,original:number):number {
 const k=enemyActionSpec(id).kind;
 return Math.max(original,k==='slash'?.44:k==='heavy'?.6:k==='thrust'?.48:k==='bow'?.28:k==='throw'?.4:0);
}
export interface ActionPose {wind:number;release:number;recover:number;phase:number;bodyX:number;bodyY:number;bodyAngle:number;squash:number;rightX:number;rightY:number;leftX:number;leftY:number;weaponAngle:number;offAngle:number;}
export const createActionPose=():ActionPose=>({wind:0,release:0,recover:0,phase:0,bodyX:0,bodyY:0,bodyAngle:0,squash:0,rightX:0,rightY:0,leftX:0,leftY:0,weaponAngle:0,offAngle:0});
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Mutates one retained pose; drawing never advances this input time or combat. */
export function sampleEnemyAction(out:ActionPose,spec:EnemyActionSpec,time:number,windup:number,angle:number,size:number,walk:number,moving:boolean,miniStage=0,miniPhase=0,chargePhase='',chargeTime=0):ActionPose {
 let t=time,w=windup,release=0,wind=0,recover=0;
 if(miniStage===3){if(t>=1.62){t-=1.62;w=.23;}else if(t>=1.12){t-=1.12;w=.23;}else w=.85;}
 else if(miniStage===4||miniStage===5)w=miniStage===5&&miniPhase%2===0?.95:.9;
 else if(miniStage===6)w=1.1;
 if(chargePhase){const cw=miniStage===1?.7:miniStage===4||miniStage===5?.9:windup;w=cw;t=chargePhase==='windup'?chargeTime:chargePhase==='dash'?w+.025:chargePhase==='recover'?w+.12+Math.min(.18,chargeTime):-1;}
 if(t>=0){if(t<w)wind=clamp(t/Math.max(.01,w));else if(t<w+.12)release=1-clamp((t-w)/.12);else recover=1-clamp((t-w-.12)/(spec.id==='E11'?.04:.18));}
 const n=size/96,c=Math.cos(angle),s=Math.sin(angle),side=c<-.15?-1:1,kind=spec.kind,ranged=['bow','crossbow','gun'].includes(kind),cast=kind==='cast'||kind==='support',thrust=kind==='thrust'||kind==='charge',brace=Math.sin(wind*Math.PI/2),kick=release||recover*.5;
 out.wind=wind;out.release=release;out.recover=recover;out.phase=t<0?0:t<w?1:t<w+.12?2:3;
 out.bodyX=(-c*4*brace+c*8*kick)*n;out.bodyY=(-s*3*brace+s*5*kick)*n;out.bodyAngle=c*(7*brace-11*kick);out.squash=brace*.035+release*.025;
 const shoulder=spec.mounted?60:30,carry=(ranged?40:34)+(spec.mounted?30:0);
 out.rightX=(side*(ranged?18:24)-c*9*brace+c*(thrust?20:11)*kick)*n;
 out.rightY=(carry+(cast?26:thrust?9:21)*brace+s*9*kick)*n;
 out.leftX=(side*(ranged?5:-22)-c*(ranged?13:4)*brace+c*6*kick)*n;
 out.leftY=((ranged?carry:shoulder)+(cast?18:ranged?2:8)*brace)*n;
 const aim=angle*180/Math.PI;
 if(ranged)out.weaponAngle=aim-spec.axis+(kind==='gun'?-8*brace+12*release:0);
 else if(cast)out.weaponAngle=side*(-12+20*brace)-spec.axis+90;
 else if(thrust){const idle=side*28+55-spec.axis;out.weaponAngle=t<0?idle:wind>0?aim+12*brace-spec.axis:release>0?aim-spec.axis:idle+(aim-spec.axis-idle)*recover;}
 else {const idle=side*24+65-spec.axis,strike=aim-55-spec.axis;out.weaponAngle=t<0?idle:wind>0?aim+90-(wind>.88?(wind-.88)/.12*70:0)-spec.axis:release>0?strike+75*release:idle+(strike-idle)*recover;}
 out.offAngle=spec.dual?-out.weaponAngle:spec.shield?side*8:0;
 if(t<0){out.bodyY=(moving?Math.abs(Math.sin(walk*Math.PI))*1.5:0)*n;out.bodyAngle=moving?Math.sin(walk*Math.PI)*2:0;}
 return out;
}
