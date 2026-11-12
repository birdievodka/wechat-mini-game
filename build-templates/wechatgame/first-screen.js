/* Project-owned WeChat first screen. Shares the main WebGL canvas with Cocos. */
const VS = 'attribute vec2 a_position; varying vec2 v_uv; void main(){ v_uv=a_position*.5+.5; gl_Position=vec4(a_position,0.,1.); }';
const FS = `precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_poster;
uniform vec2 u_size;
uniform float u_aspect;
uniform float u_ready;
uniform float u_progress;
float box(vec2 p,vec2 halfSize,float radius){vec2 q=abs(p)-halfSize+radius;return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;}
void main(){
  float ratio=(u_size.x/u_size.y)/u_aspect;
  vec2 uv=vec2(v_uv.x,1.-v_uv.y);
  if(ratio>=1.)uv.y/=ratio;else uv.x=.5+(uv.x-.5)*ratio;
  vec3 color=mix(vec3(.15,.19,.14),texture2D(u_poster,uv).rgb,u_ready);
  color*=1.-(1.-smoothstep(0.,.38,v_uv.y))*.1;
  float scale=u_size.y/750.,width=min(520.*scale,u_size.x-112.*scale);
  vec2 p=v_uv*u_size-vec2(u_size.x*.5,u_size.y*.1);
  float edge=box(p,vec2(width*.5+4.*scale,10.*scale),10.*scale);
  if(edge<0.)color=vec3(.84,.72,.46);
  if(box(p,vec2(width*.5+2.*scale,8.*scale),8.*scale)<0.)color=vec3(.11,.17,.12);
  if(u_progress>0.){
    float fill=width*u_progress;
    vec2 fp=p-vec2((fill-width)*.5,0.);
    if(box(fp,vec2(fill*.5,6.*scale),min(6.*scale,fill*.5))<0.)color=mix(vec3(.35,.52,.25),vec3(.71,.82,.43),clamp(p.y/(12.*scale)+.5,0.,1.));
  }
  gl_FragColor=vec4(color,1.);
}`;
let gl,program,buffer,texture,raf;
let running=false;
const waiters=[];
const state={progress:0,image:null,ended:false};
function publish(){
  globalThis.__taoyuanStartup=state;
  if(typeof window!=='undefined')window.__taoyuanStartup=state;
  if(typeof GameGlobal!=='undefined')GameGlobal.__taoyuanStartup=state;
}
function shader(type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
}
function draw(){
  gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.uniform1i(gl.getUniformLocation(program,'u_poster'),0);
  gl.uniform2f(gl.getUniformLocation(program,'u_size'),canvas.width,canvas.height);
  gl.uniform1f(gl.getUniformLocation(program,'u_aspect'),state.image?state.image.width/state.image.height:1334/750);
  gl.uniform1f(gl.getUniformLocation(program,'u_ready'),state.image?1:0);
  gl.uniform1f(gl.getUniformLocation(program,'u_progress'),state.progress);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
function tick(){
  if(!running)return;
  draw();const pending=waiters.splice(0);pending.forEach(resolve=>resolve());
  raf=requestAnimationFrame(tick);
}
function painted(){return new Promise(resolve=>waiters.push(resolve));}
async function start(alpha,antialias,useWebgl2){
  publish();
  const options={alpha:alpha==='true',antialias:antialias!=='false',depth:true,stencil:true,premultipliedAlpha:false,preserveDrawingBuffer:false};
  if(useWebgl2==='true')gl=canvas.getContext('webgl2',options);
  window.WebGL2RenderingContext=!!gl;
  if(!gl)gl=canvas.getContext('webgl',options);
  if(!gl)throw Error('无法初始化游戏画面');
  const vertex=shader(gl.VERTEX_SHADER,VS),fragment=shader(gl.FRAGMENT_SHADER,FS);
  program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([38,48,36,255]));
  running=true;raf=requestAnimationFrame(tick);
  await new Promise(resolve=>{
    const image=new Image();image.premultiplyAlpha=false;
    image.onload=()=>{
      try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);state.image=image;}
      catch(error){console.warn('启动海报上传失败，继续进入游戏',error);}
      resolve();
    };
    image.onerror=error=>{console.warn('启动海报加载失败，继续进入游戏',error);resolve();};
    image.src='startup-poster.jpg';
  });
  return setProgress(0);
}
function setProgress(value){
  // Boot milestones occupy 2–22%; resource preparation continues from here.
  state.progress=Math.max(state.progress,.02+Math.max(0,Math.min(1,value))*.2);
  return painted();
}
async function end(){
  await setProgress(1);running=false;cancelAnimationFrame(raf);
  gl.disableVertexAttribArray(gl.getAttribLocation(program,'a_position'));
  gl.useProgram(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindTexture(gl.TEXTURE_2D,null);
  gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);state.ended=true;
}
module.exports={start,setProgress,end};
