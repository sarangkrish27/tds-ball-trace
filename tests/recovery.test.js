import test from 'node:test';
import assert from 'node:assert/strict';
import {detect,detectCircles,detectFrame} from '../src/tracker.js';
function image(centres,{labels=false,bridge=false}={}){
 const w=480,data=new Uint8ClampedArray(w*w*4).fill(255);
 for(const [cx,cy] of centres)for(let y=cy-13;y<=cy+13;y++)for(let x=cx-13;x<=cx+13;x++)if((x-cx)**2+(y-cy)**2<=169){const k=(y*w+x)*4;data[k]=data[k+1]=data[k+2]=150;}
 if(bridge)for(let y=224;y<=256;y++)for(let x=237;x<=243;x++){const k=(y*w+x)*4;data[k]=data[k+1]=data[k+2]=150;}
 if(labels)for(const [cx,cy]of centres)for(let y=cy-5;y<=cy+5;y++)for(let x=cx-7;x<=cx+7;x++)if((x-cx+8)%4<2){const k=(y*w+x)*4;data[k]=data[k+1]=data[k+2]=255;}
 return data;
}
test('separates touching balls even when interiors form one component',()=>{
 const centres=[[227,240],[253,240]],data=image(centres);
 assert.equal(detect(data,480,480).length,0);
 const balls=detectCircles(data,480,480);assert.equal(balls.length,2);
 for(const [x,y]of centres)assert.ok(balls.some(b=>Math.hypot(b.x-x,b.y-y)<=1));
});
test('fills number-label holes before finding circle centres',()=>{
 const centres=[[180,220],[206,220],[270,270]],data=image(centres,{labels:true});
 const balls=detectCircles(data,480,480);assert.equal(balls.length,3);
 for(const [x,y]of centres)assert.ok(balls.some(b=>Math.hypot(b.x-x,b.y-y)<=1));
});
test('does not fabricate 100 detections when balls are absent',()=>{
 const data=image([[200,200]]);assert.equal(detectFrame(data,480,480).length,1);
 assert.equal(detectCircles(new Uint8ClampedArray(480*480*4).fill(255),480,480).length,0);
});
test('recovers a complete 100-ball frame after both segmentation passes lose compressed pairs',()=>{
 const centres=[];for(let row=0;row<10;row++)for(let col=0;col<10;col++)centres.push([114+col*28,114+row*28]);
 const data=image(centres);
 for(let pair=0;pair<7;pair++){const [cx,cy]=centres[pair*2];for(let y=cy-4;y<=cy+4;y++)for(let x=cx+10;x<=cx+18;x++){const k=(y*480+x)*4;data[k]=data[k+1]=data[k+2]=150;}}
 assert.ok(detect(data,480,480).length<100);assert.ok(detect(data,480,480,true).length<100);
 const balls=detectFrame(data,480,480);assert.equal(balls.length,100);
 for(const [x,y]of centres)assert.ok(balls.some(b=>Math.hypot(b.x-x,b.y-y)<=1),`missing centre ${x},${y}`);
});
