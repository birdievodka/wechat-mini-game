import {Graphics,Node} from 'cc';

/** Read-only, low-frequency census. Never asks impl for render data (that allocates). */
export function renderDiagnostics(root:Node|undefined):object {
 let nodes=0,activeNodes=0,graphics=0,models=0,bufferBytes=0,unavailable=0;
 const top:{name:string;active:boolean;bytes:number;vertices:number;indices:number;paths:number}[]=[];
 const buffers=new Set<unknown>();
 const visit=(node:Node):void=>{
  nodes++;if(node.activeInHierarchy)activeNodes++;
  // A native backend or a retiring model may not expose every WebGL field.
  // A missing optional census must never prevent exporting the previous session.
  try{const g=node.getComponent(Graphics);
  if(g){graphics++;let bytes=0,vertices=0,indices=0;
   for(const sub of g.model?.subModels||[]){const ia=sub?.inputAssembler;if(!ia){unavailable++;continue;}models++;vertices+=ia.vertexCount||0;indices+=ia.indexCount||0;
    for(const b of [...(ia.vertexBuffers||[]),ia.indexBuffer])if(b&&!buffers.has(b)){buffers.add(b);bytes+=b.size||0;}
   }
   bufferBytes+=bytes;
   if(bytes){top.push({name:node.name,active:node.activeInHierarchy&&g.enabled,bytes,vertices,indices,paths:g.impl?.paths?.length||0});top.sort((a,b)=>b.bytes-a.bytes);if(top.length>6)top.length=6;}
  }}catch(_){unavailable++;}
  for(const child of node.children)visit(child);
 };
 if(root?.isValid)visit(root);
 return {nodes,activeNodes,graphics,models,bufferBytes,top,unavailable};
}
