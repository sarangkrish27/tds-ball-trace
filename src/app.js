import {Input, ALL_FORMATS, BlobSource, CanvasSink} from 'mediabunny';
import {detectFrame,Tracker,readNumber} from './tracker.js';
const $=id=>document.getElementById(id),ctx=$('view').getContext('2d');
let file=null,input=null,sink=null,history=[],requested=[],cancelled=false,busy=false,reviewToken=0;
function status(text){$('status').textContent=text;}
function choose(f){if(busy)return;if(!f)return;if(!/\.webm$/i.test(f.name)){status('Please choose a .webm video.');return;}if(f.size>100*1024*1024){status('Please choose a video smaller than 100 MB.');return;}file=f;$('filename').textContent=f.name;$('track').disabled=false;clearResult();status('Video ready. Enter three frame numbers and start tracking.');}
function clearResult(){history=[];$('result').hidden=true;$('resultEmpty').hidden=false;$('resultState').textContent='WAITING FOR A TRACE';$('scrub').disabled=true;$('prev').disabled=true;$('next').disabled=true;$('meta').textContent='READY TO TRACK';}
$('file').onchange=e=>choose(e.target.files[0]);
for(const type of ['dragover','dragleave','drop'])$('drop').addEventListener(type,e=>{e.preventDefault();$('drop').classList.toggle('drag',type==='dragover');if(type==='drop')choose(e.dataTransfer.files[0]);});
$('cancel').onclick=()=>{cancelled=true;status('Cancelling…');};
function draw(canvas,point,index){const view=$('view');if(view.width!==canvas.width||view.height!==canvas.height){view.width=canvas.width;view.height=canvas.height;}ctx.drawImage(canvas,0,0);if(point){ctx.strokeStyle='#d64c3f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(point.x,point.y,point.r+5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d64c3f';ctx.beginPath();ctx.arc(point.x,point.y,2,0,Math.PI*2);ctx.fill();}view.style.visibility='visible';$('empty').hidden=true;$('frameLabel').textContent=`Frame ${index}`;}
async function review(index){if(!sink||!history[index])return;const token=++reviewToken;try{const result=await sink.getCanvas(history[index].time+history[index].duration*.1);if(token!==reviewToken||!result)return;draw(result.canvas,history[index],index);$('scrub').value=index;}catch(e){status(`Could not review this frame: ${e.message}`);}}
$('scrub').oninput=e=>review(Number(e.target.value));$('prev').onclick=()=>review(Math.max(0,Number($('scrub').value)-1));$('next').onclick=()=>review(Math.min(history.length-1,Number($('scrub').value)+1));
function updateAnswer(){const n=Number($('number').value),valid=Number.isInteger(n)&&n>=1&&n<=100&&requested.every(i=>history[i]);$('answer').textContent=valid?`${n}; ${requested.map(i=>`${Math.round(history[i].x)},${Math.round(history[i].y)}`).join('; ')}`:'Confirm the final ball number to generate your answer.';$('copy').disabled=!valid;}
$('number').oninput=updateAnswer;$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('answer').textContent);$('copy').textContent='Copied ✓';setTimeout(()=>$('copy').textContent='Copy answer ↗',1800);}catch{status('Clipboard unavailable. Select and copy the answer text manually.');}};
$('track').onclick=async()=>{
 if(!file||busy)return;
 requested=[1,2,3].map(i=>$(`frame${i}`).value.trim());if(requested.some(s=>!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s)))){status('Enter three non-negative whole frame numbers.');return;}requested=requested.map(Number);
 if(!globalThis.VideoDecoder){status('This browser cannot decode video frames. Open this page in desktop Chrome or Edge.');return;}
 clearResult();cancelled=false;busy=true;reviewToken++;$('track').disabled=true;$('file').disabled=true;$('cancel').hidden=false;$('progress').hidden=false;$('progress').value=0;for(let i=1;i<=3;i++)$(`frame${i}`).disabled=true;
 try{
  input?.dispose();input=new Input({formats:ALL_FORMATS,source:new BlobSource(file)});const track=await input.getPrimaryVideoTrack();if(!track||!await track.canDecode())throw Error('This video codec is not supported by your browser. Try desktop Chrome or Edge.');
  const duration=await track.computeDuration();sink=new CanvasSink(track,{poolSize:2,rotation:0});let tracker,index=0,lastCanvas;const detections=[];
  for await(const frame of sink.canvases()){
   if(cancelled)throw Error('Tracking cancelled. You can start again.');const canvas=frame.canvas,w=canvas.width,h=canvas.height;if(w*h>1920*1080)throw Error('Video resolution is too large. Maximum supported resolution is 1920 × 1080.');
   const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;const balls=detectFrame(data,w,h,tracker?.balls);
   if(!tracker){if(balls.length!==100)throw Error(`Detected ${balls.length} balls in the first frame; this tracker expects 100 outlined balls on a light background.`);tracker=new Tracker(balls);}
   const point=index===0?tracker.balls[tracker.target]:tracker.step(balls,index);history.push({...point,time:frame.timestamp,duration:frame.duration});detections.push(balls);
   if(index%6===0){draw(canvas,point,index);status(`Tracking frame ${index} · ${balls.length} balls detected`);$('progress').value=duration>0?Math.min(.98,frame.timestamp/duration):0;await new Promise(r=>setTimeout(r,0));}
   if(!lastCanvas){lastCanvas=document.createElement('canvas');lastCanvas.width=w;lastCanvas.height=h;}lastCanvas.getContext('2d').drawImage(canvas,0,0);index++;
  }
  if(!history.length)throw Error('No video frames were decoded.');if(requested.some(i=>i>=history.length))throw Error(`This video has ${history.length} frames. Choose frame numbers from 0 to ${history.length-1}.`);
  status('Checking the path backwards…');await new Promise(r=>setTimeout(r,0));
  const final=history.at(-1),reverse=new Tracker(detections.at(-1).map(b=>({...b,red:Math.hypot(b.x-final.x,b.y-final.y)<1?1:0})));
  let reverseMismatch=0;for(let i=history.length-2;i>=0;i--){if(cancelled)throw Error('Tracking cancelled.');const p=reverse.step(detections[i],i);if(Math.hypot(p.x-history[i].x,p.y-history[i].y)>1)reverseMismatch++;if(i%50===0)await new Promise(r=>setTimeout(r,0));}
  const lastCtx=lastCanvas.getContext('2d'),ocr=readNumber(lastCtx.getImageData(0,0,lastCanvas.width,lastCanvas.height).data,lastCanvas.width,lastCanvas.height,final);
  $('number').value=ocr.number&&ocr.score>=.9?ocr.number:'';$('zoom').getContext('2d').imageSmoothingEnabled=false;const size=Math.ceil(final.r*3);$('zoom').getContext('2d').drawImage(lastCanvas,final.x-size/2,final.y-size/2,size,size,0,0,144,144);
  $('coordinates').replaceChildren();for(const i of requested){const card=document.createElement('div');card.className='coordinate';card.innerHTML=`<small>FRAME ${i}</small><strong>${Math.round(history[i].x)}, ${Math.round(history[i].y)}</strong><button>Inspect frame ↗</button>`;card.querySelector('button').onclick=()=>review(i);$('coordinates').append(card);}
  const needsReview=tracker.warnings.length||reverseMismatch;
  $('confidence').textContent=needsReview?`Review recommended: ${tracker.warnings.length} motion disagreements${tracker.warnings.length?` (frames ${tracker.warnings.slice(0,6).join(', ')})`:''}; ${reverseMismatch} reverse-path disagreements. This answer is an estimate. Check the path and enlarged number before using it.`:`Forward and reverse paths agree. Check the enlarged final label${ocr.number&&ocr.score>=.9?' to confirm the automatically read number.':', then enter its number above.'} Coordinates are measured from the top-left of the original video.`;
  $('resultState').textContent=needsReview?'REVIEW RECOMMENDED':'TRACE COMPLETE';$('result').hidden=false;$('resultEmpty').hidden=true;$('meta').textContent=`${lastCanvas.width} × ${lastCanvas.height} · ${history.length} FRAMES`;$('scrub').max=history.length-1;$('scrub').value=history.length-1;$('scrub').disabled=false;$('prev').disabled=false;$('next').disabled=false;draw(lastCanvas,final,history.length-1);updateAnswer();$('progress').value=1;status(`Done. Tracked ${history.length} frames. ${needsReview?'Review the estimated answer below.':'Your answer is ready below.'}`);
 }catch(e){status(e.message||'Tracking failed. Please try another video.');$('resultState').textContent='TRACE INCOMPLETE';if(history.length){$('scrub').max=history.length-1;$('scrub').disabled=false;$('prev').disabled=false;$('next').disabled=false;await review(history.length-1);}}
 finally{busy=false;$('track').disabled=!file;$('file').disabled=false;$('cancel').hidden=true;for(let i=1;i<=3;i++)$(`frame${i}`).disabled=false;}
};
