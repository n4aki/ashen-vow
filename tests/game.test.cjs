const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Run the actual game logic in a deterministic DOM/canvas adapter.
function loadGame(random) {
  const context2d = new Proxy({}, {get: (_, key) => key === 'getTransform' ? () => ({}) : key === 'createRadialGradient' ? () => ({addColorStop(){}}) : () => {}, set: () => true});
  function element() {
    const children = new Map(),events=new Map();
    return {style:{},dataset:{},textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn)},dispatch(name,e){for(const fn of events.get(name)||[])fn(e)},getBoundingClientRect(){return {left:0,top:0,width:136,height:136}},setPointerCapture(){},setAttribute(){},blur(){},getContext:()=>context2d,querySelector(s){if(!children.has(s))children.set(s,element());return children.get(s);}};
  }
  const elements = new Map();
  const document = {getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll:selector=>selector==='[data-action]'?['attack','dash','whirl','nova','heal'].map(action=>{const e=document.getElementById('test-'+action);e.dataset.action=action;return e}):[],addEventListener(){}};
  const sandbox = {document,window:{addEventListener(){}},Image:class {},requestAnimationFrame(){},Math:random?Object.assign(Object.create(Math),{random}):Math,console,matchMedia:()=>({matches:false})};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','hero-motion.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','skeleton-motion.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','enemy-motion.js'),'utf8'),sandbox);
  let source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
  const hook=`globalThis.gameTest = { start, action, update, takeDamage, togglePause, enemy, inside, canStand, arenaForStage, spawnWave, waveRoster, wavePositions, get formation(){return lastFormation}, move, render, hit, tick,
    setStick, resetStick, get stick(){return stick}, get attackPointers(){return attackPointers}, touchEvent(target,name,e){document.getElementById(target).dispatch(name,{button:0,pointerType:'touch',preventDefault(){},stopPropagation(){},...e})}, get player(){return player}, get enemies(){return enemies}, get state(){return state}, get wave(){return wave}, get stage(){return stage}, activateStart, addEruption, get eruptions(){return eruptions}, addPoisonPool, get poisonPools(){return poisonPools}, combatStats, cooldownDuration, get upgrades(){return upgrades}, get effects(){return effects}, buyShopItem, leaveShop, get shopStock(){return shopStock}, get guardCharges(){return guardCharges}, setWallet(g,c){gold=g;crystals=c}, get gold(){return gold}, get crystals(){return crystals}, motionFor, attackDirection, get mouse(){return mouse}, get cooldowns(){return cooldowns}, get potions(){return potionCount}, get kills(){return totalKills},
    setEnemies(v){enemies=v}, clear(){enemies=[]}, setCooldown(name,v){cooldowns[name]=v}, get keys(){return keys}, get ghosts(){return ghosts}, get corpses(){return corpses}, motion:HeroMotion, skeletonMotion:SkeletonMotion, enemyMotion:EnemyMotion, get bolts(){return bolts} };`;
  source=source.replace(/\n\}\)\(\);\s*$/, '\n'+hook+'\n})();');
  vm.runInContext(source,sandbox);
  return sandbox.gameTest;
}

