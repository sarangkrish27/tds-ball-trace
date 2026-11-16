// Interior segmentation keeps the dark outlines of touching balls separate.
export function detect(data, w, h, erode=false) {
 let mask=new Uint8Array(w*h); const seen=new Uint8Array(w*h), queue=new Int32Array(w*h), balls=[];
 for(let i=0;i<mask.length;i++){let r=data[i*4],g=data[i*4+1],b=data[i*4+2]; mask[i]=((Math.min(r,g,b)>105&&Math.max(r,g,b)<195&&Math.max(r,g,b)-Math.min(r,g,b)<30)||(r>120&&g<150&&b<150&&r>g*1.15))?1:0;}
 if(erode){const copy=mask.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;mask[p]=copy[p]&&copy[p-1]&&copy[p+1]&&copy[p-w]&&copy[p+w]&&copy[p-w-1]&&copy[p-w+1]&&copy[p+w-1]&&copy[p+w+1];}}
 const scale=Math.min(w,h)/480;
 for(let i=0;i<mask.length;i++) {
  if(!mask[i]||seen[i])continue;
  let head=0,tail=1,sx=0,sy=0,red=0,minx=w,maxx=0,miny=h,maxy=0;queue[0]=i;seen[i]=1;
  while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;sx+=x;sy+=y;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);if(data[p*4]>140&&data[p*4+1]<90)red++;
   for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(q>=0&&mask[q]&&!seen[q]){seen[q]=1;queue[tail++]=q;}
  }
  if(tail>(erode?130:180)*scale*scale&&tail<850*scale*scale&&maxx-minx>(erode?13:16)*scale&&maxx-minx<36*scale&&maxy-miny>(erode?13:16)*scale&&maxy-miny<36*scale)balls.push({x:sx/tail,y:sy/tail,r:(maxx-minx+maxy-miny)/4+(erode?2:1),red:red/tail});
 }
 return balls;
}
// Minimum-cost one-to-one assignment (Hungarian algorithm).
export function assign(cost){
 const n=cost.length,m=cost[0]?.length||0;if(n>m)throw Error('Insufficient detections');
 const u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
 for(let i=1;i<=n;i++){p[0]=i;let j0=0;const min=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
  do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;for(let j=1;j<=m;j++)if(!used[j]){let cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;j0=j1;}while(p[j0]);
  do{let j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
 }const result=Array(n);for(let j=1;j<=m;j++)if(p[j])result[p[j]-1]=j-1;return result;
}
export class Tracker {
 constructor(balls){this.balls=balls.map(b=>({...b,vx:0,vy:0}));this.target=balls.findIndex(b=>b.red>.3);if(this.target<0)throw Error('No red ball found in frame 0. Use the original, untrimmed video.');this.warnings=[];}
 step(balls,frame){
  if(balls.length!==this.balls.length)throw Error(`Frame ${frame}: detected ${balls.length} of ${this.balls.length} balls. Tracking stopped to avoid silently switching identity.`);
  const costs=this.balls.map(a=>balls.map(b=>(b.x-a.x)**2+(b.y-a.y)**2));
  const match=assign(costs),motion=assign(this.balls.map(a=>balls.map(b=>(b.x-a.x-a.vx*.65)**2+(b.y-a.y-a.vy*.65)**2)));let uncertain=false;
  this.balls=this.balls.map((a,i)=>{const b=balls[match[i]],d=Math.hypot(b.x-a.x,b.y-a.y);if(i===this.target){uncertain=d>a.r*2||motion[i]!==match[i];if(uncertain)this.warnings.push(frame);}return {...b,vx:b.x-a.x,vy:b.y-a.y};});
  return {...this.balls[this.target],uncertain};
 }
}
const DIGITS=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
export function readNumber(data,w,h,ball){
 const rad=Math.round(ball.r*.80),x0=Math.max(0,Math.round(ball.x)-rad),y0=Math.max(0,Math.round(ball.y)-rad),x1=Math.min(w-1,Math.round(ball.x)+rad),y1=Math.min(h-1,Math.round(ball.y)+rad);
 const white=(x,y)=>{if((x-ball.x)**2+(y-ball.y)**2>(ball.r*.88)**2)return false;const k=(y*w+x)*4;return data[k]>205&&data[k+1]>205&&data[k+2]>205;};
 const columns=[];for(let x=x0;x<=x1;x++){let count=0;for(let y=y0;y<=y1;y++)if(white(x,y))count++;columns.push(count>1);}
 const groups=[];for(let i=0;i<columns.length;i++)if(columns[i]){let start=i;while(i+1<columns.length&&columns[i+1])i++;groups.push([x0+start,x0+i]);}
 if(!groups.length||groups.length>3)return {number:null,score:0};let text='',error=0;
 for(const [left,right] of groups){let top=y1,bottom=y0;for(let y=y0;y<=y1;y++)for(let x=left;x<=right;x++)if(white(x,y)){top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(bottom-top<4)return {number:null,score:0};let bits='';for(let row=0;row<5;row++)for(let col=0;col<3;col++){let x=Math.round(left+(right-left)*(col+.5)/3),y=Math.round(top+(bottom-top)*(row+.5)/5);bits+=white(x,y)?'1':'0';}
  let scores=DIGITS.map(s=>[...s].reduce((sum,c,i)=>sum+(c!==bits[i]),0));let best=Math.min(...scores);text+=scores.indexOf(best);error+=best;
 }const number=Number(text);return {number:number>=1&&number<=100?number:null,score:1-error/(15*groups.length)};
}



