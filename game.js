'use strict';
(() => {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('minimap').getContext('2d');
  const $ = id => document.getElementById(id);
  const W = 1280, H = 720, TAU = Math.PI * 2;
  // Foot-level boundaries traced separately from each background (1280 × 720).
  const stageArenas=[
    [[567,146],[698,131],[807,161],[922,214],[1008,281],[1036,336],[1035,379],[1090,423],[1028,481],[936,528],[853,552],[773,621],[625,551],[486,494],[362,446],[264,402],[252,374],[298,302],[388,248],[458,207]],
    [[503,169],[703,173],[758,152],[941,201],[996,248],[1054,294],[1070,357],[1037,412],[979,441],[961,497],[876,536],[806,560],[784,610],[670,574],[611,536],[541,506],[503,469],[429,448],[366,419],[309,395],[316,372],[374,335],[374,298],[456,260],[456,229]],
    [[613,187],[760,181],[839,212],[861,246],[934,269],[982,302],[1027,332],[1005,374],[1045,418],[1023,455],[981,483],[918,511],[916,540],[880,552],[845,549],[775,583],[695,555],[659,531],[594,508],[581,481],[521,466],[478,451],[435,434],[416,419],[427,403],[463,379],[490,341],[509,320],[490,305],[510,280],[560,251],[579,220]],
    [[469,205],[771,135],[823,151],[951,228],[1063,301],[1125,333],[1072,367],[1015,388],[980,429],[968,473],[920,518],[850,550],[787,582],[718,580],[667,553],[607,526],[543,499],[472,471],[402,446],[343,417],[302,393],[271,369],[297,338],[353,301],[376,270]]
  ];
  const arenaForStage=()=>stageArenas[stage];
  const globalBackground = new Image(); globalBackground.src = 'assets/temple.png';
  const necropolisImage = new Image(); necropolisImage.src='assets/necropolis.png';
  const mireImage=new Image();mireImage.src='assets/venom-mire.png';
  const forgeImage=new Image();forgeImage.src='assets/infernal-forge.png';
  let eruptions=[];
  const stageNames=['忘れられた聖堂','砂に沈んだ王墓','毒霧の沼地','灼熱の鍛冶場'];
  const stageSubtitles=['RUINED TEMPLE · STAGE 01','SUNKEN NECROPOLIS · STAGE 02','VENOM MIRE · STAGE 03','INFERNAL FORGE · STAGE 04'];
  const bossNames=['聖堂の番人','冥府の守護者 アヌビス','毒沼の巨躯 モルグ','熔鉄の暴君 ヴァルカン'];
  let poisonPools=[];
  const shopImage=new Image();shopImage.src='assets/merchant-refuge.png';
  let stage=0,guardCharges=0,shopStock={},upgrades=new Set(),shopCategory='equipment';
  const shopGoods=[
    {id:'blade',name:'研ぎ澄まされた刃',icon:'⚔',category:'equipment',currency:'gold',price:90,stock:1,upgrade:true,description:'通常攻撃の威力 +25%（33 → 41）。'},
    {id:'armor',name:'鉄織りの外套',icon:'♜',category:'equipment',currency:'gold',price:100,stock:1,upgrade:true,description:'すべての被ダメージを10%軽減。'},
    {id:'boots',name:'疾風のブーツ',icon:'➶',category:'equipment',currency:'gold',price:80,stock:1,upgrade:true,description:'歩く速さ +15%。敵との距離を取りやすく。'},
    {id:'vitality',name:'生命の器',icon:'♥',category:'equipment',currency:'gold',price:120,stock:1,upgrade:true,description:'最大ハート +2個（12 → 14）。追加分も回復。'},
    {id:'whirl-rune',name:'嵐のルーン',icon:'↻',category:'runes',currency:'crystals',price:3,stock:1,upgrade:true,description:'旋風斬りの範囲 +30%。周囲を広く薙ぎ払う。'},
    {id:'nova-rune',name:'蒼炎のルーン',icon:'✧',category:'runes',currency:'crystals',price:4,stock:1,upgrade:true,description:'蒼炎の衝撃：威力 +40%、範囲 +25%。'},
    {id:'haste',name:'時のルーン',icon:'◷',category:'runes',currency:'crystals',price:4,stock:1,upgrade:true,description:'E・Rの待ち時間を15%短縮（4.25秒／7.65秒）。'},
    {id:'siphon',name:'吸命のルーン',icon:'✦',category:'runes',currency:'crystals',price:5,stock:1,upgrade:true,description:'敵を1体倒すたび、ハート0.2個分回復。'},
    {id:'potion',name:'回復薬',icon:'⚱',category:'supplies',currency:'gold',price:45,stock:3,amount:1,description:'Qで使用。ハート約5.7個分を回復。'},
    {id:'supplies',name:'旅の補給袋',icon:'▣',category:'supplies',currency:'gold',price:110,stock:1,amount:3,description:'回復薬3個入り。まとめて備える。'},
    {id:'crystal-potion',name:'結晶の交換薬',icon:'♦',category:'supplies',currency:'crystals',price:2,stock:2,amount:1,description:'紫の結晶2個で、回復薬1個。'},
    {id:'ward',name:'守りの護符',icon:'♜',category:'supplies',currency:'crystals',price:4,stock:1,amount:0,description:'受けるダメージを2回だけ半減。'}
  ];
  function combatStats(){return {
    attack:33*(upgrades.has('blade')?1.25:1),armor:upgrades.has('armor')?.9:1,speed:166*(upgrades.has('boots')?1.15:1),
    maxHp:180+(upgrades.has('vitality')?30:0),whirlScale:upgrades.has('whirl-rune')?1.3:1,
    novaScale:upgrades.has('nova-rune')?1.25:1,novaDamage:96*(upgrades.has('nova-rune')?1.4:1),killHeal:upgrades.has('siphon')?3:0
  };}
  function cooldownDuration(name){return Math.round(maxCooldowns[name]*(upgrades.has('haste')&&(name==='whirl'||name==='nova')?.85:1)*100)/100;}
  function setShopCategory(category){
    if(!['equipment','runes','supplies'].includes(category))return;shopCategory=category;
    for(const c of ['equipment','runes','supplies']){$('category-'+c).setAttribute('aria-pressed',String(c===category));}
    for(const g of shopGoods)$('buy-'+g.id).hidden=g.category!==category;
  }
  const sprites = new Image();
  const spriteFrames = {
    hero: [15,160,603,525,94,.5],
    skeleton: [642,159,349,529,88,.5],
    mage: [1084,48,434,637,111,.5],
    knight: [1556,10,588,681,132,.54],
    boss: [1556,10,588,681,174,.54]
  };
  sprites.onload=()=>{const p=$('portrait').getContext('2d');p.imageSmoothingEnabled=false;p.fillStyle='#12202a';p.fillRect(0,0,76,76);p.drawImage(sprites,262,145,186,186,0,0,76,76);};
  sprites.src='assets/characters.png';
  const keys = new Set();
  const mouse = { down: false };
  const stick={pointerId:null,x:0,y:0};
  const attackPointers=new Set();
  function resetStick(){stick.pointerId=null;stick.x=stick.y=0;$('stick-knob').style.transform='translate(-50%,-50%)';$('touch-move').classList.remove('active');}
  function clearTouch(){resetStick();attackPointers.clear();}
  function setStick(dx,dy,radius){
    const length=Math.hypot(dx,dy),amount=Math.min(1,length/radius),speed=amount<=.12?0:(amount-.12)/.88;
    stick.x=length?dx/length*speed:0;stick.y=length?dy/length*speed:0;
    const scale=length?Math.min(length,radius)/length:0;
    $('stick-knob').style.transform=`translate(calc(-50% + ${dx*scale}px),calc(-50% + ${dy*scale}px))`;
  }
  function movementInput(){
    const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),n=Math.hypot(x,y);
    return n?{x:x/n,y:y/n}:{x:stick.x,y:stick.y};
  }
  const rnd = (a,b) => a+Math.random()*(b-a);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  let state='intro', previous=0, time=0, gameTime=0, wave=0, waveWait=0, shake=0, hitstop=0;
  let enemies=[], effects=[], particles=[], drops=[], bolts=[], stains=[], ghosts=[], floating=[];
  let corpses=[];
  let combo=0, comboTime=0, bestCombo=0, gold=0, crystals=0, totalKills=0, potionCount=3, player;
  let bannerTime=0, toastTime=0, muted=false, audioContext=null, musicClock=0;
  const cooldowns={attack:0,dash:0,whirl:0,nova:0,heal:0};
  const maxCooldowns={attack:.32,dash:1.15,whirl:5,nova:9,heal:1};
  const waveNames=['忘れられた者たち','闇に囁く声','鉄と骨の行進','聖堂を覆う影','最後の番人'];
  const roman=['I','II','III','IV','V'];
  const necropolisWaveNames=['砂に埋もれた兵士','蒼い冥火','黄金の近衛兵','王墓の呪い','冥府の守護者'];
  function motionFor(e){return EnemyMotion.forType(e.type==='boss'&&e.stage===3?'forgelord':e.type==='boss'&&e.stage===2?'mirelord':e.type==='boss'&&e.stage===1?'anubis':e.type);}
  const forgeWaveNames=['熾火の兵士','炉の祈祷師','黒鉄の近衛','地獄の坩堝','熔鉄の暴君'];
  function addEruption(x,y,warn=1){if(stage===3&&inside(x,y))eruptions.push({x,y,r:48,warn,life:.5,fired:false});}
  const mireWaveNames=['沼に眠る骨','腐敗の囁き','毒霧の近衛','底なしの悪意','毒沼の巨躯'];
  function addPoisonPool(x,y){if(stage===2&&inside(x,y))poisonPools.push({x,y,r:45,warn:.9,life:5});}
  const torches=[[218,327],[565,37],[962,105],[1061,558]];

  function inside(x,y){const arena=arenaForStage();let c=false;for(let i=0,j=arena.length-1;i<arena.length;j=i++){const a=arena[i],b=arena[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
  function canStand(x,y,r=9){
    if(!inside(x,y))return false;const points=arenaForStage();
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);if(Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<r)return false;}return true;
  }
  function move(o,dx,dy){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4)),r=o===player?9:Math.max(7,(o.r||15)*.4);dx/=steps;dy/=steps;
    for(let i=0;i<steps;i++){if(canStand(o.x+dx,o.y+dy,r)){o.x+=dx;o.y+=dy;}else{if(canStand(o.x+dx,o.y,r))o.x+=dx;if(canStand(o.x,o.y+dy,r))o.y+=dy;}}
  }
  function poly(points,color,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
  function line(x,y,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
  function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function sound(type){
    if(muted)return;
    try{
      if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==='suspended')audioContext.resume();
      const presets={slash:[400,75,.12,'sawtooth',.025],hit:[130,40,.1,'triangle',.09],hurt:[110,48,.25,'sawtooth',.065],dash:[450,110,.16,'triangle',.03],coin:[880,1320,.12,'sine',.04],heal:[330,990,.5,'sine',.055],magic:[190,850,.5,'triangle',.045],wave:[160,80,.9,'triangle',.05],death:[120,22,1.2,'sawtooth',.04]};
      const [from,to,duration,kind,vol]=presets[type]||presets.hit;
      const osc=audioContext.createOscillator(), gain=audioContext.createGain(), now=audioContext.currentTime;
      osc.type=kind;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(to,now+duration);
      gain.gain.setValueAtTime(vol,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(now+duration);
    }catch{}
  }
  function ambient(dt){if(muted||!audioContext||state!=='playing')return;musicClock-=dt;if(musicClock<=0){musicClock=3.6;const n=audioContext.currentTime;[55,82.41,110,Math.random()<.5?164.81:146.83].forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.001,n);g.gain.linearRampToValueAtTime(.011/(i+1),n+.7);g.gain.exponentialRampToValueAtTime(.001,n+3.4);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(n+3.5);});}}
  function burst(x,y,color,count=15,speed=140){for(let i=0;i<count;i++){const a=rnd(0,TAU),v=rnd(speed*.2,speed);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.18,.55),max:.55,color,size:rnd(1,4)});}}
  function number(x,y,text,color='#f6f4e9',big=false){floating.push({x,y,text,color,life:.8,big});}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');toastTime=2.1;}
  function reset(){
    player={x:660,y:413,hp:180,maxHp:180,angle:0,attackAngle:0,facing:1,walk:0,moving:false,invuln:0,dash:0,dx:0,dy:0,attack:0,motion:HeroMotion.create()};
    enemies=[];effects=[];particles=[];drops=[];bolts=[];stains=[];ghosts=[];floating=[];corpses=[];wave=0;waveWait=0;combo=0;comboTime=0;bestCombo=0;gold=0;crystals=0;totalKills=0;potionCount=3;gameTime=0;shake=0;hitstop=0;musicClock=0;
    guardCharges=0;shopStock={};upgrades=new Set();poisonPools=[];eruptions=[];$('shop').classList.add('hidden');$('game').classList.remove('shopping');$('pause').disabled=false;
    keys.clear();mouse.down=false;clearTouch();for(const k in cooldowns)cooldowns[k]=0;
    updateHUD();
  }
  function enemy(type,x,y){const hp=type==='boss'?940:type==='knight'?220:type==='mage'?86:65;return {type,stage,x,y,hp:Math.round(hp*[1,1.2,1.4,1.6][stage]),maxHp:Math.round(hp*[1,1.2,1.4,1.6][stage]),speed:type==='boss'?33:type==='knight'?34:type==='mage'?39:rnd(43,57),r:type==='boss'?29:type==='knight'?23:15,walk:rnd(0,7),cool:rnd(.6,1.6),telegraph:0,flash:0,born:.6,kx:0,ky:0,aim:null,swing:0,facing:player.x<x?-1:1,motion:EnemyMotion.forType(type==='boss'&&stage===3?'forgelord':type==='boss'&&stage===2?'mirelord':type==='boss'&&stage===1?'anubis':type).create()};}
  let lastFormation=-1;
  const formationNames=['包囲','二方向からの挟撃','三隊の襲撃','横陣','散開'];
  function waveRoster(){
    const base=[5,7,7,9,6][wave-1]+(stage?2:0)+(stage>=2?1:0);
    const count=base-1+Math.floor(Math.random()*4),types=wave===5?['boss']:[];
    const mageLimit=Math.min(3,1+Math.floor((wave+stage)/3));
    const knightLimit=wave>=3?Math.min(3,1+Math.floor(stage/2)):stage>0&&wave===2?1:0;
    let mages=0,knights=0;
    while(types.length<count){
      const roll=Math.random();
      if(roll<.23&&mages<mageLimit){types.push('mage');mages++;}
      else if(roll<.43&&knights<knightLimit){types.push('knight');knights++;}
      else types.push('skeleton');
    }
    // Keep the boss first for placement; shuffle the supporting units.
    for(let i=types.length-1;i>(wave===5?1:0);i--){const lo=wave===5?1:0,j=lo+Math.floor(Math.random()*(i-lo+1));[types[i],types[j]]=[types[j],types[i]];}
    return types;
  }
  function wavePositions(types,formation){
    const angle=rnd(0,TAU),points=arenaForStage(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const candidates=[];
    for(let y=Math.min(...ys)+18;y<Math.max(...ys);y+=28)for(let x=Math.min(...xs)+18;x<Math.max(...xs);x+=28){
      const p={x:x+rnd(-7,7),y:y+rnd(-7,7)};if(canStand(p.x,p.y,18)&&dist(p,player)>=175)candidates.push(p);
    }
    const placed=[];
    types.forEach((type,i)=>{
      const r=type==='boss'?30:type==='knight'?23:15;
      let a=angle,tx,ty;
      if(formation===0)a+=i/types.length*TAU;
      else if(formation===1)a+=(i%2)*Math.PI;
      else if(formation===2)a+=(i%3)*TAU/3;
      tx=678+Math.cos(a)*275;ty=378+Math.sin(a)*155;
      if(formation===3){const offset=(i-(types.length-1)/2)*45;tx+=Math.cos(a+Math.PI/2)*offset;ty+=Math.sin(a+Math.PI/2)*offset*.65;}
      if(formation===4){tx=rnd(Math.min(...xs),Math.max(...xs));ty=rnd(Math.min(...ys),Math.max(...ys));}
      let best=null,score=Infinity;
      for(const p of candidates){
        if(dist(p,player)<175+r||placed.some(q=>dist(p,q)<r+q.r+14))continue;
        const s=(p.x-tx)**2+((p.y-ty)*1.3)**2+rnd(0,300);
        if(s<score){best=p;score=s;}
      }
      // The stage grids have ample safe slots even at the maximum wave size.
      if(!best)throw new Error('No safe enemy spawn position');
      placed.push({...best,r,type});
    });
    return placed;
  }
  function spawnWave(){
    wave++;waveWait=0;comboTime=0;bolts=[];
    const types=waveRoster();
    const choices=formationNames.map((_,i)=>i).filter(i=>i!==lastFormation);
    lastFormation=choices[Math.floor(Math.random()*choices.length)];
    for(const {type,x,y} of wavePositions(types,lastFormation)){enemies.push(enemy(type,x,y));burst(x,y,'#9371c6',20,80);}
    const b=$('wave-banner');b.querySelector('strong').textContent='WAVE '+roman[wave-1];b.querySelector('span').textContent=[waveNames,necropolisWaveNames,mireWaveNames,forgeWaveNames][stage][wave-1];b.querySelector('small').textContent=formationNames[lastFormation]+' · '+types.length+'体';b.classList.add('visible');bannerTime=2.5;sound('wave');
  }
  function start(stageIndex=0,carry=false){
    const carried=carry?{upgrades:[...upgrades],gold,crystals,guardCharges,potionCount:Math.max(3,potionCount),totalKills,bestCombo,gameTime}:null;
    stage=Number.isInteger(stageIndex)?clamp(stageIndex,0,stageNames.length-1):0;reset();
    if(carried){({gold,crystals,guardCharges,potionCount,totalKills,bestCombo,gameTime}=carried);upgrades=new Set(carried.upgrades);player.maxHp=combatStats().maxHp;player.hp=player.maxHp;}
    state='playing';$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';sound('heal');spawnWave();updateHUD();
  }
  function activateStart(){if(state==='paused')togglePause();else if(state==='shop')leaveShop();else start(stage);}
  function enterShop(){
    poisonPools=[];eruptions=[];state='shop';keys.clear();mouse.down=false;clearTouch();player.hp=player.maxHp;player.invuln=0;player.attack=0;player.dash=0;player.moving=false;player.x=520;player.y=465;player.facing=1;HeroMotion.play(player.motion,'idle');
    potionCount=Math.max(3,potionCount);enemies=[];bolts=[];effects=[];particles=[];drops=[];stains=[];corpses=[];ghosts=[];floating=[];shake=0;hitstop=0;combo=0;comboTime=0;
    for(const k in cooldowns)cooldowns[k]=0;
    shopStock=Object.fromEntries(shopGoods.map(g=>[g.id,g.stock]));
    $('overlay').classList.add('hidden');$('wave-banner').classList.remove('visible');bannerTime=0;
    $('shop').classList.remove('hidden');$('game').classList.add('shopping');$('pause').disabled=true;
    $('shop-message').textContent='お疲れさま。体力は全回復、回復薬は最低3個まで補充しておいた。';
    setShopCategory('equipment');updateHUD();updateShop();sound('heal');$('shop').scrollTop=0;$('shop').focus?.({preventScroll:true});
  }
  function updateShop(){
    $('shop-next').querySelector('span').textContent=stageNames[stage+1]+' →';
    $('shop-gold').textContent=gold;$('shop-crystals').textContent=crystals;
    $('shop-inventory').textContent=`回復薬 ${potionCount}個 · 護符の残り ${guardCharges}回`;
    $('shop-owned').textContent=upgrades.size?'購入済み：'+shopGoods.filter(g=>upgrades.has(g.id)).map(g=>g.name).join('・'):'強化は各1回。組み合わせ自由・この冒険中ずっと有効。';
    for(const g of shopGoods){const button=$('buy-'+g.id),money=g.currency==='gold'?gold:crystals,remaining=upgrades.has(g.id)?0:shopStock[g.id]||0;
      button.disabled=remaining<=0||money<g.price;button.classList.toggle('is-owned',upgrades.has(g.id));
      button.querySelector('.stock').textContent=upgrades.has(g.id)?'購入済み · 効果発動中':remaining<=0?'売り切れ':money<g.price?'所持数が足りません':g.upgrade?'購入して強化':'在庫 '+remaining;
    }
  }
  function buyShopItem(id){
    if(state!=='shop')return false;const g=shopGoods.find(o=>o.id===id);if(!g||!shopStock[id]||upgrades.has(id))return false;
    const money=g.currency==='gold'?gold:crystals;
    if(money<g.price){$('shop-message').textContent='所持数が足りないようだ。';return false;}
    if(g.currency==='gold')gold-=g.price;else crystals-=g.price;shopStock[id]--;
    if(g.upgrade){upgrades.add(id);const nextMax=combatStats().maxHp;player.hp=Math.min(nextMax,player.hp+nextMax-player.maxHp);player.maxHp=nextMax;}
    else if(id==='ward')guardCharges+=2;else potionCount+=g.amount;
    $('shop-message').textContent=g.name+'を購入しました。'+(g.upgrade?g.description:id==='ward'?'次の被ダメージを2回半減します。':`回復薬 +${g.amount}個`);
    sound('coin');updateHUD();updateShop();return true;
  }
  function leaveShop(){if(state!=='shop'||stage>=stageNames.length-1)return;start(stage+1,true);}
  function renderShop(){
    ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=false;
    if(shopImage.complete&&shopImage.naturalWidth)ctx.drawImage(shopImage,0,0,W,H);else{if(globalBackground.complete&&globalBackground.naturalWidth)ctx.drawImage(globalBackground,0,0,W,H);rect(0,0,W,H,'#08141c77');}
    glow(240,290,95,'#327eff22');glow(580,310,100,'#e8a54622');
    hero(player.x,player.y,0,0,1);
  }
  function togglePause(){
    if(state==='playing'){state='paused';mouse.down=false;keys.clear();clearTouch();showOverlay('PAUSED','ひとときの静寂','剣を休め、次の一撃に備えよ。','戦いに戻る','THE TEMPLE WAITS');$('pause').textContent='▶';}
    else if(state==='paused'){state='playing';$('touch-move').hidden=false;$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';}
  }
  function showOverlay(title,subtitle,description,button,eyebrow){$('touch-move').hidden=true;$('overlay-title').textContent=title;$('overlay-subtitle').textContent=subtitle;$('overlay-description').innerHTML=description;$('start').innerHTML=button+' <span>↗</span>';$('overlay-eyebrow').textContent=eyebrow;$('intro-controls').style.display='none';$('stage-two').style.display='none';$('stage-three').style.display='none';$('stage-four').style.display='none';$('intro-note').textContent=state==='paused'?'ESC で再開':'もう一度、灰の中から。';$('overlay').classList.remove('hidden');}
  function finish(win){
    if(win&&stage<stageNames.length-1){enterShop();return;}
    state=win?'victory':'dead';mouse.down=false;keys.clear();clearTouch();$('wave-banner').classList.remove('visible');bannerTime=0;sound(win?'heal':'death');
    showOverlay(win?'VOW FULFILLED':'YOU FALL',win?'熾火の向こうに、朝が来る':'灰に還る',`${win?'四つの地に、静寂が戻った。':'それでも、灯はまだ消えない。'}<br>撃破 ${totalKills} 体　·　最大 ${bestCombo} COMBO<br>獲得 ${gold} G　·　${Math.floor(gameTime/60)}分${Math.floor(gameTime%60)}秒`,'このステージをもう一度',win?'THE LAST LIGHT REMAINS':'RISE AGAIN, ASHEN ONE');
  }
  function takeDamage(amount){if(player.invuln>0||state!=='playing')return;amount=Math.ceil(amount*combatStats().armor);if(guardCharges>0){guardCharges--;amount=Math.ceil(amount/2);toast('守りの護符  ·  ダメージ半減（残り'+guardCharges+'回）');}player.hp=Math.max(0,player.hp-amount);player.invuln=.72;shake=8;combo=0;comboTime=0;sound('hurt');burst(player.x,player.y-28,'#bf4047',17);number(player.x,player.y-63,'−'+amount,'#ff8580');updateHearts();if(!player.hp)finish(false);}
  function hit(e,damage,force=95){
    if(e.hp<=0)return;const crit=Math.random()<.13;damage=Math.round(damage*(crit?1.55:1));e.hp-=damage;e.flash=.13;
    const a=Math.atan2(e.y-player.y,e.x-player.x);e.kx=Math.cos(a)*force;e.ky=Math.sin(a)*force;
    burst(e.x,e.y-23,crit?'#ffd267':'#ffdf9b',crit?20:12,190);number(e.x+rnd(-10,10),e.y-55,damage,crit?'#ffca52':'#fff4df',crit);combo++;comboTime=3.5;bestCombo=Math.max(bestCombo,combo);shake=Math.max(shake,crit?5:2.5);hitstop=.035;sound('hit');
    if(e.hp<=0){const animator=motionFor(e),motion=animator.create();animator.play(motion,'death');corpses.push({type:e.type,stage:e.stage,x:e.x,y:e.y,facing:e.facing,motion,life:e.type==='skeleton'?1.6:2.0});}
    if(e.hp<=0){const heal=Math.min(combatStats().killHeal,player.maxHp-player.hp);if(heal>0){player.hp+=heal;number(player.x,player.y-60,'+'+heal,'#9aefa5');}totalKills++;stains.push({x:e.x,y:e.y,seed:rnd(0,999),type:e.type});burst(e.x,e.y-20,e.type==='mage'?'#a252bd':'#b1ada0',22,140);for(let i=0;i<3;i++)drops.push({x:e.x+rnd(-23,23),y:e.y+rnd(-13,13),kind:'gold',amount:e.type==='boss'?30:Math.round(rnd(3,8)),life:25,phase:rnd(0,TAU)});if(e.type==='knight'||e.type==='boss'||Math.random()<.22)drops.push({x:e.x,y:e.y,kind:'crystal',life:25,phase:0});}
  }
  function movementDirection(){
    const {x,y}=movementInput();
    if(player.dash>0){player.angle=Math.atan2(player.dy,player.dx);if(Math.abs(player.dx)>.001)player.facing=player.dx<0?-1:1;}
    else if(x||y){player.angle=Math.atan2(y,x);if(x)player.facing=x<0?-1:1;}
  }
  function attackDirection(){
    const base=player.angle;let nearest=Infinity,correction=0;
    for(const e of enemies){if(e.hp<=0)continue;const d=dist(e,player),a=Math.atan2(e.y-player.y,e.x-player.x),diff=Math.atan2(Math.sin(a-base),Math.cos(a-base));
      if(d<105+e.r&&d<nearest&&Math.abs(diff)<=Math.PI*35/180){nearest=d;correction=clamp(diff,-Math.PI/12,Math.PI/12);}}
    return base+correction;
  }
  function drawAttackDirection(){
    if(state==='intro')return;
    const a=player.attack>0?player.attackAngle:attackDirection();
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(a);
    poly([[35,-7],[52,0],[35,7],[39,0]],player.attack>0?'#fff3b9':'#9de6ec','#162c35');ctx.restore();
  }
  function action(name){
    if(state!=='playing'||cooldowns[name]>0)return;
    if(name==='attack'){
      movementDirection();const a=attackDirection();player.attackAngle=a;cooldowns.attack=.32;player.attack=.24;if(player.dash<=0)HeroMotion.play(player.motion,'attack',true);effects.push({type:'slash',x:player.x,y:player.y-16,a,life:.25,max:.25,r:90});sound('slash');
      enemies.forEach(e=>{let diff=Math.atan2(Math.sin(Math.atan2(e.y-player.y,e.x-player.x)-a),Math.cos(Math.atan2(e.y-player.y,e.x-player.x)-a));if(dist(e,player)<105+e.r&&Math.abs(diff)<1.55)hit(e,combatStats().attack);});
    } else if(name==='dash'){
      movementDirection();let x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);if(!x&&!y){x=Math.cos(player.angle);y=Math.sin(player.angle);}const n=Math.hypot(x,y);player.dx=x/n;player.dy=y/n;player.dash=.2;player.invuln=.3;cooldowns.dash=1.15;HeroMotion.play(player.motion,'dash',true);sound('dash');
    } else if(name==='heal'){
      if(potionCount<=0){toast('回復薬がない');return;}if(player.hp>=player.maxHp){toast('HPは満タン');return;}potionCount--;cooldowns.heal=1;player.hp=Math.min(player.maxHp,player.hp+85);burst(player.x,player.y-20,'#8bea9a',34,110);number(player.x,player.y-60,'+85','#9aefa5');sound('heal');
    } else {
      cooldowns[name]=cooldownDuration(name);player.invuln=.35;player.attack=.24;player.attackAngle=player.angle;if(player.dash<=0)HeroMotion.play(player.motion,'attack',true);sound('magic');
      if(name==='whirl'){effects.push({type:'whirl',x:player.x,y:player.y-15,life:.5,max:.5,r:144*combatStats().whirlScale});enemies.forEach(e=>{if(dist(e,player)<158*combatStats().whirlScale)hit(e,73,245);});}
      else{effects.push({type:'nova',x:player.x,y:player.y,life:.65,max:.65,r:235*combatStats().novaScale,color:'#8fcfff'});enemies.forEach(e=>{if(dist(e,player)<235*combatStats().novaScale)hit(e,combatStats().novaDamage,330);});bolts=bolts.filter(b=>dist(b,player)>235*combatStats().novaScale);burst(player.x,player.y-15,'#9bcfff',60,320);shake=7;}
    }
    updateHUD();
  }
  function update(dt){
    if(state!=='playing')return;
    gameTime+=dt;ambient(dt);
    for(const c of corpses){c.life-=dt;motionFor(c).advance(c.motion,dt);}corpses=corpses.filter(c=>c.life>0);
    for(const k in cooldowns)cooldowns[k]=Math.max(0,cooldowns[k]-dt);
    player.invuln=Math.max(0,player.invuln-dt);player.attack=Math.max(0,player.attack-dt);
    movementDirection();
    const {x:mx,y:my}=movementInput();
    player.moving=!!(mx||my);if(player.dash>0){if(Math.abs(player.dx)>.001)player.facing=player.dx<0?-1:1;player.dash=Math.max(0,player.dash-dt);move(player,player.dx*640*dt,player.dy*640*dt);ghosts.push({x:player.x,y:player.y,angle:player.facing<0?Math.PI:0,walk:player.walk,life:.22,frame:HeroMotion.frame(player.motion)});}else if(player.moving){if(mx)player.facing=mx<0?-1:1;move(player,mx*combatStats().speed*dt,my*combatStats().speed*dt);player.walk+=dt*13;player.angle=Math.atan2(my,mx);}
    HeroMotion.play(player.motion,player.dash>0?'dash':player.attack>0?'attack':player.moving?'run':'idle');
    HeroMotion.advance(player.motion,dt);
    if(mouse.down||attackPointers.size||keys.has('j'))action('attack');
    comboTime=Math.max(0,comboTime-dt);if(!comboTime)combo=0;
    for(const e of enemies){
      if(e.motion&&e.hp>0)motionFor(e).advance(e.motion,dt);
      if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.born=Math.max(0,e.born-dt);e.cool-=dt;e.walk+=dt*7;move(e,e.kx*dt,e.ky*dt);e.kx*=Math.exp(-dt*10);e.ky*=Math.exp(-dt*10);if(e.born>0)continue;
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
      if(e.swing>0){e.swing=Math.max(0,e.swing-dt);if(e.swing>0)continue;}
      if(e.motion&&e.telegraph<=0)e.facing=dx<0?-1:1;
      if(e.telegraph>0){e.telegraph-=dt;if(e.telegraph<=0){e.swing=motionFor(e).clips.attack.duration-e.teleMax;
        if(e.type==='mage'){const a=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);[-.13,0,.13].forEach((offset,i)=>{if(wave<4&&stage===0&&i!==1)return;bolts.push({x:e.x,y:e.y-22,vx:Math.cos(a+offset)*(stage===3?165:140),vy:Math.sin(a+offset)*(stage===3?165:140),life:4,color:stage===3?'#ff9d32':stage===2?'#b5f64b':stage?'#67dcff':'#d968ff'});});e.cool=2.8;}
        else if(e.type==='boss'||e.type==='knight'){effects.push({type:'enemyHit',x:e.aim.x,y:e.aim.y,r:e.type==='boss'?104:72,life:.4,max:.4});if(Math.hypot(player.x-e.aim.x,player.y-e.aim.y)<(e.type==='boss'?104:72))takeDamage(e.type==='boss'?34:24);e.cool=e.type==='boss'?1.25:1.9;if(stage===2&&e.type==='boss'){addPoisonPool(e.aim.x,e.aim.y);addPoisonPool(e.aim.x-75,e.aim.y+30);addPoisonPool(e.aim.x+75,e.aim.y-30);}if(stage===3&&e.type==='boss'){for(let i=-1;i<=1;i++)addEruption(e.aim.x+i*90,e.aim.y+i*25,1+(i+1)*.2);}shake=5;burst(e.aim.x,e.aim.y,'#d27245',30,190);}
        else{if(d<66)takeDamage(11);e.cool=1.3;effects.push({type:'enemyHit',x:e.x+dx*.5,y:e.y+dy*.5,r:23,life:.17,max:.17});}
      }continue;}
      const range=e.type==='mage'?215:e.type==='boss'?118:e.type==='knight'?84:40;
      if(e.motion)motionFor(e).play(e.motion,d>range||(e.type==='mage'&&d<135)?'walk':'idle');
      if(d>range){move(e,dx/d*e.speed*dt,dy/d*e.speed*dt);}else if(e.type==='mage'&&d<135){move(e,-dx/d*e.speed*.65*dt,-dy/d*e.speed*.65*dt);}
      if(d<range+20&&e.cool<=0){e.telegraph=e.type==='mage'?.85:e.type==='skeleton'?.42:.95;e.teleMax=e.telegraph;e.aim={x:player.x,y:player.y};if(e.motion)motionFor(e).play(e.motion,'attack',true);}
      for(const other of enemies){if(other===e||other.hp<=0)continue;const sep=dist(e,other),min=e.r+other.r-5;if(sep>0&&sep<min){move(e,(e.x-other.x)/sep*dt*28,(e.y-other.y)/sep*dt*28);}}
    }
    enemies=enemies.filter(e=>e.hp>0);
    for(const b of bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-player.x,b.y-(player.y-19))<22){takeDamage(16);if(stage===2)addPoisonPool(player.x,player.y);b.life=0;burst(b.x,b.y,b.color,16,80);}if(!inside(b.x,b.y+20))b.life=0;}
    bolts=bolts.filter(b=>b.life>0);
    for(const p of poisonPools){if(p.warn>0){p.warn=Math.max(0,p.warn-dt);continue;}p.life-=dt;if(p.life>0&&Math.hypot(player.x-p.x,(player.y-p.y)/.58)<p.r)takeDamage(6);}
    poisonPools=poisonPools.filter(p=>p.life>0);
    for(const p of eruptions){
      if(p.warn>0){p.warn=Math.max(0,p.warn-dt);if(p.warn>0)continue;}
      if(!p.fired){p.fired=true;if(Math.hypot(player.x-p.x,(player.y-p.y)/.58)<p.r)takeDamage(22);burst(p.x,p.y,'#ffac35',22,170);}
      p.life-=dt;
    }
    eruptions=eruptions.filter(p=>p.life>0);
    for(const d of drops){d.life-=dt;const distance=dist(d,player);if(distance<108){const speed=(130+(108-distance)*4)*dt;d.x+=(player.x-d.x)/(distance||1)*speed;d.y+=(player.y-d.y)/(distance||1)*speed;}if(distance<24){d.life=0;if(d.kind==='gold')gold+=d.amount;else crystals++;sound('coin');}}
    drops=drops.filter(d=>d.life>0);
    if(!enemies.length){if(!waveWait){waveWait=3.2;player.hp=Math.min(player.maxHp,player.hp+25);if(wave<5)toast('WAVE CLEAR  ·  体力回復');}waveWait-=dt;if(waveWait<=0){if(wave>=5){for(const d of drops){if(d.kind==='gold')gold+=d.amount;else crystals++;}drops=[];finish(true);}else spawnWave();}}
    updateHUD();
  }
  // One heart is 15 HP; only a purchased vessel increases the maximum.
  function updateHearts(){
    const el=$('hearts'),hp=clamp(player.hp,0,player.maxHp),stamp=hp+':'+player.maxHp;
    if(el.dataset.health===stamp)return;
    el.dataset.health=stamp;
    el.innerHTML=Array.from({length:Math.ceil(player.maxHp/15)},(_,i)=>{
      const fill=clamp((hp-i*15)/15,0,1)*100;
      return `<span class="heart" aria-hidden="true"><i style="width:${fill}%"></i></span>`;
    }).join('');
    el.setAttribute('aria-label',`体力 ハート${Math.round(hp/15*10)/10} / ${player.maxHp/15}個`);
    el.classList.toggle('critical',hp>0&&hp<=player.maxHp*.3);
  }
  function updateHUD(){
    $('touch-move').hidden=state!=='playing';
    $('location-title').textContent=stageNames[stage];$('location-subtitle').textContent=stageSubtitles[stage];
    updateHearts();$('potions').textContent=potionCount;$('gold').textContent=gold;$('crystals').textContent=crystals;$('keys').textContent=state==='victory'?'1':'0';$('wave-label').innerHTML='WAVE '+String(Math.max(1,wave)).padStart(2,'0')+' <em>/ 05</em>';$('enemy-count').textContent=state==='intro'?'聖堂に足を踏み入れよ':enemies.length?'残り '+enemies.length+' 体':'聖堂に静寂が戻る';
    $('combo').classList.toggle('visible',combo>=2);$('combo-num').textContent=combo;$('combo-fill').style.width=comboTime/3.5*100+'%';$('combo-rating').textContent=combo>=25?'止まらぬ剣舞':combo>=15?'鮮やかな連撃':combo>=8?'容赦なき一撃':'鋭い連撃';
    document.querySelectorAll('.skill').forEach(el=>{const name=el.dataset.action,c=cooldowns[name];el.querySelector('.cooldown').style.transform=`scaleY(${c/cooldownDuration(name)})`;const label=el.querySelector('.recharge-label');if(label)label.textContent=cooldownDuration(name)+'秒';const num=el.querySelector('.cd-number');if(num)num.textContent=c>.05?c.toFixed(1):'';});
  }

  function drawSprite(type,x,y,side,walk=0,alpha=1){
    const [sx,sy,sw,sh,height,anchor]=spriteFrames[type],width=Math.round(height*sw/sh),bob=Math.abs(Math.sin(walk))*1.8;
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.globalAlpha=alpha;ellipse(0,1,type==='boss'?30:17,type==='boss'?10:5,'#02070b8a');ctx.scale(side,1);
    if(type==='hero'&&player.attack>0){ctx.translate(4,-1);ctx.rotate(Math.sin(player.attack/.24*Math.PI)*.1);}
    else if(walk)ctx.rotate(Math.sin(walk)*.018);
    ctx.drawImage(sprites,sx,sy,sw,sh,Math.round(-width*anchor),Math.round(-height-bob),width,height);ctx.restore();
  }
  function sword(x,y,a,length=34){ctx.save();ctx.translate(x,y);ctx.rotate(a);poly([[0,-3],[length,-2],[length+9,0],[length,3],[0,3]],'#090d17');poly([[2,-2],[length,-1],[length+7,0],[length,1],[2,1]],'#d4e3e9');line(4,-2,length,0,'#f4f5e4',1);rect(-2,-7,3,14,'#bc9d54');rect(-10,-2,8,4,'#3a2b25');rect(-11,-3,3,5,'#d2b378');ctx.restore();}
  function hero(x,y,angle,walk=0,alpha=1,scale=2.1,portrait=false,frame=null){
    if(!portrait&&HeroMotion.draw(ctx,frame===null?HeroMotion.frame(player.motion):frame,x,y,Math.cos(angle)<0?-1:1,alpha))return;
    if(!portrait&&sprites.complete&&sprites.naturalWidth){drawSprite('hero',x,y,Math.cos(angle)<0?-1:1,walk,alpha);return;}
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.globalAlpha=alpha;
    const side=Math.cos(angle)<0?-1:1,step=Math.sin(walk)*2,bob=Math.abs(Math.cos(walk))*.5;
    if(!portrait)ellipse(0,0,12,4,'#03090ca0');ctx.scale(side,1);ctx.translate(0,-bob);
    poly([[-3,-26],[-12,-23],[-18,-17+step],[-30,-16+step],[-21,-10],[-13,-9],[-7,-16],[1,-19]],'#220d20','#0b1119');poly([[-5,-25],[-12,-21],[-19,-17+step],[-26,-17+step],[-19,-13],[-11,-12],[-5,-19]],'#8f263f');poly([[-6,-22],[-15,-16],[-23,-15],[-15,-12],[-7,-15]],'#bb3648');line(-20,-17,-27,-18,'#f35552');
    poly([[-8,-14],[0,-12],[3,-6],[-4,1+step],[-10,1+step],[-9,-2+step],[-4,-7]],'#0a0d16');poly([[-1,-14],[7,-13],[8,-6],[14,-1-step],[13,2-step],[7,2-step],[1,-4]],'#0b0e18');rect(-8,-4+step,4,4,'#42485b');rect(8,-3-step,4,3,'#515269');rect(-11,1+step,8,2,'#14121a');rect(7,2-step,8,2,'#131119');
    poly([[-6,-27],[3,-28],[9,-21],[7,-12],[-1,-10],[-9,-15],[-10,-22]],'#101322');poly([[-5,-25],[3,-26],[7,-21],[4,-16],[-4,-16],[-7,-21]],'#343b55');rect(-5,-24,6,3,'#6b7491');rect(3,-24,3,6,'#53516d');rect(-6,-16,13,3,'#222533');rect(-3,-16,4,3,'#b39a59');rect(-1,-15,2,1,'#efd796');
    poly([[-9,-24],[-5,-23],[-7,-17],[-12,-14],[-15,-17],[-12,-22]],'#111826');rect(-13,-21,5,3,'#56647a');rect(-13,-17,3,3,'#b6a4a0');
    poly([[4,-24],[8,-25],[13,-19],[17,-18],[16,-14],[10,-15],[5,-19]],'#151a2b');rect(7,-23,4,4,'#66718a');rect(12,-18,5,3,'#d4b09b');
    rect(-6,-39,13,13,'#080e19');poly([[-7,-38],[-3,-42],[5,-41],[10,-35],[6,-27],[-4,-27],[-8,-32]],'#101627');rect(-4,-35,10,7,'#c79784');rect(3,-34,4,5,'#e1b8a0');rect(2,-32,2,2,'#191b2e');rect(5,-32,2,1,'#cde3ff');rect(-3,-37,11,3,'#111a2b');poly([[-7,-38],[-8,-32],[-2,-34],[-1,-30],[2,-36],[8,-35],[10,-38],[4,-42],[-2,-42]],'#172137');rect(-3,-41,5,2,'#3c455f');rect(-7,-37,12,2,'#8f2b40');rect(-3,-37,6,1,'#cd4659');rect(-4,-28,10,3,'#6e233a');rect(1,-27,7,2,'#c0494d');
    if(!portrait)sword(16,-16,side===1?angle:Math.PI-angle,23);ctx.restore();
  }
  function skeleton(e){
    ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.scale(1.8,1.8);const side=player.x<e.x?-1:1;const step=Math.sin(e.walk)*2;ellipse(0,0,12,4,'#030a0b90');ctx.scale(side,1);
    line(-4,-13,-7,-7,'#171920',5);line(-7,-7,-10,step,'#1a1c20',5);line(-4,-13,-7,-7,'#b1afa0',2);line(-7,-7,-10,step,'#aaa899',2);rect(-12,step,6,2,'#b5afa0');line(3,-13,7,-8,'#171920',5);line(7,-8,10,-step,'#171920',5);line(3,-13,7,-8,'#b2ad9e',2);line(7,-8,10,-step,'#9c9b91',2);rect(8,-step,5,2,'#b8b3a4');
    poly([[-7,-28],[5,-28],[8,-22],[4,-14],[-5,-13],[-9,-22]],'#10171b');line(-1,-26,-1,-13,'#beb8a2',2);for(let j=0;j<4;j++){line(-7+j*.4,-25+j*3,-2,-23+j*3,'#c3baa7',2);line(1,-23+j*3,6-j*.4,-25+j*3,'#9b9d94',2);}rect(-6,-15,11,3,'#7c786d');rect(-4,-14,7,2,'#d5c8ac');
    line(-8,-25,-13,-19,'#101518',5);line(-13,-19,-10,-14,'#101518',5);line(-8,-25,-13,-19,'#b2ad97',2);line(-13,-19,-10,-14,'#c1b49c',2);ellipse(-11,-18,5,7,'#191c1a');ellipse(-11,-18,4,6,'#615346');line(-11,-23,-11,-13,'#9b8c6a',1);rect(-12,-19,3,2,'#b5a276');line(6,-25,12,-20,'#14181e',5);line(12,-20,15,-13,'#171a1c',5);line(6,-25,12,-20,'#bab39f',2);line(12,-20,15,-13,'#bcb4a0',2);
    poly([[-7,-40],[3,-41],[7,-37],[6,-30],[3,-27],[-4,-28],[-7,-33]],'#11161b');poly([[-5,-39],[2,-39],[5,-36],[4,-31],[2,-29],[-3,-30],[-5,-33]],'#c4c1b4');rect(-3,-38,5,3,'#dfd8c3');rect(-5,-34,3,3,'#151b23');rect(1,-34,3,3,'#151b23');rect(-1,-31,2,2,'#3d3c39');rect(-3,-29,6,2,'#989b8c');rect(-2,-29,1,2,'#343b3a');rect(1,-29,1,2,'#343b3a');
    sword(15,-13,e.telegraph>0?-1.4:.65,20);if(e.flash>0){ctx.globalCompositeOperation='source-atop';}ctx.restore();
  }
  function mage(e){
    ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.scale(2,2);ellipse(0,0,13,4,'#05080b9c');const sway=Math.sin(e.walk)*1.3;
    poly([[-4,-29],[6,-29],[9,-19],[9+sway,-8],[14,1],[2,-1],[-3,1],[-13,0],[-8,-13],[-9,-22]],'#0a0f1a');poly([[-4,-25],[2,-28],[6,-18],[5,-7],[10,-1],[3,-2],[-2,-1],[-9,-2],[-5,-15]],'#352238');poly([[2,-23],[6,-16],[5,-7],[8,-2],[4,-3],[1,-15]],'#5b2c50');poly([[-5,-22],[-1,-24],[-3,-4],[-7,-1],[-7,-8]],'#1a2631');rect(-6,-19,12,2,'#ad8b54');rect(0,-19,2,3,'#ded29c');
    poly([[-8,-26],[-13,-20],[-14,-11],[-10,-11],[-7,-19]],'#33273f');rect(-15,-13,4,3,'#bf9c95');poly([[6,-26],[11,-23],[13,-17],[10,-15],[6,-21]],'#40213b');rect(11,-18,4,3,'#b9908d');
    poly([[-8,-33],[-5,-40],[0,-44],[7,-36],[8,-27],[2,-24],[-6,-27]],'#151023');poly([[-5,-33],[-1,-39],[4,-34],[5,-28],[1,-27],[-4,-29]],'#090c18');line(-6,-34,-2,-40,'#745276',2);line(1,-40,6,-33,'#a2618b',2);rect(-2,-34,5,6,'#b29ea5');rect(-2,-33,2,2,'#30233d');rect(2,-33,2,2,'#3a2042');rect(0,-30,2,3,'#dcc3c1');
    line(-16,1,-17,-36,'#17131c',4);line(-16,0,-17,-36,'#85524b',2);poly([[-17,-43],[-22,-36],[-18,-30],[-13,-34],[-13,-39]],'#281735','#b37c94');rect(-19,-39,4,6,'#af56d3');rect(-18,-38,2,3,'#edb6fc');ctx.restore();glow(e.x-34,e.y-75,16+Math.sin(time*6)*3,'#ad41d34f');
  }
  function knight(e){
    ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));const s=e.type==='boss'?3.05:2.3;ctx.scale(s,s);const step=Math.sin(e.walk)*1.2;ellipse(0,0,16,4,'#00080ba0');
    poly([[-9,-28],[9,-28],[12,-2],[4,-4],[-3,-2],[-11,-5]],'#46202a');line(-6,-24,-7,-6,'#942d37',2);
    poly([[-9,-17],[-2,-17],[-2,-9],[-5,0+step],[-12,0+step],[-11,-4],[-10,-11]],'#171c21','#0b1014');poly([[2,-17],[9,-17],[10,-10],[13,-2-step],[12,1-step],[5,1-step],[4,-8]],'#252b2c','#0b1014');rect(-10,-12,7,4,'#73756a');rect(3,-11,7,4,'#71766e');rect(-11,-3+step,6,3,'#6d736b');rect(6,-2-step,6,3,'#888777');
    poly([[-12,-35],[0,-39],[12,-33],[10,-20],[4,-14],[-7,-17],[-12,-27]],'#131a1e','#080b10');poly([[-9,-33],[0,-36],[9,-32],[7,-21],[0,-17],[-7,-21]],'#4a5352');poly([[0,-35],[5,-31],[4,-23],[0,-20],[-2,-28]],'#7d8170');line(-7,-24,0,-21,'#baab80',2);line(0,-21,7,-25,'#ada07f',2);rect(-8,-19,16,3,'#29282a');rect(-2,-19,4,3,'#c0a265');
    poly([[-13,-37],[-18,-30],[-14,-26],[-8,-28],[-7,-34]],'#424b4d','#12191c');poly([[-17,-32],[-20,-41],[-14,-37],[-11,-34]],'#b1afa0','#1b2227');line(-15,-32,-10,-31,'#a69f7d',2);poly([[8,-35],[15,-37],[20,-30],[14,-26],[8,-28]],'#545b54','#13191e');poly([[14,-36],[17,-42],[18,-35]],'#b9b2a0','#242b2e');
    poly([[-9,-46],[-5,-52],[4,-53],[10,-44],[7,-33],[0,-29],[-7,-34]],'#141b20');poly([[-6,-45],[-3,-49],[3,-50],[6,-43],[4,-35],[0,-32],[-4,-36]],'#6e776e');poly([[0,-51],[2,-47],[2,-33],[-1,-35],[-2,-45]],'#b6b6a0');rect(-5,-42,11,3,'#080f16');rect(-4,-41,3,1,'#e68b68');rect(3,-41,2,1,'#e68b68');line(-6,-46,-10,-56,'#939687',2);line(6,-47,10,-58,'#b9b5a1',2);
    line(-14,-27,-17,-14,'#262c2c',6);rect(-18,-19,5,6,'#9a967c');sword(-17,-14,1.95,32);
    poly([[10,-28],[24,-30],[26,-24],[24,-9],[18,-2],[11,-10]],'#131b20','#beb08a');poly([[13,-25],[22,-26],[22,-12],[18,-6],[14,-11]],'#424845');line(18,-23,18,-10,'#aaa38b',2);line(14,-18,22,-18,'#aaa38b',2);rect(16,-19,4,4,'#d1b678');ctx.restore();
  }
  function enemyDraw(e){ctx.save();if(stage&&e.type!=='boss')ctx.filter=stage===3?(e.type==='mage'?'sepia(1) saturate(4) hue-rotate(-35deg)':'sepia(1) saturate(3) hue-rotate(-20deg)'):stage===2?(e.type==='mage'?'hue-rotate(170deg) saturate(1.1)':'sepia(.6) hue-rotate(35deg)'):e.type==='mage'?'hue-rotate(-65deg) saturate(0.9)':'sepia(0.45) saturate(1.35)';if(e.born>0)ctx.globalAlpha=1-e.born/.8;if(e.motion&&motionFor(e).ready())motionFor(e).draw(ctx,motionFor(e).frame(e.motion),e.x,e.y,e.facing,e.born>0?1-e.born/.8:1,EnemyMotion.sizeFor(e.type));else if(sprites.complete&&sprites.naturalWidth)drawSprite(e.type,e.x,e.y,player.x<e.x?-1:1,e.walk,e.born>0?1-e.born/.8:1);else if(e.type==='mage')mage(e);else if(e.type==='knight'||e.type==='boss')knight(e);else skeleton(e);if(e.flash>0)glow(e.x,e.y-35,35,'#ffedb76b');ctx.restore();const w=e.type==='boss'?94:e.type==='knight'?61:44,y=e.y-(e.type==='boss'?186:e.type==='knight'?144:e.type==='mage'?122:99);rect(e.x-w/2-2,y-2,w+4,9,'#0b1114');rect(e.x-w/2-1,y-1,w+2,7,'#9b8e7066');rect(e.x-w/2,y,w,5,'#201b22');rect(e.x-w/2,y,Math.max(0,w*e.hp/e.maxHp),5,e.type==='boss'?'#d7623d':'#b82f3f');rect(e.x-w/2,y,Math.max(0,w*e.hp/e.maxHp),1,'#f47768');if(e.type==='boss'){ctx.font='10px Georgia';ctx.textAlign='center';ctx.fillStyle='#e3c18c';ctx.fillText(bossNames[stage],e.x,y-9);}}
  // Background-only flow regions, traced around water and falling sand.
  const sandStreams=[[[359,2],[383,2],[469,140],[445,139]],[[154,566],[209,563],[366,678],[340,699]]];
  const mireWaters=[[[265,349],[300,354],[316,374],[276,368]],[[338,553],[395,564],[421,589],[354,578]],[[967,221],[1003,219],[1015,241],[979,244]],[[1018,474],[1043,475],[1047,505],[1027,512]]];
  function flowPatch(image,points,dx,dy,speed,strength){
    ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
    for(let pass=0;pass<2;pass++){
      const phase=(time*speed+pass*.5)%1;
      ctx.globalAlpha=strength*Math.sin(phase*Math.PI)**2;
      ctx.drawImage(image,dx*phase,dy*phase,W,H);
    }
    ctx.restore();
  }
  function drawSandFlow(){
    if(!necropolisImage.complete||!necropolisImage.naturalWidth)return;
    sandStreams.forEach((p,i)=>flowPatch(necropolisImage,p,i?18:8,i?13:20,.32,.7));
    ctx.save();
    // Falling grains follow the same two slopes, with staggered lifetimes.
    for(let i=0;i<64;i++){
      const lower=i>=28,p=(time*(lower?.22:.3)+i*.618)%1,u=(i*.381)%1;
      const x=lower?159+u*45+p*182:363+u*18+p*88,y=lower?569+p*(116-u*19):6+p*133;
      ctx.globalAlpha=Math.sin(p*Math.PI)*.48;rect(x,y,1,lower?1:2,i%3?'#f8d083':'#ffe3a6');
    }
    for(let i=0;i<18;i++){
      const p=(time*.06+i*.618)%1,x=130+p*300,y=540+i%5*30+Math.sin(p*5+i)*8;
      if(inside(x,y))continue;ctx.globalAlpha=Math.sin(p*Math.PI)*.2;rect(x,y,2,1,'#e8c17f');
    }
    ctx.restore();
  }
  function drawMireFlow(){
    if(!mireImage.complete||!mireImage.naturalWidth)return;
    mireWaters.forEach((p,i)=>flowPatch(mireImage,p,10,i%2?3:-2,.17,.55));
    ctx.save();
    // Small bubbles swell and break on exposed water, away from bridges.
    for(let i=0;i<16;i++){
      const p=(time*(.13+i%3*.025)+i*.618)%1,region=mireWaters[i%4];
      const x=(region[0][0]+region[2][0])/2+Math.sin(i*7)*8,y=(region[0][1]+region[2][1])/2+Math.cos(i*3)*5;
      ctx.globalAlpha=Math.sin(p*Math.PI)*.45;ctx.strokeStyle='#b7d86b';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x+p*5,y,1+p*5,.7+p*2.3,0,0,TAU);ctx.stroke();
      if(p<.7)ellipse(x+p*5-1,y-1,1,1,'#d5e994');
    }
    // Slime trickles from the carved drain on the left wall.
    for(let i=0;i<9;i++){
      const p=(time*.45+i*.618)%1;ctx.globalAlpha=Math.sin(p*Math.PI)*.55;rect(201+i%3*3,285+p*38,2,3,'#b6e84a');
    }
    ctx.restore();
  }
  let forgeFlow=null;
  function drawForgeFlow(){
    if(!forgeImage.complete||!forgeImage.naturalWidth)return;
    // Cache a half-resolution mask once; stone, chains and the arena stay still.
    if(!forgeFlow){
      const mask=document.createElement('canvas'),layer=document.createElement('canvas');
      mask.width=layer.width=640;mask.height=layer.height=360;
      const m=mask.getContext('2d'),c=layer.getContext('2d');
      m.drawImage(forgeImage,0,0,640,360);
      try{
      const pixels=m.getImageData(0,0,640,360),d=pixels.data;
      for(let y=0;y<360;y++)for(let x=0;x<640;x++){
        const i=(y*640+x)*4,r=d[i],g=d[i+1],b=d[i+2];
        d[i+3]=inside(x*2,y*2)?0:Math.round(clamp((r-145)/65,0,1)*clamp((g-45)/65,0,1)*clamp((r-b-65)/75,0,1)*255);
        d[i]=255;d[i+1]=255;d[i+2]=255;
      }
      m.putImageData(pixels,0,0);
      }catch{
        // Local file URLs can block pixel reads. Recreate an untainted mask.
        mask.width=640;m.fillStyle='#fff';
        for(const points of [[[156,50],[174,58],[171,89],[155,94]],[[115,282],[151,302],[151,325],[117,306]]]){
          m.beginPath();points.forEach(([x,y],i)=>i?m.lineTo(x,y):m.moveTo(x,y));m.closePath();m.fill();
        }
      }
      forgeFlow={mask,layer,c};
    }
    const {mask,layer,c}=forgeFlow,t=time;
    c.clearRect(0,0,640,360);c.globalCompositeOperation='source-over';
    // Quiet local glow in pools; no uniform stripes across the environment.
    for(const [i,x,y,r] of [[0,161,99,25],[1,550,219,48],[2,397,341,62],[3,546,69,49]]){
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,`rgba(255,175,55,${.035+.025*Math.sin(t*.8+i*2)})`);g.addColorStop(1,'transparent');
      c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    // Advect the painted lava downward. Two staggered passes fade out before
    // their sampling offset resets, keeping the loop seam invisible.
    const sx=forgeImage.naturalWidth/640,sy=forgeImage.naturalHeight/360;
    for(const points of [[[156,51],[174,58],[172,91],[155,96]],[[113,280],[200,326],[200,345],[113,307]]]){
      c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
      const x=Math.min(...points.map(p=>p[0])),right=Math.max(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1])),bottom=Math.max(...points.map(p=>p[1]));
      for(let pass=0;pass<2;pass++){
        const phase=(t*.32+pass*.5)%1,weight=Math.sin(phase*Math.PI)**2;
        for(let px=x;px<right;px+=2){
          const u=(px-x)/(right-x),a=points[0][1]+(points[1][1]-points[0][1])*u+2,b=points[3][1]+(points[2][1]-points[3][1])*u-2,span=b-a;
          if(span<4)continue;
          for(let y=Math.ceil(a);y<b;y+=2){
            const sampleY=a+(((y-a-phase*22)%span)+span)%span;
            const edge=Math.min(1,(y-a)/3,(b-y)/3,(px-x+1)/3,(right-px)/3);
            c.globalAlpha=.92*weight*Math.max(0,edge);
            c.drawImage(forgeImage,px*sx,sampleY*sy,2*sx,Math.min(2,b-sampleY)*sy,px,y,2,2);
          }
        }
      }c.restore();
    }
    c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(layer,0,0,W,H);
    // Deterministic embers rise from the lava rather than the combat floor.
    for(let i=0;i<22;i++){
      const cycle=(t*(.15+i%4*.025)+i*.618)%1;
      const sources=[[320,238],[250,592],[710,689],[1122,486],[1100,153]];
      const [sx,sy]=sources[i%5],x=sx+Math.sin(i*8.1)*75+Math.sin(t+i)*8,y=sy-cycle*(55+i%5*12);
      if(inside(x,y))continue;
      ctx.globalAlpha=Math.sin(cycle*Math.PI)*.4;rect(x,y,2,i%3===0?3:2,i%2?'#ffb348':'#ffe5a0');
    }
    ctx.restore();
  }
  function renderBackground(){
    const image=[globalBackground,necropolisImage,mireImage,forgeImage][stage];
    ctx.fillStyle='#0d1b21';ctx.fillRect(0,0,W,H);
    if(image.complete&&image.naturalWidth){ctx.drawImage(image,0,0,W,H);ctx.fillStyle=stage===3?'#20080018':stage===2?'#14250812':stage?'#23160612':'#07141a26';ctx.fillRect(0,0,W,H);}else{for(let y=0;y<H;y+=28)for(let x=0;x<W;x+=49){const n=Math.sin(x*9+y*7)*.5+.5;rect(x+(y%56?24:0),y,47,26,inside(x,y)?`rgb(${42+n*19},${48+n*19},${48+n*17})`:'#101e22');}poly(arenaForStage(),'#7b746711','#aaa17d22');}
    if(stage===1)drawSandFlow();
    if(stage===2)drawMireFlow();
    if(stage===3)drawForgeFlow();
    for(const t of (stage===3?[[445,107],[830,39],[949,165],[167,422],[575,590]]:stage===2?[[369,123],[663,636],[285,451]]:stage?[[316,288],[543,127],[989,74],[735,619]]:torches)){const f=1+Math.sin(time*9+t[0])*.1;glow(t[0],t[1],66*f,'#ee92361a');glow(t[0],t[1]-4,25*f,'#ffae4426');for(let j=0;j<4;j++){const phase=(time*(.5+j*.14)+j*.24)%1;rect(t[0]+Math.sin(time+j*2)*7,t[1]-phase*42,2,3,`rgba(255,${140+j*20},50,${1-phase})`);}}
    for(const s of stains){ellipse(s.x,s.y,22,9,'#461d2490');for(let j=0;j<7;j++){const a=s.seed+j*3;rect(s.x+Math.sin(a)*27,s.y+Math.cos(a)*15,3+j%4,2+j%2,'#71253088');}if(s.type==='skeleton'){line(s.x-8,s.y-3,s.x+4,s.y+3,'#aaa7986a',3);rect(s.x+7,s.y-2,6,5,'#b7b0a064');}}
  }
  function drawEffect(f){const p=1-f.life/f.max;ctx.save();ctx.globalAlpha=Math.min(1,f.life*6);
    if(f.type==='slash'||f.type==='whirl'){
      ctx.translate(f.x,f.y);ctx.scale(1,.7);const isWhirl=f.type==='whirl',r=f.r*(.68+p*.38),angle=isWhirl?p*TAU*1.5:f.a-1.55+p*2.6;
      ctx.shadowColor='#328aff';ctx.shadowBlur=22;ctx.strokeStyle='#398bffaa';ctx.lineWidth=isWhirl?15:17;ctx.beginPath();ctx.arc(0,0,r,angle-1.9,angle+.3);ctx.stroke();ctx.shadowBlur=8;ctx.strokeStyle='#c5f2ff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,r,angle-1.4,angle+.3);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r+4,angle-.8,angle+.3);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#6987ee80';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r-18,angle-1.5,angle+.4);ctx.stroke();
    }else if(f.type==='nova'){
      const r=f.r*(.2+p*.8);ctx.translate(f.x,f.y);ctx.scale(1,.68);ctx.shadowColor=f.color;ctx.shadowBlur=20;ctx.strokeStyle=f.color;ctx.lineWidth=5*(1-p)+1;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r-14,0,TAU);ctx.stroke();for(let i=0;i<12;i++){const a=i/12*TAU;line(Math.cos(a)*(r-17),Math.sin(a)*(r-17),Math.cos(a)*(r+7),Math.sin(a)*(r+7),f.color,2);}
    }else{ellipse(f.x,f.y,f.r*(.4+p),f.r*.48*(.4+p),'#ba393648');ctx.strokeStyle='#f7795c';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(f.x,f.y,f.r*(.4+p),f.r*.48*(.4+p),0,0,TAU);ctx.stroke();}ctx.restore();
  }
  function render(){
    if(state==='shop'){renderShop();return;}
    ctx.save();ctx.clearRect(0,0,W,H);ctx.translate(shake?rnd(-shake,shake):0,shake?rnd(-shake,shake)*.5:0);ctx.imageSmoothingEnabled=false;renderBackground();
    for(const p of eruptions){ellipse(p.x,p.y,p.r,p.r*.58,p.fired?'#ff9a2588':'#ff6a252a');ctx.strokeStyle='#ffcf81';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r,p.r*.58,0,0,TAU);ctx.stroke();if(p.fired){glow(p.x,p.y-25,65,'#ff772277');for(let i=0;i<7;i++){const x=p.x+(i-3)*10;const h=32+(i%3)*13+Math.sin(time*22+i*3)*9;rect(x-7,p.y-h,14,h,'#ed481cbb');rect(x-4,p.y-h+10,8,h-10,'#ff9a29');rect(x-2,p.y-h+24,4,Math.max(4,h-24),'#ffe2a1');rect(x+Math.sin(time*9+i)*6,p.y-h-10,3,5,'#ffb63b');}}else{ctx.fillStyle='#ffe4ad';ctx.font='bold 18px Georgia';ctx.textAlign='center';ctx.fillText('!',p.x,p.y+5);}}
    for(const p of poisonPools){const active=p.warn<=0;ellipse(p.x,p.y,p.r,p.r*.58,active?'#7aa62166':'#a5e14316');ctx.strokeStyle=active?'#b7ed5488':'#cff27ea0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r,p.r*.58,0,0,TAU);ctx.stroke();if(active){for(let i=0;i<6;i++){const a=time+i*1.7;ellipse(p.x+Math.sin(a)*p.r*.65,p.y+Math.cos(a)*p.r*.3,2,2,'#d0ff7b');}}}
    for(const e of enemies){
      if(e.type==='mage'||e.type==='boss'){ctx.strokeStyle=e.type==='boss'?'#e24c4b66':'#d2465466';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y,36*(e.type==='boss'?1.9:1),17*(e.type==='boss'?1.9:1),0,0,TAU);ctx.stroke();}
      if(e.telegraph>0){const r=e.type==='boss'?104:e.type==='knight'?72:e.type==='mage'?30:27,x=e.type==='boss'||e.type==='knight'?e.aim.x:e.x,y=e.type==='boss'||e.type==='knight'?e.aim.y:e.y;ellipse(x,y,r,r*.58,'#ed3b3b28');ctx.strokeStyle='#fb5c5caa';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r,r*.58,0,0,TAU);ctx.stroke();const p=1-e.telegraph/e.teleMax;ellipse(x,y,r*p,r*.58*p,'#f63c3c35');}
    }
    for(const d of drops){
      const bob=Math.sin(time*3.4+d.phase)*3, pulse=1+Math.sin(time*5+d.phase)*.08;
      ctx.save();ctx.translate(d.x,d.y+bob);ctx.globalCompositeOperation='lighter';
      glow(0,-7,d.kind==='gold'?24:27,d.kind==='gold'?'#ff9f241f':'#a94dff2b');
      ctx.globalCompositeOperation='source-over';
      ellipse(0,5,10,3.5,'#02070acc');
      if(d.kind==='gold'){
        // A thick, tilted coin with a dark edge, two metallic faces, and an embossed star.
        ctx.rotate(-.2+Math.sin(time*2+d.phase)*.06);ctx.scale(pulse,1);
        ctx.fillStyle='#6b350d';ctx.beginPath();ctx.ellipse(0,-7,9,11,0,0,TAU);ctx.fill();
        ctx.strokeStyle='#ffcf57';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-8,8,10,0,0,TAU);ctx.stroke();
        ctx.fillStyle='#f5b52f';ctx.beginPath();ctx.ellipse(-1,-9,6.5,8.2,0,0,TAU);ctx.fill();
        ctx.strokeStyle='#ffe89a';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(-1,-9,5,6.7,0,0,TAU);ctx.stroke();
        poly([[-1,-14],[.5,-11], [4,-10],[1.4,-7], [2,-3],[-1,-5],[-4,-3],[-3.5,-7],[-6,-10],[-2,-11]],'#ffe18a','#9b5c13');
        line(-1,-14,-1,-5,'#fff0b0',.8);
      }else{
        // Faceted purple shard: three faces and a bright core make it read at phone size.
        ctx.scale(pulse,pulse);ctx.shadowColor='#b45cff';ctx.shadowBlur=10;
        poly([[0,-22],[10,-10],[6,5],[0,11],[-7,5],[-10,-10]],'#5d259d','#dca1ff');
        poly([[0,-22],[2,-9],[0,8],[-7,5],[-10,-10]],'#b451e5','#f3c6ff');
        poly([[0,-22],[10,-10],[6,5],[0,8],[2,-9]],'#7d36c5','#cc82ff');
        line(-2,-17,0,2,'#fff0ff',1.4);line(1,-16,5,-7,'#f1b7ff',1);
        ctx.shadowBlur=0;
      }
      ctx.restore();
    }
    drawAttackDirection();
    for(const g of ghosts)hero(g.x,g.y,g.angle,g.walk,g.life*.85,2.1,false,g.frame);
    const actors=[...corpses.map(c=>({y:c.y,draw:()=>motionFor(c).draw(ctx,motionFor(c).frame(c.motion),c.x,c.y,c.facing,Math.min(1,c.life/.5),EnemyMotion.sizeFor(c.type))})),...enemies.map(e=>({y:e.y,draw:()=>enemyDraw(e)})),{y:player.y,draw:()=>hero(player.x,player.y,player.facing<0?Math.PI:0,player.moving?player.walk:0,player.invuln>0&&Math.sin(time*45)>0?.5:1)}];actors.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    for(const b of bolts){glow(b.x,b.y,25,stage===3?'#ff791f99':stage===2?'#9bdd277a':stage?'#42caff7a':'#cb44ff7a');ctx.shadowColor=stage===3?'#ff9327':stage===2?'#b7ff40':stage?'#55d8ff':'#d249ff';ctx.shadowBlur=12;ctx.strokeStyle=stage===3?'#ffe5a0':stage===2?'#edff95':stage?'#c9faff':'#f3c7ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,7,0,TAU);ctx.stroke();ctx.shadowBlur=0;rect(b.x-2,b.y-2,4,4,'#fff');line(b.x-b.vx*.1,b.y-b.vy*.1,b.x,b.y,stage===3?'#ff752599':stage===2?'#9bf03599':stage?'#69deff99':'#b162ec99',2);}
    effects.forEach(drawEffect);
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(p.x,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
    for(const n of floating){ctx.globalAlpha=Math.min(1,n.life*3);ctx.font=`bold ${n.big?26:20}px Georgia`;ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#0b1218';ctx.strokeText(n.text,n.x,n.y);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x,n.y);}ctx.globalAlpha=1;
    for(let i=0;i<22;i++){const x=(i*173.3+Math.sin(time*.2+i)*19)%W,y=(i*81.7-time*(3+i%4)+H*10)%H;rect(x,y,i%3===0?2:1,1,'#d2c19732');}
    if(state==='intro'){ctx.fillStyle='#04111733';ctx.fillRect(0,0,W,H);}if(player.hp<player.maxHp*.3&&state==='playing'){const g=ctx.createRadialGradient(W/2,H/2,200,W/2,H/2,700);g.addColorStop(0,'transparent');g.addColorStop(1,'#900d244f');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}ctx.restore();drawMini();
  }
  function drawMini(){
    mini.clearRect(0,0,164,116);mini.fillStyle='#091113eb';mini.fillRect(0,0,164,116);mini.save();mini.translate(-8,-3);mini.scale(.138,.17);mini.beginPath();arenaForStage().forEach((p,i)=>i?mini.lineTo(...p):mini.moveTo(...p));mini.closePath();mini.fillStyle='#4d5350';mini.fill();mini.strokeStyle='#919183';mini.lineWidth=9;mini.stroke();mini.strokeStyle='#69716b55';mini.lineWidth=3;for(let i=380;i<1030;i+=70){mini.beginPath();mini.moveTo(i,250);mini.lineTo(i,530);mini.stroke();}for(const e of enemies){mini.fillStyle=e.type==='boss'?'#ffb24a':'#e35051';mini.fillRect(e.x-10,e.y-8,20,16);}mini.fillStyle='#d9f6fa';mini.fillRect(player.x-10,player.y-9,20,18);mini.fillStyle='#87d4ed';mini.fillRect(player.x-5,player.y-5,10,10);mini.restore();mini.strokeStyle='#d1b16a';mini.lineWidth=1;mini.beginPath();mini.moveTo(82,9);mini.lineTo(82,17);mini.moveTo(78,13);mini.lineTo(86,13);mini.stroke();
  }
  function tick(now){const dt=Math.min((now-previous)/1000||0,.035);previous=now;time+=dt;
    if(state==='playing'){if(hitstop>0)hitstop-=dt;else update(dt);}if(state==='shop')HeroMotion.advance(player.motion,dt);if(state==='intro'){player.walk=0;HeroMotion.advance(player.motion,dt);for(const e of enemies){e.walk+=dt*1.5;if(e.motion)motionFor(e).advance(e.motion,dt);}}
    if(state!=='paused'){
      for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*110;p.vx*=Math.exp(-dt*3);p.life-=dt;}particles=particles.filter(p=>p.life>0);
      for(const n of floating){n.y-=dt*33;n.life-=dt;}floating=floating.filter(n=>n.life>0);
      for(const f of effects)f.life-=dt;effects=effects.filter(f=>f.life>0);for(const g of ghosts)g.life-=dt;ghosts=ghosts.filter(g=>g.life>0);shake*=Math.exp(-dt*17);if(shake<.2)shake=0;
      if(bannerTime>0){bannerTime-=dt;if(bannerTime<=0)$('wave-banner').classList.remove('visible');}if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
    }render();requestAnimationFrame(tick);
  }
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;mouse.down=true;if(state==='playing')action('attack');});
  window.addEventListener('pointerup',()=>mouse.down=false);window.addEventListener('pointercancel',()=>mouse.down=false);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(state==='shop'){if(k==='enter'&&!e.repeat&&!e.target?.closest?.('button')){e.preventDefault();leaveShop();}return;}if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='escape'){if(!e.repeat)togglePause();return;}if(k==='enter'&&(state==='intro'||state==='dead'||state==='victory'||state==='shop')){activateStart();return;}keys.add(k);if(!e.repeat){if(k===' ')action('dash');if(k==='e')action('whirl');if(k==='r')action('nova');if(k==='q')action('heal');}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();mouse.down=false;clearTouch();if(state==='playing')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause();});
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',e=>{if((e.pointerType&&e.pointerType!=='mouse')||(e.detail!==0&&Date.now()<(b.touchClickUntil||0)))return;action(b.dataset.action);b.blur();}));
  const stickPad=$('touch-move');
  function dragStick(e){const b=stickPad.getBoundingClientRect();setStick(e.clientX-b.left-b.width/2,e.clientY-b.top-b.height/2,b.width*.34);}
  stickPad.addEventListener('pointerdown',e=>{if(state!=='playing'||stick.pointerId!==null||e.button>0)return;e.preventDefault();e.stopPropagation();stick.pointerId=e.pointerId;stickPad.setPointerCapture(e.pointerId);stickPad.classList.add('active');dragStick(e);});
  stickPad.addEventListener('pointermove',e=>{if(e.pointerId!==stick.pointerId)return;e.preventDefault();dragStick(e);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stickPad.addEventListener(name,e=>{if(e.pointerId===stick.pointerId)resetStick();});
  document.querySelectorAll('[data-action]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;e.preventDefault();b.touchClickUntil=Date.now()+800;if(state!=='playing')return;b.setPointerCapture(e.pointerId);if(b.dataset.action==='attack')attackPointers.add(e.pointerId);action(b.dataset.action);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>attackPointers.delete(e.pointerId));
  });
  window.addEventListener('resize',clearTouch);
  $('shop-items').innerHTML=shopGoods.map(g=>`<button id="buy-${g.id}" class="shop-item"><span class="item-icon ${g.currency==='crystals'?'violet':''}">${g.icon}</span><span class="item-copy"><b>${g.name}</b><small>${g.description}</small><em class="stock"></em></span><span class="item-price ${g.currency==='crystals'?'violet':''}">${g.currency==='gold'?'◈':'♦'} ${g.price}</span></button>`).join('');
  for(const c of ['equipment','runes','supplies'])$('category-'+c).addEventListener('click',()=>setShopCategory(c));
  for(const g of shopGoods)$('buy-'+g.id).addEventListener('click',()=>buyShopItem(g.id));
  $('shop-next').addEventListener('click',leaveShop);
  $('stage-four').addEventListener('click',()=>{start(3);$('stage-four').blur();});
  $('stage-three').addEventListener('click',()=>{start(2);$('stage-three').blur();});
  $('stage-two').addEventListener('click',()=>{start(1);$('stage-two').blur();});
  $('start').addEventListener('click',()=>{activateStart();$('start').blur();});$('pause').addEventListener('click',()=>{togglePause();$('pause').blur();});
  $('sound').addEventListener('click',()=>{muted=!muted;$('sound').querySelector('span').textContent=muted?'OFF':'ON';$('sound').setAttribute('aria-pressed',String(muted));if(muted&&audioContext)audioContext.suspend();else{if(audioContext)audioContext.resume();sound('coin');}$('sound').blur();});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').requestFullscreen();}catch{toast('この画面では全画面表示を利用できません');}$('fullscreen').blur();});
  reset();enemies=[enemy('skeleton',485,326),enemy('skeleton',803,476),enemy('mage',947,389),enemy('knight',786,267),enemy('skeleton',427,411)];enemies.forEach(e=>e.born=0);player.x=636;player.y=431;
  // Paint the portrait with the same hand-drawn pixel sprite as the player.
  const portraitCanvas=$('portrait'),portraitCtx=portraitCanvas.getContext('2d');
  const originalTransform=ctx.getTransform();ctx.save();ctx.clearRect(0,0,W,H);ctx.fillStyle='#111e2a';ctx.fillRect(0,0,76,76);hero(43,112,.1,0,1,2.7,true);portraitCtx.imageSmoothingEnabled=false;portraitCtx.drawImage(canvas,0,0,76,76,0,0,76,76);ctx.restore();ctx.setTransform(originalTransform);
  requestAnimationFrame(tick);
})();