test('stage boundaries match distinct floors and block long movement at every edge',()=>{
  const signatures=new Set();
  for(let stage=0;stage<4;stage++){
    const g=loadGame();g.start(stage);signatures.add(JSON.stringify(g.arenaForStage()));assert.ok(g.canStand(g.player.x,g.player.y));
    for(let i=0;i<32;i++){const a=i*Math.PI/16;g.player.x=660;g.player.y=413;g.move(g.player,Math.cos(a)*1800,Math.sin(a)*1800);assert.ok(g.canStand(g.player.x,g.player.y),`stage ${stage} angle ${i}`);}
    for(let wave=1;wave<=5;wave++){assert.ok(g.enemies.every(e=>g.canStand(e.x,e.y,13)));g.clear();if(wave<5)g.spawnWave();}
    assert.equal(g.inside(100,500),false);assert.equal(g.inside(1200,650),false);
  }
  assert.equal(signatures.size,4);const g=loadGame();g.start(0);assert.equal(g.inside(320,350),true);g.start(2);assert.equal(g.inside(320,350),false);
});
test('random waves vary counts, formations and positions while preserving safe spawns and final bosses',()=>{
  let seed=81281;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const g=loadGame(random),counts=new Set(),formations=new Set(),locations=new Set(),rosters=new Set();
  for(let s=0;s<4;s++)for(let run=0;run<12;run++){
    g.start(s);counts.add(g.enemies.length);locations.add(g.enemies.map(e=>`${Math.round(e.x)},${Math.round(e.y)}`).join(';'));rosters.add(g.enemies.map(e=>e.type).sort().join(','));
    let previous=-1;
    for(let w=1;w<=5;w++){
      assert.notEqual(g.formation,previous);previous=g.formation;formations.add(g.formation);
      assert.equal(g.enemies.filter(e=>e.type==='boss').length,w===5?1:0);
      assert.ok(g.enemies.length>=4&&g.enemies.length<=14);
      for(const e of g.enemies){assert.ok(g.canStand(e.x,e.y,18));assert.ok(Math.hypot(e.x-g.player.x,e.y-g.player.y)>=190);}
      for(let i=0;i<g.enemies.length;i++)for(let j=i+1;j<g.enemies.length;j++)assert.ok(Math.hypot(g.enemies[i].x-g.enemies[j].x,g.enemies[i].y-g.enemies[j].y)>=44);
      if(w<5){g.clear();const a=run*Math.PI/6;g.move(g.player,Math.cos(a)*1000,Math.sin(a)*1000);g.spawnWave();}
    }
  }
  assert.ok(counts.size>=4);assert.equal(formations.size,5);assert.ok(locations.size>30);assert.ok(rosters.size>6);
});
test('analog stick supports dead zone, proportional speed, diagonal movement and release',()=>{
  const g=loadGame();g.start();g.setEnemies([g.enemy('skeleton',950,400)]);
  const x=g.player.x,y=g.player.y;g.setStick(2,2,46);g.update(.1);assert.equal(g.player.x,x);assert.equal(g.player.y,y);
  g.setStick(23,0,46);g.update(.1);const slow=g.player.x-x;assert.ok(slow>0&&slow<16.6);assert.equal(g.player.angle,0);
  g.player.x=x;g.setStick(46,46,46);g.update(.1);assert.ok(Math.abs(Math.hypot(g.player.x-x,g.player.y-y)-16.6)<1e-8);assert.equal(g.player.angle,Math.PI/4);
  g.resetStick();const stopX=g.player.x,stopY=g.player.y;g.update(.1);assert.equal(g.player.x,stopX);assert.equal(g.player.y,stopY);assert.equal(g.player.angle,Math.PI/4);
});
test('stick capture isolates fingers, attack can be held while moving, and pause cancels touch',()=>{
  const g=loadGame();g.start();g.setEnemies([g.enemy('knight',950,400)]);
  g.touchEvent('touch-move','pointerdown',{pointerId:10,clientX:110,clientY:68});assert.equal(g.stick.pointerId,10);assert.ok(g.stick.x>0);
  g.touchEvent('touch-move','pointerdown',{pointerId:11,clientX:10,clientY:68});assert.equal(g.stick.pointerId,10);
  g.touchEvent('test-attack','pointerdown',{pointerId:20});assert.equal(g.attackPointers.size,1);g.update(.1);assert.ok(g.player.moving);
  g.touchEvent('touch-move','pointerup',{pointerId:11});assert.ok(g.stick.x>0);g.touchEvent('touch-move','pointerup',{pointerId:10});assert.equal(g.stick.x,0);assert.equal(g.attackPointers.size,1);
  g.touchEvent('test-attack','pointercancel',{pointerId:20});assert.equal(g.attackPointers.size,0);
  g.touchEvent('touch-move','pointerdown',{pointerId:30,clientX:10,clientY:68});g.touchEvent('test-attack','pointerdown',{pointerId:40});g.togglePause();assert.equal(g.stick.x,0);assert.equal(g.stick.pointerId,null);assert.equal(g.attackPointers.size,0);g.togglePause();g.update(.1);assert.equal(g.player.moving,false);
});
test('start, attack range, damage and cooldown prevent repeated damage',()=>{
  const g=loadGame();g.start();assert.equal(g.state,'playing');assert.equal(g.wave,1);assert.ok(g.enemies.length>=4&&g.enemies.length<=7);
  const near=g.enemy('skeleton',g.player.x+65,g.player.y),far=g.enemy('skeleton',g.player.x+200,g.player.y);g.setEnemies([near,far]);g.action('attack');assert.ok(near.hp<65);assert.equal(far.hp,65);const hp=near.hp;g.action('attack');assert.equal(near.hp,hp);g.render();
});
test('skills require only cooldowns, repeat after recovery, and healing still uses charges',()=>{
  const g=loadGame();g.start();assert.equal('mp' in g.player,false);
  const e=g.enemy('knight',g.player.x+60,g.player.y);e.hp=e.maxHp=10000;g.setEnemies([e]);
  for(let i=0;i<5;i++){
    g.action('whirl');const hp=e.hp;assert.equal(g.cooldowns.whirl,5);g.action('whirl');assert.equal(e.hp,hp);
    g.action('nova');const after=e.hp;assert.ok(after<hp);assert.equal(g.cooldowns.nova,9);g.action('nova');assert.equal(e.hp,after);
    e.x=900;e.y=450;e.kx=0;e.ky=0;e.cool=20;for(let j=0;j<91;j++)g.update(.1);
    assert.equal(g.cooldowns.whirl,0);assert.equal(g.cooldowns.nova,0);e.x=g.player.x+60;e.y=g.player.y;
  }
  g.player.hp=g.player.maxHp;g.action('heal');assert.equal(g.potions,3);g.player.hp=80;g.action('heal');assert.equal(g.player.hp,165);assert.equal(g.potions,2);assert.equal('mp' in g.player,false);
});
test('dash grants invulnerability, arena collision keeps player on walkable floor',()=>{
  const g=loadGame();g.start();g.action('dash');g.takeDamage(30);assert.equal(g.player.hp,180);g.keys.add('w');g.keys.add('a');g.setEnemies([g.enemy('mage',900,400)]);for(let i=0;i<600;i++)g.update(1/60);assert.ok(g.inside(g.player.x,g.player.y));g.player.invuln=0;const before=g.player.hp;g.takeDamage(10);assert.equal(g.player.hp,before-10);
});
test('all five temple waves transition into shop and restart resets resources',()=>{
  const g=loadGame();g.start();for(let w=1;w<=5;w++){assert.equal(g.wave,w);g.clear();for(let i=0;i<34;i++)g.update(.1);}assert.equal(g.state,'shop');g.start();assert.equal(g.state,'playing');assert.equal(g.wave,1);assert.equal(g.player.hp,180);assert.equal('mp' in g.player,false);assert.equal(g.potions,3);assert.equal(g.kills,0);
});
test('death, pause, resume, and rendered actor types work',()=>{
  const g=loadGame();g.start();g.togglePause();assert.equal(g.state,'paused');g.togglePause();assert.equal(g.state,'playing');g.setEnemies(['skeleton','mage','knight','boss'].map((type,i)=>g.enemy(type,550+i*65,340)));g.render();g.takeDamage(1000);assert.equal(g.state,'dead');g.start();assert.equal(g.state,'playing');
});

