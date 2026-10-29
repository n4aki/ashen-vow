'use strict';
const SkeletonMotion = (() => {
  const clips={
    idle:{frames:[0,1,2,3,2,1],times:[.24,.22,.24,.24,.22,.24],loop:true},
    walk:{frames:[4,5,6,7],times:[.14,.12,.14,.12],loop:true},
    // Damage occurs when the two wind-up frames finish, at 0.42 seconds.
    attack:{frames:[8,9,10,11],times:[.21,.21,.12,.18],loop:false},
    death:{frames:[12,13,14,15],times:[.13,.18,.2,.3],loop:false}
  };
  for(const clip of Object.values(clips))clip.duration=clip.times.reduce((a,b)=>a+b,0);
  const sheet=new Image();sheet.src='assets/skeleton-motion.png';
  // The extended attack sword needs a wider third cell. These measured gutters
  // keep it intact without taking pixels from the adjacent skeleton.
  const rows=[0,330,620,945,1254];
  const roots=[165,480,794,1105,165,479,799,1106,165,480,777,1091,165,480,780,1095];
  const baselines=[303,602,916,1215];
  const frames=Array.from({length:16},(_,i)=>{const c=i%4,r=Math.floor(i/4),columns=r===2?[0,320,630,990,1254]:[0,320,630,940,1254];return {x:columns[c],y:rows[r],width:columns[c+1]-columns[c],height:rows[r+1]-rows[r],rootX:roots[i],rootY:baselines[r]};});
  function create(){return {name:'idle',elapsed:0};}
  function play(anim,name,restart=false){if(clips[name]&&(anim.name!==name||restart)){anim.name=name;anim.elapsed=0;}}
  function advance(anim,dt){const c=clips[anim.name],t=anim.elapsed+Math.max(0,dt);anim.elapsed=c.loop?t%c.duration:Math.min(t,c.duration);}
  function frame(anim){const c=clips[anim.name];let t=0;for(let i=0;i<c.frames.length;i++){t+=c.times[i];if(anim.elapsed<t-1e-9)return c.frames[i];}return c.frames[c.frames.length-1];}
  function ready(){return sheet.complete&&sheet.naturalWidth>0;}
  function draw(ctx,index,x,y,side=1,alpha=1,size=152,shadow=true){
    if(!ready())return false;
    const f=frames[Math.max(0,Math.min(15,Math.floor(index)))],sx=sheet.naturalWidth/1254,sy=sheet.naturalHeight/1254,s=size/420;
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.globalAlpha=alpha;
    if(shadow){ctx.fillStyle='#02070b8a';ctx.beginPath();ctx.ellipse(0,1,15,4,0,0,Math.PI*2);ctx.fill();}
    ctx.scale(side<0?-1:1,1);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sheet,f.x*sx,f.y*sy,f.width*sx,f.height*sy,Math.round((f.x-f.rootX)*s),Math.round((f.y-f.rootY)*s),Math.round(f.width*s),Math.round(f.height*s));ctx.restore();return true;
  }
  return {create,play,advance,frame,ready,draw,clips,frames};
})();
