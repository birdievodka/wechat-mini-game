import {Graphics} from 'cc';
/** Four shared FX layers only. Empty→empty avoids clear; content→empty clears once. */
export function trackGraphicsContent(g:Graphics):Graphics {
 let dirty=false;const clear=g.clear;
 // Unfilled paths also need retiring; otherwise a later fill could paint an old path.
 const methods=['fill','stroke','moveTo','lineTo','circle','ellipse','rect','roundRect','close','bezierCurveTo','quadraticCurveTo','arc'] as const;
 for(const key of methods){const fn=g[key] as (...args:number[])=>void;if(typeof fn!=='function')continue;(g as unknown as Record<string,unknown>)[key]=function(this:Graphics,...args:number[]){dirty=true;return fn.apply(this,args);};}
 g.clear=function(){if(!dirty)return;dirty=false;return clear.call(this);};
 return g;
}