test('hero changes from idle to running, attacks, dash, and back to idle',()=>{
  const g=loadGame();g.start();assert.equal(g.player.motion.name,'idle');
  g.keys.add('d');g.update(.02);assert.equal(g.player.motion.name,'run');assert.ok(g.motion.frame(g.player.motion)>=4);
  g.action('attack');assert.equal(g.player.motion.name,'attack');assert.equal(g.motion.frame(g.player.motion),8);
  g.update(.06);assert.equal(g.motion.frame(g.player.motion),9);
  g.action('dash');assert.equal(g.player.motion.name,'dash');g.update(.06);assert.ok(g.ghosts.length);const saved=g.ghosts[0].frame;assert.ok(saved>=12&&saved<=15);
  g.keys.clear();for(let i=0;i<12;i++)g.update(.02);assert.equal(g.player.motion.name,'idle');
});

test('animation playback is time-based, clamps one-shot clips, and freezes on pause',()=>{
  const g=loadGame();const a=g.motion.create(),b=g.motion.create();g.motion.play(a,'run');g.motion.play(b,'run');
  for(let i=0;i<60;i++)g.motion.advance(a,1/60);for(let i=0;i<30;i++)g.motion.advance(b,1/30);assert.equal(g.motion.frame(a),g.motion.frame(b));
  g.motion.play(a,'attack');g.motion.advance(a,10);assert.equal(g.motion.frame(a),11);
  g.start();g.action('attack');g.togglePause();const before=g.player.motion.elapsed;g.tick(100);g.tick(116);assert.equal(g.player.motion.elapsed,before);
  g.togglePause();g.tick(132);assert.ok(g.player.motion.elapsed>before);g.start();assert.equal(g.player.motion.elapsed,0);
});

