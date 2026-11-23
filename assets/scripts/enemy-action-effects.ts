import {Graphics} from 'cc';
import {drawNpcAttack} from './enemy-vfx-v10';
/** All 40 authored action identities; simulation owns the lock, release and recovery. */
export function drawEnemyAction(g:Graphics,id:string,x:number,y:number,t:number,a:number,w:number,range:number):void {drawNpcAttack(g,id,x,y,t,a,w,range);}
