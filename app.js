const $=id=>document.getElementById(id);
const input=$('fileInput'),drop=$('dropZone'),workspace=$('workspace'),preview=$('preview');
let mode='image',file=null,cleanedBlob=null,cleanedName='',previewUrl=null,downloadUrl=null;
const C2PA_UUID='d8fec3d61b0e483c92975828877ec481';

const formats={image:'JPG, PNG, WebP',video:'MP4, MOV, M4V'};
const accepts={image:'image/jpeg,image/png,image/webp',video:'video/mp4,video/quicktime,video/x-m4v'};

document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.mode));
function setMode(m){mode=m;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));input.accept=accepts[m];$('formats').textContent=formats[m];reset();}

function bytes(n){if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(2)+' MB'}

input.onchange=()=>input.files[0]&&inspect(input.files[0]);
['dragenter','dragover'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('drag')}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('drag')}));
drop.addEventListener('drop',ev=>ev.dataTransfer.files[0]&&inspect(ev.dataTransfer.files[0]));

async function inspect(f){
 file=f;cleanedBlob=null;$('verification').classList.add('hidden');workspace.classList.remove('hidden');$('layers').classList.remove('hidden');
 $('name').textContent=f.name;$('type').textContent=f.type||'Unknown';$('size').textContent=bytes(f.size);
 $('status').textContent='Inspecting file…';preview.innerHTML='';
 if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(f);

 const buf=await f.arrayBuffer();
 const scan=scanBytes(new Uint8Array(buf));
 $('metadataStatus').textContent=scan.metadata?'Detected':'Not detected in quick scan';
 $('c2paStatus').textContent=scan.c2pa?'Detected':'Not detected in quick scan';
 $('layerMeta').textContent=scan.metadata?'Detected — supported cleanup':'No common marker detected';
 $('layerC2pa').textContent=scan.c2pa?'Detected — supported cleanup':'No common C2PA marker detected';

 if(mode==='image'){
   const img=new Image();img.src=previewUrl;preview.appendChild(img);
   img.onload=()=>{$('dimensions').textContent=img.naturalWidth+' × '+img.naturalHeight};
 }else{
   const v=document.createElement('video');v.controls=true;v.muted=true;v.src=previewUrl;preview.appendChild(v);
   v.onloadedmetadata=()=>{$('dimensions').textContent=Math.round(v.videoWidth)+' × '+Math.round(v.videoHeight)+' · '+(v.duration?v.duration.toFixed(1)+'s':'—')};
 }
 $('status').textContent='Ready to create a cleaned copy.';
}

function scanBytes(u8){
 const text=new TextDecoder('latin1').decode(u8.slice(0,Math.min(u8.length,4_000_000))).toLowerCase();
 return {
   metadata:/exif|xmp|photoshop|iptc|xml/.test(text),
   c2pa:/c2pa|jumb|jumbf|contentcredentials|content credentials/.test(text)
 };
}

$('cleanBtn').onclick=async()=>{
 if(!file)return;
 $('status').textContent='Creating cleaned copy…';
 try{
   if(mode==='image') await cleanImage();
   else await cleanVideoContainer();
   await verifyOutput();
   $('verification').classList.remove('hidden');
   $('status').textContent='Cleaned copy created and verified.';
 }catch(err){
   console.error(err);$('status').textContent='Could not process this file safely in the browser.';
 }
};

async function cleanImage(){
 const img=await createImageBitmap(file);
 const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
 c.getContext('2d',{alpha:true}).drawImage(img,0,0);img.close();
 const type=file.type==='image/png'?'image/png':'image/jpeg';
 cleanedBlob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('encode failed')),type,type==='image/jpeg'?.95:undefined));
 const ext=type==='image/png'?'png':'jpg';
 cleanedName=(file.name.replace(/\.[^.]+$/,'')||'puremedia')+'-clean.'+ext;
}

async function cleanVideoContainer(){
 const u8=new Uint8Array(await file.arrayBuffer());
 if(!isBmff(u8)) throw new Error('Not an ISO-BMFF/MP4-family file');
 const result=stripC2paBmffBoxes(u8);
 cleanedBlob=new Blob(result.parts,{type:file.type||'video/mp4'});
 const ext=(file.name.match(/\.([^.]+)$/)||[])[1]||'mp4';
 cleanedName=(file.name.replace(/\.[^.]+$/,'')||'puremedia')+'-clean.'+ext;
 $('status').textContent=result.removed
   ? `Removed ${result.removed} C2PA provenance UUID box(es) without re-encoding audio/video.`
   : 'No C2PA provenance UUID box was found; a clean copy was prepared.';
}
function isBmff(u8){
 return u8.length>=12 && (ascii(u8,4,4)==='ftyp'||ascii(u8,4,4)==='styp');
}
function stripC2paBmffBoxes(u8){
 const parts=[];let off=0,removed=0;
 while(off+8<=u8.length){
  let size=readU32(u8,off),header=8;
  if(size===1){if(off+16>u8.length)throw new Error('Invalid box');size=Number(readU64(u8,off+8));header=16}
  else if(size===0)size=u8.length-off;
  if(size<header||off+size>u8.length)throw new Error('Invalid BMFF box length');
  let drop=false;
  if(ascii(u8,off+4,4)==='uuid'&&off+header+16<=u8.length){
   drop=toHex(u8.slice(off+header,off+header+16))===C2PA_UUID;
  }
  if(drop)removed++;else parts.push(u8.slice(off,off+size));
  off+=size;
 }
 if(off!==u8.length)throw new Error('Malformed BMFF');
 return {parts,removed};
}
function toHex(u8){return [...u8].map(x=>x.toString(16).padStart(2,'0')).join('')}
function readU64(u8,o){return BigInt(readU32(u8,o))*4294967296n+BigInt(readU32(u8,o+4))}
function readU32(u8,o){return ((u8[o]<<24)>>>0)+(u8[o+1]<<16)+(u8[o+2]<<8)+u8[o+3]}
function ascii(u8,o,n){return String.fromCharCode(...u8.slice(o,o+n))}
async function verifyOutput(){
 const out=new Uint8Array(await cleanedBlob.arrayBuffer());
 const scan=scanBytes(out);
 $('verifyMetadata').textContent=scan.metadata?'Some metadata markers remain':'No common markers found';
 $('verifyMetadata').className=scan.metadata?'warn':'ok';
 $('verifyC2pa').textContent=scan.c2pa?'C2PA marker still detected':'No C2PA marker found in quick scan';
 $('verifyC2pa').className=scan.c2pa?'warn':'ok';
}

$('downloadBtn').onclick=()=>{
 if(!cleanedBlob)return;
 if(downloadUrl)URL.revokeObjectURL(downloadUrl);
 downloadUrl=URL.createObjectURL(cleanedBlob);
 const a=document.createElement('a');a.href=downloadUrl;a.download=cleanedName;a.click();
};

$('resetBtn').onclick=reset;
function reset(){file=null;cleanedBlob=null;input.value='';workspace.classList.add('hidden');$('verification').classList.add('hidden');$('layers').classList.add('hidden');preview.innerHTML='';if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}}

function readU32(u8,o){return ((u8[o]<<24)>>>0)+(u8[o+1]<<16)+(u8[o+2]<<8)+u8[o+3]}
function readU64(u8,o){return BigInt(readU32(u8,o))*4294967296n+BigInt(readU32(u8,o+4))}
function ascii(u8,o,n){return String.fromCharCode(...u8.slice(o,o+n))}