test('skeleton walks, winds up, deals damage on swing, and recovers only once',()=>{
  const g=loadGame();g.start();const e=g.enemy('skeleton',g.player.x+140,g.player.y);e.born=0;e.cool=5;g.setEnemies([e]);
  g.update(.02);assert.equal(e.motion.name,'walk');
  e.x=g.player.x+35;e.y=g.player.y;e.cool=0;g.update(.01);assert.equal(e.motion.name,'attack');assert.equal(g.skeletonMotion.frame(e.motion),8);
  for(let i=0;i<4;i++)g.update(.1);assert.equal(g.player.hp,180);assert.equal(g.skeletonMotion.frame(e.motion),9);
  g.update(.025);assert.equal(g.player.hp,169);assert.equal(g.skeletonMotion.frame(e.motion),10);assert.ok(e.swing>0);
  for(let i=0;i<4;i++)g.update(.1);assert.equal(g.player.hp,169);assert.equal(e.motion.name,'idle');
});

test('a defeated skeleton collapses without attacking, blocking the wave, or duplicating loot',()=>{
  const g=loadGame();g.start();const e=g.enemy('skeleton',g.player.x+30,g.player.y);e.born=0;e.cool=0;g.setEnemies([e]);g.update(.01);
  g.hit(e,999);g.hit(e,999);assert.equal(g.kills,1);assert.equal(g.corpses.length,1);assert.equal(g.corpses[0].motion.name,'death');
  g.update(.03);assert.equal(g.enemies.length,0);const hp=g.player.hp;for(let i=0;i<10;i++)g.update(.1);assert.equal(g.player.hp,hp);assert.equal(g.skeletonMotion.frame(g.corpses[0].motion),15);
  g.togglePause();const t=g.corpses[0].motion.elapsed;g.tick(100);assert.equal(g.corpses[0].motion.elapsed,t);g.togglePause();
  for(let i=0;i<8;i++)g.update(.1);assert.equal(g.corpses.length,0);g.start();assert.equal(g.corpses.length,0);
});

test('mage walks backwards, then releases one projectile on the cast frame',()=>{
  const g=loadGame();g.start();const e=g.enemy('mage',g.player.x+100,g.player.y);e.born=0;e.cool=3;g.setEnemies([e]);g.update(.02);assert.equal(e.motion.name,'walk');assert.ok(e.x>g.player.x+100);
  e.x=g.player.x+180;e.cool=0;g.update(.01);assert.equal(e.motion.name,'attack');
  for(let i=0;i<8;i++)g.update(.1);assert.equal(g.bolts.length,0);assert.equal(g.enemyMotion.forType('mage').frame(e.motion),9);
  g.update(.055);assert.equal(g.bolts.length,1);assert.equal(g.enemyMotion.forType('mage').frame(e.motion),10);assert.ok(e.swing>0);
  g.update(.1);assert.equal(g.bolts.length,1);
});

test('knight and boss deal their damage at the overhead strike frame',()=>{
  for(const [type,damage] of [['knight',24],['boss',34]]){const g=loadGame();g.start();const e=g.enemy(type,g.player.x+70,g.player.y);e.born=0;e.cool=0;g.setEnemies([e]);g.update(.01);assert.equal(e.motion.name,'attack');
    for(let i=0;i<9;i++)g.update(.1);assert.equal(g.player.hp,180);assert.equal(g.enemyMotion.forType(type).frame(e.motion),9);
    g.update(.06);assert.equal(g.player.hp,180-damage);assert.equal(g.enemyMotion.forType(type).frame(e.motion),10);assert.ok(e.swing>0);
    for(let i=0;i<5;i++)g.update(.1);assert.equal(g.player.hp,180-damage);assert.equal(e.motion.name,'idle');
  }
});

