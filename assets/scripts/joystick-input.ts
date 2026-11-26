import { movement } from './combat-math';
export const JOYSTICK = {
  radius: 120, knob: 44, travel: 74, insetX: 182, insetY: 160,
  activationWidth: 360, activationHeight: 324, edgePadding: 12, weaponHudClearance: 232,
  deadzone: 3, fullSpeed: 44, response: .62,
};

export function joystickCenter(halfWidth:number,halfHeight:number):{x:number;y:number} {
  return joystickActiveCenter(-halfWidth+JOYSTICK.insetX,-halfHeight+JOYSTICK.insetY,halfWidth,halfHeight);
}

export function canStartJoystick(x:number,y:number,halfWidth:number,halfHeight:number):boolean {
  const fromLeft=x+halfWidth,fromBottom=y+halfHeight;
  return fromLeft>=0&&fromLeft<=Math.min(JOYSTICK.activationWidth,halfWidth*.72)
    &&fromBottom>=0&&fromBottom<=Math.min(JOYSTICK.activationHeight,halfHeight*.9);
}

/** Keep the ring in the left HUD column while measuring motion from the actual touch. */
export function joystickActiveCenter(x:number,y:number,halfWidth:number,halfHeight:number):{x:number;y:number} {
  const inset=JOYSTICK.radius+JOYSTICK.edgePadding;
  const limitX=Math.max(0,halfWidth-inset),limitY=Math.max(0,halfHeight-inset);
  const right=-JOYSTICK.weaponHudClearance-JOYSTICK.radius;
  return { x:Math.max(-limitX,Math.min(right,x)), y:Math.max(-limitY,Math.min(limitY,y)) };
}

export function joystickVector(dx:number,dy:number):{x:number;y:number} {
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return {x:0,y:0};
  const length=Math.hypot(dx,dy);
  if(length<=JOYSTICK.deadzone)return {x:0,y:0};
  const magnitude=Math.min(1,(length-JOYSTICK.deadzone)/(JOYSTICK.fullSpeed-JOYSTICK.deadzone));
  const response=Math.pow(magnitude,JOYSTICK.response);
  return movement(dx/length*response,dy/length*response);
}
/** The thumb cap tracks the actual finger, independently of the stronger movement response. */
export function joystickThumb(dx:number,dy:number):{x:number;y:number} {
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return {x:0,y:0};
  return movement(dx/JOYSTICK.travel,dy/JOYSTICK.travel);
}
