'use strict';
// Mage and knight share playback logic but have separate artwork and timings.
const EnemyMotion = (() => {
  const configs={
    forgelord:{src:'assets/forge-lord-motion.png',height:132,standingHeight:265,attack:[.45,.5,.18,.27],walk:[.2,.17,.2,.17],rows:[0,307,602,931,1254],columns:[0,319,628,944,1254],rowColumns:{2:[0,333,625,944,1254]},roots:[180,490,800,1110,184,499,811,1123,201,489,802,1124,175,484,793,1100],ground:[285,592,908,1204]},
    mirelord:{src:'assets/mirelord-motion.png',height:132,standingHeight:270,attack:[.45,.5,.18,.27],walk:[.2,.17,.2,.17],rows:[0,310,603,927,1254],columns:[0,323,634,946,1254],rowColumns:{2:[0,350,636,1018,1254],3:[0,323,621,924,1254]},roots:[197,511,823,1135,195,510,825,1134,216,516,764,1140,190,499,799,1100],ground:[296,594,912,1210],overrides:{11:{x:978,width:276}},masks:{10:[[636,603],[1018,603],[1018,850],[978,870],[978,927],[636,927]],11:[[1018,603],[1254,603],[1254,927],[978,927],[978,870],[1018,850]]}},
    anubis:{src:'assets/anubis-motion.png',height:132,standingHeight:300,attack:[.45,.5,.18,.27],walk:[.2,.17,.2,.17],rows:[0,314,630,945,1254],columns:[0,314,627,940,1254],roots:[158,474,797,1111,180,494,811,1128,160,485,791,1111,168,483,794,1100],ground:[310,624,940,1234],overrides:{9:{y:610,height:335}},masks:{5:[[314,314],[627,314],[627,630],[425,630],[314,585]],9:[[350,610],[421,610],[460,644],[627,685],[627,945],[314,945],[314,638]]}},
    mage:{src:'assets/mage-motion.png',height:111,standingHeight:286,attack:[.4,.45,.13,.2],walk:[.18,.16,.18,.16],rows:[0,314,620,938,1254],columns:[0,314,627,939,1254],roots:[181,493,800,1107,191,499,795,1119,185,480,797,1107,158,470,789,1096],ground:[303,618,927,1228]},
    knight:{src:'assets/knight-motion.png',height:132,standingHeight:282,attack:[.45,.5,.18,.27],walk:[.2,.17,.2,.17],rows:[0,314,620,945,1254],columns:[0,320,630,940,1254],rowColumns:{3:[0,320,622,935,1254]},roots:[174,482,795,1115,173,491,807,1128,164,490,788,1104,154,486,792,1097],ground:[300,614,931,1218],overrides:{9:{y:590,height:355}},masks:{5:[[320,314],[630,314],[630,620],[415,620],[320,575]],9:[[320,590],[380,590],[470,640],[630,640],[630,945],[320,945]]}}
  };
  function build(config){
    const sheet=new Image();sheet.src=config.src;
    const clips={idle:{frames:[0,1,2,3,2,1],times:[.25,.25,.25,.25,.25,.25],loop:true},walk:{frames:[4,5,6,7],times:config.walk,loop:true},attack:{frames:[8,9,10,11],times:config.attack,loop:false},death:{frames:[12,13,14,15],times:[.18,.23,.24,.35],loop:false}};
    for(const c of Object.values(clips))c.duration=c.times.reduce((a,b)=>a+b,0);
    const frames=Array.from({length:16},(_,i)=>{const c=i%4,r=Math.floor(i/4),xs=config.rowColumns?.[r]||config.columns;return {x:xs[c],y:config.rows[r],width:xs[c+1]-xs[c],height:config.rows[r+1]-config.rows[r],rootX:config.roots[i],rootY:config.ground[r],...config.overrides?.[i]};});
    function create(){return {name:'idle',elapsed:0};}
    function play(a,name,restart=false){if(clips[name]&&(a.name!==name||restart)){a.name=name;a.elapsed=0;}}
    function advance(a,dt){const c=clips[a.name],t=a.elapsed+Math.max(0,dt);a.elapsed=c.loop?t%c.duration:Math.min(t,c.duration);}
    function frame(a){const c=clips[a.name];let end=0;for(let i=0;i<c.frames.length;i++){end+=c.times[i];if(a.elapsed<end-1e-9)return c.frames[i];}return c.frames.at(-1);}
    function ready(){return sheet.complete&&sheet.naturalWidth>0;}
    function draw(ctx,index,x,y,side=1,alpha=1,size=152,shadow=true){
      if(!ready())return false;
      const f=frames[Math.max(0,Math.min(15,Math.floor(index)))],sx=sheet.naturalWidth/1254,sy=sheet.naturalHeight/1254,s=config.height/config.standingHeight*size/152;
      ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.globalAlpha=alpha;
      if(shadow){ctx.fillStyle='#02070b8a';ctx.beginPath();ctx.ellipse(0,1,config.height*.14*size/152,5*size/152,0,0,Math.PI*2);ctx.fill();}
      ctx.scale(side<0?-1:1,1);ctx.imageSmoothingEnabled=false;
      // Atlas masks isolate the raised sword where neighboring bounding boxes
      // overlap. Source PNGs stay intact and every pose uses the same scale.
      const mask=config.masks?.[index];if(mask){ctx.beginPath();mask.forEach(([px,py],i)=>i?ctx.lineTo((px-f.rootX)*s,(py-f.rootY)*s):ctx.moveTo((px-f.rootX)*s,(py-f.rootY)*s));ctx.closePath();ctx.clip();}
      ctx.drawImage(sheet,f.x*sx,f.y*sy,f.width*sx,f.height*sy,Math.round((f.x-f.rootX)*s),Math.round((f.y-f.rootY)*s),Math.round(f.width*s),Math.round(f.height*s));ctx.restore();return true;
    }
    return {create,play,advance,frame,ready,draw,clips,frames};
  }
  const forgelord=build(configs.forgelord),mage=build(configs.mage),knight=build(configs.knight),anubis=build(configs.anubis),mirelord=build(configs.mirelord);
  return {forType:type=>type==='skeleton'?SkeletonMotion:type==='mage'?mage:type==='anubis'?anubis:type==='mirelord'?mirelord:type==='forgelord'?forgelord:knight,sizeFor:type=>type==='boss'?152*174/132:152,configs};
})();