test('mage, knight and boss deaths retain type and size without duplicate rewards',()=>{
  const g=loadGame();g.start();const es=['mage','knight','boss'].map((type,i)=>g.enemy(type,600+i*40,400));g.setEnemies(es);
  for(const e of es){g.hit(e,2000);g.hit(e,2000);}assert.equal(g.kills,3);assert.equal(g.corpses.length,3);assert.deepEqual(Array.from(g.corpses,c=>c.type),['mage','knight','boss']);assert.ok(g.enemyMotion.sizeFor('boss')>g.enemyMotion.sizeFor('knight'));
  for(let i=0;i<11;i++)g.update(.1);assert.equal(g.enemies.length,0);for(const c of g.corpses)assert.equal(g.enemyMotion.forType(c.type).frame(c.motion),15);
  for(let i=0;i<10;i++)g.update(.1);assert.equal(g.corpses.length,0);g.start();assert.equal(g.corpses.length,0);
});

function clearStage(g){for(let w=1;w<=5;w++){assert.equal(g.wave,w);g.clear();for(let i=0;i<34;i++)g.update(.1);}}
test('temple victory advances to stage two with fixed stats, full recovery, and no wave spillover',()=>{
  const g=loadGame();g.start();clearStage(g);assert.equal(g.state,'shop');g.player.hp=30;
  g.activateStart();assert.equal(g.stage,1);assert.equal(g.wave,1);assert.equal(g.state,'playing');assert.equal("level" in g.player,false);assert.equal(g.player.hp,180);assert.equal('mp' in g.player,false);assert.equal("xp" in g.player,false);assert.ok(g.enemies.length>5);assert.ok(g.enemies.every(e=>e.stage===1));g.render();
  clearStage(g);assert.equal(g.state,'shop');g.activateStart();assert.equal(g.stage,2);assert.equal(g.wave,1);assert.equal("level" in g.player,false);
});
test('direct necropolis selection and death retry keep stage while explicit restart restores temple',()=>{
  const g=loadGame();g.start(1);assert.equal(g.player.hp,180);assert.equal("level" in g.player,false);const e=g.enemy('skeleton',700,400);assert.equal(e.hp,78);g.takeDamage(1000);assert.equal(g.state,'dead');g.activateStart();assert.equal(g.stage,1);assert.equal(g.state,'playing');g.start(0);assert.equal(g.stage,0);assert.equal("level" in g.player,false);assert.equal(g.enemy('skeleton',700,400).hp,65);
});
test('necropolis mage casts three blue bolts and guardian uses distinct animation through death',()=>{
  const g=loadGame();g.start(1);const mage=g.enemy('mage',g.player.x+180,g.player.y);mage.born=0;mage.cool=0;g.setEnemies([mage]);g.update(.01);g.update(.8);g.update(.06);assert.equal(g.bolts.length,3);assert.ok(g.bolts.every(b=>b.color==='#67dcff'));
  const boss=g.enemy('boss',g.player.x+80,g.player.y);assert.notEqual(g.motionFor(boss),g.enemyMotion.forType('boss'));g.setEnemies([boss]);g.hit(boss,9999);assert.equal(g.corpses[0].stage,1);assert.equal(g.motionFor(g.corpses[0]),g.motionFor(boss));g.render();
});

test('Anubis strike lands after its anticipation and pause preserves the animation',()=>{
  const g=loadGame();g.start(1);const e=g.enemy('boss',g.player.x+80,g.player.y);e.born=0;e.cool=0;g.setEnemies([e]);g.update(.01);assert.equal(e.motion.name,'attack');g.update(.5);assert.equal(g.player.hp,180);g.togglePause();const elapsed=e.motion.elapsed;g.tick(16);g.tick(32);assert.equal(e.motion.elapsed,elapsed);g.togglePause();g.update(.46);assert.equal(g.player.hp,146);assert.equal(g.motionFor(e).frame(e.motion),10);assert.ok(e.swing>0);
});

