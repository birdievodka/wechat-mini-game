import {Graphics} from 'cc';
import {GRUNT_MELEE} from './grunt-melee';
import {drawNpcAttack} from './enemy-vfx-v10';
export function drawGruntAttack(g:Graphics,x:number,y:number,attack:number,angle:number,range:number):void {drawNpcAttack(g,'E01',x,y,attack,angle,GRUNT_MELEE.windup,range);}
