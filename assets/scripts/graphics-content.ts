import {Graphics} from 'cc';
/** Four shared FX layers only. Empty→empty avoids clear; content→empty clears once. */
export function trackGraphicsContent(g:Graphics):Graphics {
 let dirty=false;const clear=g.clear;
 // Unfilled paths also need retiring; otherwise a later fill could paint an old path.
 const methods=['fill','stroke','moveTo','lineTo','circle','ellipse','rect','roundRect','close','bezierCurveTo','quadraticCurveTo','arc'] as const;
 for(const key of methods){const fn=g[key] as (...args:unknown[])=>void;if(typeof fn!=='function')continue;
  // Thousands of path commands per displayed frame: don't allocate a rest array
  // for every point just to observe whether this shared surface is empty.
  (g as unknown as Record<string,unknown>)[key]=function(this:Graphics,a?:unknown,b?:unknown,c?:unknown,d?:unknown,e?:unknown,f?:unknown){
   dirty=true;
   switch(arguments.length){
    case 0:return fn.call(this);
    case 1:return fn.call(this,a);
    case 2:return fn.call(this,a,b);
    case 3:return fn.call(this,a,b,c);
    case 4:return fn.call(this,a,b,c,d);
    case 5:return fn.call(this,a,b,c,d,e);
    default:return fn.call(this,a,b,c,d,e,f);
   }
  };
 }
 g.clear=function(){if(!dirty)return;dirty=false;return clear.call(this);};
 return g;
}