test('movement determines attack direction immediately, persists at rest, and ignores the cursor',()=>{
  const g=loadGame();g.start();g.setEnemies([g.enemy('skeleton',g.player.x-65,g.player.y)]);g.mouse.active=true;g.mouse.x=g.player.x+500;g.mouse.y=g.player.y;g.keys.add('a');g.action('attack');assert.equal(g.player.angle,Math.PI);assert.equal(g.player.facing,-1);assert.ok(g.enemies[0].hp<65);g.keys.clear();g.update(.02);assert.equal(g.player.angle,Math.PI);
  g.action('dash');assert.ok(g.player.dx<-.99);assert.ok(Math.abs(g.player.dy)<.001);
});
test('assistance is limited to nearby front targets and cannot turn the resting direction',()=>{
  const g=loadGame();g.start();g.player.angle=0;
  const foe=a=>g.enemy('skeleton',g.player.x+80*Math.cos(a),g.player.y+80*Math.sin(a));
  g.setEnemies([foe(Math.PI),foe(Math.PI/6)]);assert.ok(Math.abs(g.attackDirection()-Math.PI/12)<1e-9);g.action('attack');assert.equal(g.player.angle,0);assert.equal(g.enemies[0].hp,65);
  g.setEnemies([foe(Math.PI/2),foe(Math.PI)]);assert.equal(g.attackDirection(),0);g.setEnemies([g.enemy('skeleton',g.player.x+250,g.player.y+60)]);assert.equal(g.attackDirection(),0);
});
test('diagonal input and arrow preview keep the actual slash direction throughout a swing',()=>{
  const g=loadGame();g.start();g.setEnemies([g.enemy('skeleton',900,400)]);g.keys.add('w');g.keys.add('d');g.action('attack');assert.equal(g.player.angle,-Math.PI/4);const swing=g.player.attackAngle;g.keys.clear();g.keys.add('s');g.update(.02);assert.equal(g.player.angle,Math.PI/2);assert.equal(g.player.attackAngle,swing);g.render();
});

test('kills never add levels, experience, maximum hearts, or healing',()=>{
  const g=loadGame();g.start();g.player.hp=90;
  for(let i=0;i<12;i++)g.hit(g.enemy(i%2?'boss':'knight',800,400),9999);
  assert.equal(g.kills,12);assert.equal(g.player.maxHp,180);assert.equal(g.player.hp,90);assert.equal('level' in g.player,false);assert.equal('xp' in g.player,false);
  g.start(1);assert.equal(g.player.maxHp,180);assert.equal(g.player.hp,180);
});

test('shop purchases enforce currency and stock, preserve supplies on departure, and reset on retry',()=>{
  const g=loadGame();g.start();assert.equal(g.buyShopItem('potion'),false);clearStage(g);assert.equal(g.state,'shop');
  g.setWallet(200,6);assert.equal(g.buyShopItem('potion'),true);assert.equal(g.gold,155);assert.equal(g.potions,4);assert.equal(g.buyShopItem('supplies'),true);assert.equal(g.gold,45);assert.equal(g.potions,7);assert.equal(g.buyShopItem('supplies'),false);assert.equal(g.gold,45);
  assert.equal(g.buyShopItem('ward'),true);assert.equal(g.crystals,2);assert.equal(g.guardCharges,2);assert.equal(g.buyShopItem('crystal-potion'),true);assert.equal(g.crystals,0);assert.equal(g.potions,8);assert.equal(g.buyShopItem('crystal-potion'),false);
  assert.equal(g.buyShopItem('potion'),true);assert.equal(g.gold,0);assert.equal(g.buyShopItem('potion'),false);assert.equal(g.buyShopItem('invalid'),false);
  g.leaveShop();assert.equal(g.stage,1);assert.equal(g.potions,9);assert.equal(g.guardCharges,2);assert.equal(g.gold,0);assert.equal(g.crystals,0);g.leaveShop();assert.equal(g.wave,1);assert.equal(g.potions,9);assert.equal(g.buyShopItem('ward'),false);
  g.takeDamage(11);assert.equal(g.player.hp,174);assert.equal(g.guardCharges,1);g.takeDamage(11);assert.equal(g.guardCharges,1);g.player.invuln=0;g.takeDamage(24);assert.equal(g.player.hp,162);assert.equal(g.guardCharges,0);g.player.invuln=0;g.takeDamage(24);assert.equal(g.player.hp,138);g.start(1);assert.equal(g.guardCharges,0);assert.equal(g.potions,3);
});
test('shop is safe, optional purchases never gate departure, and final stage ends the game',()=>{
  const g=loadGame();g.start();clearStage(g);assert.equal(g.state,'shop');assert.equal(g.enemies.length,0);assert.equal(g.bolts.length,0);
  const hp=g.player.hp;g.takeDamage(999);g.keys.add('w');g.action('nova');g.update(10);g.togglePause();assert.equal(g.state,'shop');assert.equal(g.player.hp,hp);assert.equal(g.cooldowns.nova,0);g.render();
  g.activateStart();assert.equal(g.stage,1);assert.equal(g.state,'playing');assert.equal(g.potions,3);clearStage(g);assert.equal(g.state,'shop');g.leaveShop();assert.equal(g.stage,2);clearStage(g);assert.equal(g.state,'shop');g.leaveShop();assert.equal(g.stage,3);clearStage(g);assert.equal(g.state,'victory');
});

