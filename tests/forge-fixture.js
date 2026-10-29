// Visual fixture only: a frozen final-wave encounter, without production cheats.
fetch('game.js').then(r=>r.text()).then(source=>{const script=document.createElement('script');script.textContent=source.replace(/\n\}\)\(\);\s*$/,'\nstart(3);wave=5;enemies=[enemy("boss",825,320),enemy("mage",945,437),enemy("skeleton",600,362),enemy("skeleton",780,505)];enemies.forEach(e=>e.born=0);addEruption(850,440);eruptions[0].warn=0;eruptions[0].fired=true;addEruption(675,460);bannerTime=0;$("wave-banner").classList.remove("visible");updateHUD();state="preview";\n})();');document.body.append(script);});

