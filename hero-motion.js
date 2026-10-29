'use strict';

// Sprite-sheet playback shared by the game and the visual animation fixture.
// Time is supplied by the simulation, so pause and hit-stop freeze the pose.
const HeroMotion = (() => {
  const clips = {
    idle: { frames: [0,1,2,3,2,1], times: [.22,.18,.2,.22,.2,.18], loop: true },
    run: { frames: [4,5,6,7], times: [.09,.075,.09,.075], loop: true },
    attack: { frames: [8,9,10,11], times: [.055,.045,.07,.07], loop: false },
    dash: { frames: [12,13,14,15], times: [.035,.055,.075,.035], loop: false }
  };
  for (const clip of Object.values(clips)) clip.duration = clip.times.reduce((a,b)=>a+b,0);
  const sheet = new Image();
  sheet.src = 'assets/hero-motion-v2.png';
  // Atlas metadata follows the transparent gutters in the delivered image.
  // Generated rows are not perfectly evenly spaced; explicit rectangles keep
  // the neighboring row's feet and long swords out of each animation frame.
  const columns=[0,320,630,960,1254],rows=[0,350,640,950,1254];
  const roots=[188,491,802,1111,183,490,804,1117,189,477,794,1105,175,473,789,1108];
  const baselines=[320,611,908,1176];
  const frames=Array.from({length:16},(_,i)=>{
    const col=i%4,row=Math.floor(i/4);
    return {x:columns[col],y:rows[row],width:columns[col+1]-columns[col],height:rows[row+1]-rows[row],rootX:roots[i],rootY:baselines[row]};
  });

  function create() { return { name:'idle', elapsed:0 }; }
  function play(anim, name, restart=false) {
    if (!clips[name]) return;
    if (anim.name!==name || restart) { anim.name=name; anim.elapsed=0; }
  }
  function advance(anim, dt) {
    const clip=clips[anim.name], elapsed=anim.elapsed+Math.max(0,dt);
    anim.elapsed=clip.loop ? elapsed%clip.duration : Math.min(elapsed,clip.duration);
  }
  function frame(anim) {
    const clip=clips[anim.name];let end=0;
    for(let i=0;i<clip.frames.length;i++) { end+=clip.times[i];if(anim.elapsed<end-1e-9)return clip.frames[i]; }
    return clip.frames[clip.frames.length-1];
  }
  function ready() { return sheet.complete && sheet.naturalWidth>0; }
  function draw(context, index, x, y, side=1, alpha=1, size=152, shadow=true) {
    if (!ready()) return false;
    index=Math.max(0,Math.min(15,Math.floor(index)));
    const f=frames[index],sx=sheet.naturalWidth/1254,sy=sheet.naturalHeight/1254,scale=size/340;
    context.save();context.translate(Math.round(x),Math.round(y));context.globalAlpha=alpha;
    if(shadow){context.fillStyle='#02070b8a';context.beginPath();context.ellipse(0,1,17,5,0,0,Math.PI*2);context.fill();}
    context.scale(side<0?-1:1,1);context.imageSmoothingEnabled=false;
    // Preserve the shared sprite scale and root; tight-cropping individual frames
    // would make the hero shrink during crouches and jitter when the cape moves.
    context.drawImage(sheet,f.x*sx,f.y*sy,f.width*sx,f.height*sy,
      Math.round((f.x-f.rootX)*scale),Math.round((f.y-f.rootY)*scale),Math.round(f.width*scale),Math.round(f.height*scale));
    context.restore();return true;
  }
  return {create,play,advance,frame,draw,ready,clips,frames};
})();