function buyUpgrades(g,ids){g.start();clearStage(g);g.setWallet(1000,40);for(const id of ids)assert.equal(g.buyShopItem(id),true);g.leaveShop();}
test('equipment purchases persist, cannot be duplicated, and change combat rather than just labels',()=>{
  const g=loadGame(()=>.99);g.start();clearStage(g);g.setWallet(500,10);
  for(const id of ['blade','armor','boots','vitality'])assert.equal(g.buyShopItem(id),true);
  assert.equal(g.gold,110);assert.equal(g.crystals,10);assert.equal(g.player.maxHp,210);assert.equal(g.player.hp,210);
  assert.equal(g.buyShopItem('vitality'),false);assert.equal(g.gold,110);assert.equal(g.player.maxHp,210);
  g.leaveShop();assert.equal(g.upgrades.size,4);assert.equal(g.player.hp,210);const e=g.enemy('knight',g.player.x+60,g.player.y);e.hp=1000;g.setEnemies([e]);g.action('attack');assert.equal(e.hp,959);
  g.player.invuln=0;g.takeDamage(20);assert.equal(g.player.hp,192);
  e.x=990;const x=g.player.x;g.keys.add('d');g.update(.1);assert.ok(Math.abs(g.player.x-x-19.09)<1e-8);g.keys.clear();
  g.start(1);assert.equal(g.upgrades.size,0);assert.equal(g.player.maxHp,180);assert.equal(g.combatStats().attack,33);assert.equal('level' in g.player,false);
});
test('runes extend actual skill reach and visuals, increase damage, and shorten cooldowns',()=>{
  const g=loadGame(()=>.99);buyUpgrades(g,['whirl-rune','nova-rune','haste']);
  const e=g.enemy('knight',g.player.x+190,g.player.y);e.hp=1000;g.setEnemies([e]);g.action('whirl');assert.equal(e.hp,927);assert.equal(g.cooldowns.whirl,4.25);assert.equal(g.effects.at(-1).r,144*1.3);g.action('whirl');assert.equal(e.hp,927);
  e.x=g.player.x+270;g.action('nova');assert.equal(e.hp,793);assert.equal(g.cooldowns.nova,7.65);assert.equal(g.effects.at(-1).r,235*1.25);assert.equal(g.cooldownDuration('dash'),1.15);assert.equal('mp' in g.player,false);
});
test('siphon heals once per kill, respects maximum hearts, and armor combines with consumable wards',()=>{
  const g=loadGame(()=>.99);g.start();clearStage(g);g.setWallet(500,20);for(const id of ['siphon','armor','ward'])assert.equal(g.buyShopItem(id),true);g.leaveShop();g.player.hp=100;
  const e=g.enemy('skeleton',800,400);g.hit(e,9999);assert.equal(g.player.hp,103);g.hit(e,9999);assert.equal(g.player.hp,103);
  g.player.hp=179;g.hit(g.enemy('skeleton',800,400),9999);assert.equal(g.player.hp,180);g.takeDamage(20);assert.equal(g.player.hp,171);assert.equal(g.guardCharges,1);
});

