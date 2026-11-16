import { movement } from './combat-math';
export const JOYSTICK = { radius: 96, knob: 36, travel: 60, activation: 140, insetX: 165, insetY: 160, deadzone: .06, fullSpeed: .8, response: .7 };
export const joystickCenter = (halfWidth:number,halfHeight:number):{x:number;y:number} => ({ x:-halfWidth+JOYSTICK.insetX, y:-halfHeight+JOYSTICK.insetY });
export function joystickVector(dx:number,dy:number):{x:number;y:number} {
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return {x:0,y:0};
  const length=Math.hypot(dx,dy),normalized=Math.min(1,length/JOYSTICK.travel);
  if(normalized<=JOYSTICK.deadzone)return {x:0,y:0};
  const magnitude=Math.min(1,(normalized-JOYSTICK.deadzone)/(JOYSTICK.fullSpeed-JOYSTICK.deadzone));
  const response=Math.pow(magnitude,JOYSTICK.response);
  return movement(dx/length*response,dy/length*response);
}
/** The thumb cap tracks the actual finger, independently of the stronger movement response. */
export function joystickThumb(dx:number,dy:number):{x:number;y:number} {
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return {x:0,y:0};
  return movement(dx/JOYSTICK.travel,dy/JOYSTICK.travel);
}