test('third stage opens after the second shop with upgrades and correct stock limits',()=>{
  const g=loadGame();g.start();clearStage(g);g.setWallet(500,20);g.buyShopItem('vitality');g.buyShopItem('haste');g.leaveShop();clearStage(g);assert.equal(g.state,'shop');assert.equal(g.stage,1);assert.equal(g.buyShopItem('vitality'),false);assert.equal(g.buyShopItem('armor'),true);g.leaveShop();assert.equal(g.stage,2);assert.equal(g.player.maxHp,210);assert.equal(g.cooldownDuration('nova'),7.65);assert.equal(g.upgrades.size,3);assert.ok(g.enemies.every(e=>e.stage===2));g.render();clearStage(g);assert.equal(g.state,'shop');g.leaveShop();assert.equal(g.stage,3);assert.equal(g.upgrades.size,3);assert.equal(g.player.maxHp,210);clearStage(g);assert.equal(g.state,'victory');g.activateStart();assert.equal(g.stage,3);assert.equal(g.upgrades.size,0);
});
test('poison pools warn first, hurt only inside, expire, and freeze on pause',()=>{
  const g=loadGame();g.start(2);g.setEnemies([g.enemy('knight',1000,400)]);g.addPoisonPool(g.player.x,g.player.y);assert.equal(g.poisonPools.length,1);g.update(.5);assert.equal(g.player.hp,180);g.togglePause();g.tick(20);g.tick(40);assert.equal(g.poisonPools[0].warn,.4);g.togglePause();g.update(.41);assert.equal(g.player.hp,180);g.update(.01);assert.equal(g.player.hp,174);g.update(.01);assert.equal(g.player.hp,174);g.player.x=600;g.player.y=300;g.update(5.1);assert.equal(g.poisonPools.length,0);g.addPoisonPool(g.player.x,g.player.y);g.start(0);assert.equal(g.poisonPools.length,0);g.addPoisonPool(g.player.x,g.player.y);assert.equal(g.poisonPools.length,0);
});
test('forge eruptions warn, freeze on pause, strike once, and clear on restart',()=>{
  const g=loadGame();g.start(3);g.setEnemies([]);g.addEruption(g.player.x,g.player.y);g.update(.5);assert.equal(g.player.hp,180);g.togglePause();g.tick(20);g.tick(40);assert.equal(g.eruptions[0].warn,.5);g.togglePause();g.update(.5);assert.equal(g.player.hp,158);g.player.invuln=0;g.update(.1);assert.equal(g.player.hp,158);g.addEruption(g.player.x+100,g.player.y,.1);g.update(.1);assert.equal(g.player.hp,158);g.start(3);assert.equal(g.eruptions.length,0);g.addEruption(g.player.x,g.player.y,.1);g.action('dash');g.update(.1);assert.equal(g.player.hp,180);g.start(0);g.addEruption(660,413);assert.equal(g.eruptions.length,0);
});
test('forge mage fires orange bolts and boss schedules three delayed eruptions',()=>{
  const g=loadGame();g.start(3);let e=g.enemy('mage',g.player.x+160,g.player.y);e.born=0;e.cool=0;g.setEnemies([e]);g.update(.01);g.update(.8);g.update(.06);assert.equal(g.bolts.length,3);assert.ok(g.bolts.every(b=>b.color==='#ff9d32'));g.start(3);e=g.enemy('boss',g.player.x+80,g.player.y);e.born=0;e.cool=0;g.setEnemies([e]);assert.equal(e.maxHp,1504);assert.notEqual(g.motionFor(e),g.enemyMotion.forType('boss'));g.update(.01);g.update(.5);g.update(.46);assert.equal(g.player.hp,146);assert.equal(g.eruptions.length,3);assert.ok(g.eruptions.every(p=>p.warn>0&&!p.fired));assert.equal(g.poisonPools.length,0);g.render();g.hit(e,9999);assert.equal(g.corpses[0].stage,3);
});
test('mire boss has distinct animation and creates warning pools on its strike',()=>{
  const g=loadGame();g.start(2);const boss=g.enemy('boss',g.player.x+80,g.player.y);boss.born=0;boss.cool=0;g.setEnemies([boss]);assert.notEqual(g.motionFor(boss),g.enemyMotion.forType('boss'));g.update(.01);g.update(.5);g.update(.46);assert.equal(g.player.hp,146);assert.equal(g.poisonPools.length,3);assert.ok(g.poisonPools.every(p=>p.warn>0));g.render();g.hit(boss,9999);assert.equal(g.corpses[0].stage,2);
});




