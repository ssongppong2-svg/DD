
/* ════════════════════════
   BGM 시스템 v2
════════════════════════ */
const BGM=(function(){
  var _els={},_vols={map:.75,battle:.82,shop:.70};
  var _masterVol=0.75; // 마스터 볼륨 (뮤트 시 0)
  var _savedT=0,_cur=null;
  var _ctx=null,_ans={},_wired={};

  /* audio 요소 초기화 */
  function _mk(k){
    if(_els[k])return _els[k];
    var el=document.getElementById('bgm-'+k);
    if(el){el.loop=true;el.volume=_vols[k]||.75;_els[k]=el;}
    return _els[k]||null;
  }

  /* Web Audio 연결 */
  function _mkCtx(){
    if(_ctx)return;
    try{_ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}
  }
  function _wire(k){
    var el=_els[k];if(!el||_wired[k]||!_ctx)return;
    try{
      var src2=_ctx.createMediaElementSource(el);
      _ans[k]=_ctx.createAnalyser();
      _ans[k].fftSize=128;_ans[k].smoothingTimeConstant=0.75;
      src2.connect(_ans[k]);_ans[k].connect(_ctx.destination);
      _wired[k]=true;window._eqAn=_ans[k];
    }catch(e){_wired[k]=true;}
  }
  function _resume(){if(_ctx&&_ctx.state==='suspended')_ctx.resume();}

  /* 볼륨 페이드 */
  function _fade(el,from,to,dur,cb){
    if(!el)return;
    var n=Math.ceil(dur/40),i=0,d=(to-from)/n;
    var t=setInterval(function(){
      i++;el.volume=Math.max(0,Math.min(1,from+d*i));
      if(i>=n){clearInterval(t);el.volume=to;if(cb)cb();}
    },40);
  }
  function _fadeOut(k,cb){
    var el=_els[k];if(!el||el.paused){if(cb)cb();return;}
    if(k==='map')_savedT=el.currentTime;
    _fade(el,el.volume,0,700,function(){el.pause();if(cb)cb();});
  }
  function _start(k,vol){
    var el=_mk(k);if(!el)return;
    if(k==='map')el.currentTime=_savedT; else el.currentTime=0;
    el.volume=0;
    _mkCtx();_resume();_wire(k);
    if(el.paused){var p=el.play();if(p&&p.catch)p.catch(function(e){console.warn(e);});}
    var _tv=_masterVol<=0?0:(vol||_vols[k]||.75);
    _fade(el,0,_tv,900,null);
    if(typeof EQ!=='undefined')EQ.setMode(k);
    window._eqAn=_ans[k]||null;
    _cur=k;
  }
  function _stop(k){
    var el=_els[k];if(!el)return;
    if(k==='map')_savedT=el.currentTime;
    el.pause();if(_cur===k)_cur=null;
  }

  return{
    playMap:    function(){
      _mk('map');_mk('battle');_mk('shop'); // 미리 초기화
      if(_cur==='map')return;
      _stop('battle');_stop('shop');
      _start('map');
    },
    pauseMap:   function(){_fadeOut('map',null);},
    fadeToMap:  function(){
      _fadeOut('shop',null);
      _fadeOut('battle',function(){ _start('map'); });
    },
    fadeToBattle:function(){
      _fadeOut('shop',null);
      _fadeOut('map',function(){ _start('battle'); });
    },
    fadeToShop:function(){
      _fadeOut('battle',null);
      _fadeOut('map',function(){ _start('shop'); });
    },
    playBattle: function(){_start('battle');},
    pauseBattle:function(){_stop('battle');},
    playShop:   function(){_start('shop');},
    pauseShop:  function(){_stop('shop');},
    getCur:     function(){return _cur;},
    setCur:     function(k){_cur=k;},
    _mk:        _mk,
    unlock:     function(){
      _mk('map');_mk('battle');_mk('shop');
    },
    vol:        function(k,v){
      if(typeof v==='undefined'){v=k;k=_cur||'map';}
      _vols[k]=v;
      _masterVol=v; // 단일 트랙 조절도 마스터 반영
      if(_els[k])_els[k].volume=Math.max(0,Math.min(1,v));
      var ico=document.getElementById('music-icon');
      if(ico)ico.textContent=v<=0?'🔇':'♪';
    },
    volAll:     function(v){
      _masterVol=Math.max(0,Math.min(1,v)); // 마스터 볼륨 저장
      ['map','battle','shop'].forEach(function(k){
        _vols[k]=v;
        if(_els[k])_els[k].volume=Math.max(0,Math.min(1,v));
      });
      var ico=document.getElementById('music-icon');
      if(ico)ico.textContent=v<=0?'🔇':'♪';
    },
    resume:     function(){_mkCtx();_resume();}
  };
})();


/* ══ 4면 이퀄라이저 ══ */


/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */
const G='#FFD700',DG='#8B6914',OB='#04040A',DOB='#0C0C18',CR='#8B0000',COP='#B87333';

/* ═══════════════════════════════════════════════════════
   GEAR PATH
═══════════════════════════════════════════════════════ */
function gp(cx,cy,R,r,n=10){
  const s=Math.PI*2/n,tw=s*.38;let d='';
  for(let i=0;i<n;i++){const a=i*s-Math.PI/2;const p=[[cx+r*Math.cos(a-tw),cy+r*Math.sin(a-tw)],[cx+R*Math.cos(a-tw*.45),cy+R*Math.sin(a-tw*.45)],[cx+R*Math.cos(a+tw*.45),cy+R*Math.sin(a+tw*.45)],[cx+r*Math.cos(a+tw),cy+r*Math.sin(a+tw)]];d+=(i===0?`M${p[0]}`:`L${p[0]}`)+p.slice(1).map(q=>`L${q}`).join('');}return d+'Z';
}
function bgs(el,sz,c,rev,spd){
  const h=sz/2;el.setAttribute('viewBox',`0 0 ${sz} ${sz}`);
  el.innerHTML=`<g style="animation:${rev?'gL':'gR'} ${(5/spd).toFixed(1)}s linear infinite;transform-origin:50% 50%;transform-box:fill-box"><path d="${gp(h,h,sz*.46,sz*.3)}" fill="${c}"/><circle cx="${h}" cy="${h}" r="${sz*.14}" fill="${OB}" stroke="${c}" stroke-width="1.5"/><circle cx="${h}" cy="${h}" r="${sz*.05}" fill="${c}"/></g>`;
}
function mkgs(sz,c,rev,spd){
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('width',sz);s.setAttribute('height',sz);s.setAttribute('viewBox',`0 0 ${sz} ${sz}`);
  const h=sz/2;s.innerHTML=`<g style="animation:${rev?'gL':'gR'} ${(5/spd).toFixed(1)}s linear infinite;transform-origin:50% 50%;transform-box:fill-box"><path d="${gp(h,h,sz*.46,sz*.3)}" fill="${c}"/><circle cx="${h}" cy="${h}" r="${sz*.14}" fill="${OB}" stroke="${c}" stroke-width="1.5"/><circle cx="${h}" cy="${h}" r="${sz*.05}" fill="${c}"/></g>`;
  return s;
}
function initGears(spd=1,red=false){
  const c=red?CR:G,dc=red?'#550000':DG;
  [['g0',c,false],['g1',c,true],['g2',c,true],['g3',c,false]].forEach(([id,col,rv])=>bgs(document.getElementById(id),80,col,rv,spd));
  [['g4',dc,true,.7],['g5',dc,false,.7],['g6',dc,false,.7],['g7',dc,true,.7]].forEach(([id,col,rv,s])=>bgs(document.getElementById(id),36,col,rv,spd*s));
  // 추가 소형 기어
  [['g8',G,false,.45],['g9',G,true,.45],['g10',DG,true,.55],['g11',DG,false,.55]].forEach(([id,col,rv,s])=>{const el=document.getElementById(id);if(el)bgs(el,el.getAttribute('width')|22,col,rv,spd*s);});
  [['g12',CR,false,.35],['g13',CR,true,.35]].forEach(([id,col,rv,s])=>{const el=document.getElementById(id);if(el)bgs(el,28,col,rv,spd*.35);});
  document.getElementById('gb').classList.toggle('red',red);
}
// Transition gears
(()=>{
  const mk=svgEl=>{
    const p=gp(100,100,92,58,18);
    const sp=Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return`<line x1="100" y1="100" x2="${(100+55*Math.cos(a)).toFixed(1)}" y2="${(100+55*Math.sin(a)).toFixed(1)}" stroke="#FFD70020" stroke-width="1.8"/>`;}).join('');
    const marks=Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;const r1=72,r2=i%3===0?64:68;return`<line x1="${(100+r1*Math.cos(a)).toFixed(1)}" y1="${(100+r1*Math.sin(a)).toFixed(1)}" x2="${(100+r2*Math.cos(a)).toFixed(1)}" y2="${(100+r2*Math.sin(a)).toFixed(1)}" stroke="#FFD70055" stroke-width="${i%3===0?2:1}"/>`;}).join('');
    const innerP=gp(100,100,18,11,10);
    svgEl.innerHTML=`<circle cx="100" cy="100" r="99" fill="#050505"/><g class="tgear"><path d="${p}" fill="#111" stroke="#FFD70028" stroke-width="1.2"/>${sp}${marks}<circle cx="100" cy="100" r="22" fill="#0a0a0a" stroke="#FFD70033" stroke-width="1.5"/><circle cx="100" cy="100" r="7" fill="#FFD70044"/></g><g class="tgear2"><path d="${innerP}" fill="#1a1a1a" stroke="#FFD70022" stroke-width="1"/></g>`;
  };
  mk(document.getElementById('tl'));mk(document.getElementById('tr'));
})();

/* ═══════════════════════════════════════════════════════
   ICONS (SVG, 이모지 없음)
═══════════════════════════════════════════════════════ */
const IC={
  atk:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2L22 9.5l-11 11L3 14l11-12z"/><line x1="2" y1="22" x2="8" y2="16"/></svg>`,
  heavy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="14" rx="2"/><rect x="6" y="14" width="12" height="6" rx="1"/></svg>`,
  multi:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12L12 3l9 9"/><path d="M5 14L12 7l7 7"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 6v6c0 5.5 3.5 9 8 10.5C17.5 21 21 17.5 21 12V6L12 2z"/></svg>`,
  heal:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  gear:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  bolt:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  skull:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.5 2 2 6.5 2 12c0 3.5 1.8 6.6 4.5 8.4V22h11v-1.6C20.2 18.6 22 15.5 22 12c0-5.5-4.5-10-10-10z"/><line x1="9" y1="17" x2="9" y2="19"/><line x1="15" y1="17" x2="15" y2="19"/><circle cx="9" cy="13" r="1.5" fill="currentColor"/><circle cx="15" cy="13" r="1.5" fill="currentColor"/></svg>`,
  bomb:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="14" r="7"/><path d="M11 7V4"/><path d="M14 4L18 2"/><line x1="18" y1="2" x2="20" y2="4"/></svg>`,
  dice:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/></svg>`,
  loop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
  drain:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="1"/><path d="M16 7V5a4 4 0 00-8 0v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
  warp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2c0 5.5-5 10-5 10s5 4.5 5 10"/><path d="M12 2c0 5.5 5 10 5 10s-5 4.5-5 10"/><circle cx="12" cy="12" r="10" stroke-dasharray="4 3"/></svg>`,
  inf:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12c-2-2.5-4-4-6-4a4 4 0 000 8c2 0 4-1.5 6-4z"/><path d="M12 12c2 2.5 4 4 6 4a4 4 0 000-8c-2 0-4 1.5-6 4z"/></svg>`,
  stasis:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>`,
  comet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="17" cy="7" r="3"/><path d="M21 3L12 12"/><path d="M16 14l-8 8M19 11l-8 8"/></svg>`,
  star:`<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  fire:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/></svg>`,
  quest:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="3" stroke-linecap="round"/></svg>`,
  coin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v2M12 16v2M9 12h6" stroke-linecap="round"/></svg>`,
  crown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20M4 20L2 8l5 5 5-7 5 7 5-5-2 12"/></svg>`,
  overload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/><circle cx="12" cy="8" r="2" fill="currentColor" opacity=".5"/></svg>`,
  wound:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><path d="M9 12l2 2 4-4"/></svg>`,
  burst:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/><circle cx="12" cy="12" r="3" fill="currentColor" opacity=".3"/></svg>`,
/* ── 신규 일반 적 ── */
  rust_tick:{id:'rust_tick',name:'녹슨 시계',type:'normal',cr:'#8B4513',glyph:'⊛',
    axis:55,maxAxis:55,cog:0,battery:0,speed:4,
    drops:['bleed','wound'],
    pat:[{t:'atk',v:9,lbl:'녹슨 침'},{t:'wound',v:1,lbl:'부식 상처'},{t:'atk',v:9,lbl:'녹슨 침'},{t:'bat',v:15,lbl:'부식 방전'}]},

  gear_hound:{id:'gear_hound',name:'기어 사냥개',type:'normal',cr:'#556644',glyph:'⊡',
    axis:50,maxAxis:50,cog:8,battery:0,speed:6,
    drops:['pierce','barrage'],
    pat:[{t:'multi',v:7,hits:2,lbl:'이중 물기'},{t:'shld',v:10,lbl:'강철 피부'},{t:'atk',v:12,lbl:'돌진'}]},

  steam_wraith:{id:'steam_wraith',name:'증기 망령',type:'normal',cr:'#334455',glyph:'≋',
    axis:45,maxAxis:45,cog:0,battery:20,speed:5,
    drops:['drain','shock'],
    pat:[{t:'drain',v:1,lbl:'에너지 흡령'},{t:'bat',v:20,lbl:'증기 방전'},{t:'atk',v:11,lbl:'유체 타격'}]},

  clockwork_spider:{id:'clockwork_spider',name:'태엽 거미',type:'normal',cr:'#443322',glyph:'✶',
    axis:40,maxAxis:40,cog:0,battery:0,speed:7,
    drops:['entropy','bleed'],
    pat:[{t:'wound',v:2,lbl:'독니'},{t:'multi',v:6,hits:3,lbl:'여섯 발 공격'},{t:'purge',v:1,lbl:'실 속박'}]},

  /* ── 신규 정예 적 ── */
  iron_herald:{id:'iron_herald',name:'철의 전령',type:'elite',cr:'#667788',glyph:'⊞',
    axis:120,maxAxis:120,cog:15,battery:0,speed:5,
    drops:['reinforce','crush'],
    pat:[{t:'shld',v:20,lbl:'철갑 방호'},{t:'shield_break',v:16,lbl:'방호 파쇄'},{t:'atk',v:18,lbl:'전령의 창'},{t:'debuff',v:2,lbl:'전령의 저주'}]},

  void_reaper:{id:'void_reaper',name:'공허 수확자',type:'elite',cr:'#442255',glyph:'⊗',
    axis:110,maxAxis:110,cog:5,battery:10,speed:6,
    drops:['execute2','finisher'],
    pat:[{t:'execute',v:22,lbl:'수확의 낫'},{t:'drain',v:2,lbl:'공허 흡수'},{t:'rage',v:18,lbl:'공허 격노'},{t:'bat',v:25,lbl:'공허 방전'}]},

  time_sentinel:{id:'time_sentinel',name:'시간 파수꾼',type:'elite',cr:'#334466',glyph:'⊕',
    axis:130,maxAxis:130,cog:20,battery:0,speed:4,
    drops:['timelock','phase_shield'],
    pat:[{t:'counter',v:3,lbl:'반격 태세'},{t:'phase',v:25,lbl:'시간 재생'},{t:'shield_break',v:18,lbl:'시간 관통'},{t:'atk',v:16,lbl:'파수꾼의 검'}]},

  entropy_beast:{id:'entropy_beast',name:'엔트로피 수괴',type:'elite',cr:'#553311',glyph:'⊜',
    axis:140,maxAxis:140,cog:0,battery:30,speed:5,
    drops:['entropy','overclock_heal'],
    pat:[{t:'overload',v:3,lbl:'혼돈 파동'},{t:'debuff',v:3,lbl:'엔트로피'},{t:'multi',v:14,hits:2,lbl:'혼돈 타격'},{t:'bat',v:30,lbl:'혼돈 방전'}]},

  /* ── 신규 보스 ── */
  boss_forge:{id:'boss_forge',name:'I — 용광로의 심장',type:'boss',cr:'#8B2000',glyph:'I',
    ultAnim:{type:'forge',color:'#FF4400',color2:'#882200',effect:'용광로가 폭발한다'},
    gimmick:{name:'용광로 과열',desc:'I — 용광로의 심장은 매 턴 과열된다. 과열이 5 이상이면 폭발하여 35 피해를 입힌다.',icon:'🔥',color:'#440000'},
    axis:180,maxAxis:180,cog:20,battery:0,speed:5,
    ult:{name:'용광로 폭발',desc:'전체 방전 +40, 관통 25 피해'},
    drops:['aegis','finisher'],
    pat:[{t:'atk',v:14,lbl:'용광로 타격'},{t:'bat',v:25,lbl:'용융 방전'},{t:'shield_break',v:18,lbl:'용융 관통'},{t:'rage',v:20,lbl:'용광로 격노'},{t:'nuke',v:28,lbl:'용광로 폭발'}]},

  boss_specter:{id:'boss_specter',name:'II — 시간의 망령',type:'boss',cr:'#223366',glyph:'II',
    axis:200,maxAxis:200,cog:10,battery:20,speed:6,
    ult:{name:'시간 역류',desc:'모든 스택 리셋, 16 피해'},
    drops:['timelock','resonance'],
    pat:[{t:'drain',v:2,lbl:'혼 흡수'},{t:'phase',v:20,lbl:'시간 역행'},{t:'debuff',v:2,lbl:'혼령 오염'},{t:'execute',v:26,lbl:'시간의 심판'},{t:'purge',v:2,lbl:'기억 소각'}]},

  boss_titan:{id:'boss_titan',name:'XIV — 강철 타이탄',type:'boss',cr:'#445566',glyph:'XIV',
    axis:260,maxAxis:260,cog:40,battery:0,speed:3,
    ult:{name:'철벽 붕괴',desc:'플레이어 톱니 0, 30 관통 피해'},
    drops:['overhaul','aegis'],
    pat:[{t:'shld',v:35,lbl:'타이탄 방호'},{t:'shield_break',v:20,lbl:'철벽 붕괴'},{t:'atk',v:22,lbl:'타이탄 주먹'},{t:'counter',v:4,lbl:'타이탄 반격'},{t:'nuke',v:36,lbl:'타이탄 붕괴'}]},

  boss_omega:{id:'boss_omega',name:'XV — 오메가',type:'boss',cr:'#660066',glyph:'XV',
    axis:300,maxAxis:300,cog:0,battery:0,speed:7,
    ult:{name:'오메가 코드',desc:'모든 적 행동 2배, 40 피해'},
    drops:['overclock2','finisher'],
    pat:[{t:'rage',v:28,lbl:'오메가 격노'},{t:'execute',v:32,lbl:'오메가 처형'},{t:'multi',v:18,hits:3,lbl:'오메가 연사'},{t:'debuff',v:3,lbl:'오메가 오염'},{t:'nuke',v:44,lbl:'오메가 코드'}]}
};

/* ═══════════════════════════════════════════════════════
   CARD DATABASE — 30 핵심 카드 (콤보 시너지 포함)
═══════════════════════════════════════════════════════ */
const CARDS={
  // ── 기본 공격 ──
  strike:{id:'strike',name:'타격',cost:1,type:'공격',rarity:'일반',icon:'atk',clr:'#CC3300',
    desc:'9 데미지.',lore:'부서진 시계의 첫 번째 움직임.',fx:g=>dealDmg(g,'enemy',9)},
  heavy:{id:'heavy',name:'강타',cost:2,type:'공격',rarity:'일반',icon:'heavy',clr:'#AA2200',
    desc:'20 데미지.',lore:'톱니 사이를 가르는 무거운 일격.',fx:g=>dealDmg(g,'enemy',20)},
  dual:{id:'dual',tag:'combo',name:'이중 타격',cost:2,type:'공격',rarity:'희귀',icon:'multi',clr:'#CC4422',
    desc:'8 데미지 × 2회.',lore:'두 침. 두 타격. 하나의 균열.',fx:g=>dealDmg(dealDmg(g,'enemy',8),'enemy',8)},
  chain:{id:'chain',tag:'combo',name:'연쇄 타격',cost:2,type:'공격',rarity:'희귀',icon:'multi',clr:'#BB3311',
    desc:'6 데미지 × 3회.',lore:'연결된 톱니—각 이가 다음 것을 잡는다.',fx:g=>dealDmg(dealDmg(dealDmg(g,'enemy',6),'enemy',6),'enemy',6)},
  // ── 과부하 콤보 ──
  overcharge:{id:'overcharge',tag:'overload',name:'과부하 부여',cost:1,type:'공격',rarity:'희귀',icon:'overload',clr:'#FF6600',
    desc:'7 데미지. 적에게 과부하 +2 스택.',lore:'회로에 균열을 만든다. 하나씩.',
    fx:g=>{let r=dealDmg(g,'enemy',7);return addStack(r,'enemy','overload',2);}},
  discharge_burst:{id:'discharge_burst',tag:'overload',name:'과부하 폭발',cost:2,type:'공격',rarity:'영웅',icon:'burst',clr:'#FF8800',
    desc:'적의 과부하 스택 × 14 데미지. 스택 소멸.',lore:'과부하된 회로를 한 번에 터뜨린다.',
    fx:g=>{const st=getStack(g,'enemy','overload');const dmg=st*14;let r=clearStack(g,'enemy','overload');return dealDmg(r,'enemy',Math.max(dmg,14));}},
  voltage:{id:'voltage',tag:'overload',name:'전압 급등',cost:1,type:'공격',rarity:'희귀',icon:'bolt',clr:'#FFAA00',
    desc:'과부하 스택 수 × 5 데미지. 스택 +1.',lore:'급등할수록 더 파괴적이다.',
    fx:g=>{const st=getStack(g,'enemy','overload');let r=addStack(g,'enemy','overload',1);return dealDmg(r,'enemy',Math.max(st*5,5));}},
  // ── 상처 콤보 ──
  wound:{id:'wound',tag:'wound',name:'깊은 상처',cost:1,type:'공격',rarity:'희귀',icon:'wound',clr:'#CC0022',
    desc:'6 데미지. 적에게 상처 +2 스택 (매 턴 스택당 2 데미지).',lore:'시간이 지날수록 깊어진다.',
    fx:g=>{let r=dealDmg(g,'enemy',6);return addStack(r,'enemy','wound',2);}},
  rupture:{id:'rupture',tag:'wound',name:'파열',cost:2,type:'공격',rarity:'영웅',icon:'wound',clr:'#AA0022',
    desc:'상처 스택 × 10 데미지. 스택 두 배.',lore:'상처를 열어 더 크게 만든다.',
    fx:g=>{const st=getStack(g,'enemy','wound');const dmg=st*10;let r=clearStack(g,'enemy','wound');r=addStack(r,'enemy','wound',st*2);return dealDmg(r,'enemy',Math.max(dmg,10));}},
  // ── 방어 ──
  cog:{id:'cog',tag:'gear',name:'톱니 전개',cost:1,type:'방어',rarity:'일반',icon:'shield',clr:'#005588',
    desc:'톱니(방어막) 8 획득.',lore:'갑옷으로 재활용된 톱니바퀴.',fx:g=>doShield(g,'player',8)},
  fort:{id:'fort',tag:'gear',name:'철갑 요새',cost:2,type:'방어',rarity:'희귀',icon:'shield',clr:'#0066AA',
    desc:'톱니(방어막) 22 획득.',lore:'너무 단단히 감겨 윙윙거리는 태엽 요새.',fx:g=>doShield(g,'player',18)},
  // ── 톱니 소모 공격 (핵심 시너지) ──
  cburst:{id:'cburst',tag:'gear',name:'톱니 폭발',cost:1,type:'공격',rarity:'영웅',icon:'gear',clr:'#0077CC',
    desc:'현재 톱니 수치 × 1.5 데미지. 톱니 전량 소멸.',lore:'요새를 포탄으로 전환하라.',
    fx:g=>{const d=Math.floor(g.player.cog*1.5);return dealDmg({...g,player:{...g.player,cog:0}},'enemy',Math.max(d,5));}},
  armor_spike:{id:'armor_spike',tag:'gear',name:'방호 가시',cost:0,type:'공격',rarity:'희귀',icon:'shield',clr:'#0099CC',
    desc:'톱니 +6. 이번 턴 피해를 받으면 적에게 6 데미지.',lore:'방패도 무기가 된다.',
    fx:g=>{let r=doShield(g,'player',6);return addStack(r,'player','armor_spike',1);}},
  // ── 회복 ──
  axis:{id:'axis',name:'축 회복',cost:1,type:'회복',rarity:'일반',icon:'heal',clr:'#006633',
    desc:'축(HP) 10 회복.',lore:'축이 재정렬된다.',fx:g=>doHeal(g,'player',10)},
  regen:{id:'regen',name:'재생 태엽',cost:2,type:'회복',rarity:'희귀',icon:'heal',clr:'#008844',
    desc:'축 20 회복. 3턴간 매 턴 5 회복.',lore:'시간을 되감으면 상처도 사라진다.',
    fx:g=>{let r=doHeal(g,'player',16);return addStack(r,'player','regen',3);}},
  // ── 방전 조작 ──
  disc:{id:'disc',tag:'battery',name:'방전 사격',cost:1,type:'공격',rarity:'희귀',icon:'bolt',clr:'#AA6600',
    desc:'7 데미지. 적 방전 +20.',lore:'회로를 과부하시켜라.',fx:g=>doBat(dealDmg(g,'enemy',7),'enemy',20)},
  gbash:{id:'gbash',tag:'gear',name:'톱니 강타',cost:1,type:'공격',rarity:'희귀',icon:'gear',clr:'#994422',
    desc:'8 데미지. 적 방전 80%+ : 시간 정지.',lore:'과부하 상태의 톱니를 막아라.',
    fx:g=>{let r=dealDmg(g,'enemy',8);return r.enemy.battery>=80?doStat(r,'enemy','stasis',2):r;}},
  recharge:{id:'recharge',tag:'battery',name:'방전 해소',cost:1,type:'유틸',rarity:'일반',icon:'bolt',clr:'#004466',
    desc:'방전 수치 -35.',fx:g=>doBat(g,'player',-35)},
  sbolt:{id:'sbolt',tag:'overload',name:'정지 번개',cost:2,type:'공격',rarity:'영웅',icon:'stasis',clr:'#660099',
    desc:'적 방전 70%+ : 시간 정지. 아니면 18 데미지.',fx:g=>g.enemy.battery>=70?doStat(g,'enemy','stasis',2):dealDmg(g,'enemy',18)},
  drain:{id:'drain',tag:'battery',name:'방전 흡수',cost:1,type:'공격',rarity:'희귀',icon:'drain',clr:'#557700',
    desc:'적 방전 -30. 8 데미지.',fx:g=>dealDmg(doBat(g,'enemy',-30),'enemy',8)},
  // ── 강화 ──
  overclock:{id:'overclock',tag:'overload',name:'초과 작동',cost:2,type:'강화',rarity:'희귀',icon:'clock',clr:'#997700',
    desc:'+3 속도 (3턴).',fx:g=>{let r={...g,player:{...g.player,speed:g.player.speed+3}};return doStat(r,'player','speed_up',3);}},
  tshield:{id:'tshield',tag:'gear',name:'시간 방패',cost:2,type:'방어',rarity:'영웅',icon:'clock',clr:'#0055AA',
    desc:'속도 × 3만큼 톱니 획득.',fx:g=>doShield(g,'player',g.player.speed*3)},
  // ── 유틸 ──
  warp:{id:'warp',tag:'time',name:'시간 왜곡',cost:3,type:'유틸',rarity:'영웅',icon:'warp',clr:'#440088',
    desc:'카드 3장 드로우.',fx:g=>drawN(g,3)},
  loop:{id:'loop',tag:'time',name:'시간 반복',cost:3,type:'유틸',rarity:'영웅',icon:'loop',clr:'#330066',
    desc:'묘지를 섞어 덱으로. 2장 드로우.',fx:g=>drawN({...g,draw:shuffle([...g.draw,...g.disc]),disc:[]},2)},
  // ── 전설 ──
  sacr:{id:'sacr',tag:'time',name:'희생',cost:0,type:'공격',rarity:'전설',icon:'skull',clr:'#880000',
    desc:'축 -15 희생. 55 데미지.',lore:'고통은 화폐다.',fx:g=>dealDmg(doHeal(g,'player',-15),'enemy',55)},
  delay:{id:'delay',tag:'time',name:'지연 폭탄',cost:2,type:'공격',rarity:'전설',icon:'bomb',clr:'#660066',
    desc:'2턴 후 70 데미지.',lore:'늦게 오는 타격이 가장 세다.',fx:g=>({...g,delayed:[...(g.delayed||[]),{dmg:70,turns:2,tgt:'enemy'}]})},
  reroll:{id:'reroll',name:'전면 폐기',cost:2,type:'공격',rarity:'영웅',icon:'dice',clr:'#AA4400',
    desc:'패 전체 버림. 카드당 9 데미지.',fx:g=>{const c=g.hand.filter(x=>x.id!=='reroll');return dealDmg({...g,hand:[],disc:[...g.disc,...c]},'enemy',c.length*9);}},
  zero:{id:'zero',tag:'time',name:'영시',cost:0,type:'공격',rarity:'전설',icon:'skull',clr:'#CC0000',
    desc:'HP 25% 이하: 90 데미지. 아니면 1.',fx:g=>dealDmg(g,'enemy',g.player.axis<=g.player.maxAxis*.25?90:1)},
  doom:{id:'doom',name:'최후의 심판',cost:4,type:'공격',rarity:'전설',icon:'comet',clr:'#660000',
    desc:'110 데미지.',lore:'마지막 째깍.',fx:g=>dealDmg(g,'enemy',90)},
  echo:{id:'echo',tag:'time',name:'무한 반향',cost:3,type:'공격',rarity:'전설',icon:'inf',clr:'#001155',
    desc:'마지막 카드 반복.',fx:g=>{const lp=g.lastPlayed;if(!lp||lp===g._safeLoop||!CARDS[lp]?.fx)return dealDmg(g,'enemy',12);const g2={...g,_safeLoop:lp,lastPlayed:null};try{return CARDS[lp].fx(g2);}catch(e){return dealDmg(g,'enemy',12);}}},
  gstorm:{id:'gstorm',tag:'combo',name:'톱니 폭풍',cost:3,type:'공격',rarity:'영웅',icon:'comet',clr:'#CC5500',
    desc:'13 데미지 × 3회.',fx:g=>dealDmg(dealDmg(dealDmg(g,'enemy',13),'enemy',13),'enemy',13)},
  pierce:{id:'pierce',name:'관통타',cost:1,type:'공격',rarity:'일반',icon:'atk',clr:'#CC3300',desc:'적 톱니 무시 10 피해.',fx:(gs)=>{const e={...gs.enemy,cog:0};return dealDmg({...gs,enemy:e},'enemy',10);}},
  barrage:{id:'barrage',name:'연사',cost:2,type:'공격',rarity:'희귀',icon:'multi',clr:'#DD4400',desc:'4회 4씩 타격.',fx:(gs)=>{for(let i=0;i<4;i++)gs=dealDmg(gs,'enemy',4);return gs;}},
  crush:{id:'crush',name:'분쇄',cost:2,type:'공격',rarity:'희귀',icon:'heavy',clr:'#AA2200',desc:'적 톱니 절반 제거 후 14 피해.',fx:(gs)=>{const cog=Math.floor((gs.enemy.cog||0)/2);gs={...gs,enemy:{...gs.enemy,cog:cog}};return dealDmg(gs,'enemy',14);}},
  bleed:{id:'bleed',tag:'wound',name:'출혈',cost:1,type:'공격',rarity:'일반',icon:'wound',clr:'#CC0033',desc:'상처 2 부여, 6 피해.',fx:(gs)=>{gs=addStack(gs,'enemy','wound',2);return dealDmg(gs,'enemy',6);}},
  execute2:{id:'execute2',name:'급소',cost:2,type:'공격',rarity:'영웅',icon:'atk',clr:'#BB1100',desc:'적 HP 50% 미만이면 피해 2배.',fx:(gs)=>{const ratio=gs.enemy.axis/gs.enemy.maxAxis;const dmg=ratio<0.5?Math.min(28,16*2):16;return dealDmg(gs,'enemy',dmg);}},
  shock:{id:'shock',name:'충격파',cost:1,type:'공격',rarity:'희귀',icon:'bat',clr:'#FFAA00',desc:'방전 15, 8 피해.',fx:(gs)=>{gs=doBat(gs,'enemy',15);return dealDmg(gs,'enemy',8);}},
  tempo:{id:'tempo',name:'시간 압박',cost:0,type:'공격',rarity:'일반',icon:'atk',clr:'#BB3300',desc:'6 피해 + 콤보 수x2.',fx:(gs)=>{const bonus=(gs.comboCount||0)*2;return dealDmg(gs,'enemy',6+bonus);}},
  finisher:{id:'finisher',tag:'wound',name:'마무리타',cost:3,type:'공격',rarity:'영웅',icon:'heavy',clr:'#990000',desc:'30 피해. 패 전체 버림.',fx:(gs)=>{gs={...gs,disc:[...gs.disc,...gs.hand],hand:[]};return dealDmg(gs,'enemy',30);}},
  bulwark:{id:'bulwark',name:'방벽',cost:1,type:'방어',rarity:'일반',icon:'cog',clr:'#336699',desc:'톱니 12.',fx:(gs)=>{return doShield(gs,'player',12);}},
  mirror_coat:{id:'mirror_coat',name:'거울 갑주',cost:2,type:'방어',rarity:'희귀',icon:'cog',clr:'#4488BB',desc:'톱니 18, 반사 2.',fx:(gs)=>{gs=doShield(gs,'player',18);return addStack(gs,'player','reflect_curse',2);}},
  parry:{id:'parry',name:'패링',cost:1,type:'방어',rarity:'희귀',icon:'cog',clr:'#2255AA',desc:'톱니 8, 적 반격 1.',fx:(gs)=>{gs=doShield(gs,'player',8);return addStack(gs,'enemy','counter',1);}},
  reinforce:{id:'reinforce',name:'철벽 강화',cost:2,type:'방어',rarity:'영웅',icon:'fort',clr:'#224488',desc:'톱니 20, 방전 -20.',fx:(gs)=>{gs=doShield(gs,'player',20);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-20)}};}},
  phase_shield:{id:'phase_shield',name:'위상 방호',cost:1,type:'방어',rarity:'희귀',icon:'cog',clr:'#3366CC',desc:'톱니 10, 스태시스 1.',fx:(gs)=>{gs=doShield(gs,'player',10);return doStat(gs,'player','stasis',1);}},
  aegis:{id:'aegis',tag:'gear',name:'이지스',cost:3,type:'방어',rarity:'전설',icon:'fort',clr:'#88AAFF',desc:'톱니 35, 방전 완전 해소.',fx:(gs)=>{gs=doShield(gs,'player',35);return {...gs,player:{...gs.player,battery:0}};}},
  field_repair:{id:'field_repair',name:'응급 수리',cost:1,type:'회복',rarity:'일반',icon:'heal',clr:'#22AA55',desc:'HP 15 회복.',fx:(gs)=>{return doHeal(gs,'player',15);}},
  overclock_heal:{id:'overclock_heal',name:'과부하 치유',cost:2,type:'회복',rarity:'희귀',icon:'heal',clr:'#33BB66',desc:'HP 20 + 방전 10% 추가 회복.',fx:(gs)=>{const bonus=Math.floor((gs.player.battery||0)*0.1);return doHeal(gs,'player',20+bonus);}},
  blood_cost:{id:'blood_cost',name:'피의 대가',cost:0,type:'강화',rarity:'영웅',icon:'util',clr:'#CC6600',desc:'HP -5, 에너지 +2.',fx:(gs)=>{gs={...gs,player:{...gs.player,axis:Math.max(1,gs.player.axis-5)}};return {...gs,energy:Math.min(gs.maxEnergy+2,gs.energy+2)};}},
  resonance:{id:'resonance',name:'공명 회복',cost:2,type:'회복',rarity:'영웅',icon:'heal',clr:'#44CC88',desc:'HP 25, 톱니 10.',fx:(gs)=>{gs=doHeal(gs,'player',25);return doShield(gs,'player',10);}},
  overhaul:{id:'overhaul',name:'완전 정비',cost:3,type:'회복',rarity:'전설',icon:'heal',clr:'#66FFAA',desc:'HP 완전 회복, 방전 -50.',fx:(gs)=>{gs=doHeal(gs,'player',gs.player.maxAxis);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-50)}};}},
  accelerate:{id:'accelerate',name:'가속',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#AA6600',desc:'에너지 +2.',fx:(gs)=>{return {...gs,energy:gs.energy+2};}},
  scrap:{id:'scrap',name:'부품 활용',cost:0,type:'유틸',rarity:'일반',icon:'util',clr:'#886633',desc:'패 1장 버리고 추가 드로우.',fx:(gs)=>{if(!gs.hand.length)return gs;const lost=gs.hand[gs.hand.length-1];gs={...gs,hand:gs.hand.slice(0,-1),disc:[...gs.disc,lost]};return drawN(gs,1);}},
  overclock2:{id:'overclock2',name:'이중 과속',cost:2,type:'강화',rarity:'영웅',icon:'util',clr:'#CC8800',desc:'다음 공격 x1.5, 에너지 +1.',fx:(gs)=>{return {...gs,_comboDmgMult:1.5,energy:Math.min(gs.maxEnergy+1,gs.energy+1)};}},
  timelock:{id:'timelock',name:'시간 봉인',cost:2,type:'유틸',rarity:'영웅',icon:'util',clr:'#334488',desc:'적 스태시스 2.',fx:(gs)=>{return doStat(gs,'enemy','stasis',2);}},
  entropy:{id:'entropy',name:'엔트로피',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#884422',desc:'적 과부하 2, 방전 +10.',fx:(gs)=>{gs=addStack(gs,'enemy','ol',2);return doBat(gs,'enemy',10);}},
  gearshift:{id:'gearshift',name:'기어 변환',cost:1,type:'강화',rarity:'희귀',icon:'util',clr:'#AA8800',desc:'속도 +1, 에너지 +1.',fx:(gs)=>{return {...gs,player:{...gs.player,speed:gs.player.speed+1},energy:gs.energy+1};}}
,
  rend:{id:'rend',name:'찢기',cost:1,type:'공격',rarity:'일반',icon:'wound',clr:'#CC2200',desc:'8 피해. 상처 1.',fx:(gs)=>{gs=addStack(gs,'enemy','wound',1);return dealDmg(gs,'enemy',8);}},
  smash:{id:'smash',name:'박살',cost:2,type:'공격',rarity:'일반',icon:'heavy',clr:'#AA2200',desc:'15 피해.',fx:(gs)=>dealDmg(gs,'enemy',15)},
  flurry:{id:'flurry',name:'난타',cost:2,type:'공격',rarity:'희귀',icon:'multi',clr:'#CC4422',desc:'3회 5 피해.',fx:(gs)=>{for(let i=0;i<3;i++)gs=dealDmg(gs,'enemy',5);return gs;}},
  spike:{id:'spike',name:'스파이크',cost:0,type:'공격',rarity:'일반',icon:'atk',clr:'#993300',desc:'4 피해.',fx:(gs)=>dealDmg(gs,'enemy',4)},
  ignite:{id:'ignite',name:'점화',cost:1,type:'공격',rarity:'희귀',icon:'bat',clr:'#FF8800',desc:'방전 20, 7 피해.',fx:(gs)=>{gs=doBat(gs,'enemy',20);return dealDmg(gs,'enemy',7);}},
  heavyblow:{id:'heavyblow',name:'중격',cost:3,type:'공격',rarity:'영웅',icon:'heavy',clr:'#881100',desc:'25 피해. 적 톱니 -10.',fx:(gs)=>{gs={...gs,enemy:{...gs.enemy,cog:Math.max(0,(gs.enemy.cog||0)-10)}};return dealDmg(gs,'enemy',25);}},
  phantom:{id:'phantom',name:'허상타',cost:1,type:'공격',rarity:'희귀',icon:'atk',clr:'#AA3366',desc:'HP 만땅 12, 아니면 8.',fx:(gs)=>{const v=gs.player.axis>=gs.player.maxAxis?12:8;return dealDmg(gs,'enemy',v);}},
  cull:{id:'cull',name:'처단',cost:2,type:'공격',rarity:'영웅',icon:'atk',clr:'#BB1100',desc:'적 HP 25% 미만 20, 아니면 10.',fx:(gs)=>dealDmg(gs,'enemy',gs.enemy.axis/gs.enemy.maxAxis<0.25?20:10)},
  lacerate:{id:'lacerate',name:'열상',cost:1,type:'공격',rarity:'일반',icon:'wound',clr:'#CC0033',desc:'5 피해, 상처 2.',fx:(gs)=>{gs=dealDmg(gs,'enemy',5);return addStack(gs,'enemy','wound',2);}},
  backstab:{id:'backstab',name:'기습타',cost:1,type:'공격',rarity:'희귀',icon:'atk',clr:'#883311',desc:'덱 30이하 15, 아니면 6.',fx:(gs)=>dealDmg(gs,'enemy',gs.deck.length<=30?15:6)},
  steadfast:{id:'steadfast',name:'불굴',cost:1,type:'방어',rarity:'일반',icon:'cog',clr:'#336699',desc:'톱니 8. 방전 -5.',fx:(gs)=>{gs=doShield(gs,'player',8);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-5)}};}},
  ironwall:{id:'ironwall',name:'철벽',cost:2,type:'방어',rarity:'희귀',icon:'fort',clr:'#2255AA',desc:'톱니 15.',fx:(gs)=>doShield(gs,'player',15)},
  reactive:{id:'reactive',name:'반응 방호',cost:1,type:'방어',rarity:'희귀',icon:'cog',clr:'#3366BB',desc:'HP 50%미만 톱니 20, 아니면 8.',fx:(gs)=>doShield(gs,'player',gs.player.axis/gs.player.maxAxis<0.5?20:8)},
  absorb:{id:'absorb',name:'흡수 방호',cost:2,type:'방어',rarity:'영웅',icon:'cog',clr:'#4455AA',desc:'톱니 12 + 반사 3.',fx:(gs)=>{gs=doShield(gs,'player',12);return addStack(gs,'player','reflect_curse',3);}},
  stonewall:{id:'stonewall',name:'석벽',cost:3,type:'방어',rarity:'영웅',icon:'fort',clr:'#224488',desc:'톱니 28. 에너지 +1.',fx:(gs)=>{gs=doShield(gs,'player',28);return {...gs,energy:Math.min(gs.maxEnergy+1,gs.energy+1)};}},
  brace:{id:'brace',name:'대비',cost:0,type:'방어',rarity:'일반',icon:'cog',clr:'#335577',desc:'톱니 4.',fx:(gs)=>doShield(gs,'player',4)},
  coverfire:{id:'coverfire',name:'엄호',cost:2,type:'방어',rarity:'희귀',icon:'cog',clr:'#2244AA',desc:'톱니 10 + 반격 2.',fx:(gs)=>{gs=doShield(gs,'player',10);return addStack(gs,'enemy','counter',2);}},
  mend:{id:'mend',name:'치유',cost:1,type:'회복',rarity:'일반',icon:'heal',clr:'#22AA55',desc:'HP 10 회복.',fx:(gs)=>doHeal(gs,'player',10)},
  surge:{id:'surge',name:'급속 회복',cost:2,type:'회복',rarity:'희귀',icon:'heal',clr:'#33BB66',desc:'HP 18 + 방전 -15.',fx:(gs)=>{gs=doHeal(gs,'player',18);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-15)}};}},
  lifetap:{id:'lifetap',name:'생명 교환',cost:1,type:'강화',rarity:'희귀',icon:'util',clr:'#BB5500',desc:'HP -8, 에너지+2, 드로우 1.',fx:(gs)=>{gs={...gs,player:{...gs.player,axis:Math.max(1,gs.player.axis-8)},energy:Math.min(gs.maxEnergy+2,gs.energy+2)};return drawN(gs,1);}},
  restoration:{id:'restoration',name:'완전 회복',cost:3,type:'회복',rarity:'영웅',icon:'heal',clr:'#44CC88',desc:'HP 30 + 상처 제거.',fx:(gs)=>{gs=doHeal(gs,'player',30);return {...gs,player:{...gs.player,stacks:{...(gs.player.stacks||{}),wound:0}}};}},
  vampiric:{id:'vampiric',name:'흡혈',cost:2,type:'공격',rarity:'영웅',icon:'wound',clr:'#881133',desc:'적 최대 HP 5% 흡수.',fx:(gs)=>{const v=Math.floor(gs.enemy.maxAxis*0.05);gs=dealDmg(gs,'enemy',v);return doHeal(gs,'player',v);}},
  patchup:{id:'patchup',name:'응급처치',cost:0,type:'회복',rarity:'일반',icon:'heal',clr:'#228844',desc:'HP 6 회복.',fx:(gs)=>doHeal(gs,'player',6)},
  analyze:{id:'analyze',name:'분석',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#886633',desc:'드로우 2장.',fx:(gs)=>drawN(gs,2)},
  cycle2:{id:'cycle2',name:'순환',cost:0,type:'유틸',rarity:'일반',icon:'util',clr:'#776644',desc:'패 1장 버리고 2장 드로우.',fx:(gs)=>{if(!gs.hand.length)return drawN(gs,1);const lost=gs.hand[gs.hand.length-1];gs={...gs,hand:gs.hand.slice(0,-1),disc:[...gs.disc,lost]};return drawN(gs,2);}},
  discharge2:{id:'discharge2',name:'방전 해소',cost:1,type:'유틸',rarity:'일반',icon:'util',clr:'#338866',desc:'방전 -35.',fx:(gs)=>({...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-35)}})},
  recall:{id:'recall',name:'회수',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#664422',desc:'묘지 랜덤 카드 덱 맨 위로.',fx:(gs)=>{if(!gs.disc.length)return gs;const card=gs.disc[Math.floor(Math.random()*gs.disc.length)];return {...gs,disc:gs.disc.filter(c=>c.uid!==card.uid),draw:[card,...gs.draw]};}},
  empowerment:{id:'empowerment',name:'강화',cost:2,type:'강화',rarity:'희귀',icon:'util',clr:'#BB8800',desc:'다음 피해 +5.',fx:(gs)=>({...gs,_dmgBonus:(gs._dmgBonus||0)+5})},
  annihilate:{id:'annihilate',name:'섬멸',cost:3,type:'공격',rarity:'전설',icon:'heavy',clr:'#FF0000',desc:'30 피해 + 상처 폭발.',fx:(gs)=>{const wound=((gs.enemy.stacks||{}).wound||0)*4;return dealDmg(gs,'enemy',30+wound);}},
  clockstop:{id:'clockstop',name:'시계 정지',cost:3,type:'유틸',rarity:'전설',icon:'util',clr:'#4488FF',desc:'적 스태시스 3 + 과부하 2.',fx:(gs)=>{gs=doStat(gs,'enemy','stasis',3);return addStack(gs,'enemy','ol',2);}},
  voltblade:{id:'voltblade',name:'전압 검',cost:2,type:'공격',rarity:'희귀',icon:'bolt',clr:'#FFCC00',desc:'14 피해. 방전 10 부여.',fx:(gs)=>{gs=doBat(gs,'enemy',10);return dealDmg(gs,'enemy',14);}},
  chainsaw:{id:'chainsaw',name:'기어 톱날',cost:2,type:'공격',rarity:'희귀',icon:'multi',clr:'#CC4400',desc:'5회 3 피해.',fx:(gs)=>{for(let i=0;i<5;i++)gs=dealDmg(gs,'enemy',3);return gs;}},
  deathmark:{id:'deathmark',name:'죽음의 표식',cost:1,type:'공격',rarity:'영웅',icon:'wound',clr:'#880022',desc:'상처 4. 이번 턴 피해 +2.',fx:(gs)=>{gs=addStack(gs,'enemy','wound',4);return {...gs,_dmgBonus:(gs._dmgBonus||0)+2};}},
  wrathstrike:{id:'wrathstrike',name:'분노의 일격',cost:2,type:'공격',rarity:'영웅',icon:'heavy',clr:'#DD2200',desc:'적 상처 스택 × 3 추가 피해 (최대 20).',fx:(gs)=>{const w=Math.min(20,((gs.enemy.stacks||{}).wound||0)*3);return dealDmg(gs,'enemy',10+w);}},
  ricochet:{id:'ricochet',name:'도탄',cost:1,type:'공격',rarity:'희귀',icon:'multi',clr:'#BB6600',desc:'적 톱니가 있으면 반사 8, 없으면 5.',fx:(gs)=>dealDmg(gs,'enemy',(gs.enemy.cog||0)>0?8:5)},
  timecut:{id:'timecut',name:'시간 절단',cost:2,type:'공격',rarity:'영웅',icon:'atk',clr:'#8844CC',desc:'15 피해 + 적 방전 20.',fx:(gs)=>{gs=doBat(gs,'enemy',20);return dealDmg(gs,'enemy',15);}},
  doubleedge:{id:'doubleedge',name:'쌍날 검',cost:1,type:'공격',rarity:'희귀',icon:'dual',clr:'#CC5500',desc:'10 피해. 자신도 3 받음.',fx:(gs)=>{gs=dealDmg(gs,'enemy',10);return {...gs,player:{...gs.player,axis:Math.max(1,gs.player.axis-3)}};}},
  overdrive:{id:'overdrive',name:'오버드라이브',cost:2,type:'공격',rarity:'영웅',icon:'overload',clr:'#FF4400',desc:'방전 소모 (×3 피해, 최대+24).',fx:(gs)=>{const bat=Math.min(8,Math.floor((gs.player.battery||0)/10));gs={...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-bat*10)}};return dealDmg(gs,'enemy',8+bat*3);}},
  crushblow:{id:'crushblow',name:'분쇄타',cost:3,type:'공격',rarity:'영웅',icon:'heavy',clr:'#991100',desc:'적 방호 무시 20 피해.',fx:(gs)=>{const e={...gs.enemy,cog:0};return dealDmg({...gs,enemy:e},'enemy',20);}},
  gearshot:{id:'gearshot',name:'기어 총탄',cost:1,type:'공격',rarity:'일반',icon:'bullet',clr:'#AA7700',desc:'7 피해.',fx:(gs)=>dealDmg(gs,'enemy',7)},
  bulkup:{id:'bulkup',name:'강화 방호',cost:2,type:'방어',rarity:'희귀',icon:'fort',clr:'#334499',desc:'톱니 18 + 반격 1.',fx:(gs)=>{gs=doShield(gs,'player',18);return addStack(gs,'enemy','counter',1);}},
  mirrorshield:{id:'mirrorshield',name:'거울 방패',cost:2,type:'방어',rarity:'영웅',icon:'shield',clr:'#6699FF',desc:'톱니 15 + 반사 5.',fx:(gs)=>{gs=doShield(gs,'player',15);return addStack(gs,'player','reflect_curse',5);}},
  hardcase:{id:'hardcase',name:'강철 외피',cost:1,type:'방어',rarity:'일반',icon:'cog',clr:'#445566',desc:'톱니 6. 매 턴 -1씩 감소하지 않음 (1회).',fx:(gs)=>doShield(gs,'player',6)},
  shieldwall:{id:'shieldwall',name:'방패 벽',cost:3,type:'방어',rarity:'영웅',icon:'fort',clr:'#1133AA',desc:'톱니 30. 방전 -10.',fx:(gs)=>{gs=doShield(gs,'player',30);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-10)}};}},
  clockshield:{id:'clockshield',name:'시계 방호',cost:2,type:'방어',rarity:'희귀',icon:'cog',clr:'#3355BB',desc:'톱니 12 + 적 스태시스 1.',fx:(gs)=>{gs=doShield(gs,'player',12);return doStat(gs,'enemy','stasis',1);}},
  energywall:{id:'energywall',name:'에너지 장벽',cost:1,type:'방어',rarity:'희귀',icon:'cog',clr:'#2266CC',desc:'방전 30% 이상이면 톱니 16, 아니면 8.',fx:(gs)=>doShield(gs,'player',(gs.player.battery||0)>=30?16:8)},
  counterform:{id:'counterform',name:'반격 자세',cost:2,type:'방어',rarity:'영웅',icon:'shield',clr:'#5544BB',desc:'톱니 10 + 반격 3. 방전 -15.',fx:(gs)=>{gs=doShield(gs,'player',10);gs=addStack(gs,'enemy','counter',3);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-15)}};}},
  deepmend:{id:'deepmend',name:'깊은 치유',cost:2,type:'회복',rarity:'희귀',icon:'heal',clr:'#33CC66',desc:'HP 22 회복.',fx:(gs)=>doHeal(gs,'player',22)},
  batteryboost:{id:'batteryboost',name:'배터리 주입',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#44BBAA',desc:'HP 8 + 방전 -20.',fx:(gs)=>{gs=doHeal(gs,'player',8);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-20)}};}},
  celldivide:{id:'celldivide',name:'세포 분열',cost:3,type:'회복',rarity:'전설',icon:'heal',clr:'#55FF88',desc:'HP 완전 회복 (과부하 10% 씩 소모).',fx:(gs)=>{const cost=Math.floor(gs.player.maxAxis*0.1);gs={...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+cost)}};return doHeal(gs,'player',gs.player.maxAxis);}},
  chronospulse:{id:'chronospulse',name:'시간 맥동',cost:2,type:'회복',rarity:'영웅',icon:'heal',clr:'#66DDAA',desc:'HP 15 + 재생 2.',fx:(gs)=>{gs=doHeal(gs,'player',15);return addStack(gs,'player','regen',2);}},
  selfrepair:{id:'selfrepair',name:'자가 수리',cost:0,type:'회복',rarity:'일반',icon:'heal',clr:'#228855',desc:'HP 8.',fx:(gs)=>doHeal(gs,'player',8)},
  drawengine:{id:'drawengine',name:'드로우 엔진',cost:2,type:'유틸',rarity:'영웅',icon:'util',clr:'#AA8833',desc:'드로우 3장. 방전 +10.',fx:(gs)=>{gs=doBat(gs,'player',10);return drawN(gs,3);}},
  overcycle:{id:'overcycle',name:'과잉 순환',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#886622',desc:'패 전부 버리고 같은 수 드로우.',fx:(gs)=>{const n=gs.hand.length;gs={...gs,disc:[...gs.disc,...gs.hand],hand:[]};return drawN(gs,n);}},
  timerewind:{id:'timerewind',name:'시간 되감기',cost:2,type:'유틸',rarity:'영웅',icon:'util',clr:'#6655BB',desc:'버린 카드 2장 패로 복귀.',fx:(gs)=>{if(gs.disc.length<2)return gs;const picks=gs.disc.slice(-2);return {...gs,disc:gs.disc.slice(0,-2),hand:[...gs.hand,...picks]};}},
  scrapyard:{id:'scrapyard',name:'폐기장 활용',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#775533',desc:'패 2장 버리고 황금 +40.',fx:(gs)=>{if(gs.hand.length<2)return gs;const lost=gs.hand.slice(-2);gs={...gs,disc:[...gs.disc,...lost],hand:gs.hand.slice(0,-2)};GS={...GS,gold:(GS.gold||0)+40};return gs;}},
  gearboost:{id:'gearboost',name:'기어 가속',cost:1,type:'강화',rarity:'희귀',icon:'util',clr:'#CC9900',desc:'에너지 +2. 다음 방어 카드 효과 +5.',fx:(gs)=>({...gs,energy:gs.energy+2,_nextDefBonus:5})},
  voidstrike:{id:'voidstrike',name:'공허 일격',cost:4,type:'공격',rarity:'전설',icon:'heavy',clr:'#9900CC',desc:'적 현재 HP 40% 직접 피해.',fx:(gs)=>{const dmg=Math.max(20,Math.floor(gs.enemy.axis*0.4));return dealDmg(gs,'enemy',dmg);}},
  chronosheart:{id:'chronosheart',name:'시간의 심장',cost:3,type:'강화',rarity:'전설',icon:'util',clr:'#FF6600',desc:'이 전투 동안 매 턴 시작 시 에너지 +1.',fx:(gs)=>({...gs,maxEnergy:gs.maxEnergy+1,energy:gs.energy+1})},
  apocalypse:{id:'apocalypse',name:'종말',cost:5,type:'공격',rarity:'전설',icon:'heavy',clr:'#CC0000',desc:'적 HP 50% 피해. 자신 HP -20.',fx:(gs)=>{const dmg=Math.floor(gs.enemy.axis*0.5);gs={...gs,player:{...gs.player,axis:Math.max(1,gs.player.axis-20)}};return dealDmg(gs,'enemy',dmg);}},
  snapshot:{id:'snapshot',name:'속사',cost:1,type:'공격',rarity:'일반',icon:'bullet',clr:'#BB5500',desc:'5 피해 × 2회.',fx:(gs)=>{gs=dealDmg(gs,'enemy',5);return dealDmg(gs,'enemy',5);}},
  gutpunch:{id:'gutpunch',name:'급소 강타',cost:2,type:'공격',rarity:'희귀',icon:'heavy',clr:'#AA3300',desc:'16 피해. 적 방전 +15.',fx:(gs)=>{gs=doBat(gs,'enemy',15);return dealDmg(gs,'enemy',16);}},
  timebomb:{id:'timebomb',name:'시한폭탄',cost:2,type:'공격',rarity:'영웅',icon:'overload',clr:'#FF6600',desc:'방전 30이상 25, 아니면 10.',fx:(gs)=>dealDmg(gs,'enemy',(gs.player.battery||0)>=30?25:10)},
  shadowblade:{id:'shadowblade',name:'그림자 검',cost:1,type:'공격',rarity:'희귀',icon:'atk',clr:'#442266',desc:'8+상처×2 피해 (최대+12).',fx:(gs)=>dealDmg(gs,'enemy',8+Math.min(12,((gs.enemy.stacks||{}).wound||0)*2))},
  geargrind:{id:'geargrind',name:'기어 갈기',cost:2,type:'공격',rarity:'희귀',icon:'wound',clr:'#993311',desc:'적 톱니 -15, 10 피해.',fx:(gs)=>{gs={...gs,enemy:{...gs.enemy,cog:Math.max(0,(gs.enemy.cog||0)-15)}};return dealDmg(gs,'enemy',10);}},
  voltwave:{id:'voltwave',name:'전압 파동',cost:2,type:'공격',rarity:'영웅',icon:'bat',clr:'#FFAA00',desc:'방전 +10 양측. 12 피해.',fx:(gs)=>{gs=doBat(gs,'player',10);gs=doBat(gs,'enemy',10);return dealDmg(gs,'enemy',12);}},
  detonator:{id:'detonator',name:'기폭장치',cost:3,type:'공격',rarity:'전설',icon:'burst',clr:'#FF4400',desc:'적 방전 전환 피해 (최대 40).',fx:(gs)=>{const dmg=Math.min(40,gs.enemy.battery||0);gs={...gs,enemy:{...gs.enemy,battery:0}};return dealDmg(gs,'enemy',Math.max(10,dmg));}},
  bladerain:{id:'bladerain',name:'칼날 비',cost:3,type:'공격',rarity:'영웅',icon:'multi',clr:'#CC3300',desc:'6회 4 피해.',fx:(gs)=>{for(let i=0;i<6;i++)gs=dealDmgNoCrit(gs,'enemy',4);return gs;}},
  overcog2:{id:'overcog2',name:'과잉 방호',cost:2,type:'방어',rarity:'희귀',icon:'fort',clr:'#3355AA',desc:'톱니 20. 방전 +10.',fx:(gs)=>{gs=doShield(gs,'player',20);return {...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+10)}};}},
  timeguard:{id:'timeguard',name:'시간 방패',cost:2,type:'방어',rarity:'영웅',icon:'cog',clr:'#5566CC',desc:'스태시스 1 + 톱니 15.',fx:(gs)=>{gs=doStat(gs,'player','stasis',1);return doShield(gs,'player',15);}},
  ecoguard:{id:'ecoguard',name:'에너지 방호',cost:1,type:'방어',rarity:'희귀',icon:'cog',clr:'#224499',desc:'에너지 1 소모 → 톱니 +18.',fx:(gs)=>gs.energy>0?doShield({...gs,energy:gs.energy-1},'player',18):doShield(gs,'player',8)},
  adaptshield:{id:'adaptshield',name:'적응 방호',cost:2,type:'방어',rarity:'영웅',icon:'fort',clr:'#334488',desc:'피해에 비례 톱니 (10~30).',fx:(gs)=>{const v=Math.min(30,Math.max(10,Math.floor((gs.player.maxAxis-gs.player.axis)/5)));return doShield(gs,'player',v);}},
  nullfield:{id:'nullfield',name:'무효화 장',cost:3,type:'방어',rarity:'전설',icon:'fort',clr:'#8899FF',desc:'톱니 25 + 반사 8. 방전 -20.',fx:(gs)=>{gs=doShield(gs,'player',25);gs=addStack(gs,'player','reflect_curse',8);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-20)}};}},
  battlecry:{id:'battlecry',name:'전투의 외침',cost:1,type:'회복',rarity:'희귀',icon:'heal',clr:'#44AA55',desc:'HP 12 + 콤보×3.',fx:(gs)=>doHeal(gs,'player',12+(gs.comboCount||0)*3)},
  overclock_h2:{id:'overclock_h2',name:'고급 치유',cost:2,type:'회복',rarity:'영웅',icon:'heal',clr:'#55CC77',desc:'HP 24 + 방전 -20.',fx:(gs)=>{gs=doHeal(gs,'player',24);return {...gs,player:{...gs.player,battery:Math.max(0,(gs.player.battery||0)-20)}};}},
  sacrifice:{id:'sacrifice',name:'희생',cost:0,type:'회복',rarity:'영웅',icon:'heal',clr:'#AA2233',desc:'HP -12, 묘지 카드 2장 회수.',fx:(gs)=>{if(gs.player.axis<=12)return gs;gs={...gs,player:{...gs.player,axis:gs.player.axis-12}};if(gs.disc.length>=2){const picks=gs.disc.slice(-2);gs={...gs,disc:gs.disc.slice(0,-2),hand:[...gs.hand,...picks]};}return gs;}},
  regenfield:{id:'regenfield',name:'재생 장',cost:2,type:'회복',rarity:'영웅',icon:'heal',clr:'#33BB66',desc:'재생 4 부여.',fx:(gs)=>addStack(gs,'player','regen',4)},
  clone:{id:'clone',name:'복사',cost:2,type:'유틸',rarity:'영웅',icon:'util',clr:'#998855',desc:'패 맨 위 카드 복사.',fx:(gs)=>{if(!gs.hand.length)return gs;const card=gs.hand[gs.hand.length-1];return {...gs,hand:[...gs.hand,mkCard(card.id)]};}},
  purge2:{id:'purge2',name:'정화',cost:1,type:'유틸',rarity:'희귀',icon:'util',clr:'#775544',desc:'묘지 제거, 에너지 +1.',fx:(gs)=>({...gs,disc:[],energy:gs.energy+1})},
  overclock_draw:{id:'overclock_draw',name:'과속 드로우',cost:0,type:'유틸',rarity:'희귀',icon:'util',clr:'#886633',desc:'드로우 1장. 방전 +5.',fx:(gs)=>{gs=doBat(gs,'player',5);return drawN(gs,1);}},
  mastermind:{id:'mastermind',name:'전략가',cost:3,type:'유틸',rarity:'전설',icon:'util',clr:'#AABB00',desc:'패 버리고 5장 드로우. 에너지 +2.',fx:(gs)=>{gs={...gs,disc:[...gs.disc,...gs.hand],hand:[],energy:gs.energy+2};return drawN(gs,5);}},
  powercharge:{id:'powercharge',name:'파워 차지',cost:1,type:'강화',rarity:'희귀',icon:'util',clr:'#DD8800',desc:'다음 공격 +8 피해.',fx:(gs)=>({...gs,_dmgBonus:(gs._dmgBonus||0)+8})},
  overclock4:{id:'overclock4',name:'사중 과속',cost:3,type:'강화',rarity:'전설',icon:'util',clr:'#FFCC00',desc:'에너지 +4. 이번 턴 피해 +3.',fx:(gs)=>({...gs,energy:gs.energy+4,_dmgBonus:(gs._dmgBonus||0)+3})},
  battleharden:{id:'battleharden',name:'전투 강화',cost:1,type:'강화',rarity:'희귀',icon:'util',clr:'#CC9900',desc:'공격력 +2 영구 (이번 전투).',fx:(gs)=>({...gs,_permDmgBonus:(gs._permDmgBonus||0)+2})},
  focusfire:{id:'focusfire',name:'집중 사격',cost:2,type:'강화',rarity:'영웅',icon:'util',clr:'#AA7700',desc:'다음 3장 피해 +5.',fx:(gs)=>({...gs,_focusStacks:3,_focusBonus:5})},
  overclock_all:{id:'overclock_all',name:'전체 과속',cost:2,type:'강화',rarity:'영웅',icon:'util',clr:'#FF9900',desc:'에너지 +2. 방전 +10.',fx:(gs)=>{gs=doBat(gs,'player',10);return {...gs,energy:gs.energy+2};}},
  warform:{id:'warform',name:'전투 형태',cost:2,type:'강화',rarity:'영웅',icon:'util',clr:'#BB6600',desc:'이번 턴 공격 카드 비용 0.',fx:(gs)=>({...gs,_zeroCostType:'공격'})},
  apexstrike:{id:'apexstrike',name:'절정 일격',cost:0,type:'강화',rarity:'전설',icon:'util',clr:'#FFDD00',desc:'다음 공격 ×2.5.',fx:(gs)=>({...gs,_comboDmgMult:2.5})}
};

/* ═══════════════════════════════════════════════════════
   11 REALMS — 각 구역별 보스 + 테마
═══════════════════════════════════════════════════════ */
const REALMS=[
  {id:1, num:'II',  name:'공허의 전당',   theme:'균열이 열린 곳',   boss:'boss2',
   accent:'#3a1520', gearClr:'#8B2030', bgDark:'#080410', bgMid:'#120818'},
,
  {id:2, num:'III', name:'붕괴의 회랑',   theme:'시간이 삼킨 복도',  boss:'boss3',
   accent:'#1a2510', gearClr:'#4a8020', bgDark:'#060A04', bgMid:'#0C1408'},
  {id:3, num:'IV',  name:'녹슨 심연',    theme:'쇠가 썩는 곳',    boss:'boss4',
   accent:'#251808', gearClr:'#B87333', bgDark:'#0A0604', bgMid:'#140C06'},
  {id:4, num:'V',   name:'역류의 소용돌이', theme:'흐름이 거꾸로 돌다', boss:'boss5',
   accent:'#0a1825', gearClr:'#2060AA', bgDark:'#040810', bgMid:'#081020'},
  {id:5, num:'VI',  name:'황금 사슬',    theme:'멈출 수 없는 구속',  boss:'boss6',
   accent:'#251e08', gearClr:'#D4A017', bgDark:'#0C0A02', bgMid:'#181404'},
  {id:6, num:'VII', name:'거울 미궁',    theme:'반사되는 시간',    boss:'boss7',
   accent:'#102020', gearClr:'#208080', bgDark:'#040C0C', bgMid:'#081818'},
  {id:7, num:'VIII',name:'무한의 감옥',   theme:'끝나지 않는 반복',  boss:'boss8',
   accent:'#101025', gearClr:'#4040AA', bgDark:'#060612', bgMid:'#0C0C20'},
  {id:8, num:'IX',  name:'침묵의 도서관', theme:'잊혀진 기록들',    boss:'boss9',
   accent:'#181818', gearClr:'#808080', bgDark:'#080808', bgMid:'#101010'},
  {id:9, num:'X',   name:'폭풍의 눈',    theme:'파괴의 중심',     boss:'boss10',
   accent:'#200808', gearClr:'#CC2020', bgDark:'#0A0404', bgMid:'#140606'},
  {id:10,num:'XI',  name:'빛의 제단',    theme:'마지막 계시',     boss:'boss11',
   accent:'#251520', gearClr:'#AA44CC', bgDark:'#100810', bgMid:'#1A0A1A'},
  {id:11,num:'XII', name:'조디악의 정상', theme:'시간의 끝',       boss:'boss12',
   accent:'#1a1200', gearClr:'#FFD700', bgDark:'#0C0800', bgMid:'#181200'},
];

/* ═══════════════════════════════════════════════════════
   ENEMY DATABASE — 11 보스 + 몹
═══════════════════════════════════════════════════════ */
const ENM={
  ambush_scout:{name:'매복 정찰병',type:'normal',
    axis:90,maxAxis:90,cog:0,battery:0,icon:'👤',desc:'기습 전문가.',
    gold:[7,14],drops:['strike','wound_card','block'],
    skills:[
      {name:'기습',type:'공격',ap:1,fx:(g)=>dealDmg(g,'player',10)},
      {name:'연속 타격',type:'공격',ap:1,fx:(g)=>{g=dealDmg(g,'player',6);return dealDmg(g,'player',6);}},
    ]
  },
  hunter:{name:'가면 사냥꾼',type:'elite',
    axis:160,maxAxis:160,cog:0,battery:0,icon:'🎭',desc:'추적자.',
    gold:[20,34],drops:['shadow_blade','precision','evasion'],
    skills:[
      {name:'추적',type:'공격',ap:1,fx:(g)=>{g=dealDmg(g,'player',12);g=addStack(g,'player','slow',1);return g;}},
      {name:'덫 설치',type:'디버프',ap:1,fx:(g)=>addStack(g,'player','wound',2)},
      {name:'일격',type:'공격',ap:1,fx:(g)=>dealDmg(g,'player',20)},
    ]
  },
  // ── 몹 ──
  tick:{id:'tick',name:'시간 도둑',glyph:'T',cr:'#5a3010',type:'mob',axis:98,maxAxis:98,cog:0,battery:20,speed:4,
    pat:[{t:'atk',v:6,lbl:'시간 갉기'},{t:'bat',v:12,lbl:'째깍 방전'},{t:'shld',v:6,lbl:'톱니 감기'},{t:'atk',v:8,lbl:'축 침식'},{t:'rage',v:7,lbl:'째깍 격노'},{t:'debuff',v:4,lbl:'시간 부식'}],
    drops:['disc','gbash','recharge'],gold:[10,20]},
  wraith:{id:'wraith',name:'시계 망령',glyph:'W',cr:'#2a0033',type:'mob',axis:196,maxAxis:196,cog:0,battery:10,speed:6,
    pat:[{t:'atk',v:8,lbl:'위상 타격'},{t:'drain',v:4,lbl:'에너지 흡령'},{t:'bat',v:14,lbl:'시간 흡수'},{t:'atk',v:10,lbl:'망령 참격'},{t:'shld',v:9,lbl:'외질 톱니'},{t:'mirror',v:4,lbl:'위상 반사'}],
    drops:['sbolt','drain','tshield'],gold:[17,31]},
  golem:{id:'golem',name:'태엽 골렘',glyph:'G',cr:'#332200',type:'mob',axis:140,maxAxis:140,cog:24,battery:5,speed:3,
    pat:[{t:'shld',v:12,lbl:'철갑 톱니'},{t:'atk',v:10,lbl:'태엽 주먹'},{t:'shield_break',v:9,lbl:'톱니 파쇄'},{t:'bat',v:9,lbl:'핵심 충전'},{t:'multi',v:6,hits:3,lbl:'톱니 연사'},{t:'counter',v:4,lbl:'반격 태세'}],
    drops:['cburst','fort','chain'],gold:[21,39]},
  specter:{id:'specter',name:'시간 亡靈',glyph:'S',cr:'#1a0030',type:'mob',axis:119,maxAxis:119,cog:0,battery:15,speed:7,
    pat:[{t:'overload',v:4,lbl:'과부하 저주'},{t:'atk',v:9,lbl:'유령 참격'},{t:'phase',v:10,lbl:'위상 전환'},{t:'debuff',v:4,lbl:'혼령 오염'},{t:'bat',v:11,lbl:'혼 방전'},{t:'drain',v:4,lbl:'혼 흡수'}],
    drops:['wound','overcharge','discharge_burst'],gold:[14,28]},
  automaton:{id:'automaton',name:'전투 자동기계',glyph:'A',cr:'#203040',type:'mob',axis:224,maxAxis:224,cog:30,battery:0,speed:4,
    pat:[{t:'shld',v:15,lbl:'방호막 전개'},{t:'atk',v:11,lbl:'기계 주먹'},{t:'multi',v:9,hits:2,lbl:'연속 사격'},{t:'shield_break',v:10,lbl:'장갑 관통'},{t:'execute',v:16,lbl:'처형 프로토콜'},{t:'counter',v:4,lbl:'반격 모드'}],
    drops:['armor_spike','cburst','gstorm'],gold:[24,44]},
  // ── 보스 II~XII ──
  boss2:{id:'boss2',name:'II — 공허자',glyph:'II',cr:'#330011',type:'boss',axis:280,maxAxis:280,cog:0,battery:0,speed:5,
    ultAnim:{type:'void',color:'#8800FF',color2:'#4400AA',effect:'공허 균열이 열린다'},
    gimmick:{name:'공허 침식',desc:'매 턴 에너지 1 흡수. 에너지 0이면 HP -12. 방전 70% 이상이면 공격력 +50%.',icon:'◈',color:'#220033'},
    pat:[{t:'atk',v:7,lbl:'공허 타격'},{t:'drain',v:3,lbl:'허무 흡수'},{t:'bat',v:12,lbl:'허무 방전'},{t:'rage',v:10,lbl:'공허 격노'},{t:'nuke',v:11,lbl:'공허의 절규'},{t:'execute',v:13,lbl:'소거 판결'}],
    ult:{name:'허무 소거',desc:'모든 톱니 분쇄. 35 데미지 + 방전 30 흡수.'},
    ultFx:g=>doBat(dealDmg({...g,player:{...g.player,cog:0}},'player',22),'player',25),
    drops:['sacr','zero','discharge_burst'],gold:[44,73],
    final:'"나는 두 번째 침이었다. 가장 빠른. 그리고 가장 잊혀진."'},
  boss3:{id:'boss3',name:'III — 붕괴의 삼지',glyph:'III',cr:'#1a3010',type:'boss',axis:340,maxAxis:340,cog:10,battery:0,speed:6,
    ultAnim:{type:'tri',color:'#FF4400',color2:'#882200',effect:'삼중 붕괴의 파동'},
    gimmick:{name:'삼중 폭발',desc:'과부하 스택이 쌓일 때마다 즉시 스택×3 피해. 스택 10 이상이면 폭발로 HP 30% 고정 피해.',icon:'▲',color:'#331100'},
    pat:[{t:'atk',v:9,lbl:'붕괴 일격'},{t:'overload',v:2,lbl:'삼중 과부하'},{t:'nuke',v:13,lbl:'붕괴 폭발'},{t:'wound',v:2,lbl:'균열 상처'},{t:'multi',v:7,hits:2,lbl:'이중 붕괴'}],
    ult:{name:'삼중 붕괴',desc:'과부하 스택 +5. 25 데미지 × 3회.'},
    ultFx:g=>{let r=addStack(g,'enemy','overload',4);r=dealDmg(r,'player',18);r=dealDmg(r,'player',18);return dealDmg(r,'player',18);},
    drops:['overcharge','voltage','rupture'],gold:[49,80],
    final:'"셋으로 나뉜 것은 결코 하나로 돌아오지 않는다."'},
  boss4:{id:'boss4',name:'IV — 녹슨 왕',glyph:'IV',cr:'#3a2010',type:'boss',axis:400,maxAxis:400,cog:20,battery:0,speed:4,
    ultAnim:{type:'rust',color:'#885500',color2:'#443300',effect:'부식이 전파된다'},
    gimmick:{name:'철의 부식',desc:'매 턴 상처 +2 누적. 상처 8 이상이면 모든 방어막 무효. 방어막 없으면 피해 +30%.',icon:'⚙',color:'#222200'},
    pat:[{t:'atk',v:10,lbl:'녹슨 일격'},{t:'wound',v:3,lbl:'부식 독소'},{t:'shld',v:30,lbl:'녹슨 방호'},{t:'atk',v:14,lbl:'철퇴'},{t:'shield_break',v:12,lbl:'부식 관통'}],
    ult:{name:'완전 부식',desc:'상처 스택 +6. 모든 톱니 제거. 30 데미지.'},
    ultFx:g=>{let r=addStack(g,'enemy','wound',4);r={...r,player:{...r.player,cog:0}};return dealDmg(r,'player',30);},
    drops:['wound','rupture','fort'],gold:[53,85],
    final:'"녹은 금속도 여전히 금속이다. 부서진 시간도 여전히 시간이다."'},
  boss5:{id:'boss5',name:'V — 역류의 군주',glyph:'V',cr:'#102040',type:'boss',axis:460,maxAxis:460,cog:0,battery:0,speed:7,
    ultAnim:{type:'reverse',color:'#00AA88',color2:'#005544',effect:'시간이 역류한다'},
    gimmick:{name:'역류 속박',desc:'최대 HP가 60%로 제한. 현재 HP가 낮을수록 보스 공격력 증가 (최대 2배).',icon:'↺',color:'#003322'},
    pat:[{t:'atk',v:11,lbl:'역류 타격'},{t:'reverse',v:2,lbl:'패 역행'},{t:'nuke',v:15,lbl:'역류 폭풍'},{t:'heal',v:20,lbl:'역류 회복'},{t:'rage',v:13,lbl:'역류 격노'}],
    ult:{name:'완전 역행',desc:'당신의 HP를 최대치의 60%로 고정. 30 데미지.'},
    ultFx:g=>{const newHp=Math.floor(g.player.maxAxis*.6);return dealDmg({...g,player:{...g.player,axis:Math.max(g.player.axis,newHp)}},'player',18);},
    drops:['loop','warp','echo'],gold:[58,92],
    final:'"흐름을 거스르는 자는 결국 자신도 거슬러진다."'},
  boss6:{id:'boss6',name:'VI — 황금 사슬자',glyph:'VI',cr:'#3a3000',type:'boss',axis:520,maxAxis:520,cog:40,battery:0,speed:5,
    ultAnim:{type:'chain',color:'#FFAA00',color2:'#885500',effect:'황금 사슬이 조여든다'},
    gimmick:{name:'황금 사슬',desc:'VI — 황금 사슬자는 카드를 버린다. 손패가 없으면 즉사기를 사용한다.',icon:'⛓',color:'#332200'},
    pat:[{t:'atk',v:12,lbl:'사슬 타격'},{t:'purge',v:2,lbl:'황금 속박'},{t:'bat',v:20,lbl:'사슬 방전'},{t:'multi',v:9,hits:2,lbl:'이중 속박'},{t:'nuke',v:16,lbl:'황금 폭발'}],
    ult:{name:'황금 속박',desc:'당신의 에너지를 1로 고정 (3턴). 40 데미지.'},
    ultFx:g=>{let r=addStack(g,'player','energy_lock',3);return dealDmg(r,'player',40);},
    drops:['cburst','doom','sacr'],gold:[63,98],
    final:'"황금은 아름답다. 황금으로 묶인 것도 아름다울 수 있을까?"'},
  boss7:{id:'boss7',name:'VII — 거울의 저주',glyph:'VII',cr:'#103030',type:'boss',axis:580,maxAxis:580,cog:15,battery:0,speed:6,
    ultAnim:{type:'mirror',color:'#0088FF',color2:'#004488',effect:'거울이 산산조각 난다'},
    gimmick:{name:'완전 반사',desc:'모든 공격 25% 반사. 방어막 보유 시 반사율 50%. 방어 카드 사용 시 역으로 10 피해.',icon:'◇',color:'#002233'},
    pat:[{t:'atk',v:13,lbl:'거울 타격'},{t:'mirror',v:2,lbl:'완전 반사'},{t:'counter',v:3,lbl:'반격 준비'},{t:'nuke',v:18,lbl:'거울 폭발'},{t:'shld',v:40,lbl:'거울 방패'}],
    ult:{name:'완전 반사',desc:'다음 2턴간 당신이 입히는 데미지의 40%를 반사.'},
    ultFx:g=>addStack(g,'player','reflect_curse',2),
    drops:['dual','gstorm','tshield'],gold:[68,102],
    final:'"거울은 진실을 보여주지 않는다. 당신이 보고 싶은 것을 보여줄 뿐."'},
  boss8:{id:'boss8',name:'VIII — 무한자',glyph:'VIII',cr:'#001133',type:'boss',axis:640,maxAxis:640,cog:20,battery:0,speed:7,
    ultAnim:{type:'infinite',color:'#AA00FF',color2:'#550088',effect:'무한이 팽창한다'},
    gimmick:{name:'무한 소생',desc:'처음 사망 시 HP 50% 회복. 이후 매 턴 HP 3% 재생. 면역이 끝나면 AP +2.',icon:'∞',color:'#220022'},
    pat:[{t:'atk',v:14,lbl:'무한 타격'},{t:'heal',v:25,lbl:'무한 재생'},{t:'shld',v:45,lbl:'무한 방호'},{t:'rage',v:16,lbl:'무한 격노'},{t:'phase',v:20,lbl:'위상 전환'}],
    ult:{name:'무한 역설',desc:'자신 체력 50 회복. 당신에게 35 데미지.'},
    ultFx:g=>dealDmg(doHeal(g,'enemy',50),'player',35),
    drops:['loop','doom','echo'],gold:[73,112],
    final:'"반복되는 시간은 시간이 아니다. 영원의 형태를 한 감옥이다."'},
  boss9:{id:'boss9',name:'IX — 침묵의 서기',glyph:'IX',cr:'#181818',type:'boss',axis:700,maxAxis:700,cog:30,battery:0,speed:5,
    ultAnim:{type:'silence',color:'#006666',color2:'#003333',effect:'완전한 침묵'},
    gimmick:{name:'절대 침묵',desc:'매 2턴 패 1장 봉인 (사용 불가). 봉인 카드 4장 이상이면 모든 봉인 카드 폭발 피해.',icon:'✗',color:'#001111'},
    pat:[{t:'atk',v:15,lbl:'침묵 타격'},{t:'reverse',v:3,lbl:'봉인 강제'},{t:'debuff',v:3,lbl:'복합 약화'},{t:'nuke',v:20,lbl:'침묵 폭발'},{t:'purge',v:2,lbl:'절대 봉인'}],
    ult:{name:'완전 말살',desc:'당신의 손패 전체를 소각. 45 데미지.'},
    ultFx:g=>dealDmg({...g,hand:[],disc:[...g.disc,...g.hand]},'player',45),
    drops:['warp','reroll','zero'],gold:[78,117],
    final:'"기억되지 않은 것은 존재하지 않은 것과 같다."'},
  boss10:{id:'boss10',name:'X — 폭풍의 눈',glyph:'X',cr:'#200808',type:'boss',axis:760,maxAxis:760,cog:0,battery:0,speed:9,
    ultAnim:{type:'storm',color:'#0044FF',color2:'#002288',effect:'폭풍의 눈이 열린다'},
    gimmick:{name:'폭풍 누적',desc:'매 턴 공격력 +4 누적 (무제한). 에너지를 다 쓰면 다음 공격이 2배.',icon:'◎',color:'#001133'},
    pat:[{t:'atk',v:16,lbl:'폭풍 타격'},{t:'overload',v:3,lbl:'폭풍 과부하'},{t:'nuke',v:22,lbl:'폭풍 핵'},{t:'wound',v:3,lbl:'폭풍 상처'},{t:'multi',v:10,hits:3,lbl:'삼중 폭풍'}],
    ult:{name:'극한 폭풍',desc:'5회 연속 공격, 각 12 데미지.'},
    ultFx:g=>dealDmg(dealDmg(dealDmg(dealDmg(dealDmg(g,'player',12),'player',12),'player',12),'player',12),'player',12),
    drops:['gstorm','discharge_burst','rupture'],gold:[83,127],
    final:'"폭풍의 중심은 고요하다. 그 고요함이 모든 것을 파괴한다."'},
  boss11:{id:'boss11',name:'XI — 빛의 심판자',glyph:'XI',cr:'#250838',type:'boss',axis:820,maxAxis:820,cog:20,battery:0,speed:7,
    ultAnim:{type:'light',color:'#FFFF88',color2:'#AAAA44',effect:'심판의 빛이 내린다'},
    gimmick:{name:'역광 심판',desc:'방어막 20 이상 보유 시 피해 2배. 방어막 없으면 매 턴 HP -8. 방어 카드 사용 시 실명 1턴.',icon:'✦',color:'#333300'},
    pat:[{t:'atk',v:17,lbl:'심판 타격'},{t:'shld',v:55,lbl:'빛의 방호'},{t:'nuke',v:24,lbl:'빛의 심판'},{t:'execute',v:22,lbl:'최후 판결'},{t:'shield_break',v:20,lbl:'역광 관통'}],
    ult:{name:'최후의 심판',desc:'당신의 방전을 80으로 만들고 50 데미지.'},
    ultFx:g=>{let r={...g,player:{...g.player,battery:80}};return dealDmg(r,'player',50);},
    drops:['sacr','doom','zero'],gold:[88,136],
    final:'"빛이 모든 것을 드러낼 때, 당신은 무엇을 숨기고 있는가?"'},
  boss12:{id:'boss12',name:'XII — 조디악',glyph:'XII',cr:'#110022',type:'boss',axis:900,maxAxis:900,cog:40,battery:0,speed:10,
    ultAnim:{type:'zodiac',color:'#FF0088',color2:'#880044',effect:'조디악이 전환된다'},
    gimmick:{name:'조디악 순환',desc:'매 3턴 속성 전환. 현재 속성과 같은 카드 타입 사용 시 보스에게 약점 피해 +50%. 틀린 타입 사용 시 역피해.',icon:'☽',color:'#330022'},
    pat:[{t:'atk',v:18,lbl:'조디악 타격'},{t:'debuff',v:4,lbl:'조디악 저주'},{t:'nuke',v:26,lbl:'조디악 폭발'},{t:'rage',v:20,lbl:'조디악 격노'},{t:'multi',v:12,hits:3,lbl:'조디악 심판'},{t:'phase',v:25,lbl:'최종 전환'}],
    ult:{name:'최후의 시계',desc:'세계가 산산이 부서진다. 60 데미지 + 시간 정지 3턴.'},
    ultFx:g=>doStat(dealDmg(g,'player',60),'player','stasis',3),
    drops:['echo','doom','zero'],gold:[122,195],
    final:'"나는 모든 시간이다. 너는 시간을 끝낼 수 없다—내가 곧 시간이기 때문에."'},
  rust_tick:{id:'rust_tick',name:'녹슨 시계',type:'normal',cr:'#8B4513',glyph:'T',axis:55,maxAxis:55,cog:0,battery:0,speed:4,drops:['bleed','wound'],
    pat:[{t:'atk',v:6,lbl:'녹슨 침'},{t:'wound',v:4,lbl:'부식 상처'},{t:'atk',v:6,lbl:'녹슨 침'},{t:'bat',v:10,lbl:'부식 방전'}]},
  gear_hound:{id:'gear_hound',name:'기어 사냥개',type:'normal',cr:'#556644',glyph:'G',axis:50,maxAxis:50,cog:8,battery:0,speed:6,drops:['pierce','barrage'],
    pat:[{t:'multi',v:6,hits:2,lbl:'이중 물기'},{t:'shld',v:7,lbl:'강철 피부'},{t:'atk',v:9,lbl:'돌진'}]},
  steam_wraith:{id:'steam_wraith',name:'증기 망령',type:'normal',cr:'#334455',glyph:'S',axis:45,maxAxis:45,cog:0,battery:20,speed:5,drops:['drain','shock'],
    pat:[{t:'drain',v:4,lbl:'에너지 흡령'},{t:'bat',v:12,lbl:'증기 방전'},{t:'atk',v:8,lbl:'유체 타격'}]},
  clockwork_spider:{id:'clockwork_spider',name:'태엽 거미',type:'normal',cr:'#443322',glyph:'C',axis:40,maxAxis:40,cog:0,battery:0,speed:7,drops:['entropy','bleed'],
    pat:[{t:'wound',v:4,lbl:'독니'},{t:'multi',v:5,hits:3,lbl:'여섯 발 공격'},{t:'purge',v:4,lbl:'실 속박'}]},
  iron_herald:{id:'iron_herald',name:'철의 전령',type:'elite',cr:'#667788',glyph:'H',axis:120,maxAxis:120,cog:15,battery:0,speed:5,drops:['reinforce','crush'],
    pat:[{t:'shld',v:12,lbl:'철갑 방호'},{t:'shield_break',v:10,lbl:'방호 파쇄'},{t:'atk',v:11,lbl:'전령의 창'},{t:'debuff',v:4,lbl:'전령의 저주'}]},
  void_reaper:{id:'void_reaper',name:'공허 수확자',type:'elite',cr:'#442255',glyph:'R',axis:110,maxAxis:110,cog:5,battery:10,speed:6,drops:['execute2','finisher'],
    pat:[{t:'execute',v:13,lbl:'수확의 낫'},{t:'drain',v:4,lbl:'공허 흡수'},{t:'rage',v:11,lbl:'공허 격노'},{t:'bat',v:15,lbl:'공허 방전'}]},
  time_sentinel:{id:'time_sentinel',name:'시간 파수꾼',type:'elite',cr:'#334466',glyph:'W',axis:130,maxAxis:130,cog:20,battery:0,speed:4,drops:['timelock','phase_shield'],
    pat:[{t:'counter',v:4,lbl:'반격 태세'},{t:'phase',v:15,lbl:'시간 재생'},{t:'shield_break',v:11,lbl:'시간 관통'},{t:'atk',v:10,lbl:'파수꾼의 검'}]},
  entropy_beast:{id:'entropy_beast',name:'엔트로피 수괴',type:'elite',cr:'#553311',glyph:'E',axis:140,maxAxis:140,cog:0,battery:30,speed:5,drops:['entropy','overclock_heal'],
    pat:[{t:'overload',v:4,lbl:'혼돈 파동'},{t:'debuff',v:4,lbl:'엔트로피'},{t:'multi',v:9,hits:2,lbl:'혼돈 타격'},{t:'bat',v:16,lbl:'혼돈 방전'}]},
  boss_forge:{id:'boss_forge',name:'I - 용광로의 심장',type:'boss',cr:'#8B2000',glyph:'F',axis:180,maxAxis:180,cog:20,battery:0,speed:5,drops:['aegis','finisher'],
    pat:[{t:'atk',v:9,lbl:'용광로 타격'},{t:'bat',v:15,lbl:'용융 방전'},{t:'shield_break',v:11,lbl:'용융 관통'},{t:'rage',v:12,lbl:'용광로 격노'},{t:'nuke',v:16,lbl:'용광로 폭발'}]},
  boss_specter:{id:'boss_specter',name:'II - 시간의 망령',type:'boss',cr:'#223366',glyph:'P',axis:200,maxAxis:200,cog:10,battery:20,speed:6,drops:['timelock','resonance'],
    pat:[{t:'drain',v:4,lbl:'혼 흡수'},{t:'phase',v:12,lbl:'시간 역행'},{t:'debuff',v:4,lbl:'혼령 오염'},{t:'execute',v:14,lbl:'시간의 심판'},{t:'purge',v:4,lbl:'기억 소각'}]},
  boss_titan:{id:'boss_titan',name:'XIV - 강철 타이탄',type:'boss',cr:'#445566',glyph:'N',axis:260,maxAxis:260,cog:40,battery:0,speed:3,drops:['overhaul','aegis'],
    pat:[{t:'shld',v:17,lbl:'타이탄 방호'},{t:'shield_break',v:12,lbl:'철벽 붕괴'},{t:'atk',v:13,lbl:'타이탄 주먹'},{t:'counter',v:4,lbl:'타이탄 반격'},{t:'nuke',v:18,lbl:'타이탄 붕괴'}]},
  boss_omega:{id:'boss_omega',name:'XV - 오메가',type:'boss',cr:'#660066',glyph:'O',axis:300,maxAxis:300,cog:0,battery:0,speed:7,drops:['overclock2','finisher'],
    pat:[{t:'rage',v:16,lbl:'오메가 격노'},{t:'execute',v:17,lbl:'오메가 처형'},{t:'multi',v:11,hits:3,lbl:'오메가 연사'},{t:'debuff',v:4,lbl:'오메가 오염'},{t:'nuke',v:22,lbl:'오메가 코드'}]}
};

/* ═══════════════════════════════════════════════════════
   11-REALM NODE MAP GENERATOR
   각 구역: 8레이어 × 분기, 총 11구역
═══════════════════════════════════════════════════════ */
function buildRealmNodes(realmIdx){
  const mobPools=[
    ['tick','wraith'],['tick','wraith','specter'],['wraith','golem','rust_tick'],
    ['golem','specter','gear_hound'],['golem','automaton','steam_wraith'],
    ['specter','automaton','clockwork_spider'],['automaton','golem','rust_tick'],
    ['specter','automaton','gear_hound'],['automaton','golem','steam_wraith'],
    ['automaton','specter','clockwork_spider'],['automaton','specter','rust_tick'],
  ];
  const mobs=mobPools[realmIdx]||['tick','wraith'];
  const realm=REALMS[realmIdx];
  const nodes=[];
  const push=(id,type,row,col,cols,lbl,enemy=null)=>nodes.push({id,type,row,col,cols,lbl,enemy,next:[]});
  const con=(fromId,toIds)=>{const n=nodes.find(x=>x.id===fromId);if(n)n.next=[...new Set([...n.next,...toIds])];};
  const rnd=(arr)=>arr[Math.floor(Math.random()*arr.length)];
  const btl=(row,col,cols,id,mob)=>push(id,'battle',row,col,cols,typeLabel('battle'),mob||rnd(mobs));
  const spc=(types)=>rnd(types);

  // ROW 0: 시작
  push('s','start',0,1,3,'시작');

  // ROW 1: 초반 갈림길 (4분기)
  push('r1a','battle',1,0,4,typeLabel('battle'),mobs[0]);
  push('r1b','event', 1,1,4,typeLabel('event'));
  push('r1t','timerift',2,3,4,'시간 틈새');  // r2 행으로 이동
  push('r1c','rest',  1,2,4,typeLabel('rest'));
  push('r1d','battle',1,3,4,typeLabel('battle'),mobs[1]||mobs[0]);

  // ROW 2
  push('r2a','battle',    2,0,4,typeLabel('battle'),mobs[0]);
  push('r2b','blackmarket',2,1,4,typeLabel('blackmarket'));
  push('r2c','event',     2,2,4,typeLabel('event'));
  push('r2d','battle',    2,3,4,typeLabel('battle'),mobs[1]||mobs[0]);

  // ROW 3
  push('r3a','rest',    3,0,4,typeLabel('rest'));
  push('r3b','battle',  3,1,4,typeLabel('battle'),mobs[0]);
  push('r3c','enhance', 3,2,4,typeLabel('enhance'));
  push('r3d','abyss',   3,3,4,typeLabel('abyss'));

  // ROW 4: 첫 교차 + 정예
  push('r4a','ambush',  4,0,3,typeLabel('ambush'),mobs[0]);
  push('r4b','relic_shrine',4,1,3,typeLabel('relic_shrine'));
  push('r4c','elite_ambush',4,2,3,typeLabel('elite_ambush'),mobs[1]||mobs[0]);
  push('elite1','elite',4,2,3,typeLabel('elite'),mobs[mobs.length>1?1:0]);

  // ROW 5
  push('r5a','rest',    5,0,4,typeLabel('rest'));
  push('r5b','forge',   5,1,4,typeLabel('forge'));
  push('r5c','event',   5,2,4,typeLabel('event'));
  push('r5d','forest',  5,3,4,typeLabel('forest'));

  // ROW 6
  push('r6a','battle',  6,0,4,typeLabel('battle'),mobs[1]||mobs[0]);
  push('r6b','clinic',  6,1,4,typeLabel('clinic'));
  push('r6c','blackmarket',6,2,4,typeLabel('blackmarket'));
  push('r6d','abyss',   6,3,4,typeLabel('abyss'));

  // ROW 7: 정예 수렴 + 분기
  push('r7a','rest',      7,0,4,typeLabel('rest'));
  push('r7b','elite',     7,1,4,typeLabel('elite'),mobs[mobs.length>1?1:0]);
  push('r7c','shop',      7,2,4,typeLabel('shop'));
  push('r7d','salvage',   7,3,4,typeLabel('salvage'));
  push('r7s2','salvage2', 7,4,4,'고철 거래소');

  // ROW 8: 보스 클리어 후 분기
  push('r8a','rest',    8,0,4,typeLabel('rest'));
  push('r8b','hunter',  8,1,4,typeLabel('hunter'));
  push('r8c','relic_shrine',8,2,4,typeLabel('relic_shrine'));
  push('r8d','salvage', 8,3,4,typeLabel('salvage'));

  // ROW 9
  push('r9a','battle',  9,0,4,typeLabel('battle'),mobs[0]);
  push('r9b','event',   9,1,4,typeLabel('event'));
  push('r9c','forge',   9,2,4,typeLabel('forge'));
  push('r9d','battle',  9,3,4,typeLabel('battle'),mobs[1]||mobs[0]);

  // ROW 10: 정예 2차
  push('r10a','elite_ambush',10,0,3,typeLabel('elite_ambush'),mobs[mobs.length>1?1:0]);
  push('elite2','elite',10,1,3,typeLabel('elite'),mobs[0]);
  push('r10c','rest',  10,2,3,typeLabel('rest'));

  // ROW 11
  push('r11a','battle', 11,0,4,typeLabel('battle'),mobs[0]);
  push('r11b','gamble', 11,1,4,typeLabel('gamble'));
  push('r11c','clinic', 11,2,4,typeLabel('clinic'));
  push('r11d','abyss',  11,3,4,typeLabel('abyss'));

  // ROW 12
  push('r12a','forge',  12,0,4,typeLabel('forge'));
  push('r12b','battle', 12,1,4,typeLabel('battle'),mobs[1]||mobs[0]);
  push('r12c','event',  12,2,4,typeLabel('event'));
  push('r12d','implant',12,3,4,typeLabel('implant'));

  // ROW 13
  push('r13a','trial',  13,0,4,typeLabel('trial'));
  push('r13b','shop',   13,1,4,typeLabel('shop'));
  push('r13c','salvage',13,2,4,typeLabel('salvage'));
  push('r13d','battle', 13,3,4,typeLabel('battle'),mobs[1]||mobs[0]);

  // ROW 14: 정예 3차 수렴
  push('r14a','elite_ambush',14,0,3,typeLabel('elite_ambush'),mobs[0]);
  push('elite3','elite',14,1,3,typeLabel('elite'),mobs[mobs.length>1?1:0]);
  push('r14c','enhance',14,2,3,typeLabel('enhance'));

  // ROW 15
  push('r15a','battle', 15,0,4,typeLabel('battle'),mobs[0]);
  push('r15b','clinic', 15,1,4,typeLabel('clinic'));
  push('r15c','abyss',  15,2,4,typeLabel('abyss'));
  push('r15d','battle', 15,3,4,typeLabel('battle'),mobs[1]||mobs[0]);

  // ROW 16
  push('r16a','timegate',16,0,4,typeLabel('timegate'));
  push('r16b','forge',  16,1,4,typeLabel('forge'));
  push('r16c','event',  16,2,4,typeLabel('event'));
  push('r16d','shop',   16,3,4,typeLabel('shop'));

  // ROW 17: 최종 전 분기
  push('r17a','battle', 17,0,4,typeLabel('battle'),mobs[0]);
  push('r17b','blackmarket',17,1,4,typeLabel('blackmarket'));
  push('r17c','rest',   17,2,4,typeLabel('rest'));
  push('r17d','abyss',  17,3,4,typeLabel('abyss'));

  // ROW 17.5: 시계탑 (보스 직전)
  push('clocktow','clocktower',17,2,4,'시계탑');
  con('clocktow',['boss']);
  // ROW 18: 최종 보스 수렴
  push('boss','boss',18,1,3,typeLabel('boss'),'boss'+Math.min((realmIdx||0)+2,12));

  // ── 연결 ──
  // s → r1
  con('s',['r1a','r1b','r1c','r1d']);
  con('r1b',['r1t']); // r1b에서 시간틈새로
  con('r1t',['r2c','r2d']);
  // r1 → r2
  con('r1a',['r2a','r2b']); con('r1b',['r2a','r2b','r2c']); con('r1c',['r2b','r2c','r2d']); con('r1d',['r2c','r2d']);
  // r2 → r3
  con('r2a',['r3a','r3b']); con('r2b',['r3a','r3b','r3c']); con('r2c',['r3b','r3c','r3d']); con('r2d',['r3c','r3d']);
  // r3 → r4
  con('r3a',['r4a','r4b']); con('r3b',['r4a','r4b','r4c']); con('r3c',['r4b','r4c']); con('r3d',['r4b','r4c']);
  // r4 → r5
  con('r4a',['r5a','r5b']); con('r4b',['r5a','r5b','r5c']); con('r4c',['r5c','r5d']); con('elite1',['r5c','r5d']);
  // r5 → r6
  con('r5a',['r6a','r6b']); con('r5b',['r6a','r6b','r6c']); con('r5c',['r6b','r6c']); con('r5d',['r6c','r6d']);
  // r6 → r7
  con('r6a',['r7a','r7b']); con('r6b',['r7a','r7b','r7c']); con('r6c',['r7b','r7c','r7d']); con('r6d',['r7c','r7d','r7s2']);
  con('r7s2',['r8b','r8c']);
  // r7 → r8
  con('r7a',['r8a','r8b']); con('r7b',['r8a','r8b','r8c']); con('r7c',['r8b','r8c','r8d']); con('r7d',['r8c','r8d']);
  // r8 → r9
  con('r8a',['r9a','r9b']); con('r8b',['r9a','r9b','r9c']); con('r8c',['r9b','r9c','r9d']); con('r8d',['r9c','r9d']);
  // r9 → r10
  con('r9a',['r10a','elite2']); con('r9b',['r10a','elite2']); con('r9c',['elite2','r10c']); con('r9d',['elite2','r10c']);
  // r10 → r11
  con('r10a',['r11a','r11b']); con('elite2',['r11a','r11b','r11c']); con('r10c',['r11c','r11d']);
  // r11 → r12
  con('r11a',['r12a','r12b']); con('r11b',['r12a','r12b','r12c']); con('r11c',['r12b','r12c','r12d']); con('r11d',['r12c','r12d']);
  // r12 → r13
  con('r12a',['r13a','r13b']); con('r12b',['r13a','r13b','r13c']); con('r12c',['r13b','r13c','r13d']); con('r12d',['r13c','r13d']);
  // r13 → r14
  con('r13a',['r14a','elite3']); con('r13b',['r14a','elite3']); con('r13c',['elite3','r14c']); con('r13d',['elite3','r14c']);
  // r14 → r15
  con('r14a',['r15a','r15b']); con('elite3',['r15a','r15b','r15c']); con('r14c',['r15c','r15d']);
  // r15 → r16
  con('r15a',['r16a','r16b']); con('r15b',['r16a','r16b','r16c']); con('r15c',['r16b','r16c','r16d']); con('r15d',['r16c','r16d']);
  // r16 → r17
  con('r16a',['r17a','r17b']); con('r16b',['r17a','r17b','r17c']); con('r16c',['r17b','r17c','r17d']); con('r16d',['r17c','r17d']);
  // r17 → boss (최종 수렴)
  con('r17a',['clocktow']); con('r17b',['boss']); con('r17c',['boss']); con('r17d',['boss']);

  return nodes;
}

function typeLabel(t){return{start:'시작',battle:'전투',rest:'휴식',event:'사건',shop:'상점',elite:'정예',boss:'지배자',blackmarket:'암시장',ambush:'기습',elite_ambush:'정예기습',salvage:'폐기장',forge:'구축소',clinic:'의료실',implant:'이식소',abyss:'심연',forest:'숲',trial:'시험',gamble:'도박장',timegate:'시간의 문',hunter:'사냥꾼',enhance:'강화소',relic_shrine:'유물 제단'}[t]||t;}

/* ═══════════════════════════════════════════════════════
   EVENTS — 리스크/보상 시스템 (15종)
═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   NODE STORY DATABASE
═══════════════════════════════════════════════════════ */
const STORIES = {

battle: [
  [{speaker:'',text:'기계 소리. 가까워진다.'},{speaker:'',text:'피할 곳 없다. 싸워.'}],
  [{speaker:'',text:'경보가 울린다.'},{speaker:'',text:'대응 방식은 하나뿐이다.'}],
  [{speaker:'',text:'복도 끝에서 움직임이 감지됐다.'},{speaker:'',text:'먼저 치는 쪽이 산다.'}],
  [{speaker:'',text:'이 구역은 정리가 안 됐다.'},{speaker:'',text:'그래서 살아있는 것들이 숨어있다.'}],
  [{speaker:'',text:'발소리. 금속 마찰음.'},{speaker:'',text:'적이다.'}],
  [{speaker:'',text:'여기까지 오면서 몇 번이나 싸웠는지 셀 수 없다.'},{speaker:'',text:'이번이 마지막은 아닐 거다.'}],
  [{speaker:'',text:'시스템이 나를 인식했다.'},{speaker:'',text:'먼저다.'}],
  [{speaker:'',text:'기어가 돌아가는 소리가 멈췄다.'},{speaker:'',text:'뭔가 움직임을 감지했을 때다.'}],
],

elite: [
  [{speaker:'',text:'설계가 다르다.'},{speaker:'',text:'일반 기계가 아니야.'}],
  [{speaker:'',text:'강화 외피. 이중 반응 시스템.'},{speaker:'',text:'만든 자들이 공을 들였다.'}],
  [{speaker:'',text:'이전 구역과 다르다.'},{speaker:'',text:'집중해.'}],
  [{speaker:'',text:'움직임 패턴이 불규칙하다.'},{speaker:'',text:'읽기 어렵다는 뜻이다.'}],
  [{speaker:'',text:'조용하다.'},{speaker:'',text:'시끄러운 기계는 경고라도 준다.'}],
  [{speaker:'',text:'생존 확률 9.2퍼센트. 항복 권고합니다.'},{speaker:'',text:'됐어.'}],
  [{speaker:'',text:'바닥에 누군가의 무기들이 널려있다.'},{speaker:'',text:'여기서 끝난 사람들의 것이다.'}],
  [{speaker:'',text:'강적이다.'},{speaker:'',text:'그래서 지금 집중하고 있는 거다.'}],
],

boss: [
  [{speaker:'',text:'지배자. 이 구역의 끝이다.'},{speaker:'',text:'돌아갈 방법은 없다.'}],
  [{speaker:'지배자',text:'여기까지 올 줄은 몰랐다.'},{speaker:'',text:'시작하자.'}],
  [{speaker:'',text:'수백 년짜리 시스템이다.'},{speaker:'',text:'그래도 부숴본다.'}],
  [{speaker:'지배자',text:'왜 왔는가.'},{speaker:'',text:'와야 했으니까.'}],
  [{speaker:'경보',text:'최우선 위협 개체. 전력 집중 승인.'},{speaker:'',text:'나도 전력으로 간다.'}],
  [{speaker:'지배자',text:'이미 늦었다.'},{speaker:'',text:'그건 끝나봐야 안다.'}],
  [{speaker:'',text:'이 자를 넘으면 다음 구역이다.'},{speaker:'',text:'그것만 생각한다.'}],
  [{speaker:'지배자',text:'처음 온 자가 아니다.'},{speaker:'',text:'다른 결과를 내는 것도 처음은 아닐 거야.'}],
],

rest: [
  [{speaker:'',text:'잠깐 멈춘다.'},{speaker:'',text:'기계 소리가 잦아든다.'}],
  [{speaker:'',text:'여기는 조용하다.'},{speaker:'',text:'오래 있을 수는 없지만.'}],
  [{speaker:'',text:'숨 고를 곳이 생겼다.'},{speaker:'',text:'잠깐이지만 충분하다.'}],
  [{speaker:'',text:'상처를 들여다본다.'},{speaker:'',text:'나쁘지 않다.'}],
  [{speaker:'',text:'잠시 앉는다.'},{speaker:'',text:'이다음에 뭐가 있든.'}],
  [{speaker:'',text:'고요하다.'},{speaker:'',text:'잠깐이다.'}],
],

shop: [
  [{speaker:'상인',text:'어서 와. 오래 버텼네.'},{speaker:'',text:'뭐가 있는지 보자.'}],
  [{speaker:'상인',text:'골드만 있으면 뭐든 살 수 있어.'},{speaker:'',text:'다 믿지는 않는다.'}],
  [{speaker:'상인',text:'품질은 보장 못 해. 살아있는 것 자체가 기적인 구역이니까.'},{speaker:'',text:'그래도 필요한 건 필요하다.'}],
  [{speaker:'상인',text:'이 구역에서 장사하는 게 제정신은 아니지. 그래도 해.'},{speaker:'',text:'그 마음, 안다.'}],
  [{speaker:'상인',text:'뭐 찾는 거 있어?'},{speaker:'',text:'있으면 말해줄게.'}],
  [{speaker:'상인',text:'싸게 팔 수는 없어. 들여오는 것도 목숨 걸고 들여오거든.'},{speaker:'',text:'알겠다.'}],
],

event: [
  [{speaker:'',text:'예상하지 못한 무언가가 있다.'},{speaker:'',text:'선택해야 한다.'}],
  [{speaker:'',text:'이상한 기운이 감돈다.'},{speaker:'',text:'무시할 수 없는 쪽이다.'}],
  [{speaker:'',text:'낯선 공간.'},{speaker:'',text:'뭔가 있다.'}],
  [{speaker:'',text:'기회인지 위협인지 판단이 안 선다.'},{speaker:'',text:'직접 부딪힌다.'}],
  [{speaker:'',text:'예상 경로에서 벗어났다.'},{speaker:'',text:'그래도 진행한다.'}],
  [{speaker:'',text:'무언가가 나를 기다리고 있다.'},{speaker:'',text:'상관없다.'}],
],

blackmarket: [
  [{speaker:'목소리',text:'왔군.'},{speaker:'',text:'물건이 있으면 거래하자.'}],
  [{speaker:'',text:'여기는 기록이 없다.'},{speaker:'목소리',text:'그게 이 곳의 가치야.'}],
  [{speaker:'목소리',text:'원하는 게 있으면 값은 치러야 해.'},{speaker:'',text:'알아.'}],
  [{speaker:'',text:'시스템 밖의 거래다.'},{speaker:'',text:'이런 곳이 있다는 게 이상하지 않다.'}],
  [{speaker:'목소리',text:'조용히 해. 오래 있으면 안 돼.'},{speaker:'',text:'금방 끝낸다.'}],
],

ambush: [
  [{speaker:'',text:'갑자기.'},{speaker:'',text:'피할 시간 없다. 바로 응전.'}],
  [{speaker:'',text:'경보도 없었다.'},{speaker:'',text:'집중한다.'}],
  [{speaker:'',text:'뒤에서 소리가 났다.'},{speaker:'',text:'돌아본다.'}],
  [{speaker:'',text:'예상하지 못한 위치에서.'},{speaker:'',text:'그래도 준비는 됐다.'}],
  [{speaker:'',text:'덫이었다.'},{speaker:'',text:'알면서도 여기까지 왔다.'}],
],

elite_ambush: [
  [{speaker:'',text:'강한 것이 기다리고 있었다.'},{speaker:'',text:'어쩔 수 없다.'}],
  [{speaker:'',text:'이건 우연이 아니다.'},{speaker:'',text:'배치됐다.'}],
  [{speaker:'',text:'예상 외의 강적.'},{speaker:'',text:'그래도 방법을 찾는다.'}],
  [{speaker:'',text:'함정이다.'},{speaker:'',text:'빠져나가는 방법은 하나뿐이다. 뚫는 것.'}],
  [{speaker:'',text:'도망치면 이 구역을 못 벗어난다.'},{speaker:'',text:'싸운다.'}],
],

salvage: [
  [{speaker:'',text:'잔해들이 널려있다.'},{speaker:'',text:'쓸 만한 것이 있을지도.'}],
  [{speaker:'',text:'누군가 두고 간 것들이다.'},{speaker:'',text:'이제 내 것이다.'}],
  [{speaker:'',text:'고철 더미.'},{speaker:'',text:'그래도 보물이 있다.'}],
  [{speaker:'',text:'전투 흔적이 남아있다.'},{speaker:'',text:'승자는 없는 것 같다.'}],
  [{speaker:'',text:'여기선 버려진 것도 가치가 있다.'},{speaker:'',text:'잘 살펴본다.'}],
],

forge: [
  [{speaker:'기술자',text:'뭘 강화하고 싶어?'},{speaker:'',text:'여기 있는 것 보여줄게.'}],
  [{speaker:'기술자',text:'돈만 있으면 더 좋게 만들어줄 수 있어.'},{speaker:'',text:'그래.'}],
  [{speaker:'기술자',text:'오래된 카드일수록 강화 여지가 많지.'},{speaker:'',text:'맡겨볼게.'}],
  [{speaker:'',text:'대장간 소리.'},{speaker:'기술자',text:'어서 와.'}],
  [{speaker:'기술자',text:'시간이 걸려. 기다려.'},{speaker:'',text:'기다린다.'}],
],

clinic: [
  [{speaker:'',text:'의료실이다.'},{speaker:'',text:'여기서 회복할 수 있다.'}],
  [{speaker:'기계',text:'상태를 확인합니다.'},{speaker:'',text:'부탁한다.'}],
  [{speaker:'',text:'낡은 장비들이다.'},{speaker:'',text:'그래도 없는 것보단 낫다.'}],
  [{speaker:'기계',text:'처치 옵션을 선택하세요.'},{speaker:'',text:'보여줘.'}],
  [{speaker:'',text:'소독약 냄새.'},{speaker:'',text:'잠깐 멈출 수 있다.'}],
],

implant: [
  [{speaker:'',text:'강화 시술이 가능한 곳이다.'},{speaker:'',text:'대가는 있겠지만.'}],
  [{speaker:'의공사',text:'어디를 개조하고 싶어?'},{speaker:'',text:'생각해보자.'}],
  [{speaker:'',text:'금속이 살 아래로 들어간다.'},{speaker:'',text:'감각이 달라지기 시작한다.'}],
  [{speaker:'의공사',text:'되돌릴 수 없어.'},{speaker:'',text:'알아. 해줘.'}],
  [{speaker:'',text:'이 구역에서 개조는 생존 수단이다.'},{speaker:'',text:'한다.'}],
],

abyss: [
  [{speaker:'',text:'심연이다.'},{speaker:'',text:'바라보면 뭔가가 보인다. 아니면 보이는 것 같다.'}],
  [{speaker:'',text:'어둠 속에서 손이 닿을 것 같다.'},{speaker:'',text:'잡는다.'}],
  [{speaker:'',text:'이상한 공간이다.'},{speaker:'',text:'그래도 뭔가 있다.'}],
  [{speaker:'목소리',text:'오지 않는 게 나았을 텐데.'},{speaker:'',text:'왔으니까.'}],
  [{speaker:'',text:'여기는 위험하다.'},{speaker:'',text:'알면서 왔다.'}],
],

};

// 노드별 VN 대사 — STORIES에 추가할 키들
const NODE_STORIES = {

forest: [
  [{speaker:'나',text:'기어와 식물이 공존하는 공간이다. 처음엔 어울리지 않는다고 생각했다. 하지만 오래 보면 알게 된다. 이것들은 서로를 필요로 하고 있다. 기어가 없으면 식물이 지지대를 잃고, 식물이 없으면 기어가 부식된다.'},{speaker:'나',text:'아이러니하지만, 이 구역에서 가장 아름다운 장소다.'}],
  [{speaker:'환경',text:'바람이 분다. 기계 소리가 아니라, 진짜 바람이. 금속 잎사귀들이 부딪히며 내는 소리가 멀리서 들린다.'},{speaker:'나',text:'이 소리를 마지막으로 들은 게 언제였지. 기억이 나지 않는다. 그게 슬픈 건지, 아니면 이제야 다시 듣게 된 게 기쁜 건지. 둘 다인 것 같다.'}],
  [{speaker:'나',text:'치유초라고 불리는 것이 있다. 뿌리가 기어를 감고, 잎은 기름을 흡수해서 에너지로 변환한다. 이 구역에서 살아남는 방식을 스스로 찾아낸 것이다.'},{speaker:'나',text:'나도 그래야 한다. 이 구역에 맞는 방식으로. 억지로 인간의 방식만 고집하지 말고.'}],
],

trial: [
  [{speaker:'목소리',text:'평가받을 준비가 됐는가.'},{speaker:'나',text:'준비라는 게 언제 완성되는지 모르겠다. 하지만 기다리는 것도 방법이 아니야.'},{speaker:'목소리',text:'그 대답이 이미 평가의 시작이다.'}],
  [{speaker:'나',text:'시험이라는 말이 낯설다. 이 구역에 온 후로 매 순간이 시험이었는데, 공식적인 시험이라고 특별히 다른 것도 아니다.'},{speaker:'목소리',text:'다르다. 이 시험에는 기준이 있다. 그 기준을 누가 세웠는지는 중요하지 않다. 기준은 존재한다.'},{speaker:'나',text:'좋아. 해보자.'}],
  [{speaker:'목소리',text:'당신은 지금까지 어떻게 살아남았는가.'},{speaker:'나',text:'잘 모르겠다. 운, 선택, 그리고 포기하지 않은 것. 이 셋이 전부인 것 같다.'},{speaker:'목소리',text:'그것으로 충분하다. 시작하라.'}],
],

gamble: [
  [{speaker:'딜러',text:'앉아. 게임은 이미 시작됐어. 이 구역에 발을 디딘 순간부터.'},{speaker:'나',text:'철학적이네.'},{speaker:'딜러',text:'오래 살아남으면 다 이렇게 돼. 베팅할 거야, 말 거야?'}],
  [{speaker:'나',text:'도박은 싫어하지만, 이 구역 자체가 거대한 도박이다. 매일 아침 살아서 눈을 뜨는 것 자체가 도박의 결과다.'},{speaker:'딜러',text:'그래서 이미 익숙하잖아. 앉아.'}],
  [{speaker:'딜러',text:'승률이 어떻든 중요하지 않아. 중요한 건 테이블에 앉느냐, 마느냐야.'},{speaker:'나',text:'무슨 뜻이야.'},{speaker:'딜러',text:'앉지 않으면 이기거나 질 기회조차 없잖아. 그게 더 무서운 거야.'}],
],

timegate: [
  [{speaker:'나',text:'이 문 앞에 서면 시간이 다르게 흐른다. 과거의 기억이 현재와 섞이고, 미래의 가능성이 발 아래로 느껴진다. 이상한 곳이다.'},{speaker:'목소리',text:'이상한 게 아니야. 여기가 원래 시간의 본모습이야. 선형으로 흐르는 척 하는 게 이상한 거지.'}],
  [{speaker:'나',text:'과거로 돌아가면 달라질 것들이 있다. 많이. 하지만 그 선택들이 없었다면 지금의 내가 없다.'},{speaker:'목소리',text:'그래서 돌아가고 싶지 않은 건가, 아니면 돌아가도 같은 선택을 할 것 같은 건가.'},{speaker:'나',text:'...모르겠다. 아마 둘 다.'}],
  [{speaker:'목소리',text:'미래를 보여줄 수 있다. 대가가 따르지만.'},{speaker:'나',text:'미래를 알면 뭐가 달라져.'},{speaker:'목소리',text:'준비할 수 있어. 두렵지 않게 될 수도 있어.'},{speaker:'나',text:'두렵지 않은 건 흥미롭지 않아. 나는 두려우면서 가는 게 더 낫다.'}],
],

hunter: [
  [{speaker:'사냥꾼',text:'움직이지 마. 네가 뭔지 파악하는 중이야.'},{speaker:'나',text:'파악됐어?'},{speaker:'사냥꾼',text:'...위험하지만, 적이 아닌 것 같아. 처음 보는 조합이야.'},{speaker:'나',text:'나도 나 자신이 뭔지 잘 모르겠어.'}],
  [{speaker:'사냥꾼',text:'이 구역에서 살아있는 사람은 드물어. 당신은 어떻게 여기까지 왔어.'},{speaker:'나',text:'걸어서.'},{speaker:'사냥꾼',text:'...그 대답이 맘에 들어.'}],
  [{speaker:'사냥꾼',text:'나는 이 구역의 것들을 사냥해. 기계도, 때로는 사람도.'},{speaker:'나',text:'나도 사냥 대상이야?'},{speaker:'사냥꾼',text:'아직 결정 못 했어. 당신이 어떻게 하느냐에 달려있어.'},{speaker:'나',text:'공정하네. 나도 같은 식으로 결정하겠어.'}],
],

};


const NODE_STORIES_EXTRA = {
  enhance: [
    [{speaker:'기술자',text:'뭘 강화해줄까.'},{speaker:'',text:'잘 보자.'}],
    [{speaker:'기술자',text:'카드 하나 보여줘봐.'},{speaker:'',text:'이게 제일 나을 것 같다.'}],
  ],
  relic_shrine: [
    [{speaker:'',text:'뭔가 있다.'},{speaker:'',text:'손을 뻗어본다.'}],
    [{speaker:'',text:'오래된 것이다.'},{speaker:'',text:'쓸 수 있을지 모르겠다. 해보자.'}],
  ],
};
function rndStory(type){
  const extra=NODE_STORIES_EXTRA[type];
  if(extra)return extra[Math.floor(Math.random()*extra.length)];
  const pool=NODE_STORIES[type]||STORIES[type]||STORIES.event;
  return pool[Math.floor(Math.random()*pool.length)];
}


/* ═══════════════════════════════════════════════════════
   STORY DIALOG ENGINE
   showStory(lines, onDone)
   lines = [{speaker:'화자', text:'대사'}, ...]
   onDone = 대사 완료 후 콜백
═══════════════════════════════════════════════════════ */
const SD={
  _lines:[],_idx:0,_typing:false,_timer:null,_cb:null,_full:false,
  _ov:null,_txt:null,_spk:null,_prog:null,_dots:null,

  init(){
    this._ov  = document.getElementById('story-overlay');
    this._box = document.getElementById('story-box');
    this._txt = document.getElementById('story-text');
    this._spk = document.getElementById('story-speaker');
    this._prog= document.getElementById('story-progress');
    this._dots= document.getElementById('story-dots');
    // 스페이스바 / 탭
    document.addEventListener('keydown', e=>{
      if(!this._ov||!this._ov.classList.contains('on'))return;
      if(e.code==='Space'||e.code==='Tab'){e.preventDefault();this.advance();}
    });
    // 탭(터치) - story-box 클릭
    if(this._box) this._box.addEventListener('click',()=>this.advance());
    // 스킵 버튼
    const skipBtn=document.createElement('button');
    skipBtn.textContent='SKIP';
    skipBtn.style.cssText='position:absolute;top:10px;right:12px;background:transparent;'+
      'border:1px solid rgba(255,215,0,.25);border-radius:3px;color:rgba(255,215,0,.4);'+
      'font-size:8px;font-family:"Share Tech Mono",monospace;letter-spacing:.15em;'+
      'cursor:pointer;padding:3px 8px;transition:all .15s;';
    skipBtn.onmouseenter=()=>skipBtn.style.color='rgba(255,215,0,.8)';
    skipBtn.onmouseleave=()=>skipBtn.style.color='rgba(255,215,0,.4)';
    skipBtn.onclick=(e)=>{e.stopPropagation();this._finish();};
    if(this._ov) this._ov.appendChild(skipBtn);
  },

  show(lines, cb){
    if(!this._ov)this.init();
    this._lines=[...lines];this._idx=0;this._cb=cb||null;
    this._ov.classList.add('on');
    this._buildDots();
    this._render();
  },

  _buildDots(){
    if(!this._dots)return;
    this._dots.innerHTML='';
    this._lines.forEach((_,i)=>{
      const d=document.createElement('span');
      d.className='s-dot'+(i===0?' cur':'');
      this._dots.appendChild(d);
    });
  },

  _updateDots(){
    if(!this._dots)return;
    Array.from(this._dots.children).forEach((d,i)=>{
      d.className='s-dot'+(i<this._idx?'done':i===this._idx?'cur':'');
    });
  },

  _render(){
    const line=this._lines[this._idx];
    if(!line){this._finish();return;}
    if(this._spk) this._spk.textContent=line.speaker||'';
    // 진행 바
    const pct=Math.round((this._idx/(this._lines.length))*100);
    if(this._prog) this._prog.style.width=pct+'%';
    this._updateDots();
    // 타이핑 시작
    this._typeText(line.text||'');
  },

  _typeText(text){
    if(!this._txt)return;
    this._full=false;this._typing=true;
    let i=0;
    const cursor='<span id="story-cursor"></span>';
    const tick=()=>{
      if(i>text.length){this._typing=false;this._full=true;
        this._txt.innerHTML=text+cursor;return;}
      this._txt.innerHTML=text.slice(0,i)+cursor;
      i++;
      // 문장부호에서 잠깐 멈춤
      const ch=text[i-1];
      const delay=ch==='.'||ch==='!'||ch==='?'||ch==='…'?90:
                   ch===','||ch==='—'?55:28;
      this._timer=setTimeout(tick, delay);
    };
    clearTimeout(this._timer);tick();
  },

  advance(){
    if(this._typing&&!this._full){
      // 타이핑 중 → 즉시 전체 표시
      clearTimeout(this._timer);this._typing=false;this._full=true;
      const line=this._lines[this._idx];
      if(this._txt&&line) this._txt.innerHTML=(line.text||'')+'<span id="story-cursor"></span>';
      return;
    }
    // 다음 줄
    this._idx++;
    if(this._idx>=this._lines.length){this._finish();return;}
    this._render();
  },

  _finish(){
    if(this._ov) this._ov.classList.remove('on');
    if(this._txt) this._txt.innerHTML='';
    this._lines=[];this._idx=0;
    const cb=this._cb;this._cb=null;
    if(GS&&GS.screen==='field'){const _ff=document.getElementById('fui');if(_ff){_ff.style.opacity='';_ff.style.pointerEvents='';}} if(cb) cb();
  }
};

const EVENTS=[
    {
    title:'수상한 그림자',
    body:'어둠 속에서 시선이 느껴진다. 위치가 노출됐을 수도 있다.',
    options:[
      {label:'조용히 이동한다 (HP -10)',tag:'선택',type:'neutral',
       fx:(s)=>({s:{...s,player:{...s.player,axis:Math.max(1,s.player.axis-10)}},msg:'조심스럽게 빠져나왔다.'})},
      {label:'맞선다 — 기습 전투',tag:'위험',type:'danger',
       fx:(s)=>{setTimeout(()=>_battleEnterFade('ambush_scout'),200);return{s,msg:'적이 달려든다!'};}},
      {label:'황금 -20으로 도망친다',tag:'도주',type:'neutral',
       fx:(s)=>(s.gold>=20?{s:{...s,gold:s.gold-20},msg:'황금을 흘리며 도망쳤다.'}:{s,msg:'황금도 없다.'})},
    ]
  },
  {
    title:'녹슨 처형 기구',
    body:'거대한 처형 기구가 앞을 가로막는다. 기계는 아직 살아 있다. 당신의 축을 원하고 있다.',
    options:[
      {label:'축 20을 희생하고 전설 카드를 획득한다',tag:'위험',type:'danger',
       fx:(s)=>{if(s.player.axis<=20)return{msg:'축이 부족하다. 기구가 비웃는다.',s};const leg=['sacr','doom','zero','delay'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,player:{...st.player,axis:st.player.axis-20},deck:[...st.deck,mkCard(leg)]}));return{msg:`축 -20. [${CARDS[leg]?.name||leg}] 획득.`,s};}},
      {label:'돌아선다',tag:'안전',type:'neutral',fx:(s)=>({msg:'기구가 멀어진다. 당신은 살았다.',s})},
    ]
  },
  {
    title:'째깍이는 기계 장치',
    body:'수백 년은 된 것 같은 장치가 혼자 작동 중이다. 손을 대면 어떤 일이 생길까.',
    options:[
      {label:'장치를 건드린다 (50%: 최대 HP+20 / 50%: 현재 HP 절반)',tag:'도박',type:'danger',
       fx:(s)=>{if(Math.random()<.5){s=upd(s,st=>({...st,player:{...st.player,maxAxis:st.player.maxAxis+20,axis:st.player.axis+20}}));return{msg:'장치가 당신을 강화했다. 최대 축 +20.',s};}else{s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,Math.floor(st.player.axis/2))}}));return{msg:'장치가 폭발했다. 축이 절반으로 줄었다.',s};}}},
      {label:'그냥 지나친다',tag:'안전',type:'neutral',fx:(s)=>({msg:'현명한 판단이다.',s})},
    ]
  },
  {
    title:'시간 상인의 그림자',
    body:'어둠 속에서 누군가 속삭인다. 거래를 제안하고 있다. 황금과 카드를 맞바꾸겠다고.',
    options:[
      {label:'황금 50을 내고 랜덤 희귀 카드를 받는다',tag:'거래',type:'gold',
       fx:(s)=>{if((s.gold||0)<50)return{msg:'황금이 부족하다. 그림자가 사라진다.',s};const pool=SHOP_P||['sacr'];const id=pool[Math.floor(Math.random()*pool.length)];s=upd(s,st=>({...st,gold:st.gold-50,deck:[...st.deck,mkCard(id)]}));return{msg:`황금 -50. [${CARDS[id]?.name||id}] 획득.`,s};}},
      {label:'거래를 거절한다',tag:'거절',type:'neutral',fx:(s)=>({msg:'그림자가 조용히 사라진다.',s})},
    ]
  },
  {
    title:'잊혀진 기사의 유물',
    body:'쓰러진 갑옷 안에 카드 묶음이 있다. 오래된 전사의 마지막 유산. 가져갈 것인가.',
    options:[
      {label:'유물을 모두 가져간다 (덱+2장, 하지만 축 -10)',tag:'탐욕',type:'danger',
       fx:(s)=>{const ids=['fort','tshield','cog','axis'];const a=ids[Math.floor(Math.random()*ids.length)];const b=ids[Math.floor(Math.random()*ids.length)];s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-10)},deck:[...st.deck,mkCard(a),mkCard(b)]}));return{msg:`유물 2장 획득. 축 -10. [${CARDS[a]?.name||a}], [${CARDS[b]?.name||b}].`,s};}},
      {label:'카드 하나만 조심스럽게 가져간다',tag:'신중',type:'gold',
       fx:(s)=>{const id=['fort','tshield','cog'][Math.floor(Math.random()*3)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`[${CARDS[id]?.name||id}] 획득. 나머지는 그자리에 두었다.`,s};}},
      {label:'건드리지 않는다',tag:'존중',type:'neutral',fx:(s)=>({msg:'죽은 전사의 물건이다. 건드리지 않는다.',s})},
    ]
  },
  {
    title:'시간의 제단',
    body:'고대 제단이 빛나고 있다. 무언가를 바치면 보상이 온다고 새겨져 있다.',
    options:[
      {label:'황금 30을 바친다 (축 +25 회복)',tag:'헌납',type:'gold',
       fx:(s)=>{if((s.gold||0)<30)return{msg:'황금이 부족하다.',s};s=upd(s,st=>({...st,gold:st.gold-30,player:{...st.player,axis:Math.min(st.player.maxAxis,st.player.axis+25)}}));return{msg:'황금 -30. 축 +25 회복됐다.',s};}},
      {label:'카드 1장을 바친다 (황금 +60)',tag:'희생',type:'danger',
       fx:(s)=>{if(!s.deck.length)return{msg:'덱이 비어 있다.',s};const card=s.deck[Math.floor(Math.random()*s.deck.length)];s=upd(s,st=>({...st,deck:st.deck.filter(c=>c.uid!==card.uid),gold:(st.gold||0)+60}));return{msg:`[${card.name}] 소각. 황금 +60.`,s};}},
      {label:'지나친다',tag:'무시',type:'neutral',fx:(s)=>({msg:'제단이 꺼진다.',s})},
    ]
  },
  {
    title:'부서진 기억 저장소',
    body:'반파된 저장소가 아직 작동하고 있다. 잃어버린 기술이 여기 있을지도 모른다.',
    options:[
      {label:'접속을 시도한다 (70%: 고급 카드 / 30%: 방전 +30)',tag:'해킹',type:'danger',
       fx:(s)=>{if(Math.random()<.7){const id=['warp','loop','tshield','overclock'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`접속 성공. [${CARDS[id]?.name||id}] 획득.`,s};}else{s=upd(s,st=>({...st,player:{...st.player,battery:Math.min(100,(st.player.battery||0)+30)}}));return{msg:'역추적 당했다. 방전 +30.',s};}}},
      {label:'포기한다',tag:'안전',type:'neutral',fx:(s)=>({msg:'저장소가 서서히 꺼진다.',s})},
    ]
  },
  {
    title:'기어 수집가의 시체',
    body:'바닥에 쓰러진 자의 품에 황금이 있다. 수집가였던 것 같다. 가져갈 것인가.',
    options:[
      {label:'황금을 가져간다 (+40~80 황금)',tag:'약탈',type:'gold',
       fx:(s)=>{const g=40+Math.floor(Math.random()*41);s=upd(s,st=>({...st,gold:(st.gold||0)+g}));return{msg:`황금 +${g}. 죽은 자는 더 이상 필요 없다.`,s};}},
      {label:'카드도 챙긴다 (황금+20, 랜덤 카드+1, 축-8)',tag:'탐욕',type:'danger',
       fx:(s)=>{const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,gold:(st.gold||0)+20,deck:[...st.deck,mkCard(id)],player:{...st.player,axis:Math.max(1,st.player.axis-8)}}));return{msg:`황금 +20, [${CARDS[id]?.name||id}] 획득. 하지만 과욕의 대가 — 축 -8.`,s};}},
      {label:'건드리지 않는다',tag:'존중',type:'neutral',fx:(s)=>({msg:'그냥 지나친다.',s})},
    ]
  },
  {
    title:'증기 폭발 직전의 파이프',
    body:'균열이 간 파이프에서 증기가 새고 있다. 폭발하기 전에 처리할 수 있다.',
    options:[
      {label:'파이프를 막는다 (축 -12, 이후 전투에서 적 HP-15%)',tag:'희생',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-12)}}));return{msg:'파이프를 막았다. 축 -12. 이 구역 적들이 약해졌다.',s};}},
      {label:'폭발을 유도한다 (황금+30, 소음으로 위험 증가)',tag:'도박',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+30}));return{msg:'폭발로 인해 부품들이 튀었다. 황금 +30. 하지만 기계들이 눈치챘을 것이다.',s};}},
      {label:'피해서 지나간다',tag:'안전',type:'neutral',fx:(s)=>({msg:'폭발을 피했다. 뒤에서 굉음이 들린다.',s})},
    ]
  },
  {
    title:'반란군의 전언',
    body:'벽 틈에 숨겨진 쪽지. 반란군이 남긴 것이다. 좌표와 암호가 적혀 있다.',
    options:[
      {label:'암호를 해독한다 (황금+50, 하지만 위치 노출 위험)',tag:'해독',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+50}));return{msg:'암호 해독 성공. 황금 +50. 하지만 신호가 감지됐을 수도 있다.',s};}},
      {label:'좌표만 기억하고 쪽지는 태운다',tag:'신중',type:'neutral',
       fx:(s)=>({msg:'쪽지가 재가 됐다. 좌표는 기억한다.',s})},
      {label:'무시한다',tag:'안전',type:'neutral',fx:(s)=>({msg:'남의 전쟁이다.',s})},
    ]
  },
  {
    title:'시간이 멈춘 시계탑',
    body:'시계탑 바늘이 멈춰 있다. 수십 년째. 이 안에 뭔가 있다고 직감이 말한다.',
    options:[
      {label:'바늘을 다시 돌린다 (랜덤: 대박 or 폭탄)',tag:'도박',type:'danger',
       fx:(s)=>{const r=Math.random();if(r<0.33){const leg=['sacr','doom','zero','delay','loop'][Math.floor(Math.random()*5)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(leg)]}));return{msg:`시계가 다시 돌아갔다. 시간이 선물을 줬다. [${CARDS[leg]?.name||leg}] 획득.`,s};}else if(r<0.66){s=upd(s,st=>({...st,gold:(st.gold||0)+80}));return{msg:'멈춘 시간 속에 황금이 있었다. 황금 +80.',s};}else{s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-30)}}));return{msg:'역류가 일어났다. 시간이 당신을 거슬렀다. 축 -30.',s};}}},
      {label:'탑을 조사한다 (황금+30)',tag:'탐색',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+30}));return{msg:'탑 안에서 황금 조각들을 발견했다. 황금 +30.',s};}},
      {label:'멈춘 것은 그대로 둔다',tag:'안전',type:'neutral',fx:(s)=>({msg:'멈춘 것에는 이유가 있다.',s})},
    ]
  },
  {
    title:'쓰러진 감시자',
    body:'순찰 기계가 바닥에 쓰러져 있다. 아직 완전히 비활성화되지 않았다.',
    options:[
      {label:'코어를 뽑아간다 (황금+60, 소음 위험)',tag:'해체',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+60}));return{msg:'코어를 해체했다. 황금 +60. 소리가 컸다.',s};}},
      {label:'정보를 추출한다 (덱에 랜덤 카드+1)',tag:'해킹',type:'gold',
       fx:(s)=>{const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`메모리 추출 성공. [${CARDS[id]?.name||id}] 획득.`,s};}},
      {label:'건드리지 않고 지나간다',tag:'신중',type:'neutral',fx:(s)=>({msg:'쓰러진 것에 손대지 않는다.',s})},
    ]
  },
  {
    title:'독성 안개 지대',
    body:'앞에 짙은 안개가 깔려 있다. 냄새가 다르다. 화학적이다. 위험하다.',
    options:[
      {label:'강행 돌파 (축 -18, 반대편에서 황금+40)',tag:'강행',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-18)},gold:(st.gold||0)+40}));return{msg:'독안개를 뚫었다. 축 -18. 반대편에 물자가 있었다. 황금 +40.',s};}},
      {label:'우회로를 찾는다 (카드 1장 소모, 안전 통과)',tag:'우회',type:'danger',
       fx:(s)=>{if(!s.deck.length)return{msg:'덱이 비어 있다. 강행한다. 축 -18.',s};const card=s.deck[s.deck.length-1];s=upd(s,st=>({...st,deck:st.deck.slice(0,-1)}));return{msg:`[${card.name}]을 소모해 우회로를 뚫었다.`,s};}},
      {label:'되돌아간다',tag:'포기',type:'neutral',fx:(s)=>({msg:'안개가 걷힐 때까지 기다린다.',s})},
    ]
  },
  {
    title:'폐허 속 연구소',
    body:'무너진 연구소 안에 실험 장비들이 남아 있다. 인간의 기억이 담긴 장치들.',
    options:[
      {label:'실험을 재현한다 (최대 축 +15, 50%: 방전 +20)',tag:'실험',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,maxAxis:st.player.maxAxis+15,axis:Math.min(st.player.maxAxis+15,st.player.axis+15)}}));if(Math.random()<.5){s=upd(s,st=>({...st,player:{...st.player,battery:Math.min(100,(st.player.battery||0)+20)}}));return{msg:'최대 축 +15. 하지만 과부하가 걸렸다. 방전 +20.',s};}return{msg:'최대 축 +15. 실험이 성공했다.',s};}},
      {label:'자료만 챙긴다 (황금+45)',tag:'수집',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+45}));return{msg:'자료를 황금으로 환산했다. 황금 +45.',s};}},
      {label:'건드리지 않는다',tag:'신중',type:'neutral',fx:(s)=>({msg:'과거의 실험에 손대지 않는다.',s})},
    ]
  },
  {
    title:'잠든 거인 기계',
    body:'거대한 기계가 전원이 꺼진 채 서 있다. 깨우면 어떻게 될지 모른다.',
    options:[
      {label:'깨운다 — 운에 맡긴다',tag:'도박',type:'danger',
       fx:(s)=>{const r=Math.random();if(r<0.4){const g=80+Math.floor(Math.random()*81);s=upd(s,st=>({...st,gold:(st.gold||0)+g}));return{msg:`거인이 당신을 우군으로 인식했다. 황금 +${g}.`,s};}else if(r<0.7){s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-25)}}));return{msg:'거인이 공격했다. 축 -25.',s};}else{s=upd(s,st=>({...st,deck:[...st.deck,mkCard('fort')]}));return{msg:'거인이 당신에게 방어 회로를 넘겼다. [철갑 요새] 획득.',s};}}},
      {label:'부품만 조심스럽게 빼낸다 (황금+35)',tag:'해체',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+35}));return{msg:'잠든 채로 해체했다. 황금 +35.',s};}},
      {label:'깨우지 않고 지나간다',tag:'신중',type:'neutral',fx:(s)=>({msg:'자는 것은 건드리지 않는다.',s})},
    ]
  },
  {
    title:'기억 증류기',
    body:'인간의 기억을 에너지로 변환하는 장치가 돌아가고 있다. 당신의 기억을 바치면 무언가를 얻는다.',
    options:[
      {label:'오래된 기억을 바친다 (최대 축 -10, 고급 카드+1)',tag:'희생',type:'danger',
       fx:(s)=>{const id=['warp','loop','overclock','sbolt'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,player:{...st.player,maxAxis:Math.max(20,st.player.maxAxis-10)},deck:[...st.deck,mkCard(id)]}));return{msg:`기억을 바쳤다. 최대 축 -10. [${CARDS[id]?.name||id}] 획득.`,s};}},
      {label:'황금을 바친다 (황금-40, 축 완전 회복)',tag:'회복',type:'gold',
       fx:(s)=>{if((s.gold||0)<40)return{msg:'황금이 부족하다.',s};s=upd(s,st=>({...st,gold:st.gold-40,player:{...st.player,axis:st.player.maxAxis}}));return{msg:'황금 -40. 축이 완전히 회복됐다.',s};}},
      {label:'바치지 않는다',tag:'거부',type:'neutral',fx:(s)=>({msg:'기억은 내 것이다.',s})},
    ]
  },
  {
    title:'추락한 정찰기',
    body:'정찰 기계가 추락해 있다. 아직 데이터 링크가 살아있다. 접속하면 정보를 얻는다.',
    options:[
      {label:'데이터를 추출한다 (황금+70, 위치 노출 30%)',tag:'해킹',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+70}));if(Math.random()<0.3){s=upd(s,st=>({...st,player:{...st.player,battery:Math.min(100,(st.player.battery||0)+25)}}));return{msg:'데이터 추출 성공. 황금 +70. 하지만 역추적 신호 감지. 방전 +25.',s};}return{msg:'데이터 추출 성공. 황금 +70.',s};}},
      {label:'엔진 부품을 가져간다 (덱+1 랜덤 카드)',tag:'해체',type:'gold',
       fx:(s)=>{const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`엔진 부품을 분리했다. [${CARDS[id]?.name||id}] 획득.`,s};}},
      {label:'지나친다',tag:'안전',type:'neutral',fx:(s)=>({msg:'추락한 것에는 이유가 있다.',s})},
    ]
  },
  {
    title:'떠도는 상인 자동기계',
    body:'자동 판매 기계가 떠돌고 있다. 물건을 팔려는 것 같다. 하지만 이 구역에 왜 있는 건지 모른다.',
    options:[
      {label:'구매한다 — 황금 60에 전설 카드',tag:'구매',type:'gold',
       fx:(s)=>{if((s.gold||0)<60)return{msg:'황금이 부족하다. 기계가 지나친다.',s};const leg=['sacr','doom','zero','delay','loop'][Math.floor(Math.random()*5)];s=upd(s,st=>({...st,gold:st.gold-60,deck:[...st.deck,mkCard(leg)]}));return{msg:`황금 -60. [${CARDS[leg]?.name||leg}] 획득.`,s};}},
      {label:'기계를 해체해서 부품을 가져간다 (황금+40)',tag:'해체',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+40}));return{msg:'기계를 분해했다. 황금 +40.',s};}},
      {label:'무시한다',tag:'무시',type:'neutral',fx:(s)=>({msg:'기계가 다른 방향으로 떠난다.',s})},
    ]
  },
  {
    title:'비밀 작전 기록',
    body:'암호화된 작전 기록을 발견했다. 해독하면 유용한 정보가 나올 것이다.',
    options:[
      {label:'해독한다 (황금+50, 50%: 추가로 카드 1장)',tag:'해독',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+50}));if(Math.random()<.5){const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`작전 기록 해독. 황금 +50. 숨겨진 정보에서 [${CARDS[id]?.name||id}] 획득.`,s};}return{msg:'작전 기록 해독. 황금 +50.',s};}},
      {label:'태운다 — 적들이 모르게',tag:'파괴',type:'neutral',fx:(s)=>({msg:'기록이 재가 됐다. 적들도 이 정보를 모른다.',s})},
    ]
  },
  {
    title:'부상당한 반란군',
    body:'벽에 기댄 부상자. 반란군의 상징이 새겨진 갑옷. 아직 숨이 붙어 있다.',
    options:[
      {label:'치료한다 (황금-20, 축 +20, 그에게서 카드 1장)',tag:'치료',type:'gold',
       fx:(s)=>{if((s.gold||0)<20)return{msg:'황금이 없다. 그가 당신의 눈을 본다.',s};const id=['chain','dual','wound','fort'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,gold:st.gold-20,player:{...st.player,axis:Math.min(st.player.maxAxis,st.player.axis+20)},deck:[...st.deck,mkCard(id)]}));return{msg:`치료했다. 황금 -20. 축 +20. 감사의 표시로 [${CARDS[id]?.name||id}]를 받았다.`,s};}},
      {label:'그의 장비를 가져간다 (황금+35)',tag:'약탈',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+35}));return{msg:'살 수 없는 자의 장비를 챙겼다. 황금 +35.',s};}},
      {label:'그냥 지나간다',tag:'외면',type:'neutral',fx:(s)=>({msg:'그의 눈을 외면하며 지나쳤다.',s})},
    ]
  },
  {
    title:'과부하된 에너지 수정',
    body:'수정이 위험하게 빛나고 있다. 에너지가 넘쳐흘러 공간이 흔들린다.',
    options:[
      {label:'에너지를 흡수한다 (방전 -40, 축 -10)',tag:'흡수',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,battery:Math.max(0,(st.player.battery||0)-40),axis:Math.max(1,st.player.axis-10)}}));return{msg:'에너지를 흡수했다. 방전 -40. 하지만 과부하가 몸에 왔다. 축 -10.',s};}},
      {label:'수정을 폭발시킨다 (황금+45, 축 -5)',tag:'폭파',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-5)},gold:(st.gold||0)+45}));return{msg:'수정을 폭파했다. 황금 +45. 파편에 축 -5.',s};}},
      {label:'피해서 지나간다',tag:'안전',type:'neutral',fx:(s)=>({msg:'수정이 서서히 안정된다.',s})},
    ]
  },
  {
    title:'공허한 지휘 센터',
    body:'지휘 시스템이 비어 있다. 운영자가 사라졌다. 시스템에 접근하면 뭔가 바꿀 수 있다.',
    options:[
      {label:'적의 순찰 경로를 흐트러뜨린다 (황금+60)',tag:'교란',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+60}));return{msg:'순찰 경로가 혼란에 빠졌다. 황금 +60.',s};}},
      {label:'비상 물자를 해제한다 (카드 2장 획득, 축 -15)',tag:'해제',type:'danger',
       fx:(s)=>{const a=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id,b=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,deck:[...st.deck,mkCard(a),mkCard(b)],player:{...st.player,axis:Math.max(1,st.player.axis-15)}}));return{msg:`비상 물자 해제. [${CARDS[a]?.name||a}], [${CARDS[b]?.name||b}] 획득. 경보 오작동으로 축 -15.`,s};}},
      {label:'시스템을 파괴한다',tag:'파괴',type:'neutral',
       fx:(s)=>({msg:'지휘 시스템이 영원히 꺼졌다.',s})},
    ]
  },
  {
    title:'녹슨 철장 안의 생존자',
    body:'철창 안에 사람이 있다. 며칠째 갇혀 있는 것 같다. 열쇠는 근처에 없다.',
    options:[
      {label:'철창을 부순다 (축 -15, 그에게서 정보와 황금+30)',tag:'구출',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-15)},gold:(st.gold||0)+30}));return{msg:'철창을 부쉈다. 축 -15. 감사의 표시로 황금 +30을 받았다.',s};}},
      {label:'열쇠를 찾아본다 (황금+20 발견, 그는 구출 불가)',tag:'수색',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+20}));return{msg:'열쇠 대신 황금을 찾았다. 황금 +20. 그는 구출할 수 없었다.',s};}},
      {label:'지나간다',tag:'외면',type:'neutral',fx:(s)=>({msg:'철창 안에서 눈이 따라온다.',s})},
    ]
  },
  {
    title:'기어 봉인의 방',
    body:'거대한 기어가 무언가를 봉인하고 있다. 풀면 위험할 수도 있고, 보물일 수도 있다.',
    options:[
      {label:'봉인을 푼다 (완전 랜덤)',tag:'도박',type:'danger',
       fx:(s)=>{const r=Math.random();if(r<0.25){s=upd(s,st=>({...st,player:{...st.player,axis:st.player.maxAxis}}));return{msg:'봉인 안에 회복 장치가 있었다. 축이 완전히 회복됐다.',s};}if(r<0.5){const leg=['sacr','doom','zero'][Math.floor(Math.random()*3)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(leg)]}));return{msg:`봉인 안에 전설 카드가 있었다. [${CARDS[leg]?.name||leg}] 획득.`,s};}if(r<0.75){s=upd(s,st=>({...st,gold:(st.gold||0)+90}));return{msg:'봉인 안에 황금이 있었다. 황금 +90.',s};}s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-35)}}));return{msg:'봉인 안에 독성 가스가 있었다. 축 -35.',s};}},
      {label:'기어만 가져간다 (황금+40)',tag:'채취',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+40}));return{msg:'봉인 기어를 해체했다. 황금 +40.',s};}},
      {label:'그대로 둔다',tag:'신중',type:'neutral',fx:(s)=>({msg:'봉인된 것에는 이유가 있다.',s})},
    ]
  },
  {
    title:'자동 경매 시스템',
    body:'자동 경매 기계가 작동하고 있다. 황금을 투자하면 무언가 돌아온다.',
    options:[
      {label:'황금 30 투자 (2배 확률 50%)',tag:'투기',type:'danger',
       fx:(s)=>{if((s.gold||0)<30)return{msg:'황금이 부족하다.',s};if(Math.random()<.5){s=upd(s,st=>({...st,gold:(st.gold||0)+30}));return{msg:'경매 성공. 황금 +30. 투자금 회수.',s};}s=upd(s,st=>({...st,gold:Math.max(0,st.gold-30)}));return{msg:'경매 실패. 황금 -30.',s};}},
      {label:'황금 50 투자 (카드 획득 보장)',tag:'구매',type:'gold',
       fx:(s)=>{if((s.gold||0)<50)return{msg:'황금이 부족하다.',s};const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,gold:st.gold-50,deck:[...st.deck,mkCard(id)]}));return{msg:`황금 -50. [${CARDS[id]?.name||id}] 낙찰.`,s};}},
      {label:'참여하지 않는다',tag:'안전',type:'neutral',fx:(s)=>({msg:'경매 시스템이 혼자 돌아간다.',s})},
    ]
  },
  {
    title:'기계 종교의 제단',
    body:'기계들이 숭배하는 제단. 이상한 일이다. 기계가 믿음을 가지다니.',
    options:[
      {label:'제단을 파괴한다 (축 +20, 기계들의 경계 증가)',tag:'파괴',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:Math.min(st.player.maxAxis,st.player.axis+20)}}));return{msg:'제단을 부쉈다. 축 +20. 이 구역 기계들이 날카로워졌다.',s};}},
      {label:'제단에 황금을 바친다 (황금-30, 덱 1장 강화)',tag:'헌납',type:'gold',
       fx:(s)=>{if((s.gold||0)<30)return{msg:'황금이 부족하다.',s};const upgraded=s.deck.find(c=>!c.upgraded);if(!upgraded)return{msg:'강화할 카드가 없다.',s};s=upd(s,st=>({...st,gold:st.gold-30,deck:st.deck.map(c=>c.uid===upgraded.uid?{...c,upgraded:true,cost:Math.max(0,c.cost-1),name:c.name+'+'}:c)}));return{msg:`황금 -30. [${upgraded.name}+] 강화됐다.`,s};}},
      {label:'관찰만 하고 지나간다',tag:'관찰',type:'neutral',fx:(s)=>({msg:'기계의 신앙을 이해할 수 없다.',s})},
    ]
  },
  {
    title:'자멸하는 감시망',
    body:'감시 시스템이 오작동하고 있다. 자기 자신을 공격하며 붕괴 중이다.',
    options:[
      {label:'붕괴를 가속시킨다 (황금+55)',tag:'가속',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+55}));return{msg:'감시망이 완전히 붕괴됐다. 부품 회수. 황금 +55.',s};}},
      {label:'데이터를 먼저 훔친다 (카드 1장, 축 -8)',tag:'절도',type:'danger',
       fx:(s)=>{const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)],player:{...st.player,axis:Math.max(1,st.player.axis-8)}}));return{msg:`데이터 절취. [${CARDS[id]?.name||id}] 획득. 과정에서 충격 — 축 -8.`,s};}},
      {label:'지켜만 본다',tag:'관찰',type:'neutral',fx:(s)=>({msg:'감시망이 스스로 소멸한다.',s})},
    ]
  },
  {
    title:'인간 공학 기계',
    body:'인간의 신체에 맞춰 설계된 보조 기계가 버려져 있다. 아직 작동한다.',
    options:[
      {label:'착용한다 (최대 축+15, 방전+20)',tag:'착용',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,maxAxis:st.player.maxAxis+15,axis:Math.min(st.player.maxAxis+15,st.player.axis+15),battery:Math.min(100,(st.player.battery||0)+20)}}));return{msg:'보조 기계를 착용했다. 최대 축 +15. 하지만 방전 +20.',s};}},
      {label:'부품을 분해한다 (황금+45)',tag:'해체',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+45}));return{msg:'기계를 해체했다. 황금 +45.',s};}},
      {label:'그냥 둔다',tag:'무시',type:'neutral',fx:(s)=>({msg:'버려진 것은 버려진 이유가 있다.',s})},
    ]
  },
  {
    title:'흑색 시장 지하 경매',
    body:'암시장보다 더 깊은 곳. 지하 경매가 열리고 있다. 참가하면 위험하지만, 얻는 것이 클 수도 있다.',
    options:[
      {label:'황금 80을 걸고 최상급 아이템을 노린다',tag:'대박',type:'danger',
       fx:(s)=>{if((s.gold||0)<80)return{msg:'참가비가 부족하다. 쫓겨났다.',s};if(Math.random()<0.45){const leg=['sacr','doom','zero','delay'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,gold:st.gold-80,deck:[...st.deck,mkCard(leg)]}));return{msg:`경매 성공. [${CARDS[leg]?.name||leg}] 낙찰. 황금 -80.`,s};}s=upd(s,st=>({...st,gold:Math.max(0,st.gold-80)}));return{msg:'경매 실패. 황금 -80.',s};}},
      {label:'황금 40으로 안전하게 참가한다',tag:'참가',type:'gold',
       fx:(s)=>{if((s.gold||0)<40)return{msg:'참가비가 부족하다.',s};const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,gold:st.gold-40,deck:[...st.deck,mkCard(id)]}));return{msg:`황금 -40. [${CARDS[id]?.name||id}] 낙찰.`,s};}},
      {label:'구경만 하고 나온다',tag:'관찰',type:'neutral',fx:(s)=>({msg:'눈만 익혔다. 빠져나온다.',s})},
    ]
  },
  {
    title:'메아리 동굴',
    body:'메아리가 이상하다. 당신의 목소리를 다른 것으로 돌려보낸다. 시간의 균열이다.',
    options:[
      {label:'균열에 말을 건다 (축 완전 회복 or 축 -20)',tag:'도박',type:'danger',
       fx:(s)=>{if(Math.random()<.5){s=upd(s,st=>({...st,player:{...st.player,axis:st.player.maxAxis}}));return{msg:'균열이 응답했다. 축이 완전히 회복됐다.',s};}s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-20)}}));return{msg:'균열이 당신을 공격했다. 축 -20.',s};}},
      {label:'조용히 지나간다',tag:'안전',type:'neutral',fx:(s)=>({msg:'메아리가 잦아든다.',s})},
    ]
  },
  {
    title:'시간 역류 장치',
    body:'이 장치는 시간을 되감는다. 카드를 되살릴 수 있다. 하지만 대가가 따른다.',
    options:[
      {label:'묘지에서 카드 1장을 덱으로 되살린다 (축 -15)',tag:'역류',type:'danger',
       fx:(s)=>{if(!s.deck.length)return{msg:'덱이 비어있다.',s};const lost=s.deck[Math.floor(Math.random()*s.deck.length)];s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-15)},deck:[...st.deck,mkCard(lost.id)]}));return{msg:`[${lost.name}]의 복사본이 덱으로 돌아왔다. 축 -15.`,s};}},
      {label:'황금을 되살린다 (황금+50, 최대 축-10)',tag:'대체',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+50,player:{...st.player,maxAxis:Math.max(20,st.player.maxAxis-10)}}));return{msg:'시간을 황금으로 바꿨다. 황금 +50. 최대 축 -10.',s};}},
      {label:'건드리지 않는다',tag:'거부',type:'neutral',fx:(s)=>({msg:'시간은 순방향으로만 흘러야 한다.',s})},
    ]
  },
  {
    title:'자동 재판 시스템',
    body:'자동 재판 기계가 당신을 스캔했다. 죄목: 생존. 처형 명령을 내리려 한다.',
    options:[
      {label:'시스템을 해킹해 무죄 판결을 내린다 (황금+40)',tag:'해킹',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+40}));return{msg:'해킹 성공. 무죄 판결. 보상금까지 나왔다. 황금 +40.',s};}},
      {label:'물리적으로 파괴한다 (축 -10)',tag:'파괴',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-10)}}));return{msg:'재판 기계를 부쉈다. 축 -10.',s};}},
      {label:'도망친다',tag:'도주',type:'neutral',fx:(s)=>({msg:'재판 기계가 당신을 놓쳤다.',s})},
    ]
  },
  {
    title:'폐기된 동료',
    body:'예전에 함께 싸웠던 자의 물건이 버려져 있다. 언제부터 여기 있었는지 모른다.',
    options:[
      {label:'물건을 가져간다 (카드 1장+황금 20)',tag:'수습',type:'gold',
       fx:(s)=>{const id=['fort','sbolt','dual','wound'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,gold:(st.gold||0)+20,deck:[...st.deck,mkCard(id)]}));return{msg:`동료의 유품을 챙겼다. [${CARDS[id]?.name||id}], 황금 +20.`,s};}},
      {label:'그 자리에 표식을 남긴다',tag:'추도',type:'neutral',fx:(s)=>({msg:'표식을 남겼다. 기억할 것이다.',s})},
      {label:'확인하지 않는다',tag:'외면',type:'neutral',fx:(s)=>({msg:'모르는 편이 낫다.',s})},
    ]
  },

,{
    title:'삼중 기어 도박판',
    body:'반쯤 무너진 도박 기계가 돌아가고 있다. 기어 세 개를 굴린다.',
    options:[
      {label:'황금 20 베팅 (1/6 확률: ×5 보상, 나머지: 손실)',tag:'도박',type:'danger',
       fx:(s)=>{if((s.gold||0)<20)return{msg:'황금이 없다. 기계가 비웃는다.',s};s=upd(s,st=>({...st,gold:st.gold-20}));if(Math.random()<1/6){s=upd(s,st=>({...st,gold:st.gold+100}));return{msg:'세 기어가 맞았다. 황금 +100.',s};}return{msg:'빗나갔다. 황금 -20.',s};}},
      {label:'황금 50 고액 베팅 (15%: ×4 / 35%: 본전 / 50%: 손실)',tag:'고액',type:'danger',
       fx:(s)=>{if((s.gold||0)<50)return{msg:'황금이 부족하다.',s};s=upd(s,st=>({...st,gold:st.gold-50}));const r=Math.random();if(r<0.15){s=upd(s,st=>({...st,gold:st.gold+200}));return{msg:'완벽. 황금 +200.',s};}if(r<0.5){s=upd(s,st=>({...st,gold:st.gold+50}));return{msg:'부분 일치. 황금 +50.',s};}return{msg:'꽝. 황금 -50.',s};}},
      {label:'구경만 한다',tag:'관전',type:'neutral',fx:(s)=>({msg:'기어가 멈췄다.',s})},
    ]
  },{
    title:'인체 실험 잔재',
    body:'기계들이 인간에게 시도한 실험 기록. 아직 작동하는 장치들이 있다. 결과는 알 수 없다.',
    options:[
      {label:'실험 장치를 사용한다 (완전 랜덤)',tag:'실험체',type:'danger',
       fx:(s)=>{const r=Math.random();if(r<0.2){s=upd(s,st=>({...st,player:{...st.player,maxAxis:st.player.maxAxis+25,axis:Math.min(st.player.maxAxis+25,st.player.axis+25)}}));return{msg:'신체 강화. 최대 축 +25.',s};}if(r<0.4){const id=['sacr','doom','zero','delay'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`[${CARDS[id]?.name||id}] 획득.`,s};}if(r<0.6){s=upd(s,st=>({...st,gold:(st.gold||0)+70}));return{msg:'실험 부산물. 황금 +70.',s};}if(r<0.8){s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-30)}}));return{msg:'실험이 공격했다. 축 -30.',s};}s=upd(s,st=>({...st,player:{...st.player,maxAxis:Math.max(20,st.player.maxAxis-15)}}));return{msg:'최대 축 -15.',s};}},
      {label:'기록만 챙긴다 (황금+35)',tag:'기록',type:'gold',fx:(s)=>{s=upd(s,st=>({...st,gold:(st.gold||0)+35}));return{msg:'황금 +35.',s};}},
      {label:'모두 파괴한다',tag:'파괴',type:'neutral',fx:(s)=>({msg:'다시는 반복되지 않는다.',s})},
    ]
  },{
    title:'러시안 룰렛 장치',
    body:'회전하는 기어 총구. 6개 중 1개에 독가스. 당기면 황금을 얻는다.',
    options:[
      {label:'당긴다 (5/6: 황금+90 / 1/6: 축-50)',tag:'룰렛',type:'danger',
       fx:(s)=>{if(Math.random()<1/6){s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-50)}}));return{msg:'독가스. 축 -50. 살았다.',s};}s=upd(s,st=>({...st,gold:(s.gold||0)+90}));return{msg:'살았다. 황금 +90.',s};}},
      {label:'두 번 당긴다 (최대 황금+180, 위험 배증)',tag:'이중룰렛',type:'danger',
       fx:(s)=>{let hit=0;for(let i=0;i<2;i++){if(Math.random()<1/6)hit++;}if(hit===2){s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-80)}}));return{msg:'두 번 모두 독. 축 -80.',s};}if(hit===1){s=upd(s,st=>({...st,gold:(s.gold||0)+60,player:{...s.player,axis:Math.max(1,s.player.axis-50)}}));return{msg:'한 번은 살았다. 황금 +60, 축 -50.',s};}s=upd(s,st=>({...st,gold:(s.gold||0)+180}));return{msg:'두 번 모두 살았다. 황금 +180.',s};}},
      {label:'장치를 분해한다 (황금+25)',tag:'해체',type:'gold',fx:(s)=>{s=upd(s,st=>({...st,gold:(s.gold||0)+25}));return{msg:'황금 +25.',s};}},
    ]
  },{
    title:'기억 경매장',
    body:'기억을 사고파는 기계. 당신의 기억을 팔거나 타인의 기억을 살 수 있다.',
    options:[
      {label:'기억을 판다 (황금+60, 최대 축 -8)',tag:'판매',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,gold:(s.gold||0)+60,player:{...s.player,maxAxis:Math.max(20,s.player.maxAxis-8)}}));return{msg:'기억이 팔렸다. 황금 +60. 최대 축 -8.',s};}},
      {label:'타인의 기억을 산다 (황금-40, 랜덤 카드)',tag:'구매',type:'gold',
       fx:(s)=>{if((s.gold||0)<40)return{msg:'황금이 부족하다.',s};const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,gold:st.gold-40,deck:[...st.deck,mkCard(id)]}));return{msg:`[${CARDS[id]?.name||id}] 획득.`,s};}},
      {label:'거래하지 않는다',tag:'거부',type:'neutral',fx:(s)=>({msg:'기억은 내 것이다.',s})},
    ]
  },{
    title:'전설의 카드패',
    body:'오래된 카드패가 바닥에 뒤집혀 있다. 뒤집으면 무엇이 나올지 모른다.',
    options:[
      {label:'카드를 뒤집는다 (33%: 전설 / 33%: 일반 / 33%: 저주)',tag:'뽑기',type:'danger',
       fx:(s)=>{const r=Math.random();if(r<0.33){const leg=['sacr','doom','zero','delay','loop'][Math.floor(Math.random()*5)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(leg)]}));return{msg:`전설 출현. [${CARDS[leg]?.name||leg}] 획득.`,s};}if(r<0.66){const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`[${CARDS[id]?.name||id}] 획득.`,s};}s=upd(s,st=>({...st,player:{...s.player,axis:Math.max(1,s.player.axis-20),battery:Math.min(100,(s.player.battery||0)+30)}}));return{msg:'저주 카드. 축 -20, 방전 +30.',s};}},
      {label:'패를 불태운다',tag:'소각',type:'neutral',fx:(s)=>({msg:'불길이 카드를 삼킨다.',s})},
    ]
  },{
    title:'기계 도박사',
    body:'기계가 카드 게임을 제안한다. 이기면 황금. 지면 축을 잃는다.',
    options:[
      {label:'소판 — 황금 20 (50%: ×2 / 50%: 손실)',tag:'소판',type:'danger',
       fx:(s)=>{if((s.gold||0)<20)return{msg:'황금이 없다.',s};if(Math.random()<0.5){s=upd(s,st=>({...st,gold:st.gold+20}));return{msg:'이겼다. 황금 +20.',s};}s=upd(s,st=>({...st,gold:Math.max(0,st.gold-20)}));return{msg:'졌다. 황금 -20.',s};}},
      {label:'대판 — 황금 60 (45%: ×2.5 / 55%: 손실)',tag:'대판',type:'danger',
       fx:(s)=>{if((s.gold||0)<60)return{msg:'황금이 부족하다.',s};if(Math.random()<0.45){s=upd(s,st=>({...st,gold:st.gold+90}));return{msg:'대판 승. 황금 +90.',s};}s=upd(s,st=>({...st,gold:Math.max(0,st.gold-60)}));return{msg:'대판 패. 황금 -60.',s};}},
      {label:'속임수 (70%: 황금+50 / 30%: 발각 축-25)',tag:'사기',type:'danger',
       fx:(s)=>{if(Math.random()<0.7){s=upd(s,st=>({...st,gold:(s.gold||0)+50}));return{msg:'성공. 황금 +50.',s};}s=upd(s,st=>({...st,player:{...s.player,axis:Math.max(1,s.player.axis-25)}}));return{msg:'발각. 축 -25.',s};}},
      {label:'거절한다',tag:'거절',type:'neutral',fx:(s)=>({msg:'기계가 다른 상대를 찾는다.',s})},
    ]
  },{
    title:'자동 수리 챔버',
    body:'자동 수리 챔버가 켜져 있다. 들어가면 회복된다. 하지만 나올 때 무언가를 잃을 수도 있다.',
    options:[
      {label:'챔버에 들어간다 (축 완전 회복, 50%: 카드 1장 소실)',tag:'입장',type:'danger',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:st.player.maxAxis}}));if(Math.random()<0.5&&s.deck.length>0){const lost=s.deck[Math.floor(Math.random()*s.deck.length)];s=upd(s,st=>({...st,deck:st.deck.filter(c=>c.uid!==lost.uid)}));return{msg:'축 완전 회복. ['+lost.name+'] 소실.',s};}return{msg:'축 완전 회복. 아무것도 잃지 않았다.',s};}},
      {label:'부분만 사용한다 (축+30, 안전)',tag:'부분',type:'gold',
       fx:(s)=>{s=upd(s,st=>({...st,player:{...st.player,axis:Math.min(st.player.maxAxis,st.player.axis+30)}}));return{msg:'축 +30.',s};}},
      {label:'들어가지 않는다',tag:'거부',type:'neutral',fx:(s)=>({msg:'챔버가 기다린다.',s})},
    ]
  },{
    title:'기어 복권',
    body:'유일하게 작동하는 복권 기계. 황금을 넣으면 무언가가 나온다.',
    options:[
      {label:'황금 10 투입 (50%: 당첨 / 30%: 본전 / 20%: 꽝)',tag:'소액',type:'gold',
       fx:(s)=>{if((s.gold||0)<10)return{msg:'황금이 없다.',s};const r=Math.random();s=upd(s,st=>({...st,gold:st.gold-10}));if(r<0.5){s=upd(s,st=>({...st,gold:st.gold+25}));return{msg:'당첨. 황금 +25.',s};}if(r<0.8){s=upd(s,st=>({...st,gold:st.gold+10}));return{msg:'본전.',s};}return{msg:'꽝.',s};}},
      {label:'황금 40 투입 (30%: 카드+황금 / 30%: 황금×2 / 40%: 꽝)',tag:'중액',type:'danger',
       fx:(s)=>{if((s.gold||0)<40)return{msg:'황금이 부족하다.',s};const r=Math.random();s=upd(s,st=>({...st,gold:st.gold-40}));if(r<0.3){const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)],gold:st.gold+40}));return{msg:`[${CARDS[id]?.name||id}], 황금 +40.`,s};}if(r<0.6){s=upd(s,st=>({...st,gold:st.gold+80}));return{msg:'황금 +80.',s};}return{msg:'꽝.',s};}},
      {label:'기계를 부수고 황금 챙긴다 (+20)',tag:'파괴',type:'gold',fx:(s)=>{s=upd(s,st=>({...st,gold:(s.gold||0)+20}));return{msg:'황금 +20.',s};}},
    ]
  },{
    title:'거울 속의 적',
    body:'거울처럼 생긴 기계가 당신을 모방하고 있다. 당신의 패턴을 학습 중이다.',
    options:[
      {label:'공격한다 (50%: 축+20 / 50%: 역공 축-25)',tag:'공격',type:'danger',
       fx:(s)=>{if(Math.random()<0.5){s=upd(s,st=>({...st,player:{...st.player,axis:Math.min(st.player.maxAxis,st.player.axis+20)}}));return{msg:'거울이 깨졌다. 축 +20.',s};}s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-25)}}));return{msg:'역공당했다. 축 -25.',s};}},
      {label:'카드를 복사시킨다 (덱에 랜덤 카드 복사본 +1)',tag:'복사',type:'gold',
       fx:(s)=>{if(!s.deck.length)return{msg:'덱이 비어있다.',s};const card=s.deck[Math.floor(Math.random()*s.deck.length)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(card.id)]}));return{msg:'['+card.name+'] 복사본 덱+1.',s};}},
      {label:'무시하고 지나간다',tag:'무시',type:'neutral',fx:(s)=>({msg:'거울이 따라온다. 하지만 방해하지 않는다.',s})},
    ]
  },{
    title:'죽은 전투원의 일기',
    body:'구겨진 일기. 마지막 페이지에 무언가 적혀 있다.',
    options:[
      {label:'읽는다 (60%: 황금+40~100 / 40%: 축-15)',tag:'독서',type:'danger',
       fx:(s)=>{if(Math.random()<0.6){const g=40+Math.floor(Math.random()*61);s=upd(s,st=>({...st,gold:(s.gold||0)+g}));return{msg:'숨겨진 황금 위치를 알았다. +'+g+'.',s};}s=upd(s,st=>({...st,player:{...st.player,axis:Math.max(1,st.player.axis-15)}}));return{msg:'눈물이 힘을 앗아갔다. 축 -15.',s};}},
      {label:'카드로 승화한다 (덱+1)',tag:'승화',type:'gold',
       fx:(s)=>{const id=['chain','dual','fort','regen'][Math.floor(Math.random()*4)];s=upd(s,st=>({...st,deck:[...st.deck,mkCard(id)]}));return{msg:`[${CARDS[id]?.name||id}] 획득.`,s};}},
      {label:'태운다',tag:'소각',type:'neutral',fx:(s)=>({msg:'기억이 연기가 됐다.',s})},
    ]
  }
];

/* ═══════════════════════════════════════════════════════
   SHOP POOL
═══════════════════════════════════════════════════════ */
const SHOP_P=[
  {id:'warp',p:65},{id:'cburst',p:55},{id:'gstorm',p:80},{id:'tshield',p:60},
  {id:'overcharge',p:50},{id:'discharge_burst',p:75},{id:'wound',p:45},{id:'rupture',p:80},
  {id:'voltage',p:55},{id:'regen',p:60},{id:'armor_spike',p:50},{id:'sbolt',p:65},
  {id:'drain',p:45},{id:'loop',p:85},{id:'reroll',p:70},{id:'delay',p:90},{id:'echo',p:95},,
  {id:'strike',p:35},
  {id:'heavy',p:35},
  {id:'dual',p:50},
  {id:'chain',p:50},
  {id:'cog',p:35},
  {id:'fort',p:50},
  {id:'axis',p:35},
  {id:'disc',p:50},
  {id:'gbash',p:50},
  {id:'recharge',p:35},
  {id:'overclock',p:50},
  {id:'sacr',p:90},
  {id:'zero',p:90},
  {id:'doom',p:90},
  {id:'pierce',p:35},
  {id:'barrage',p:50},
  {id:'crush',p:50},
  {id:'bleed',p:35},
  {id:'execute2',p:65},
  {id:'shock',p:50},
  {id:'tempo',p:35},
  {id:'finisher',p:65},
  {id:'bulwark',p:35},
  {id:'mirror_coat',p:50},
  {id:'parry',p:50},
  {id:'reinforce',p:65},
  {id:'phase_shield',p:50},
  {id:'aegis',p:90},
  {id:'field_repair',p:35},
  {id:'overclock_heal',p:50},
  {id:'blood_cost',p:65},
  {id:'resonance',p:65},
  {id:'overhaul',p:90},
  {id:'accelerate',p:50},
  {id:'scrap',p:35},
  {id:'overclock2',p:65},
  {id:'timelock',p:65},
  {id:'entropy',p:50},
  {id:'gearshift',p:50},
  {id:'voltblade',p:50},
  {id:'chainsaw',p:50},
  {id:'deathmark',p:65},
  {id:'wrathstrike',p:65},
  {id:'ricochet',p:50},
  {id:'timecut',p:65},
  {id:'doubleedge',p:50},
  {id:'overdrive',p:65},
  {id:'crushblow',p:65},
  {id:'gearshot',p:35},
  {id:'bulkup',p:50},
  {id:'mirrorshield',p:65},
  {id:'hardcase',p:35},
  {id:'shieldwall',p:65},
  {id:'clockshield',p:50},
  {id:'energywall',p:50},
  {id:'counterform',p:65},
  {id:'deepmend',p:50},
  {id:'batteryboost',p:50},
  {id:'celldivide',p:90},
  {id:'chronospulse',p:65},
  {id:'selfrepair',p:35},
  {id:'drawengine',p:65},
  {id:'overcycle',p:50},
  {id:'timerewind',p:65},
  {id:'scrapyard',p:50},
  {id:'gearboost',p:50},
  {id:'voidstrike',p:90},
  {id:'chronosheart',p:120},
  {id:'apocalypse',p:120}
];

const STARTER=['strike','strike','strike','heavy','dual','axis','cog','cog','disc','gbash','recharge','warp','chain','fort','overcharge'];

/* ═══════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════ */
const uid=()=>Math.random().toString(36).slice(2,9);
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}
const rng=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const mkCard=id=>{const c=CARDS[id];if(!c){console.warn('mkCard: unknown',id);return {id:id||'strike',name:'???',cost:1,type:'공격',rarity:'일반',icon:'atk',clr:'#888',desc:'',fx:gs=>gs,uid:uid()};}return{...c,uid:uid()};};
function upd(s,fn){return fn(s);}

/* ═══════════════════════════════════════════════════════
   STACK SYSTEM (과부하, 상처, 재생 등)
═══════════════════════════════════════════════════════ */
function getStack(gs,tgt,type){return((gs[tgt].stacks||{})[type])||0;}
function addStack(gs,tgt,type,n){
  const t={...gs[tgt],stacks:{...(gs[tgt].stacks||{})}};
  t.stacks[type]=(t.stacks[type]||0)+n;
  return addV({...gs,[tgt]:t},{type:'stack',stackType:type,val:n,tgt});
}
function clearStack(gs,tgt,type){
  const t={...gs[tgt],stacks:{...(gs[tgt].stacks||{})}};
  t.stacks[type]=0;return{...gs,[tgt]:t};
}
function tickStacks(gs,tgt){
  let g={...gs};
  const stacks={...(g[tgt].stacks||{})};

  // 상처: 매 턴 스택당 2 피해 후 1 감소
  if((stacks.wound||0)>0){
    g=dealDmg(g,tgt,stacks.wound*2,true);
    stacks.wound=Math.max(0,stacks.wound-1);
  }
  // 재생: 매 턴 5 회복 후 1 감소
  if(tgt==='player'&&(stacks.regen||0)>0){
    g=doHeal(g,'player',5);
    stacks.regen=Math.max(0,stacks.regen-1);
  }
  // 과부하(ol): 매 턴 1 감소 (전투 종료 시 다음 에너지 -ol)
  if((stacks.ol||0)>0){
    stacks.ol=Math.max(0,stacks.ol-1);
  }
  // reflect_curse: 매 턴 1 감소
  if((stacks.reflect_curse||0)>0){
    stacks.reflect_curse=Math.max(0,stacks.reflect_curse-1);
  }
  // counter: 매 턴 1 감소
  if((stacks.counter||0)>0){
    stacks.counter=Math.max(0,stacks.counter-1);
  }
  g={...g,[tgt]:{...g[tgt],stacks}};
  return g;
}


/* ── 숲 노드 ── */
function showForestModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  box.appendChild(mkDiv('evt-title',{},'숲 — 기어 덤불'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#2d6a3f',fontFamily:"'Noto Serif KR',serif",lineHeight:'2',textAlign:'center',marginBottom:'14px'},
    '녹슨 기어들 사이에 기묘한 식물이 자란다.\n이 구역에서 자연은 기계와 함께 변이했다.'));
  const opts=[
    ['치유초를 뜯는다 (HP +25, 50%: 방전 +10)','gold',()=>{
      GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+25),
        battery:Math.random()<.5?Math.min(100,(s.player.battery||0)+10):s.player.battery||0}}));
      updateFUI();bd.remove();showNotif('치유초 섭취. HP +25',G);}],
    ['기계 수액을 마신다 (방전 -30, 80%: HP+15 / 20%: 축-10)','danger',()=>{
      const hit=Math.random()<.8;
      GS=upd(GS,s=>({...s,player:{...s.player,battery:Math.max(0,(s.player.battery||0)-30),
        axis:hit?Math.min(s.player.maxAxis,s.player.axis+15):Math.max(1,s.player.axis-10)}}));
      updateFUI();bd.remove();showNotif(hit?'수액 흡수. 방전-30 HP+15':'독성 반응. 방전-30 HP-10',hit?G:CR);}],
    ['자연의 기운을 흡수한다 (덱+1 랜덤)','neutral',()=>{
      const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;
      GS=upd(GS,s=>addCardSafe(s,mkCard(id)));updateFUI();bd.remove();
      showNotif('['+(CARDS[id]?.name||id)+'] 습득',G);}],
    ['그냥 지나간다','neutral',()=>bd.remove()],
  ];
  opts.forEach(([lbl,type,fn])=>{const b=mkDiv('evt-btn evt-btn-'+type,{},lbl);b.onclick=fn;box.appendChild(b);});
  bd.appendChild(box);document.body.appendChild(bd);
}

/* ── 시험 노드 ── */
function showTrialModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  const trials=[
    {q:'현재 덱에서 공격 카드가 방어 카드보다 많은가?',
     check:()=>GS.deck.filter(c=>c.type==='공격').length>GS.deck.filter(c=>c.type==='방어').length,
     pass:'공격 우세. 황금 +50.',fail:'방어 우세. 도전 실패.',pg:50,fa:0},
    {q:'현재 HP가 최대 HP의 절반 이상인가?',
     check:()=>GS.player.axis>=GS.player.maxAxis*0.5,
     pass:'건강함이 인정됐다. 최대 HP +15.',fail:'HP 부족. 도전 실패.',pg:0,fa:0,passExtra:()=>{
       GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:s.player.maxAxis+15,axis:Math.min(s.player.maxAxis+15,s.player.axis+15)}}));}},
    {q:'방전 게이지가 30 미만인가?',
     check:()=>(GS.player.battery||0)<30,
     pass:'절제됨이 인정됐다. 카드 1장 획득.',fail:'방전 과다. 도전 실패.',pg:0,fa:0,passExtra:()=>{
       const id=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;
       GS=upd(GS,s=>addCardSafe(s,mkCard(id)));showNotif('['+(CARDS[id]?.name||id)+'] 획득',G);}},
    {q:'저장소에 카드가 5장 이상 있는가?',
     check:()=>(GS.storage||[]).length>=5,
     pass:'비축됨이 인정됐다. 황금 +80.',fail:'저장소 부족. 도전 실패.',pg:80,fa:0},
  ];
  const trial=trials[Math.floor(Math.random()*trials.length)];
  box.appendChild(mkDiv('evt-title',{},'시험'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#8899BB',fontFamily:"'Noto Serif KR',serif",lineHeight:'2',textAlign:'center',marginBottom:'12px'},'시스템이 당신을 평가한다.\n'+trial.q));
  const attempt=mkDiv('evt-btn evt-btn-gold',{},'시험에 응한다');
  attempt.onclick=()=>{
    const pass=trial.check();
    if(pass){
      if(trial.pg>0)GS=upd(GS,s=>({...s,gold:(s.gold||0)+trial.pg}));
      if(trial.passExtra)trial.passExtra();
      updateFUI();bd.remove();showNotif(trial.pass,G);
    } else {
      bd.remove();showNotif(trial.fail,CR);
    }
  };
  const skip=mkDiv('evt-btn evt-btn-neutral',{},'거부한다');
  skip.onclick=()=>bd.remove();
  box.appendChild(attempt);box.appendChild(skip);
  bd.appendChild(box);document.body.appendChild(bd);
}

/* ── 도박장 노드 ── */
function showGambleModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  box.appendChild(mkDiv('evt-title',{},'도박장'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#AA7722',fontFamily:"'Noto Serif KR',serif",lineHeight:'2',textAlign:'center',marginBottom:'12px'},
    '구석에 기계 딜러가 앉아있다.\n황금이 있으면 테이블에 앉을 수 있다.'));
  const opts=[
    ['황금 30 베팅 (60%: 2배 / 40%: 손실)','danger',()=>{
      if((GS.gold||0)<30){showNotif('황금 부족',CR);return;}
      const win=Math.random()<.6;
      GS=upd(GS,s=>({...s,gold:win?s.gold+30:Math.max(0,s.gold-30)}));
      updateFUI();bd.remove();showNotif(win?'승리. 황금 +30':'패배. 황금 -30',win?G:CR);}],
    ['황금 80 하이스테이크 (40%: 3배 / 60%: 전액손실)','danger',()=>{
      if((GS.gold||0)<80){showNotif('황금 부족',CR);return;}
      const win=Math.random()<.4;
      GS=upd(GS,s=>({...s,gold:win?s.gold+160:Math.max(0,s.gold-80)}));
      updateFUI();bd.remove();showNotif(win?'대승리. 황금 +160':'대패배. 황금 -80',win?G:CR);}],
    ['카드로 배팅 (70%: 카드 2장 / 30%: 1장 잃음)','danger',()=>{
      if(!GS.deck.length){showNotif('덱이 비어있다',CR);return;}
      const win=Math.random()<.7;
      if(win){
        const a=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;
        const b=SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id;
        GS=upd(GS,s=>addCardSafe(addCardSafe(s,mkCard(a)),mkCard(b)));
        updateFUI();bd.remove();showNotif('카드 2장 획득',G);
      } else {
        const lost=GS.deck[Math.floor(Math.random()*GS.deck.length)];
        GS=upd(GS,s=>({...s,deck:s.deck.filter(c=>c.uid!==lost.uid)}));
        updateFUI();bd.remove();showNotif('['+lost.name+'] 잃음',CR);
      }}],
    ['테이블을 떠난다','neutral',()=>bd.remove()],
  ];
  opts.forEach(([lbl,type,fn])=>{const b=mkDiv('evt-btn evt-btn-'+type,{},lbl);b.onclick=fn;box.appendChild(b);});
  bd.appendChild(box);document.body.appendChild(bd);
}

/* ── 시간의 문 노드 ── */
function showTimegateModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  box.appendChild(mkDiv('evt-title',{},'시간의 문'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#6688CC',fontFamily:"'Noto Serif KR',serif",lineHeight:'2',textAlign:'center',marginBottom:'12px'},
    '시간이 흐르지 않는 장소.\n이곳에서 과거와 거래할 수 있다.'));
  const opts=[
    ['과거의 강함을 빌린다 (최대 HP +20, 현재 HP -10)','danger',()=>{
      GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:s.player.maxAxis+20,axis:Math.max(1,s.player.axis-10)}}));
      updateFUI();bd.remove();showNotif('최대 HP +20, 현재 HP -10',G);}],
    ['시간을 되돌린다 (덱에서 랜덤 카드 복사본 +1)','gold',()=>{
      if(!GS.deck.length){showNotif('덱이 비어있다',CR);return;}
      const card=GS.deck[Math.floor(Math.random()*GS.deck.length)];
      GS=upd(GS,s=>addCardSafe(s,mkCard(card.id)));
      updateFUI();bd.remove();showNotif('['+card.name+'] 복사',G);}],
    ['미래를 엿본다 (황금 -40, 전설 카드 선택)','gold',()=>{
      if((GS.gold||0)<40){showNotif('황금 부족',CR);return;}
      const legs=['sacr','doom','zero','delay','loop','aegis','overhaul','finisher'];
      const picks=shuffle(legs).slice(0,3);
      bd.remove();
      const bd2=mkBk();const box2=mkDiv('evt-box',{maxWidth:'340px'});
      box2.appendChild(mkDiv('evt-title',{},'미래 선택'));
      picks.forEach(id=>{
        const b=mkDiv('evt-btn evt-btn-gold',{},'['+(CARDS[id]?.name||id)+']');
        b.onclick=()=>{GS=upd(GS,s=>({...s,gold:Math.max(0,s.gold-40)}));
          GS=upd(GS,s=>addCardSafe(s,mkCard(id)));updateFUI();bd2.remove();showNotif('황금-40. ['+(CARDS[id]?.name||id)+'] 획득',G);};
        box2.appendChild(b);
      });
      const cl=mkDiv('evt-btn evt-btn-neutral',{},'포기');cl.onclick=()=>bd2.remove();box2.appendChild(cl);
      bd2.appendChild(box2);document.body.appendChild(bd2);}],
    ['그냥 지나간다','neutral',()=>bd.remove()],
  ];
  opts.forEach(([lbl,type,fn])=>{const b=mkDiv('evt-btn evt-btn-'+type,{},lbl);b.onclick=fn;box.appendChild(b);});
  bd.appendChild(box);document.body.appendChild(bd);
}

/* ── 사냥꾼 노드 ── */
function showHunterModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  box.appendChild(mkDiv('evt-title',{},'사냥꾼'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#8B4513',fontFamily:"'Noto Serif KR',serif",lineHeight:'2',textAlign:'center',marginBottom:'12px'},
    '가면을 쓴 인물이 당신을 향해 무기를 겨눈다.\n하지만 먼저 말을 건넨다.'));
  const opts=[
    ['대결한다 (승리: 황금+80 + 카드 1장)','danger',()=>{
      bd.remove();GS={...GS,_hunterReward:true};
      doTrans(()=>{hideField();startBattle('hunter');});
    }],
    ['거래한다 (황금 -50, 희귀 카드 3개 중 선택)','gold',()=>{
      if((GS.gold||0)<50){showNotif('황금 부족',CR);return;}
      const picks=[SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id,
                   SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id,
                   SHOP_P[Math.floor(Math.random()*SHOP_P.length)].id];
      bd.remove();
      const bd2=mkBk();const box2=mkDiv('evt-box',{maxWidth:'340px'});
      box2.appendChild(mkDiv('evt-title',{},'사냥꾼의 전리품'));
      picks.forEach(id=>{
        const b=mkDiv('evt-btn evt-btn-gold',{},'['+(CARDS[id]?.name||id)+']');
        b.onclick=()=>{GS=upd(GS,s=>({...s,gold:Math.max(0,s.gold-50)}));
          GS=upd(GS,s=>addCardSafe(s,mkCard(id)));updateFUI();bd2.remove();
          showNotif('황금-50. ['+(CARDS[id]?.name||id)+'] 획득',G);};
        box2.appendChild(b);
      });
      const cl=mkDiv('evt-btn evt-btn-neutral',{},'포기');cl.onclick=()=>bd2.remove();box2.appendChild(cl);
      bd2.appendChild(box2);document.body.appendChild(bd2);}],
    ['피한다','neutral',()=>bd.remove()],
  ];
  opts.forEach(([lbl,type,fn])=>{const b=mkDiv('evt-btn evt-btn-'+type,{},lbl);b.onclick=fn;box.appendChild(b);});
  bd.appendChild(box);document.body.appendChild(bd);
}

/* ── 강화소 ── */
function showEnhanceModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'380px',maxHeight:'92vh',display:'flex',flexDirection:'column'});
  box.appendChild(mkDiv('evt-title',{},'강화소'));
  box.appendChild(mkDiv('',{fontSize:'9px',color:'#AA8822',fontFamily:"'Noto Serif KR',serif",textAlign:'center',marginBottom:'12px'},
    '카드를 선택하고 강화 방식을 고르라.'));
  if(!GS.deck.length){
    box.appendChild(mkDiv('',{color:CR,fontSize:'10px',textAlign:'center',padding:'12px'},'덱이 비어있다.'));
    const cl=mkDiv('evt-btn evt-btn-neutral',{},'돌아간다');cl.onclick=()=>bd.remove();box.appendChild(cl);
    bd.appendChild(box);document.body.appendChild(bd);return;
  }
  // 상단: 카드 리스트 (스크롤)
  const listWrap=document.createElement('div');
  listWrap.style.cssText='flex:1;overflow-y:auto;margin-bottom:10px;border:1px solid rgba(255,215,0,.1);border-radius:6px;';
  let selIdx=-1;
  const optArea=document.createElement('div');
  optArea.style.cssText='padding:8px 0;';
  function renderList(){
    listWrap.innerHTML='';
    GS.deck.forEach((card,i)=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;'+
        'border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s;'+
        (i===selIdx?'background:rgba(255,215,0,.1);':'');
      row.onmouseenter=()=>{if(i!==selIdx)row.style.background='rgba(255,255,255,.03)';};
      row.onmouseleave=()=>{if(i!==selIdx)row.style.background='';};
      // 타입 색 도트
      const typeCLR={'공격':CR,'방어':'#4488BB','회복':'#33BB66','유틸':'#886633','강화':'#CC9900'};
      const dot=document.createElement('div');
      dot.style.cssText='width:6px;height:6px;border-radius:50%;flex-shrink:0;background:'+(typeCLR[card.type]||'#555')+';';
      // 이름
      const nm=document.createElement('div');
      nm.style.cssText='flex:1;font-size:10px;color:'+(card.clr||G)+';font-family:"Share Tech Mono",monospace;';
      nm.textContent=card.name;
      // 타입/등급
      const meta=document.createElement('div');
      meta.style.cssText='font-size:7px;color:#444;font-family:"Share Tech Mono",monospace;';
      meta.textContent=card.type+' '+card.rarity+(card._dmgUp?'[+'+card._dmgUp+'피]':'')+(card._shieldUp?'[+'+card._shieldUp+'방]':'');
      // 비용
      const cost=document.createElement('div');
      cost.style.cssText='width:18px;height:18px;border-radius:50%;background:rgba(255,215,0,.15);border:1px solid rgba(255,215,0,.3);'+
        'display:flex;align-items:center;justify-content:center;font-size:9px;color:'+G+';font-family:"Share Tech Mono",monospace;flex-shrink:0;';
      cost.textContent=card.cost;
      [dot,nm,meta,cost].forEach(el=>row.appendChild(el));
      row.onclick=()=>{selIdx=i;renderList();showOpts(i);};
      listWrap.appendChild(row);
    });
  }
  function showOpts(idx){
    optArea.innerHTML='';
    const card=GS.deck[idx];
    const upTl=mkDiv('',{fontSize:'8px',color:'#555',fontFamily:"'Share Tech Mono',monospace",marginBottom:'6px'},'['+card.name+'] 강화 선택:');
    optArea.appendChild(upTl);
    const upgrades=[
      {lbl:'피해 +4',detail:'(공격 카드 전용)',clr:CR,ok:card.type==='공격',apply:c=>({...c,desc:c.desc+' [+4피]',_dmgUp:(c._dmgUp||0)+4})},
      {lbl:'톱니 +5',detail:'(방어 카드 전용)',clr:'#4488BB',ok:card.type==='방어',apply:c=>({...c,desc:c.desc+' [+5방]',_shieldUp:(c._shieldUp||0)+5})},
      {lbl:'회복 +6',detail:'(회복 카드 전용)',clr:'#33BB66',ok:card.type==='회복',apply:c=>({...c,desc:c.desc+' [+6힐]',_healUp:(c._healUp||0)+6})},
      {lbl:'비용 -1',detail:'(모든 카드)',clr:G,ok:card.cost>0,apply:c=>({...c,cost:Math.max(0,c.cost-1),desc:c.desc+' [-1코]'})},
      {lbl:'희귀도 업',detail:'(일반→희귀→고급→전설)',clr:'#AA44FF',ok:['일반','희귀','고급'].includes(card.rarity),
       apply:c=>{const nx={'일반':'희귀','희귀':'고급','고급':'전설'};return{...c,rarity:nx[c.rarity]||c.rarity};}},
    ].filter(o=>o.ok);
    if(!upgrades.length){optArea.appendChild(mkDiv('',{color:'#555',fontSize:'9px',textAlign:'center',padding:'8px'},'이 카드는 강화 불가'));return;}
    upgrades.forEach(u=>{
      const btn=document.createElement('div');
      btn.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border:1px solid '+u.clr+'44;'+
        'border-radius:5px;margin-bottom:4px;transition:background .12s;';
      btn.onmouseenter=()=>btn.style.background=u.clr+'16';
      btn.onmouseleave=()=>btn.style.background='';
      const lbl=document.createElement('div');lbl.style.cssText='font-size:10px;color:'+u.clr+';font-family:"Share Tech Mono",monospace;font-weight:700;flex:1;';lbl.textContent=u.lbl;
      const dtl=document.createElement('div');dtl.style.cssText='font-size:7px;color:#555;font-family:"Share Tech Mono",monospace;';dtl.textContent=u.detail;
      btn.appendChild(lbl);btn.appendChild(dtl);
      btn.onclick=()=>{GS=upd(GS,s=>({...s,deck:s.deck.map((c,i)=>i===idx?u.apply(c):c)}));showNotif('['+card.name+'] '+u.lbl+' 강화',G);bd.remove();};
      optArea.appendChild(btn);
    });
  }
  renderList();
  box.appendChild(listWrap);
  box.appendChild(optArea);
  const cl=mkDiv('evt-btn evt-btn-neutral',{},'그냥 떠난다');cl.onclick=()=>bd.remove();box.appendChild(cl);
  bd.appendChild(box);document.body.appendChild(bd);
}

/* ── 유물 제단 ── */
function showRelicShrineModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  box.appendChild(mkDiv('evt-title',{},'유물 제단'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#CC6600',fontFamily:"'Noto Serif KR',serif",lineHeight:'2',textAlign:'center',marginBottom:'12px'},
    '빛나는 무언가가 제단 위에 놓여있다.\n손을 뻗으면 닿을 것 같다.'));
  const equipped=GS.relicsEquipped||[];const bag=GS.relicBag||[];
  const used=new Set([...equipped.map(x=>x.id),...bag.map(x=>x.id)]);
  const avail=RELICS.filter(r=>!used.has(r.id));
  const shuf=a=>[...a].sort(()=>Math.random()-.5);
  const picks=shuf(avail).slice(0,Math.min(3,avail.length));
  const addRelic=r=>{
    if(equipped.length<5){GS=upd(GS,s=>({...s,relicsEquipped:[...(s.relicsEquipped||[]),{id:r.id}]}));showNotif('['+r.name+'] 착용됨',r.clr||G);}
    else if(bag.length<10){GS=upd(GS,s=>({...s,relicBag:[...(s.relicBag||[]),{id:r.id}]}));showNotif('['+r.name+'] 보관함으로',G);}
    else showNotif('착용/보관 공간 없음',CR);
  };
  if(!picks.length){
    box.appendChild(mkDiv('',{color:'#555',fontSize:'10px',textAlign:'center',padding:'20px'},'제단이 이미 비어있다.'));
    const cl=mkDiv('evt-btn evt-btn-neutral',{},'돌아선다');cl.onclick=()=>bd.remove();box.appendChild(cl);
    bd.appendChild(box);document.body.appendChild(bd);return;
  }
  const opts=[
    ['바로 집어든다 (랜덤 유물 획득)','gold',()=>{addRelic(picks[Math.floor(Math.random()*picks.length)]);bd.remove();}],
    ['골라서 가져간다 (3개 중 선택)','gold',()=>{
      bd.remove();
      const bd2=mkBk(e=>{if(e.target===bd2)bd2.remove();});
      const box2=mkDiv('evt-box',{maxWidth:'360px'});
      box2.appendChild(mkDiv('evt-title',{},'유물 선택'));
      picks.forEach(r=>{
        const rc=mkRelicCard(r,false,()=>{addRelic(r);bd2.remove();});
        box2.appendChild(rc);
      });
      const cl2=mkDiv('evt-btn evt-btn-neutral',{},'포기한다');cl2.onclick=()=>bd2.remove();box2.appendChild(cl2);
      bd2.appendChild(box2);document.body.appendChild(bd2);}],
    ['황금을 바친다 (황금 -60, 유물 획득)','danger',()=>{
      if((GS.gold||0)<60){showNotif('황금이 부족하다',CR);return;}
      GS=upd(GS,s=>({...s,gold:s.gold-60}));
      const r=picks[Math.floor(Math.random()*picks.length)];
      addRelic(r);updateFUI();bd.remove();}],
    ['그냥 지나간다','neutral',()=>bd.remove()],
  ];
  opts.forEach(([lbl,type,fn])=>{const b=mkDiv('evt-btn evt-btn-'+type,{},lbl);b.onclick=fn;box.appendChild(b);});
  bd.appendChild(box);document.body.appendChild(bd);
}


/* ═══════════════════════════════════════════════════════
   GAME STATE PURE FUNCTIONS
═══════════════════════════════════════════════════════ */
function addV(gs,v){return{...gs,vfx:[...gs.vfx,{id:uid(),...v}]};}
function dealDmgNoCrit(gs,tgt,amt){
  if(amt<=0)return gs;
  if(tgt==='enemy'&&(gs._comboDmgMult||1)>1){
    const m=gs._comboDmgMult;gs={...gs,_comboDmgMult:1};amt=Math.round(amt*m);
  }
  let t={...gs[tgt]};let fin=amt;let blk=0;
  if(t.cog>0){blk=Math.min(t.cog,fin);t.cog-=blk;fin-=blk;}
  t.axis=Math.max(0,t.axis-fin);
  t.battery=Math.min(100,t.battery+Math.floor(fin*.2));
  return addV({...gs,[tgt]:t},{type:'dmg',val:amt,blk,tgt,cr:false});
}
function dealDmg(gs,tgt,amt,isTick=false){
  if(amt<=0)return gs;
  // 콤보 배율 적용 (과부하 전도 콤보)
  if(!isTick&&tgt==='enemy'&&(gs._comboDmgMult||1)>1){
    const m=gs._comboDmgMult;
    gs={...gs,_comboDmgMult:1}; // 소비
    amt=Math.round(amt*m);
  }
  // 반격 스택: 적의 counter가 있으면 플레이어 공격이 증폭되어 돌아옴
  if(tgt==='enemy'&&!isTick){
    const cnt=(gs.enemy.stacks||{}).counter||0;
    if(cnt>0){
      const backDmg=Math.round(amt*0.5);
      gs={...gs,player:{...gs.player,axis:Math.max(0,gs.player.axis-backDmg)}};
      gs={...gs,enemy:{...gs.enemy,stacks:{...gs.enemy.stacks,counter:cnt-1}}};
      VFX.stat('enemy',`반격 ${backDmg}`,G);
    }
  }
  // 유물 효과: dmgBonus, critBonus, condDmgBonus, onDmg
  if(!isTick&&tgt==='enemy'){
    const eqp=GS.relicsEquipped||[];
    for(const re2 of eqp){
      const rr=RELICS.find(x=>x.id===re2.id);if(!rr)continue;
      // dmgBonus: 공격 카드 타입 피해 보너스
      if(rr.dmgBonus)amt+=rr.dmgBonus.bonus||0;
      // condDmgBonus: 조건부 피해 배율
      if(rr.condDmgBonus){
        const eb=rr.condDmgBonus;
        if(eb.enemyBelowRatio&&gs.enemy&&gs.enemy.axis/gs.enemy.maxAxis<eb.enemyBelowRatio)amt=Math.round(amt*(eb.mult||1));
      }
      // shieldBonus: 방어 카드 보너스 (여기선 공격이라 skip)
      // onDmg: 피해 값 변경 함수
      if(rr.onDmg&&typeof rr.onDmg==='function')amt=rr.onDmg(gs,amt)||amt;
      // iron_will: HP 낮을 때 피해 감소 (플레이어 방어)
    }
    // condDmgBonus - 플레이어 HP 낮을 때 받는 피해 보너스는 enemy→player 방향에서
  }
  // critBonus 유물
  let baseCritRate=0.10,baseCritMult=1.5;
  if(!isTick){const eqp2=GS.relicsEquipped||[];for(const re2 of eqp2){const rr=RELICS.find(x=>x.id===re2.id);if(rr&&rr.critBonus){baseCritRate+=rr.critBonus.rate||0;baseCritMult+=rr.critBonus.mult||0;}}}
  const cr=!isTick&&Math.random()<baseCritRate;let val=cr?Math.floor(amt*baseCritMult):amt;
  if(cr&&tgt==='enemy'&&typeof achCheck==='function')achCheck('crit',{});
  
  // 2페이즈 공격력 배율 (적→플레이어 공격 시)
  if(tgt==='player'&&gs.enemy&&gs.enemy._p2DmgMult&&!isTick)val=Math.floor(val*(gs.enemy._p2DmgMult||1));
  let t={...gs[tgt]};let fin=val;let blk=0;
  // 거울 반사 저주 (플레이어가 적을 공격할 때)
  if(tgt==='enemy'&&(gs.player.stacks||{}).reflect_curse>0&&!isTick){
    const reflected=Math.floor(val*.4);
    gs=dealDmg({...gs},'player',reflected,true);
  }
  // reflectRatio 유물 (적→플레이어 공격 시 반사)
  if(tgt==='player'&&!isTick){
    (GS.relicsEquipped||[]).forEach(function(re2){
      const rr=RELICS.find(function(x){return x.id===re2.id;});
      if(rr&&rr.reflectRatio){const ref=Math.floor(val*rr.reflectRatio);if(ref>0)gs=dealDmg({...gs},'enemy',ref,true);}
    });
  }
  // reflectRatio 유물 - 적이 플레이어를 공격할 때 반사
  if(tgt==='player'&&!isTick){
    const eqp3=GS.relicsEquipped||[];
    for(const re2 of eqp3){const rr=RELICS.find(x=>x.id===re2.id);
      if(rr&&rr.reflectRatio){const ref=Math.floor(val*rr.reflectRatio);if(ref>0)gs=dealDmg({...gs},'enemy',ref,true);}
    }
  }
  // iron_will: HP 50%이상이면 받는 피해 +2, HP 20%이하면 받는 피해 -4
  if(tgt==='player'&&!isTick){
    const eqp4=GS.relicsEquipped||[];
    for(const re2 of eqp4){const rr=RELICS.find(x=>x.id===re2.id);
      if(rr&&rr.id==='relic_iron_will'&&gs.player){
        const ratio=gs.player.axis/gs.player.maxAxis;
        if(ratio>=0.5)amt=Math.max(0,amt+2);
        if(ratio<=0.2)amt=Math.max(0,amt-4);
      }
    }
  }
  if(t.cog>0){blk=Math.min(t.cog,fin);t.cog-=blk;fin-=blk;}
  // 보스 1페이즈 보호: 최대체력 20% 이하로 떨어지지 않음
  // 2페이즈 면역 턴
  if(tgt==='enemy'&&gs.enemy&&gs.enemy._immuneTurns&&gs.enemy._immuneTurns>0){
    gs=addV({...gs},{type:'dmg',val:0,blk:0,tgt:'enemy',cr:false});
    VFX.stat('enemy','면역','#FF4444');
    return gs;
  }
  // 거울 반사 — 공격 시 반사
  if(tgt==='enemy'){gs={...gs,_lastDmgToEnemy:amt};}
  if(tgt==='enemy'&&gs.eid==='boss7'&&!isTick){
    try{gs=applyBossGimmick(gs,'playerAttack');}catch(_me){}
  }
  if(tgt==='enemy'&&gs.enemy&&gs.enemy.type==='boss'){
    const _isP2=!!(gs.enemy._phase2||gs.enemy._phase2Done||(GS.battle&&GS.battle.phase===2));
    if(!_isP2){
      const minHp=Math.ceil(gs.enemy.maxAxis*0.2);
      if(t.axis-fin<minHp)fin=Math.max(0,t.axis-minHp);
    }
  }
  t.axis=cl(t.axis-fin,0,t.maxAxis);t.battery=cl(t.battery+Math.floor(fin*.25),0,100);
  
  return addV({...gs,[tgt]:t},{type:'dmg',val,blk,tgt,cr});
}
function doHeal(gs,tgt,amt){
  let t={...gs[tgt]};t.axis=cl(t.axis+amt,0,t.maxAxis);
  let g={...gs,[tgt]:t};if(amt>0)g=addV(g,{type:'heal',val:amt,tgt});return g;
}
function doShield(gs,tgt,amt){
  let t={...gs[tgt]};t.cog=cl(t.cog+amt,0,100);
  return addV({...gs,[tgt]:t},{type:'shld',val:amt,tgt});
}
function doBat(gs,tgt,d){
  let t={...gs[tgt]};t.battery=cl(t.battery+d,0,100);
  if(t.battery>=100&&d>0){t.battery=50;t.status=[...(t.status||[]).filter(s=>s.type!=='stasis'),{type:'stasis',turns:2}];return addV({...gs,[tgt]:t},{type:'stasis',tgt});}
  return{...gs,[tgt]:t};
}
function doStat(gs,tgt,type,turns){
  let t={...gs[tgt]};t.status=[...(t.status||[]).filter(s=>s.type!==type),{type,turns}];
  let g={...gs,[tgt]:t};
  if(type==='stasis')g=addV(g,{type:'stasis',tgt});
  if(type==='speed_up')g=addV(g,{type:'speed',tgt});
  return g;
}
function tickS(gs,tgt){let t={...gs[tgt]};t.status=(t.status||[]).map(s=>({...s,turns:s.turns-1})).filter(s=>s.turns>0);return{...gs,[tgt]:t};}
function drawN(gs,n){
  if(n>0)setTimeout(function(){SFX.card();},80);
  let g={...gs,hand:[...gs.hand],draw:[...gs.draw],disc:[...gs.disc]};
  const curTurn=g.turn||0;
  for(let i=0;i<n;i++){
    if(g.hand.length>=8)break;
    if(!g.draw.length){if(!g.disc.length)break;g.draw=shuffle(g.disc);g.disc=[];}
    const c=g.draw.pop();
    g.hand.push({...c,drawnAt:curTurn}); // 뽑힌 턴 기록
  }
  return g;
}

/* ═══════════════════════════════════════════════════════
   PARTICLE SYSTEM
═══════════════════════════════════════════════════════ */
const PS=(()=>{
  const cv=document.getElementById('vfc'),cx=cv.getContext('2d');
  let pool=[],raf=null;
  function resize(){cv.width=Math.min(430,window.innerWidth);cv.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);
  function add(p){if(pool.length<60)pool.push(p);}
  function spawnGear(x,y,n=14){for(let i=0;i<Math.min(n,18);i++){const a=Math.random()*Math.PI*2,s=rng(2,7);add({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rng(1,4),sz:rng(2,6),life:1,dec:.022+Math.random()*.018,clr:`hsl(${40+rng(-10,20)},${80+rng(0,20)}%,${50+rng(0,30)}%)`,rot:Math.random()*Math.PI*2,rv:(Math.random()-.5)*.4,sh:rng(0,1)});}run();}
  function spawnDust(x,y,n=18){for(let i=0;i<Math.min(n,22);i++){const a=Math.random()*Math.PI*2,s=rng(1,5);add({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rng(2,5),sz:rng(1,3),life:1,dec:.03+Math.random()*.02,clr:`rgba(255,${185+rng(0,70)},0,1)`,rot:0,rv:0,sh:2});}run();}
  function spawnCrit(x,y){spawnGear(x,y,20);spawnDust(x,y,25);add({x,y,vx:0,vy:0,sz:5,life:1,dec:.045,clr:G,sh:3,rot:0,rv:0});}
  function run(){if(!raf)loop();}
  function loop(){
    cx.clearRect(0,0,cv.width,cv.height);
    // 파티클 렌더
    pool=pool.filter(p=>{
      p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.vx*=.96;p.life-=p.dec;p.rot+=p.rv;
      if(p.life<=0)return false;
      cx.save();cx.globalAlpha=Math.max(0,p.life);cx.translate(p.x,p.y);
      if(p.sh===3){const r=(1-p.life)*80;cx.strokeStyle=p.clr;cx.lineWidth=2*p.life;cx.beginPath();cx.arc(0,0,r,0,Math.PI*2);cx.stroke();}
      else if(p.sh===2){cx.fillStyle=p.clr;cx.beginPath();cx.arc(0,0,p.sz,0,Math.PI*2);cx.fill();}
      else{cx.rotate(p.rot);cx.strokeStyle=p.clr;cx.lineWidth=1.2;cx.beginPath();
        if(p.sh===0){cx.moveTo(0,-p.sz);cx.lineTo(p.sz*.5,0);cx.lineTo(0,p.sz);cx.lineTo(-p.sz*.5,0);cx.closePath();}
        else{cx.moveTo(-p.sz,0);cx.lineTo(p.sz,0);cx.moveTo(0,-p.sz);cx.lineTo(0,p.sz);}cx.stroke();}
      cx.restore();return true;
    });
    if(pool.length>0){
      raf=requestAnimationFrame(loop);
    }else raf=null;
  }
  return{spawnGear,spawnDust,spawnCrit,get w(){return cv.width;},get h(){return cv.height;}};
})();

/* ═══════════════════════════════════════════════════════
   VFX CONTROLLER
═══════════════════════════════════════════════════════ */
function getEntRect(tgt){const dom=document.getElementById(`ent-${tgt}`);if(!dom)return null;const r=dom.getBoundingClientRect(),rr=document.getElementById('root').getBoundingClientRect();return{x:r.left-rr.left,y:r.top-rr.top,w:r.width,h:r.height};}
function getVL(){return document.getElementById('vpl');}
function addDE(x,y,cls,txt,delay=0){const de=document.createElement('div');de.className=`dp ${cls}`;de.style.cssText=`left:${x}px;top:${y}px;`;de.textContent=txt;const l=getVL();if(l)l.appendChild(de);setTimeout(()=>de.remove(),2100+delay);}
const VFX={
  stop(d=115){const r=document.getElementById('root');r.classList.add('hit-stop');setTimeout(()=>r.classList.remove('hit-stop'),d);},
  shake(m){const r=document.getElementById('root');r.classList.remove('ss','sm','sl');void r.offsetWidth;r.classList.add(m<8?'ss':m<22?'sm':'sl');setTimeout(()=>r.classList.remove('ss','sm','sl'),500);},
  dmg(tgt,val,cr,blk){
    const r=getEntRect(tgt);const rx=r?r.x+r.w/2-20:200,ry=r?r.y:200;
    addDE(rx,ry,cr?'dc':val>15?'dn':'ds','-'+val);
    if(cr)addDE(rx,ry+22,'dp dcl','치명타!',100);
    if(blk>0)addDE(rx+22,ry+12,'dp dsh',blk+' 차단');
    const px=PS.w*(tgt==='enemy'?.65:.3),py=PS.h*.3;
    if(cr)PS.spawnCrit(px,py);else PS.spawnGear(px,py,val>15?14:8);
  },
  heal(tgt,val){const r=getEntRect(tgt);addDE(r?r.x+r.w/2-20:180,r?r.y:200,'dp dh','+'+val+' 회복');},
  shld(tgt,val){const r=getEntRect(tgt);addDE(r?r.x+r.w/2-24:180,r?r.y:200,'dp dsh','+'+val+' 방어');},
  stat(tgt,txt,c){
    _statQ.push({tgt,txt,c:c||G});
    if(!_statBusy)_statFlush();
  },
  stasis(tgt){const e=document.getElementById('ent-'+tgt);if(e){e.classList.add('se');const n=document.createElement('div');n.className='dn-fx';e.appendChild(n);setTimeout(()=>{n.remove();e.classList.remove('se');},3500);}const al=document.createElement('div');al.className='sal';al.textContent='시간 정지됨';document.body.appendChild(al);setTimeout(()=>al.remove(),1800);},
  dissolve(el){if(!el)return;el.classList.add('cdis');PS.spawnDust(PS.w*.5,PS.h*.72,12);setTimeout(()=>el.remove(),420);}
};

const _statQ=[];let _statBusy=false;
function _statFlush(){
  if(!_statQ.length){_statBusy=false;return;}
  _statBusy=true;
  const {tgt,txt,c}=_statQ.shift();
  const r=getEntRect(tgt);
  const rx=r?r.x+r.w/2-28:180,ry=r?r.y-10:190;
  const vl=getVL();
  if(!vl){setTimeout(_statFlush,320);return;}
  const de=document.createElement('div');
  de.className='dp dst';
  de.style.left=rx+'px';de.style.top=ry+'px';de.style.color=c;
  de.textContent=txt;
  vl.appendChild(de);
  setTimeout(()=>{de.remove();_statFlush();},700);
}

function procVFX(prev,next){
  if(!next.battle||!prev.battle)return;
  const nv=(next.battle.vfx||[]).filter(v=>!(prev.battle.vfx||[]).find(p=>p.id===v.id));
  for(const v of nv){
    const d=v.cr?160:v.type==='dmg'?110:0;
    if(v.type==='dmg'){VFX.stop(d);VFX.shake(v.val);setTimeout(()=>VFX.dmg(v.tgt,v.val,v.cr,v.blk),d+20);}
    if(v.type==='heal')setTimeout(()=>VFX.heal(v.tgt,v.val),80);
    if(v.type==='shld')setTimeout(()=>VFX.shld(v.tgt,v.val),80);
    if(v.type==='stasis')setTimeout(()=>{VFX.stasis(v.tgt);VFX.stat(v.tgt,'시간 정지됨','#AAAAFF');},120);
    if(v.type==='speed')setTimeout(()=>VFX.stat(v.tgt,'속도 증가',G),80);
    if(v.type==='stack'){const clrs={overload:'#FF8844',wound:'#FF6666',regen:'#44FF88',armor_spike:'#88AAFF'};setTimeout(()=>VFX.stat(v.tgt,`${v.stackType} +${v.val}`,clrs[v.stackType]||G),80);}
  }
}

/* ═══════════════════════════════════════════════════════
   TRANSITION
═══════════════════════════════════════════════════════ */
let _tr=false;
function doTrans(cb,reverse=false){
  if(_tr)return;_tr=true;
  const ov=document.getElementById('tov'),tl=document.getElementById('tl'),tr=document.getElementById('tr'),fl=document.getElementById('tfl');
  function setClass(el,cls){el.setAttribute('class',cls);}
  setClass(tl,'');setClass(tr,'');
  tl.style.left='-95%';tr.style.right='-95%';
  tl.style.animation='none';tr.style.animation='none';
  fl.style.animation='none';fl.style.opacity='0';
  void tl.getBoundingClientRect();void tr.getBoundingClientRect();
  ov.classList.add('on');
  requestAnimationFrame(()=>{
    tl.style.left='';tr.style.right='';tl.style.animation='';tr.style.animation='';
    void tl.getBoundingClientRect();
    setClass(tl,'ti-l');setClass(tr,'ti-r');
  });
  setTimeout(()=>{
    if(!reverse)fl.style.animation='tFlash .35s ease forwards';
    cb();
    const ex=reverse?250:360;
    setTimeout(()=>{
      setClass(tl,'to-l');setClass(tr,'to-r');
      fl.style.animation='none';fl.style.opacity='0';
      setTimeout(()=>{
        ov.classList.remove('on');
        tl.style.left='-95%';tr.style.right='-95%';
        setClass(tl,'');setClass(tr,'');
        _tr=false;
      },460);
    },ex);
  },540);
}

/* ═══════════════════════════════════════════════════════
   FIELD BACKGROUND (구역별 테마)
═══════════════════════════════════════════════════════ */
function drawFieldBg(realmIdx){
  const cv=document.getElementById('fbg');
  const W=430,H=4600;
  cv.width=W;cv.height=H;
  cv.style.width='100%';cv.style.height=H+'px';cv.style.minHeight=H+'px';cv.style.display='block';
  const ctx=cv.getContext('2d');

  const realm=REALMS[realmIdx]||REALMS[0];
  const {bgDark,bgMid,gearClr,accent}=realm;
  const ri=realmIdx||0;

  // ── 1. 배경 기본 ──
  ctx.fillStyle=bgDark;
  ctx.fillRect(0,0,W,H);

  // ── 2. 구역 테마 그라디언트 (4방향 순환) ──
  const [gx1,gy1,gx2,gy2]=[[0,0,0,H],[W,0,0,H],[0,H,0,0],[W,H,W,0]][ri%4];
  const bg=ctx.createLinearGradient(gx1,gy1,gx2,gy2);
  bg.addColorStop(0,bgDark);
  bg.addColorStop(0.3,bgMid);
  bg.addColorStop(0.7,bgDark);
  bg.addColorStop(1,bgDark);
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  // ── 3. 구역별 빛 (위치 5곳 순환) ──
  const lx=[W*.5,W*.2,W*.8,W*.35,W*.65][ri%5];
  const ly=H*0.22;
  const rg=ctx.createRadialGradient(lx,ly,0,lx,ly,W*.8);
  rg.addColorStop(0,accent+'55');
  rg.addColorStop(0.4,accent+'18');
  rg.addColorStop(1,'transparent');
  ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);

  // ── 4. 구역 테마 패널: 19개 행 구역마다 다른 색띠 ──
  const rowH=H/19;
  for(let row=0;row<19;row++){
    const y=row*rowH;
    // 짝홀 미세 명암
    if(row%2===0){
      ctx.fillStyle='rgba(0,0,0,0.07)';
      ctx.fillRect(0,y,W,rowH);
    }
    // 행 구분선
    ctx.strokeStyle=gearClr+'22';
    ctx.lineWidth=0.5;
    ctx.setLineDash([2,12]);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 5. 수직 파이프 구조물 ──
  ctx.save();
  ctx.globalAlpha=0.055;
  ctx.strokeStyle=gearClr;
  const pipeW=[6,4,10,5,8][ri%5];
  for(let x=pipeW+14;x<W-14;x+=38+pipeW){
    ctx.lineWidth=pipeW;
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    ctx.lineWidth=1.5;
    for(let y=120;y<H;y+=240){
      ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.stroke();
    }
  }
  ctx.restore();

  // ── 6. 배경 기어 (구역마다 위치/크기 다름) ──
  const gSets=[
    [{x:.12,y:.1,r:.28},{x:.82,y:.45,r:.20},{x:.45,y:.72,r:.14},{x:.70,y:.88,r:.10}],
    [{x:.75,y:.12,r:.26},{x:.18,y:.55,r:.22},{x:.55,y:.78,r:.13}],
    [{x:.50,y:.08,r:.30},{x:.08,y:.62,r:.16},{x:.88,y:.35,r:.18},{x:.40,y:.88,r:.11}],
    [{x:.22,y:.18,r:.24},{x:.72,y:.60,r:.20},{x:.48,y:.82,r:.14}],
    [{x:.60,y:.07,r:.26},{x:.14,y:.48,r:.18},{x:.82,y:.75,r:.15},{x:.35,y:.92,r:.09}],
  ];
  const gs2=gSets[ri%gSets.length];
  gs2.forEach(({x,y,r},gi)=>{
    drawBgGearCanvas(ctx,W*x,H*y,W*r,gearClr,0.035+gi*0.008,0.15+gi*0.03);
  });

  // ── 7. 격자 ──
  ctx.save();
  ctx.globalAlpha=0.035;
  ctx.strokeStyle=gearClr;
  ctx.lineWidth=0.5;
  const grid=26+ri*2;
  for(let x=0;x<W;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.restore();

  // ── 8. 심층 구역 (ri 4+): 대각 스캔라인 ──
  if(ri>=4){
    ctx.save();ctx.globalAlpha=0.02;ctx.strokeStyle=accent;ctx.lineWidth=1;
    for(let k=-H;k<W+H;k+=55){ctx.beginPath();ctx.moveTo(k,0);ctx.lineTo(k+H,H);ctx.stroke();}
    ctx.restore();
  }

  // ── 9. 심층 구역 (ri 6+): 별 필드 ──
  if(ri>=6){
    ctx.save();ctx.globalAlpha=0.18;ctx.fillStyle=accent;
    for(let i=0;i<80;i++){
      const sx=(Math.sin(i*137.5+ri)*0.5+0.5)*W;
      const sy=(Math.cos(i*83.7+ri)*0.5+0.5)*H;
      const sr=0.4+((i*17)%3)*0.5;
      ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  // ── 10. 19행 구역 구분 강조선 ──
  ctx.save();
  ctx.globalAlpha=0.06;
  ctx.strokeStyle=accent;
  ctx.lineWidth=1.5;
  ctx.setLineDash([3,16]);
  for(let s=1;s<19;s++){
    const y=(H/19)*s;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ── 11. 비네트 ──
  const vn=ctx.createRadialGradient(W/2,H/2,W*.1,W/2,H/2,W*.95);
  vn.addColorStop(0,'transparent');
  vn.addColorStop(1,'rgba(0,0,0,0.8)');
  ctx.fillStyle=vn;ctx.fillRect(0,0,W,H);

  // ── 12. 상단/하단 페이드 ──
  const topF=ctx.createLinearGradient(0,0,0,H*0.07);
  topF.addColorStop(0,'rgba(0,0,0,0.97)');topF.addColorStop(1,'transparent');
  ctx.fillStyle=topF;ctx.fillRect(0,0,W,H*0.07);

  const botF=ctx.createLinearGradient(0,H*0.95,0,H);
  botF.addColorStop(0,'transparent');botF.addColorStop(1,'rgba(0,0,0,0.97)');
  ctx.fillStyle=botF;ctx.fillRect(0,H*0.95,W,H*0.05);
}
function drawBgGearCanvas(ctx,cx,cy,r,color,opacity,alpha){
  ctx.save();ctx.globalAlpha=opacity;
  // 기어 이빨
  const n=12,s=Math.PI*2/n,tw=s*.38;
  ctx.beginPath();
  for(let i=0;i<n;i++){
    const a=i*s;const R=r,ri=r*.65;
    const pts=[[cx+ri*Math.cos(a-tw),cy+ri*Math.sin(a-tw)],[cx+R*Math.cos(a-tw*.4),cy+R*Math.sin(a-tw*.4)],[cx+R*Math.cos(a+tw*.4),cy+R*Math.sin(a+tw*.4)],[cx+ri*Math.cos(a+tw),cy+ri*Math.sin(a+tw)]];
    if(i===0)ctx.moveTo(pts[0][0],pts[0][1]);else ctx.lineTo(pts[0][0],pts[0][1]);
    pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
  }
  ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=color.replace('#','rgba(').replace(/(..)(..)(..)$/,(_,r,g,b)=>`${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},${alpha})`);
  ctx.fill();
  // 허브
  ctx.beginPath();ctx.arc(cx,cy,r*.2,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════
   NODE POSITIONS
═══════════════════════════════════════════════════════ */
function npos(n){
  if(!n||n.row===undefined) return {x:215,y:2300};
  const ROWS=19,MAP_T=140,MAP_B=4460,W=430;
  // 같은 행의 노드들 총 수로 균등 분할
  const nodes=GS.realmNodes||[];
  const rowNodes=nodes.filter(x=>x.row===n.row);
  const total=rowNodes.length;
  const myIdx=rowNodes.findIndex(x=>x.id===n.id);
  const margin=40;
  const usableW=W-margin*2;
  const step=total>1?usableW/(total-1):0;
  const x=total===1?W/2:Math.round(margin+myIdx*step);
  const y=Math.round(MAP_B-(MAP_B-MAP_T)*(n.row/(ROWS-1)));
  return{x,y};
}

/* ═══════════════════════════════════════════════════════
   FIELD RENDER
═══════════════════════════════════════════════════════ */
const NC={start:G,battle:CR,elite:'#FF2222',rest:'#44BB66',event:'#4488FF',shop:COP,boss:'#CC44FF',blackmarket:'#AA8800',ambush:'#CC3300',elite_ambush:'#FF4400',salvage:'#886633',forge:'#6688AA',clinic:'#339966',implant:'#9944CC',abyss:'#444466'};
const NI={start:'star',battle:'atk',elite:'skull',rest:'fire',event:'quest',shop:'coin',boss:'crown',blackmarket:'gear',ambush:'bolt',elite_ambush:'skull',salvage:'sword2',forge:'shield',clinic:'heal',implant:'comet',abyss:'clock'};

const CLOCK_REWARDS = [
  // 태엽 1~12 (보스 클리어 순서대로)
  {id:'cw1', name:'시간의 각성',
   desc:'최대 HP +20. 아무것도 멈추지 않는다.',
   icon:'⊕', clr:'#FFCC00',
   apply:(gs)=>({...gs,player:{...gs.player,maxAxis:gs.player.maxAxis+20,axis:Math.min(gs.player.maxAxis+20,gs.player.axis+20)}})},
  {id:'cw2', name:'기어의 선물',
   desc:'전투 시작 시 에너지 +1 영구.',
   icon:'⚙', clr:'#FFAA00',
   apply:(gs)=>({...gs,player:{...gs.player,maxEnergy:(gs.player.maxEnergy||4)+1}})},
  {id:'cw3', name:'공허의 속삭임',
   desc:'카드: [공허의 메아리] 해금. 매 턴 랜덤 버프.',
   icon:'◈', clr:'#AA44FF',
   cardReward:'void_echo'},
  {id:'cw4', name:'강철 의지',
   desc:'받는 피해 -2 영구.',
   icon:'◆', clr:'#4488CC',
   apply:(gs)=>({...gs,player:{...gs.player,_dmgReduce:(gs.player._dmgReduce||0)+2}})},
  {id:'cw5', name:'시간의 역류',
   desc:'카드: [시간의 회수] 해금. 사용한 카드 돌려받음.',
   icon:'↺', clr:'#44CCAA',
   cardReward:'time_recall'},
  {id:'cw6', name:'파국의 전조',
   desc:'크리티컬 확률 +10%.',
   icon:'✦', clr:'#FF6600',
   apply:(gs)=>({...gs,player:{...gs.player,_critBonus:(gs.player._critBonus||0)+0.1}})},
  {id:'cw7', name:'기어 연쇄',
   desc:'콤보 발동 시 방전 -5.',
   icon:'⋯', clr:'#FFDD00',
   apply:(gs)=>gs},  // onCombo 효과는 별도 처리
  {id:'cw8', name:'심연의 눈',
   desc:'카드: [심연 응시] 해금. 적 디버프 2종 부여.',
   icon:'∞', clr:'#6600CC',
   cardReward:'abyss_gaze'},
  {id:'cw9', name:'절대 방호',
   desc:'전투 시작 시 톱니 +20.',
   icon:'◎', clr:'#2266FF',
   apply:(gs)=>({...gs,player:{...gs.player,cog:(gs.player.cog||0)+20}})},
  {id:'cw10', name:'황금의 손길',
   desc:'전투 클리어 시 황금 +30 추가.',
   icon:'◇', clr:'#FFBB00',
   goldBonus:30},
  {id:'cw11', name:'시간의 역설',
   desc:'카드: [역설의 일격] 해금. 현재 시간 기반 피해.',
   icon:'⊗', clr:'#FF4488',
   cardReward:'paradox_strike'},
  {id:'cw12', name:'어리석은 자의 각인',
   desc:'모든 능력치 +15%. 어리석음이 세계를 바꾼다.',
   icon:'☿', clr:'#FFFFFF',
   apply:(gs)=>({...gs,player:{...gs.player,
     maxAxis:Math.floor(gs.player.maxAxis*1.15),
     axis:Math.floor(gs.player.axis*1.15)}}),
   isFinal:true},
];

const CLOCK_CARDS = {
  void_echo:{id:'void_echo',name:'공허의 메아리',cost:1,type:'유틸',rarity:'전설',icon:'util',clr:'#AA44FF',
    desc:'이번 턴 마지막으로 사용한 카드 효과 반복.',
    fx:(gs)=>{const lp=gs.lastPlayed;if(!lp||!CARDS[lp]||!CARDS[lp].fx)return gs;
      try{return CARDS[lp].fx({...gs,lastPlayed:null});}catch(e){return gs;}}},
  time_recall:{id:'time_recall',name:'시간의 회수',cost:2,type:'유틸',rarity:'전설',icon:'util',clr:'#44CCAA',
    desc:'묘지 카드 전부 패로.',
    fx:(gs)=>({...gs,hand:[...gs.hand,...gs.disc],disc:[]})},
  abyss_gaze:{id:'abyss_gaze',name:'심연 응시',cost:2,type:'유틸',rarity:'전설',icon:'util',clr:'#6600CC',
    desc:'적에게 스태시스 2 + 상처 3 + 과부하 2.',
    fx:(gs)=>{gs=doStat(gs,'enemy','stasis',2);gs=addStack(gs,'enemy','wound',3);return addStack(gs,'enemy','ol',2);}},
  paradox_strike:{id:'paradox_strike',name:'역설의 일격',cost:3,type:'공격',rarity:'전설',icon:'heavy',clr:'#FF4488',
    desc:'현재 초 × 2 피해 (최소 15, 최대 59).',
    fx:(gs)=>{const dmg=Math.max(15,Math.min(59,new Date().getSeconds()*2));return dealDmg(gs,'enemy',dmg);}},
};

function showField(){_tr=false;const _to=document.getElementById('title-overlay');if(_to)_to.remove();
  const rootEl=document.getElementById('root');rootEl.innerHTML='';rootEl.style.display='none';
  const fsEl2=document.getElementById('fs');fsEl2.style.display='block';
  const s=GS;initGears(Math.min(3,s.player.speed/5),false);
  drawFieldBg(s.realmIdx||0);
  // 높이 동기화
  const _fn=document.getElementById('fnodes');if(_fn)_fn.style.height='4600px';
  const _fp=document.getElementById('fpaths');if(_fp){_fp.style.height='4600px';_fp.setAttribute('height','4600');}
  renderNodes();if(typeof renderClockUI==='function')renderClockUI();updateFUI();
  BGM.playMap();
  // 이퀄라이저 표시
  const eqCv=document.getElementById('eq-canvas');
  if(eqCv){eqCv.style.display='block';eqCv.width=220;eqCv.height=28;setTimeout(()=>drawEQ(eqCv),300);}const _fuiSF=document.getElementById('fui');if(_fuiSF){_fuiSF.style.opacity='';_fuiSF.style.pointerEvents='';_fuiSF.style.display='block';}
  const r=REALMS[s.realmIdx||0];
  const _rn=document.getElementById('realm-name');if(_rn)_rn.textContent=r?`구역 ${r.num} — ${r.name}`:'크로노스 영역';
  const _rs=document.getElementById('realm-sub');if(_rs)_rs.textContent=r?r.theme:'';
  // 현재 노드 위치로 초기 스크롤
  setTimeout(()=>{
    const _nodes=GS.realmNodes||[];
    const _cur=_nodes.find(n=>n.id===GS.curNode)||_nodes[0];
    if(_cur){const _pos=npos(_cur);const _fs=document.getElementById('fs');
      if(_fs){_fs.scrollTop=Math.max(0,_pos.y-(_fs.clientHeight||window.innerHeight)*.55);}}
  },150);
}
function hideField(){
  const _cbh=document.getElementById('chain-bar');if(_cbh){_cbh.classList.remove('visible');_cbh.style.cssText='opacity:0;';}document.getElementById('fs').style.display='none';const _fh=document.getElementById('fui');if(_fh){_fh.style.opacity='0';_fh.style.pointerEvents='none';}document.getElementById('gb').classList.remove('red');const ie=document.getElementById('enemy-intent');if(ie)ie.style.display='none';document.getElementById('root').style.display='block';}


function renderNodes(){
  const s=GS;
  const layer=document.getElementById('fnodes'),svg=document.getElementById('fpaths');
  layer.innerHTML='';svg.innerHTML='';
  svg.setAttribute('width','430');svg.setAttribute('height','4600');
  const nodes=s.realmNodes||[];
  const cur=nodes.find(n=>n.id===s.curNode)||nodes[0];
  const cleared=s.cleared||new Set();
  const reachable=new Set(cur?.next||[]);

  const TYPE_ICON={
    battle:'⚔',boss:'☿',elite:'★',rest:'✦',event:'?',shop:'$',
    blackmarket:'~',ambush:'!',elite_ambush:'!!',salvage:'↺',
    forge:'⚒',clinic:'+',implant:'◈',abyss:'∞',
    forest:'♣',trial:'≡',gamble:'◆',timegate:'◎',hunter:'▲',start:'◉',enhance:'⬆',relic_shrine:'◈',fragment_forge:'◆',void_rift:'∅',reliquary:'◎'
  };
  const TYPE_CLR={
    battle:'#CC3300',boss:'#FF4400',elite:'#AA2299',rest:'#226633',
    event:'#886622',shop:'#AA7700',blackmarket:'#664422',ambush:'#AA3300',
    elite_ambush:'#882299',salvage:'#556633',forge:'#AA5500',clinic:'#226644',
    implant:'#334488',abyss:'#220055',forest:'#336622',enhance:'#AA6600',relic_shrine:'#884400',trial:'#555588',
    gamble:'#886611',timegate:'#334477',hunter:'#663311',start:'#888800',fragment_forge:'#336688',void_rift:'#333333',reliquary:'#885500'
  };

  // ── 연결선 (SVG path + glow) ──
  nodes.forEach(n=>{
    const p1=npos(n);
    n.next.forEach(nid=>{
      const n2=nodes.find(x=>x.id===nid);if(!n2)return;
      const p2=npos(n2);
      const isCl=cleared.has(n.id);
      const isReach=reachable.has(nid)&&n.id===s.curNode;

      // 곡선 경로
      const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2 + (p2.y>p1.y?-20:20);
      const d=`M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`;

      // glow 레이어 (활성 경로)
      if(isReach||isCl){
        const glow=document.createElementNS('http://www.w3.org/2000/svg','path');
        glow.setAttribute('d',d);
        glow.setAttribute('stroke',isCl?'rgba(255,215,0,.18)':'rgba(255,215,0,.35)');
        glow.setAttribute('stroke-width',isCl?'4':'6');
        glow.setAttribute('fill','none');
        glow.setAttribute('filter','url(#glow-path)');
        svg.appendChild(glow);
      }
      // 기본선
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',d);
      path.setAttribute('stroke',
        isCl?'rgba(255,215,0,.35)':
        isReach?'rgba(255,215,0,.6)':
        'rgba(255,255,255,.06)');
      path.setAttribute('stroke-width',isCl?'1.5':'2');
      path.setAttribute('stroke-dasharray',isCl?'':'4 6');
      path.setAttribute('fill','none');
      svg.appendChild(path);
    });
  });

  // SVG 필터
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML='<filter id="glow-path"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svg.insertBefore(defs,svg.firstChild);

  // ── 노드 ──
  nodes.forEach((n,ni)=>{
    const pos=npos(n);
    const isCurr=n.id===s.curNode;
    const isCl=cleared.has(n.id);
    const isR=reachable.has(n.id)&&!cleared.has(n.id);
    const clr=TYPE_CLR[n.type]||'#555';
    const icon=TYPE_ICON[n.type]||'?';

    const wrap=document.createElement('div');
    wrap.style.cssText='position:absolute;transform:translate(-50%,-50%);cursor:'+(isR?'pointer':'default')+';animation:nodeEnter 0.35s ease '+(ni*0.04)+'s both;'+
      'left:'+pos.x+'px;top:'+pos.y+'px;pointer-events:'+(isR?'all':'none')+';'+
      'transition:all .2s;z-index:'+(isCurr?20:10)+';';

    // 노드 원
    const sz=isCurr?52:(n.type==='boss'?48:isR?44:34);
    const circle=document.createElement('div');
    circle.style.cssText='width:'+sz+'px;height:'+sz+'px;border-radius:50%;'+
      'display:flex;align-items:center;justify-content:center;'+
      'font-size:'+(sz>44?18:sz>36?15:sz>28?12:9)+'px;'+
      'border:2px solid '+(isCurr?'#FFD700':isCl?clr+'88':isR?clr:'rgba(255,255,255,.12)')+';'+
      'background:'+(isCurr?'rgba(255,215,0,.18)':isCl?'rgba(0,0,0,.6)':isR?clr+'22':'rgba(0,0,0,.4)')+';'+
      'box-shadow:'+(isCurr?'0 0 20px #FFD700,0 0 40px rgba(255,215,0,.3)':
                    isR?'0 0 12px '+clr+'88,0 0 4px '+clr:'none')+';'+
      'color:'+(isCurr?'#FFD700':isCl?clr+'88':isR?clr:'rgba(255,255,255,.2)')+';'+
      'transition:all .2s;position:relative;overflow:visible;';
    circle.textContent=icon;

    // 도달 가능 노드: 맥동 링
    if(isR){
      const ring=document.createElement('div');
      ring.style.cssText='position:absolute;inset:-6px;border-radius:50%;'+
        'border:1px solid '+clr+'55;animation:nodeRing 1.8s ease-in-out infinite;pointer-events:none;';
      circle.appendChild(ring);
    }
    // 현재 노드: 외부 링 2개
    if(isCurr){
      const r1=document.createElement('div');
      r1.style.cssText='position:absolute;inset:-8px;border-radius:50%;border:1px solid rgba(255,215,0,.4);animation:nodeRing 2s ease-in-out infinite;pointer-events:none;';
      const r2=document.createElement('div');
      r2.style.cssText='position:absolute;inset:-14px;border-radius:50%;border:1px solid rgba(255,215,0,.2);animation:nodeRing 2s ease-in-out infinite .4s;pointer-events:none;';
      circle.appendChild(r1);circle.appendChild(r2);
    }

    // 레이블
    const lbl=document.createElement('div');
    lbl.style.cssText='position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);'+
      'white-space:nowrap;font-size:7px;font-family:"Share Tech Mono",monospace;letter-spacing:.05em;'+
      'color:'+(isCurr?'#FFD700':isR?clr:'rgba(255,255,255,.2)')+';text-align:center;pointer-events:none;';
    lbl.textContent=n.lbl||n.type;

    wrap.appendChild(circle);wrap.appendChild(lbl);

    if(isR){
      wrap.addEventListener('click',()=>onNode(n.id));
    }
    layer.appendChild(wrap);
  });

  // ── 플레이어 마커 ──
  const cp=cur?npos(cur):{x:215,y:2390};
  const pw=document.getElementById('fplayer');
  if(pw){
    pw.style.left=`${cp.x}px`;pw.style.top=`${cp.y-50}px`;
  }
  const r=REALMS[s.realmIdx||0];
  document.getElementById('realm-name').textContent=r?r.name:'';
  document.getElementById('realm-sub').textContent=r?r.theme:'';
  document.getElementById('frealm').textContent=r?`구역 ${r.num}`:'I';
  const _achBtn=document.getElementById('ach-open-btn');if(_achBtn&&!_achBtn._bnd){_achBtn._bnd=true;_achBtn.onclick=function(){showAchievementModal();};}

  // 현재 노드 위치로 스크롤
  setTimeout(()=>{
    const _nodes=GS.realmNodes||[];
    const _cur=_nodes.find(n=>n.id===GS.curNode)||_nodes[0];
    if(_cur){
      const _pos=npos(_cur);
      const _fs=document.getElementById('fs');
      if(_fs)_fs.scrollTop=Math.max(0,_pos.y-(_fs.clientHeight||window.innerHeight)*.55);
    }
  },150);
}

function updateSidePanels(){
  if(window.innerWidth<768)return;
  var s=GS,g=function(id){return document.getElementById(id);};
  var realm=REALMS[s.realmIdx||0];
  if(g('sp-realm'))g('sp-realm').textContent=realm?realm.name:'';
  if(g('sp-theme'))g('sp-theme').textContent=realm?realm.theme:'';
  if(g('sp-area'))g('sp-area').textContent=((s.realmIdx||0)+1)+'/'+REALMS.length;
  if(g('sp-gold'))g('sp-gold').textContent=s.gold||0;
  if(s.player){
    var p=s.player,hEl=g('sp-hp');
    if(hEl){hEl.textContent=p.axis+'/'+p.maxAxis;
      hEl.style.color=p.axis/p.maxAxis<0.3?'#CC4400':'rgba(255,215,0,.6)';}
    if(g('sp-bat'))g('sp-bat').textContent=(p.battery||0)+'%';
  }
}
function addBattleLog(msg,clr){
  var log=document.getElementById('dt-log');if(!log)return;
  var d=document.createElement('div');d.style.color=clr||'#444';d.textContent=msg;
  log.appendChild(d);if(log.children.length>80)log.removeChild(log.firstChild);
  log.scrollTop=log.scrollHeight;
}

function setInBattle(yes){
  document.body.classList.toggle('inbattle',yes);
  if(yes){
    BGM.pauseMap();BGM.pauseShop();
    setTimeout(function(){if(typeof EQ!=='undefined')EQ.reposition();},50);
  } else {
    // BGM.fadeToMap()은 _battleExitFade에서 이미 호출
    setTimeout(function(){if(typeof EQ!=='undefined')EQ.reposition();},300);
  }
}

function fixOverlays(){
  if(window.innerWidth<768)return;
  const sw=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--side-w'))||240;
  const gw=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--game-w'))||500;
  const cx=sw+gw/2;
  ['tov','stov','story-overlay','chain-bar','combo-badge','enemy-intent'].forEach(function(id){
    const e=document.getElementById(id);if(e){e.style.left=cx+'px';e.style.transform='translateX(-50%)';}
  });
  const fui=document.getElementById('fui');
  if(fui){fui.style.left=cx+'px';fui.style.transform='translateX(-50%)';}
}

function showSalvageSelectMode(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'380px',maxHeight:'92vh',display:'flex',flexDirection:'column'});
  box.appendChild(mkDiv('evt-title',{},'카드 선택'));
  box.appendChild(mkDiv('',{fontSize:'9px',color:'#666',fontFamily:"'Share Tech Mono',monospace",marginBottom:'8px'},'파괴할 카드를 선택하라:'));

  const rarityGold2={일반:15,희귀:30,고급:60,전설:100,유물:150};
  const list=document.createElement('div');
  list.style.cssText='flex:1;overflow-y:auto;border:1px solid rgba(255,215,0,.1);border-radius:6px;';

  GS.deck.forEach((card,i)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;'+
      'cursor:pointer;border-bottom:1px solid rgba(255,255,255,.03);transition:background .1s;';
    row.onmouseenter=()=>row.style.background='rgba(255,215,0,.06)';
    row.onmouseleave=()=>row.style.background='';
    const typeCLR={공격:CR,방어:'#4488BB',회복:'#33BB66',유틸:'#886633',강화:'#CC9900'};
    const dot=document.createElement('div');
    dot.style.cssText='width:6px;height:6px;border-radius:50%;flex-shrink:0;background:'+(typeCLR[card.type]||'#555')+';';
    const nm=mkDiv('',{flex:'1',fontSize:'10px',color:card.clr||G,fontFamily:"'Share Tech Mono',monospace"},card.name);
    const gold2=(rarityGold2[card.rarity]||15);
    const pr=mkDiv('',{fontSize:'8px',color:'rgba(255,215,0,.5)',fontFamily:"'Share Tech Mono',monospace"},'+'+gold2+'G');
    [dot,nm,pr].forEach(el=>row.appendChild(el));
    row.onclick=()=>{
      bd.remove();
      // 보너스 선택
      showSalvageBonus(card, gold2, i);
    };
    list.appendChild(row);
  });

  box.appendChild(list);
  const cl=mkDiv('evt-btn evt-btn-neutral',{marginTop:'8px'},'취소');cl.onclick=()=>bd.remove();box.appendChild(cl);
  bd.appendChild(box);document.body.appendChild(bd);
}

function showSalvageBonus(card, gold, deckIdx){
  const bd=mkBk();
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  box.appendChild(mkDiv('evt-title',{},'파괴 보너스'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#888',fontFamily:"'Noto Serif KR',serif",
    lineHeight:'2',textAlign:'center',marginBottom:'12px'},
    '['+card.name+'] 파괴 → +'+gold+'G\n추가 보너스를 하나 선택:'));

  const bonuses=[
    {lbl:'HP 회복 +'+Math.max(15,gold/2|0),clr:'#33BB66',fn:()=>{
      GS=upd(GS,s=>({...s,gold:s.gold+gold,deck:s.deck.filter((_,i)=>i!==deckIdx),
        player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+(gold/2|0))}}));
      showNotif('['+card.name+'] 파괴 +'+gold+'G +HP',G);}},
    {lbl:'다음 전투 에너지 +2',clr:G,fn:()=>{
      GS=upd(GS,s=>({...s,gold:s.gold+gold,deck:s.deck.filter((_,i)=>i!==deckIdx)}));
      GS={...GS,_nextBattleEnergy:(GS._nextBattleEnergy||0)+2};
      showNotif('['+card.name+'] 파괴 +'+gold+'G +에너지',G);}},
    {lbl:'랜덤 희귀 카드 1장',clr:'#AA44FF',fn:()=>{
      GS=upd(GS,s=>({...s,gold:s.gold+gold,deck:s.deck.filter((_,i)=>i!==deckIdx)}));
      const rarePool=SHOP_P.filter(e=>{const c=CARDS[e.id];return c&&(c.rarity==='희귀'||c.rarity==='고급');});
      if(rarePool.length){
        const pick=rarePool[Math.floor(Math.random()*rarePool.length)];
        if(pick&&pick.id&&CARDS[pick.id]){GS=upd(GS,s=>addCardSafe(s,mkCard(pick.id)));showNotif('['+card.name+'] 파괴 → ['+CARDS[pick.id].name+'] 획득',G);}
      }}},
    {lbl:'황금만 받기 (+50% 추가)',clr:'#FFCC00',fn:()=>{
      const total=Math.floor(gold*1.5);
      GS=upd(GS,s=>({...s,gold:s.gold+total,deck:s.deck.filter((_,i)=>i!==deckIdx)}));
      showNotif('['+card.name+'] 파괴 +'+total+'G',G);}},
  ];

  bonuses.forEach(b=>{
    const btn=mkDiv('evt-btn evt-btn-gold',{},b.lbl);
    btn.style.color=b.clr;btn.style.borderColor=b.clr+'55';
    btn.onclick=()=>{b.fn();updateFUI();bd.remove();};
    box.appendChild(btn);
  });
  bd.appendChild(box);document.body.appendChild(bd);
}

function showSalvageBulkMode(){
  const bd=mkBk();
  const box=mkDiv('evt-box',{maxWidth:'380px'});
  box.appendChild(mkDiv('evt-title',{},'대량 처분'));
  box.appendChild(mkDiv('',{fontSize:'9px',color:'#666',fontFamily:"'Share Tech Mono',monospace",marginBottom:'8px'},
    '파괴할 카드 3장 선택:'));
  const selected=new Set();
  const list=document.createElement('div');
  list.style.cssText='max-height:200px;overflow-y:auto;border:1px solid rgba(255,215,0,.1);border-radius:6px;margin-bottom:10px;';

  function updateRows(){
    list.innerHTML='';
    GS.deck.forEach((card,i)=>{
      const row=document.createElement('div');
      const isSel=selected.has(i);
      row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;'+
        'background:'+(isSel?'rgba(255,215,0,.1)':'transparent')+';'+
        'border-bottom:1px solid rgba(255,255,255,.03);transition:background .1s;';
      const chk=mkDiv('',{fontSize:'12px',width:'16px',textAlign:'center',color:isSel?G:'#333'},isSel?'✓':'○');
      const nm=mkDiv('',{flex:'1',fontSize:'10px',color:isSel?G:(card.clr||'#555'),fontFamily:"'Share Tech Mono',monospace"},card.name);
      const tp=mkDiv('',{fontSize:'8px',color:'#444',fontFamily:"'Share Tech Mono',monospace"},card.type+' '+card.rarity);
      [chk,nm,tp].forEach(el=>row.appendChild(el));
      row.onclick=()=>{if(isSel)selected.delete(i);else if(selected.size<3)selected.add(i);updateRows();};
      list.appendChild(row);
    });
  }
  updateRows();
  box.appendChild(list);

  const confBtn=mkDiv('evt-btn evt-btn-gold',{},'3장 파괴 → 고급 카드 획득');
  confBtn.onclick=()=>{
    if(selected.size!==3){showNotif('3장을 선택해야 한다',CR);return;}
    const idxArr=Array.from(selected).sort((a,b)=>b-a);
    let newDeck=[...GS.deck];
    idxArr.forEach(i=>newDeck.splice(i,1));
    GS={...GS,deck:newDeck};
    const epicPool=SHOP_P.filter(e=>{const c=CARDS[e.id];return c&&(c.rarity==='고급'||c.rarity==='전설');});
    if(epicPool.length){
      const pick=epicPool[Math.floor(Math.random()*epicPool.length)];
      if(pick&&pick.id&&CARDS[pick.id]){GS=upd(GS,s=>addCardSafe(s,mkCard(pick.id)));showNotif('카드 3장 파괴 → ['+CARDS[pick.id].name+'] 획득',G);}
    }
    updateFUI();bd.remove();
  };
  box.appendChild(confBtn);
  const cl=mkDiv('evt-btn evt-btn-neutral',{},'취소');cl.onclick=()=>bd.remove();box.appendChild(cl);
  bd.appendChild(box);document.body.appendChild(bd);
}

function showBattleEntry(cb){
  // 전투 진입 씬 — 화면 균열+섬광
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:8500;pointer-events:none;overflow:hidden;';
  document.body.appendChild(ov);
  // 붉은 빛 확산
  const flash=document.createElement('div');
  flash.style.cssText='position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(180,0,0,.0),rgba(80,0,0,.0));';
  ov.appendChild(flash);
  // 균열선 3개
  for(let i=0;i<3;i++){
    const crack=document.createElement('div');
    const x=20+Math.random()*60;
    crack.style.cssText='position:absolute;left:'+x+'%;top:0;width:1px;height:0;'+
      'background:linear-gradient(180deg,transparent,rgba(255,100,0,.6) 40%,rgba(255,50,0,.4) 70%,transparent);'+
      'transition:height .3s '+(i*.06)+'s ease;';
    ov.appendChild(crack);
    requestAnimationFrame(()=>setTimeout(()=>crack.style.height='100%',50+i*60));
  }
  // 플래시
  requestAnimationFrame(()=>{
    flash.style.transition='background .15s ease';
    flash.style.background='radial-gradient(ellipse at 50% 40%,rgba(180,0,0,.5),rgba(20,0,0,.8))';
    setTimeout(()=>{flash.style.background='radial-gradient(ellipse at 50% 40%,rgba(180,0,0,.0),rgba(80,0,0,.0))';},150);
  });
  VFX.shake(18);
  setTimeout(()=>{ov.style.transition='opacity .3s';ov.style.opacity='0';setTimeout(()=>ov.remove(),320);},400);
  setTimeout(cb,200);
}

function renderClockUI(){
  const n=GS.clockUnlocked||0;
  const hud=document.getElementById('map-clock');
  if(!hud)return;
  hud.style.display='block';hud.innerHTML='';
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('width','44');svg.setAttribute('height','44');svg.setAttribute('viewBox','0 0 44 44');
  const bg=document.createElementNS(ns,'circle');bg.setAttribute('cx','22');bg.setAttribute('cy','22');bg.setAttribute('r','20');
  bg.setAttribute('fill','rgba(4,4,14,.95)');bg.setAttribute('stroke',n>=12?'rgba(255,215,0,.9)':'rgba(255,215,0,.3)');bg.setAttribute('stroke-width','1.5');svg.appendChild(bg);
  for(let i=0;i<12;i++){
    const ang=((i+1)*30-90)*Math.PI/180,r2=15,cx2=22+Math.cos(ang)*r2,cy2=22+Math.sin(ang)*r2;
    const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',cx2.toFixed(1));dot.setAttribute('cy',cy2.toFixed(1));
    dot.setAttribute('r',i%3===0?'2':'1.2');dot.setAttribute('fill',i<n&&CLOCK_REWARDS[i]?CLOCK_REWARDS[i].clr:'rgba(255,255,255,.1)');svg.appendChild(dot);
  }
  const ha=((n+1)*30-90)*Math.PI/180,hx=22+Math.cos(ha)*12,hy=22+Math.sin(ha)*12;
  const hl=document.createElementNS(ns,'line');hl.setAttribute('x1','22');hl.setAttribute('y1','22');
  hl.setAttribute('x2',hx.toFixed(1));hl.setAttribute('y2',hy.toFixed(1));
  hl.setAttribute('stroke','rgba(255,215,0,.9)');hl.setAttribute('stroke-width','2');hl.setAttribute('stroke-linecap','round');svg.appendChild(hl);
  const cc=document.createElementNS(ns,'circle');cc.setAttribute('cx','22');cc.setAttribute('cy','22');cc.setAttribute('r','2');cc.setAttribute('fill','rgba(255,215,0,.9)');svg.appendChild(cc);
  const tt=document.createElementNS(ns,'text');tt.setAttribute('x','22');tt.setAttribute('y','38');tt.setAttribute('text-anchor','middle');
  tt.setAttribute('fill','rgba(255,215,0,.45)');tt.setAttribute('font-size','5');tt.setAttribute('font-family','Share Tech Mono,monospace');tt.textContent=n+'/12';svg.appendChild(tt);
  hud.appendChild(svg);hud.onclick=showClockModal;
}

function showClockModal(){
  if(typeof SFX!=='undefined')SFX.clock();
  const n=GS.clockUnlocked||0;
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('',{background:'rgba(4,4,14,.97)',border:'1px solid rgba(255,215,0,.2)',
    borderRadius:'12px',padding:'20px',maxWidth:'360px',maxHeight:'88vh',overflow:'auto',position:'relative'});

  // 제목
  box.appendChild(mkDiv('',{textAlign:'center',color:'rgba(255,215,0,.85)',
    fontFamily:"'Cinzel Decorative',serif",fontSize:'14px',fontWeight:'900',letterSpacing:'.15em',marginBottom:'2px'},'어리석은 자의 시계'));
  box.appendChild(mkDiv('',{textAlign:'center',color:'#444',fontFamily:"'Share Tech Mono',monospace",
    fontSize:'8px',marginBottom:'16px'},'FOOL\'S CHRONOMETER — '+n+'/12'));

  // 큰 SVG 시계 + 진행도
  const ns='http://www.w3.org/2000/svg';
  const svgEl=document.createElementNS(ns,'svg');
  svgEl.setAttribute('width','200');svgEl.setAttribute('height','200');svgEl.setAttribute('viewBox','0 0 200 200');
  svgEl.style.cssText='display:block;margin:0 auto 16px;filter:drop-shadow(0 0 12px rgba(255,215,0,.2));';

  // 배경
  const bg=document.createElementNS(ns,'circle');bg.setAttribute('cx','100');bg.setAttribute('cy','100');bg.setAttribute('r','92');
  bg.setAttribute('fill','rgba(2,2,10,.95)');bg.setAttribute('stroke','rgba(255,215,0,.3)');bg.setAttribute('stroke-width','2');
  svgEl.appendChild(bg);

  // 진행도 아크 (태엽 n/12)
  if(n>0){
    const prog=document.createElementNS(ns,'circle');
    prog.setAttribute('cx','100');prog.setAttribute('cy','100');prog.setAttribute('r','84');
    prog.setAttribute('fill','none');prog.setAttribute('stroke','rgba(255,215,0,.6)');prog.setAttribute('stroke-width','4');
    const circumf=2*Math.PI*84;
    const dashLen=(n/12)*circumf;
    prog.setAttribute('stroke-dasharray',dashLen+' '+circumf);
    prog.setAttribute('stroke-dashoffset',circumf/4); // 12시 시작
    prog.setAttribute('stroke-linecap','round');
    prog.setAttribute('filter','url(#cwg3)');
    svgEl.appendChild(prog);
  }

  // 황금 아크 (gold/1000 비율, 최대 금색)
  const goldRatio=Math.min(1,(GS.gold||0)/800);
  if(goldRatio>0){
    const goldArc=document.createElementNS(ns,'circle');
    goldArc.setAttribute('cx','100');goldArc.setAttribute('cy','100');goldArc.setAttribute('r','76');
    goldArc.setAttribute('fill','none');goldArc.setAttribute('stroke','rgba(255,180,0,.35)');goldArc.setAttribute('stroke-width','3');
    const gc2=2*Math.PI*76;
    goldArc.setAttribute('stroke-dasharray',(goldRatio*gc2)+' '+gc2);
    goldArc.setAttribute('stroke-dashoffset',gc2/4);
    svgEl.appendChild(goldArc);
  }

  // 글로우 필터
  const defs2=document.createElementNS(ns,'defs');
  defs2.innerHTML='<filter id="cwg3"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svgEl.insertBefore(defs2,svgEl.firstChild);

  // 12개 눈금+숫자
  const nums2=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  for(let i=0;i<12;i++){
    const ang=((i+1)*30-90)*Math.PI/180;
    const r2=68,cx2=100+Math.cos(ang)*r2,cy2=100+Math.sin(ang)*r2;
    const unlocked=i<n;
    const isMaj=i%3===0;
    // 눈금선
    const t1=document.createElementNS(ns,'line');
    t1.setAttribute('x1',(100+Math.cos(ang)*(isMaj?87:88)).toFixed(1));t1.setAttribute('y1',(100+Math.sin(ang)*(isMaj?87:88)).toFixed(1));
    t1.setAttribute('x2',(100+Math.cos(ang)*(isMaj?78:83)).toFixed(1));t1.setAttribute('y2',(100+Math.sin(ang)*(isMaj?78:83)).toFixed(1));
    t1.setAttribute('stroke',unlocked?(CLOCK_REWARDS[i]?CLOCK_REWARDS[i].clr:'#FFCC00'):(isMaj?'rgba(255,255,255,.2)':'rgba(255,255,255,.08)'));
    t1.setAttribute('stroke-width',isMaj?'2':'1');svgEl.appendChild(t1);
    // 태엽 점
    const dot2=document.createElementNS(ns,'circle');
    dot2.setAttribute('cx',cx2.toFixed(1));dot2.setAttribute('cy',cy2.toFixed(1));
    dot2.setAttribute('r',isMaj?'4':'2.5');
    dot2.setAttribute('fill',unlocked?(CLOCK_REWARDS[i]?CLOCK_REWARDS[i].clr:'#FFCC00'):'rgba(255,255,255,.08)');
    if(unlocked)dot2.setAttribute('filter','url(#cwg3)');
    svgEl.appendChild(dot2);
    // 숫자
    if(isMaj){
      const tn2=document.createElementNS(ns,'text');
      tn2.setAttribute('x',(100+Math.cos(ang)*55).toFixed(1));tn2.setAttribute('y',(100+Math.sin(ang)*55+4).toFixed(1));
      tn2.setAttribute('text-anchor','middle');tn2.setAttribute('fill',unlocked?'rgba(255,215,0,.7)':'rgba(255,255,255,.15)');
      tn2.setAttribute('font-size','8');tn2.setAttribute('font-family','Share Tech Mono,monospace');
      tn2.textContent=nums2[i];svgEl.appendChild(tn2);
    }
  }

  // 시침 (진행도 위치)
  const hAng2=((n+1)*30-90)*Math.PI/180;
  const hx2=100+Math.cos(hAng2)*38,hy2=100+Math.sin(hAng2)*38;
  const hrLine=document.createElementNS(ns,'line');
  hrLine.setAttribute('x1',(100-Math.cos(hAng2)*8).toFixed(1));hrLine.setAttribute('y1',(100-Math.sin(hAng2)*8).toFixed(1));
  hrLine.setAttribute('x2',hx2.toFixed(1));hrLine.setAttribute('y2',hy2.toFixed(1));
  hrLine.setAttribute('stroke','rgba(255,215,0,.9)');hrLine.setAttribute('stroke-width','3');hrLine.setAttribute('stroke-linecap','round');
  hrLine.setAttribute('filter','url(#cwg3)');svgEl.appendChild(hrLine);
  // 황금 분침
  const gAng2=(goldRatio*360-90)*Math.PI/180;
  const gx2=100+Math.cos(gAng2)*50,gy2=100+Math.sin(gAng2)*50;
  const mnLine=document.createElementNS(ns,'line');
  mnLine.setAttribute('x1','100');mnLine.setAttribute('y1','100');
  mnLine.setAttribute('x2',gx2.toFixed(1));mnLine.setAttribute('y2',gy2.toFixed(1));
  mnLine.setAttribute('stroke','rgba(255,180,0,.55)');mnLine.setAttribute('stroke-width','2');mnLine.setAttribute('stroke-linecap','round');
  svgEl.appendChild(mnLine);
  // 중심
  const ctr2=document.createElementNS(ns,'circle');ctr2.setAttribute('cx','100');ctr2.setAttribute('cy','100');ctr2.setAttribute('r','5');
  ctr2.setAttribute('fill',n>=12?'rgba(255,255,255,.9)':'rgba(255,215,0,.9)');ctr2.setAttribute('filter','url(#cwg3)');svgEl.appendChild(ctr2);
  // 중앙 텍스트
  const ct2=document.createElementNS(ns,'text');ct2.setAttribute('x','100');ct2.setAttribute('y','104');ct2.setAttribute('text-anchor','middle');
  ct2.setAttribute('fill','rgba(255,215,0,.35)');ct2.setAttribute('font-size','8');ct2.setAttribute('font-family','Share Tech Mono,monospace');
  ct2.textContent=n+'/12';svgEl.appendChild(ct2);

  box.appendChild(svgEl);

  // 황금 현황
  const goldRow=mkDiv('',{display:'flex',justifyContent:'space-between',
    padding:'6px 10px',background:'rgba(255,215,0,.04)',borderRadius:'5px',marginBottom:'12px'});
  goldRow.appendChild(mkDiv('',{fontSize:'8px',color:'#555',fontFamily:"'Share Tech Mono',monospace"},'현재 황금'));
  const gv=mkDiv('',{fontSize:'9px',color:'rgba(255,180,0,.7)',fontFamily:"'Share Tech Mono',monospace"},
    (GS.gold||0)+'G — 분침: '+Math.round(goldRatio*100)+'%');
  goldRow.appendChild(gv);box.appendChild(goldRow);

  // 태엽 목록
  CLOCK_REWARDS.forEach((cw,i)=>{
    if(!cw||!cw.name)return;
    const unlocked=i<n;
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:5px;'+
      'border:1px solid '+(unlocked?cw.clr+'44':'rgba(255,255,255,.04)')+';'+
      'margin-bottom:4px;background:'+(unlocked?cw.clr+'09':'transparent')+';';
    const ic2=mkDiv('',{fontSize:'15px',width:'20px',textAlign:'center',opacity:unlocked?'1':'0.2'},cw.icon);
    const info2=document.createElement('div');info2.style.flex='1';
    const inm=document.createElement('div');inm.style.cssText='font-size:9px;color:'+(unlocked?cw.clr:'#333')+';font-family:"Share Tech Mono",monospace;font-weight:700;';
    inm.textContent=unlocked?cw.name:'태엽 '+(i+1)+' — 미해제';
    info2.appendChild(inm);
    if(unlocked){const ids=document.createElement('div');ids.style.cssText='font-size:7px;color:#555;font-family:"Noto Serif KR",serif;';ids.textContent=cw.desc;info2.appendChild(ids);}
    row.appendChild(ic2);row.appendChild(info2);box.appendChild(row);
  });

  const cl=mkDiv('evt-btn evt-btn-neutral',{marginTop:'12px'},'닫기');cl.onclick=()=>bd.remove();
  box.appendChild(cl);bd.appendChild(box);document.body.appendChild(bd);
}

function showClockIntro(cb){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9800;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.98);pointer-events:all;';
  document.body.appendChild(ov);
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('width','180');svg.setAttribute('height','180');svg.setAttribute('viewBox','0 0 180 180');
  svg.style.cssText='filter:drop-shadow(0 0 16px rgba(255,215,0,.3));margin-bottom:16px;';
  const bg=document.createElementNS(ns,'circle');bg.setAttribute('cx','90');bg.setAttribute('cy','90');bg.setAttribute('r','82');
  bg.setAttribute('fill','rgba(4,4,14,.98)');bg.setAttribute('stroke','rgba(255,215,0,.3)');bg.setAttribute('stroke-width','1.5');svg.appendChild(bg);
  for(let i=0;i<12;i++){
    const ang=((i+1)*30-90)*Math.PI/180,r2=66,cx2=90+Math.cos(ang)*r2,cy2=90+Math.sin(ang)*r2;
    const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',cx2.toFixed(1));dot.setAttribute('cy',cy2.toFixed(1));
    dot.setAttribute('r',i%3===0?'4':'2.5');dot.setAttribute('fill',i===0?'rgba(255,215,0,.9)':'rgba(255,255,255,.1)');svg.appendChild(dot);
    const tn=document.createElementNS(ns,'text');tn.setAttribute('x',(90+Math.cos(ang)*50).toFixed(1));tn.setAttribute('y',(90+Math.sin(ang)*50+4).toFixed(1));
    tn.setAttribute('text-anchor','middle');tn.setAttribute('fill',i===0?'rgba(255,215,0,.6)':'rgba(255,255,255,.1)');tn.setAttribute('font-size','8');tn.setAttribute('font-family','Share Tech Mono,monospace');
    tn.textContent=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][i];svg.appendChild(tn);
  }
  const handG=document.createElementNS(ns,'g');handG.setAttribute('transform','rotate(0,90,90)');
  const hl=document.createElementNS(ns,'line');hl.setAttribute('x1','90');hl.setAttribute('y1','90');hl.setAttribute('x2','90');hl.setAttribute('y2','20');
  hl.setAttribute('stroke','rgba(255,215,0,.9)');hl.setAttribute('stroke-width','2.5');hl.setAttribute('stroke-linecap','round');
  handG.appendChild(hl);svg.appendChild(handG);
  const cc=document.createElementNS(ns,'circle');cc.setAttribute('cx','90');cc.setAttribute('cy','90');cc.setAttribute('r','4');cc.setAttribute('fill','rgba(255,215,0,.9)');svg.appendChild(cc);
  ov.appendChild(svg);
  const title=document.createElement('div');title.style.cssText='font-size:8px;color:rgba(255,215,0,.4);font-family:"Share Tech Mono",monospace;letter-spacing:.3em;margin-bottom:6px;';title.textContent='시간이 시작된다';
  const sub=document.createElement('div');sub.style.cssText='font-size:12px;color:rgba(255,215,0,.7);font-family:"Cinzel",serif;letter-spacing:.2em;';sub.textContent='붕괴의 회랑';
  ov.appendChild(title);ov.appendChild(sub);
  let st=null;
  function anim(ts){if(!st)st=ts;const p=Math.min(1,(ts-st)/1000);const e=p<0.5?2*p*p:(1-(2*(1-p)*(1-p)));handG.setAttribute('transform','rotate('+(e*30).toFixed(2)+',90,90)');if(p<1){requestAnimationFrame(anim);}else{setTimeout(()=>{ov.style.transition='opacity .4s';ov.style.opacity='0';setTimeout(()=>{ov.remove();cb();},420);},600);}}
  setTimeout(()=>requestAnimationFrame(anim),400);
}

function applyClockReward(cwIdx, nr2, hcP, loot, gold){
  if(document.getElementById('_cwr_ov'))return;
  const cw=CLOCK_REWARDS[cwIdx];
  if(!cw)return;
  // 시침: 1시=30도, 2시=60도... 12시=0(360)도
  const fromAngle=((cwIdx+1)*30);   // 현재 태엽 위치 (1시부터)
  const toAngle=((cwIdx+2)*30)%360; // 다음 위치

  // 시계 오버레이 생성
  const ov=document.createElement('div');
  ov.id='_cwr_ov';
  ov.style.cssText='position:fixed;inset:0;z-index:9600;display:flex;flex-direction:column;'+
    'align-items:center;justify-content:center;background:rgba(0,0,0,.0);pointer-events:all;';
  document.body.appendChild(ov);

  // 배경 페이드 인
  requestAnimationFrame(()=>{ov.style.transition='background .5s';ov.style.background='rgba(0,0,0,.92)';});

  // SVG 시계
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('width','260');svg.setAttribute('height','260');
  svg.setAttribute('viewBox','0 0 260 260');
  svg.style.cssText='margin-bottom:28px;filter:drop-shadow(0 0 24px rgba(255,215,0,.3));';

  // 글로우 필터
  const defs=document.createElementNS(svgNS,'defs');
  defs.innerHTML='<filter id="cwg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<filter id="cwg2"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svg.appendChild(defs);

  // 바깥 테두리
  const outerRing=document.createElementNS(svgNS,'circle');
  outerRing.setAttribute('cx','130');outerRing.setAttribute('cy','130');outerRing.setAttribute('r','120');
  outerRing.setAttribute('fill','rgba(4,4,14,.95)');
  outerRing.setAttribute('stroke','rgba(255,215,0,.25)');outerRing.setAttribute('stroke-width','2');
  svg.appendChild(outerRing);

  // 안쪽 테두리
  const innerRing=document.createElementNS(svgNS,'circle');
  innerRing.setAttribute('cx','130');innerRing.setAttribute('cy','130');innerRing.setAttribute('r','105');
  innerRing.setAttribute('fill','none');
  innerRing.setAttribute('stroke','rgba(255,215,0,.08)');innerRing.setAttribute('stroke-width','1');
  svg.appendChild(innerRing);

  // 12개 태엽 점
  const dots=[];
  for(let i=0;i<12;i++){
    const ang=((i+1)*30-90)*Math.PI/180; // 0=1시, 11=12시
    const r=90;
    const cx=130+Math.cos(ang)*r;
    const cy=130+Math.sin(ang)*r;
    const wasUnlocked=i<cwIdx;
    const isNew=i===cwIdx;
    const unlocked=wasUnlocked||isNew;
    const cwR=CLOCK_REWARDS[i];

    // 눈금 선
    const r1=106,r2=i%3===0?94:100;
    const lx1=130+Math.cos(ang)*r1, ly1=130+Math.sin(ang)*r1;
    const lx2=130+Math.cos(ang)*r2, ly2=130+Math.sin(ang)*r2;
    const tick=document.createElementNS(svgNS,'line');
    tick.setAttribute('x1',lx1.toFixed(1));tick.setAttribute('y1',ly1.toFixed(1));
    tick.setAttribute('x2',lx2.toFixed(1));tick.setAttribute('y2',ly2.toFixed(1));
    tick.setAttribute('stroke',i%3===0?'rgba(255,215,0,.4)':'rgba(255,215,0,.15)');
    tick.setAttribute('stroke-width',i%3===0?'2':'1');
    svg.appendChild(tick);

    // 태엽 점
    const dot=document.createElementNS(svgNS,'circle');
    dot.setAttribute('cx',cx.toFixed(1));dot.setAttribute('cy',cy.toFixed(1));
    dot.setAttribute('r',i%3===0?'6':'4');
    dot.setAttribute('fill',unlocked?(cwR?cwR.clr:'#FFCC00'):'rgba(255,255,255,.08)');
    if(unlocked)dot.setAttribute('filter','url(#cwg)');
    svg.appendChild(dot);
    dots.push(dot);

    // 시간 숫자
    const rn=130+Math.cos(ang)*74;
    const ry=130+Math.sin(ang)*74;
    const tnum=document.createElementNS(svgNS,'text');
    tnum.setAttribute('x',rn.toFixed(1));tnum.setAttribute('y',(ry+4).toFixed(1));
    tnum.setAttribute('text-anchor','middle');tnum.setAttribute('fill',unlocked?(cwR?cwR.clr:'#FFCC00'):'rgba(255,255,255,.12)');
    tnum.setAttribute('font-size','9');tnum.setAttribute('font-family','Share Tech Mono,monospace');
    tnum.textContent=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][i];
    svg.appendChild(tnum);
  }

  // 시침 (현재 위치 → 다음 위치 애니메이션)
  const handGroup=document.createElementNS(svgNS,'g');
  handGroup.setAttribute('transform',`rotate(${fromAngle},130,130)`);

  const hand=document.createElementNS(svgNS,'line');
  hand.setAttribute('x1','130');hand.setAttribute('y1','130');
  hand.setAttribute('x2','130');hand.setAttribute('y2','52');
  hand.setAttribute('stroke','rgba(255,215,0,1)');hand.setAttribute('stroke-width','3');
  hand.setAttribute('stroke-linecap','round');
  hand.style.filter='drop-shadow(0 0 4px rgba(255,215,0,.9))';
  handGroup.appendChild(hand);

  // 중심
  const center=document.createElementNS(svgNS,'circle');
  center.setAttribute('cx','130');center.setAttribute('cy','130');center.setAttribute('r','6');
  center.setAttribute('fill',cw.clr);center.style.filter='drop-shadow(0 0 3px rgba(255,215,0,.8))';
  handGroup.appendChild(center);
  svg.appendChild(handGroup);

  ov.appendChild(svg);

  // 보상 텍스트
  const cwNum=document.createElement('div');
  cwNum.style.cssText='font-size:8px;color:rgba(255,215,0,.5);font-family:"Share Tech Mono",monospace;letter-spacing:.25em;margin-bottom:10px;opacity:0;transition:opacity .4s .5s;';
  cwNum.textContent=(cwIdx+1)+'번째 태엽';
  ov.appendChild(cwNum);

  const cwName=document.createElement('div');
  cwName.style.cssText='font-size:22px;color:'+cw.clr+';font-family:"Cinzel Decorative",serif;font-weight:900;letter-spacing:.12em;'+
    'text-shadow:0 0 20px '+cw.clr+';margin-bottom:8px;opacity:0;transition:opacity .4s .7s;transform:scale(.85);transition:all .5s .6s cubic-bezier(.34,1.56,.64,1);';
  cwName.textContent=cw.name;
  ov.appendChild(cwName);

  const cwDesc=document.createElement('div');
  cwDesc.style.cssText='font-size:11px;color:#888;font-family:"Noto Serif KR",serif;line-height:1.8;max-width:280px;text-align:center;'+
    'opacity:0;transition:opacity .4s 1s;margin-bottom:20px;';
  cwDesc.textContent=cw.desc;
  ov.appendChild(cwDesc);

  // 카드 보상 표시
  if(cw.cardReward&&CLOCK_CARDS[cw.cardReward]){
    const cc=CLOCK_CARDS[cw.cardReward];
    const cwWrap=document.createElement('div');
    cwWrap.style.cssText='margin-bottom:16px;opacity:0;transition:opacity .4s 1.2s;text-align:center;';
    const cwLabel=document.createElement('div');
    cwLabel.style.cssText='font-size:8px;color:#555;font-family:"Share Tech Mono",monospace;margin-bottom:8px;';
    cwLabel.textContent='신규 카드 해금';
    const ccard=mkCardEl({...cc,uid:'preview'},false);
    ccard.style.margin='0 auto';ccard.style.pointerEvents='none';
    cwWrap.appendChild(cwLabel);cwWrap.appendChild(ccard);
    ov.appendChild(cwWrap);
    setTimeout(()=>{cwWrap.style.opacity='1';},1200);
  }

  const cwBtn=document.createElement('div');
  cwBtn.style.cssText='padding:10px 28px;border:1px solid '+cw.clr+'55;border-radius:5px;'+
    'color:'+cw.clr+';font-family:"Share Tech Mono",monospace;font-size:9px;letter-spacing:.18em;'+
    'cursor:pointer;opacity:0;transition:opacity .4s 1.5s;';
  cwBtn.textContent='계속';
  if(typeof SFX!=='undefined')SFX.clock();
  ov.appendChild(cwBtn);

  // 시침 회전 애니메이션
  let startTime=null;
  const animDur=1200;
  function animHand(ts){
    if(!startTime)startTime=ts;
    const p=Math.min(1,(ts-startTime)/animDur);
    const eased=p<0.5?2*p*p:(1-(2*(1-p)*(1-p)));
    const cur=fromAngle+eased*(toAngle-fromAngle);
    handGroup.setAttribute('transform',`rotate(${cur.toFixed(1)},130,130)`);
    if(p<1)requestAnimationFrame(animHand);
    else {
      // 애니 완료 — 도달한 점 강조
      const targetDot=dots[cwIdx];
      if(targetDot){
        targetDot.setAttribute('r','8');
        targetDot.style.transition='all .3s';
      }
    }
  }

  // 페이드 인 후 애니 시작
  setTimeout(()=>{
    requestAnimationFrame(animHand);
    cwNum.style.opacity='1';
    cwName.style.opacity='1';cwName.style.transform='scale(1)';
    cwDesc.style.opacity='1';
    setTimeout(()=>{cwBtn.style.opacity='1';},1500);
  },600);

  cwBtn.onclick=()=>{
    if(_tr)return; // 중복 클릭 방지
    _tr=true;
    cwBtn.disabled=true;cwBtn.style.opacity='0.4';
    if(cw.apply){
      GS=upd(GS,s=>{
        const applied=cw.apply({player:s.player,maxEnergy:s.player.maxEnergy||3});
        return{...s,player:applied.player||s.player};
      });
    }
    if(cw.cardReward&&CLOCK_CARDS[cw.cardReward]){
      GS=upd(GS,s=>addCardSafe(s,{...CLOCK_CARDS[cw.cardReward],uid:uid()}));
      if(!CARDS[cw.cardReward])CARDS[cw.cardReward]={...CLOCK_CARDS[cw.cardReward]};
    }
    GS={...GS,clockUnlocked:(GS.clockUnlocked||0)+1};
    updateFUI();
    ov.style.transition='opacity .3s';ov.style.opacity='0';
    setTimeout(()=>{
      var _sck=document.getElementById('sfx-clock');if(_sck){_sck.pause();_sck.currentTime=0;}
      ov.remove();
      if(cwIdx===11){setTimeout(()=>startEndingMap(),400);return;}
      if(nr2<REALMS.length){
        const newAxis=Math.max(1,GS.player.axis-(hcP||0));
        GS={...GS,realmIdx:nr2,curNode:'s',cleared:new Set(['s']),
          realmNodes:buildRealmNodes(nr2),
          player:{...GS.player,axis:newAxis}};
        if(loot&&CARDS[loot])showNotif('['+CARDS[loot].name+'] 획득! +'+(gold||0)+'G',G);
        // 카드 선택 후 다음 구역으로
      var _eType2=GS.lastEnemy?(ENM[GS.lastEnemy]||{}).type||'normal':'normal';
      if(loot&&CARDS[loot]){
        var _ch=_pickCardChoices(_eType2,GS.realmIdx||0,3);
        if(!_ch.some(function(c){return c.id===loot;})&&_ch.length)_ch[0]={...CARDS[loot],uid:uid()};
        showCardChoiceModal(_ch,function(picked){
          if(picked){GS=upd(GS,function(s){return addCardSafe(s,picked);});showNotif(picked.name+' 획득!','#FFD700');}
          showRealmBanner(nr2,function(){
            doTrans(function(){document.getElementById('root').innerHTML='';showField();},true);
          });
        });
      } else {
        showRealmBanner(nr2,function(){
          doTrans(function(){document.getElementById('root').innerHTML='';showField();},true);
        });
      }
    } else {
        GS={...GS,screen:'victory'};hideField();renderScreen();
      }
    },320);
  };
}

function renderEndingMap(){
  hideField();
  const root=document.getElementById('root');root.innerHTML='';root.style.display='block';
  const sc=document.createElement('div');sc.className='screen';
  sc.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px;background:var(--OB);';

  sc.appendChild(mkDiv('',{fontSize:'10px',color:'rgba(255,215,0,.4)',
    fontFamily:"'Share Tech Mono',monospace",letterSpacing:'.25em',marginBottom:'8px'},'앤딩 맵'));
  sc.appendChild(mkDiv('',{fontSize:'20px',color:'rgba(255,215,0,.8)',
    fontFamily:"'Cinzel Decorative',serif",fontWeight:'900',marginBottom:'20px',
    textShadow:'0 0 20px rgba(255,215,0,.3)'},'시간의 끝'));

  const phase=GS.endingPhase||0;
  // 앤딩 맵: 구역1 보스들 재대전 (간략) + 최후의 기억
  const bossList=[
    {eid:'boss2',name:'I구역의 지배자'},
    {eid:'boss4',name:'II구역의 지배자'},
    {eid:'boss6',name:'III구역의 지배자'},
    {eid:'final_memory',name:'최후의 기억',isFinal:true},
  ];

  bossList.forEach((b,i)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 16px;'+
      'border-radius:7px;margin-bottom:8px;width:100%;max-width:300px;cursor:pointer;'+
      'border:1px solid '+(i<phase?'rgba(255,215,0,.3)':i===phase?'rgba(255,215,0,.5)':'rgba(255,255,255,.06)')+';'+
      'background:'+(i<phase?'rgba(255,215,0,.05)':i===phase?'rgba(255,215,0,.08)':'transparent')+';'+
      'transition:all .2s;';

    const status=i<phase?'✓':i===phase?'▶':'○';
    const sc2=mkDiv('',{fontSize:'16px',width:'24px',textAlign:'center',
      color:i<phase?'rgba(255,215,0,.7)':i===phase?'rgba(255,215,0,.9)':'#333'},status);
    const nm=mkDiv('',{flex:'1',fontSize:'10px',
      color:i<phase?'#555':i===phase?'rgba(255,215,0,.9)':'#333',
      fontFamily:"'Share Tech Mono',monospace"},b.name);

    row.appendChild(sc2);row.appendChild(nm);

    if(i===phase){
      row.onmouseenter=()=>row.style.background='rgba(255,215,0,.12)';
      row.onmouseleave=()=>row.style.background='rgba(255,215,0,.08)';
      row.onclick=()=>{
        if(b.isFinal){startFinalBattle();}
        else startEndingBattle(b.eid, i);
      };
    }
    sc.appendChild(row);
  });

  root.appendChild(sc);
}

function startEndingBattle(eid, phase){
  GS={...GS,screen:'battle'};
  const enemy=ENM[eid]||{id:eid,name:'???',axis:200,maxAxis:200,cog:0,battery:0,
    gold:[24,39],drops:['strike'],t:'boss',skills:[{t:'atk',v:20,lbl:'공격',ap:2}],maxAp:3};
  // 전투 후 콜백 설정
  GS={...GS,_endingPhase:phase,_afterEndingBattle:()=>{
    GS={...GS,endingPhase:(GS.endingPhase||0)+1,screen:'ending_map'};
    renderEndingMap();
  }};
  hideField();startBattle(eid);
}

function startEndingMap(){
  const bd=mkBk();
  const box=mkDiv('',{background:'rgba(0,0,0,.97)',border:'1px solid rgba(255,215,0,.3)',
    borderRadius:'12px',padding:'28px 24px',maxWidth:'360px',textAlign:'center'});

  // 시계 12개 모두 빛나는 연출
  box.appendChild(mkDiv('',{fontSize:'32px',marginBottom:'12px',
    filter:'drop-shadow(0 0 16px rgba(255,215,0,.8))'},'☿'));
  box.appendChild(mkDiv('',{fontSize:'8px',color:'rgba(255,215,0,.5)',
    fontFamily:"'Share Tech Mono',monospace",letterSpacing:'.25em',marginBottom:'8px'},
    '어리석은 자의 시계 — 완성'));
  box.appendChild(mkDiv('',{fontSize:'16px',color:'rgba(255,215,0,.9)',
    fontFamily:"'Cinzel Decorative',serif",fontWeight:'900',marginBottom:'12px',
    textShadow:'0 0 20px rgba(255,215,0,.6)'},'앤딩 맵 해금'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#666',
    fontFamily:"'Noto Serif KR',serif",lineHeight:'2',marginBottom:'20px'},
    '12개의 태엽이 모두 맞물렸다.\n시간의 끝에 무언가가 기다리고 있다.\n\n최후의 기억과 대면하라.'));

  const btn=mkDiv('evt-btn evt-btn-gold',{},'앤딩 맵으로');
  btn.onclick=()=>{
    bd.remove();
    // 앤딩 맵 시작 — 모든 보스 재대전 + 최후의 기억
    GS={...GS,screen:'ending_map',endingPhase:0};
    renderEndingMap();
  };
  box.appendChild(btn);bd.appendChild(box);document.body.appendChild(bd);
}

function startFinalBattle(){
  // 최후의 기억 — 플레이어 능력치 기반
  const fm=FINAL_MEMORY_BOSS;
  const maxHp=Math.round(GS.player.maxAxis*1.2);
  // ENM에 동적 등록
  ENM['final_memory']={
    id:'final_memory',name:'최후의 기억',type:'boss',
    axis:maxHp,maxAxis:maxHp,cog:0,battery:0,
    gold:[73,98],drops:['annihilate'],t:'boss',
    skills:[
      {t:'atk',v:Math.max(8,Math.round(GS.player.axis*0.15)),lbl:'기억의 상흔',ap:2},
      {t:'atk',v:Math.max(12,Math.round(GS.player.axis*0.22)),lbl:'자아 침식',ap:3},
      {t:'shield',v:25,lbl:'기억의 방패',ap:2},
      {t:'nuke',v:Math.max(20,Math.round(GS.player.maxAxis*0.38)),lbl:'존재의 소각',ap:4},
    ],
    ult:{name:'시간의 귀환',desc:'당신이 걸어온 모든 선택이 무기가 된다.'},
    maxAp:4,
  };
  GS={...GS,screen:'battle',_isFinalBoss:true};
  hideField();startBattle('final_memory');
}

function updateFUI(){if(typeof achCheck==='function'&&GS.gold>=999)achCheck('gold',{v:GS.gold});
  // gearShard FUI 표시
  var _gsEl=document.getElementById('fgear-shard');
  if(_gsEl)_gsEl.textContent='⚙ '+(GS.gearShard||0);
  // 업적 버튼 연결 (최초 1회)
  var _ab=document.getElementById('ach-open-btn');
  if(_ab&&!_ab._bound){_ab._bound=true;_ab.onclick=function(){showAchievementModal();};}if(GS.gold>=999)achCheck('gold',{amount:GS.gold});
  const s=GS;
  const h=document.getElementById('fhp');if(h)h.style.width=`${cl(s.player.axis/s.player.maxAxis*100,0,100)}%`;
  const hl=document.getElementById('fhpl');if(hl)hl.textContent=`${s.player.axis}/${s.player.maxAxis}`;
  const gf=document.getElementById('ffrag');if(gf)gf.textContent=(GS.fragment||0)?'◆'+(GS.fragment||0)+' ':'  ';
  const ge=document.getElementById('fgold');if(ge)ge.textContent=s.gold||0;
  const gv=document.getElementById('fgold-val');if(gv)gv.textContent=s.gold||0;
  const de=document.getElementById('fdeck');if(de)de.textContent=s.deck.length+'/'+(s.storage||[]).length;
  const be=document.getElementById('fbat');if(be)be.style.width=`${s.player.battery||0}%`;
  const db=document.getElementById('fdeckbtn');if(db)db.onclick=()=>showInventoryModal();
  const spEl=document.getElementById('fspd');if(spEl)spEl.textContent=`속도 ${s.player.speed||5}`;
  const ri=document.getElementById('frealm');if(ri){const r=REALMS[s.realmIdx||0];ri.textContent=r?`구역 ${r.num}`:'I';}
}


function _nodeClickFx(x,y){
  for(let i=0;i<6;i++){
    const p=document.createElement('div');
    const ang=(i/6)*Math.PI*2;
    const dist=20+Math.random()*20;
    p.style.cssText='position:fixed;left:'+x+'px;top:'+y+'px;width:4px;height:4px;'+
      'border-radius:50%;background:rgba(255,215,0,.8);pointer-events:none;z-index:9999;'+
      'transform:translate(-50%,-50%);transition:all .4s ease;';
    document.body.appendChild(p);
    requestAnimationFrame(()=>{
      p.style.left=(x+Math.cos(ang)*dist)+'px';
      p.style.top=(y+Math.sin(ang)*dist)+'px';
      p.style.opacity='0';
    });
    setTimeout(()=>p.remove(),420);
  }
}

function onNode(nid){
  if(_tr)return;
  const s=GS;const nodes=s.realmNodes||[];
  const node=nodes.find(n=>n.id===nid);if(!node)return;
  const cur=nodes.find(n=>n.id===s.curNode);
  if(!cur||!cur.next.includes(nid))return;
  _tr=true; // 중복 클릭 방지
  GS={...GS,curNode:nid,cleared:new Set([...GS.cleared,nid])};
  renderNodes();
  _nodeAction(node,nodes);
}

function showVN(lines, cb){
  const _fui=document.getElementById('fui');
  if(_fui){_fui.style.opacity='0';_fui.style.pointerEvents='none';}
  SD.show(lines, ()=>{
    if(_fui){_fui.style.opacity='';_fui.style.pointerEvents='';}
    if(cb)cb();
  });
}

function _nodeAction(node,nodes){
  const _autoVN=['forest','trial','gamble','timegate','hunter','enhance','relic_shrine','rest','shop','blackmarket','salvage','forge','clinic','implant','abyss','battle','elite','boss','event','ambush','elite_ambush','fragment_forge','void_rift','reliquary'];
  if(_autoVN.includes(node.type)){
    const _st=rndStory(node.type);
    if(_st&&_st.length){
      showVN(_st,()=>{
        _tr=false; // VN 끝 후 잠금 해제
        _runNode(node,nodes);
      });
      return;
    }
  }
  _tr=false;
  _runNode(node,nodes);
}
/* 노드 분위기 텍스트 */
const NODE_FLAVOR = {
  'rest':['잠시 멈춘다. 부서진 톱니 소리가 사그라든다.','숨을 고른다. 시계는 여전히 돌아가고 있다.'],
  'event':['낯선 기운이 감돈다...','무언가 예상치 못한 일이 기다리고 있다.'],
  'shop':['황동 종이 울린다. 누군가 기다리고 있다.','고물과 보석이 뒤섞인 냄새. 상인의 목소리가 들린다.'],
  'blackmarket':['어둠 속 거래. 흔적을 남기지 마라.','누군가 속삭인다. 값은... 생각보다 비쌀 수 있다.'],
  'salvage':['잔해 속에서 쓸 만한 것을 찾는다.','고철 더미. 하지만 보물이 숨어 있을지도.'],
  'forge':['불꽃이 튄다. 장인의 손길이 느껴진다.','쇠를 두드리는 소리. 무언가 더 강해질 수 있다.'],
  'clinic':['소독약 냄새. 낡은 의료 장비들.','여기서라면 상처를 치료할 수 있을 것 같다.'],
  'implant':['금속이 피부 아래로 스민다...','개조. 대가가 따른다.'],
  'abyss':['심연이 바라본다. 그리고 너도 바라본다.','어둠 속 무언가가 손을 내밀고 있다.'],
  'forest':['톱니바퀴 숲. 기어들이 나무처럼 자란다.','이 곳의 공기는 기름 냄새가 난다.'],
  'trial':['시험이 기다린다. 준비됐는가?','증명해야 할 시간이다.'],
  'gamble':['운명을 건다. 전부 잃을 수도 있다.','동전 하나. 앞면인가, 뒷면인가.'],
  'timegate':['시간의 문. 통과하면 돌아올 수 없다.','과거와 미래가 교차하는 지점.'],
  'hunter':['사냥꾼의 눈빛. 그는 무언가를 원한다.','거래인가, 위협인가.'],
  'enhance':['강화의 기회. 하지만 실패의 위험도.','더 강하게. 혹은 더 부서지게.'],
  'relic_shrine':['고대의 유물이 잠들어 있다.','손을 뻗는다. 선택의 순간.'],
  'battle_enter':['적이 나타났다.','도망칠 수 없다. 싸워라.'],
  'elite_enter':['강적이 앞을 가로막는다.','이 전투, 쉽지 않을 것이다.'],
  'boss_enter':['지배자가 등장했다.','시계가 멈출지도 모른다.']
};


/* 전투 진입 암전 */


function _checkBossPhase2(){
  const b=GS.battle;if(!b)return;
  let e=b.enemy;if(!e||e.type!=='boss')return;
  if(e._phase2||e._phase2Done)return; // 이미 변신했음
  const threshold=Math.ceil(e.maxAxis*0.2);
  if(e.axis>threshold)return; // 아직 아님

  if(typeof VFX_GLITCH!=='undefined')VFX_GLITCH.heavy();
  // ── 2페이즈 발동 — 극한 하드코어 ──
  const p2MaxHp=Math.floor(e.maxAxis*1.4);    // 최대 HP +80%
  const p2Shield=Math.floor(e.maxAxis*0.18);  // 실드 45% (두꺼운 방호)
  const p2Axis=Math.floor(p2MaxHp*0.70);      // HP 65% 회복
  const p2Skills=[
    {t:'atk', v:Math.round(p2MaxHp*0.08), lbl:'절망의 일격'},
    {t:'shld',v:Math.round(p2MaxHp*0.12), lbl:'분노 방호'},
    {t:'multi',v:Math.round(p2MaxHp*0.05),hits:3,lbl:'분쇄 연타'},
    {t:'execute',v:Math.round(p2MaxHp*0.10),lbl:'분노 처형'},
    {t:'rage',v:Math.round(p2MaxHp*0.07), lbl:'극한 광폭화'},
    {t:'phase_shield',v:Math.round(p2MaxHp*0.14),lbl:'분노의 갑옷'},
    {t:'buff',v:2,lbl:'절망 강화'},
  ];
  const newEnemy={
    ...e,
    axis:p2Axis,
    maxAxis:p2MaxHp,
    cog:p2Shield,
    battery:80,
    _phase2:true,
    _phase2Done:true,
    _p2DmgMult:1.2,
    _ap:(e._scaledAP||e.ap||2)+3,
    speed:Math.min(12,(e.speed||5)+3),
    _immuneTurns:2,
    _ultChargeLeft:2,
    pat:[...(e.pat||[]),...p2Skills]
  };
  // 단 한 번 GS 업데이트
  GS={...GS,battle:{...b,enemy:newEnemy,phase:2}};
  if(typeof triggerGlitch!=='undefined')triggerGlitch(900,1.5);
  // VFX: 보스 흔들림 + 화면 플래시
  var vfc=document.getElementById('vfc');
  if(vfc){
    var ctx2=vfc.getContext('2d');
    var W=vfc.width,H=vfc.height;
    var start=performance.now();
    var flashDur=800;
    function flashAnim(now){
      var t=(now-start)/flashDur;
      if(t>=1){ctx2.clearRect(0,0,W,H);return;}
      ctx2.clearRect(0,0,W,H);
      var alpha=Math.sin(t*Math.PI)*0.7;
      ctx2.fillStyle='rgba(180,0,0,'+alpha+')';
      ctx2.fillRect(0,0,W,H);
      requestAnimationFrame(flashAnim);
    }
    requestAnimationFrame(flashAnim);
  }

  // 배경 색조 변경
  var fs=document.getElementById('fs');
  if(fs){fs.style.filter='hue-rotate(20deg) saturate(1.4)';
    setTimeout(function(){fs.style.transition='filter 1s';fs.style.filter='';},2000);}

  // 적 체력바 색상 변경 → 붉은색
  var hpBar=document.getElementById('enemy-hp');
  if(hpBar){hpBar.style.background='#CC0000';hpBar.style.boxShadow='0 0 8px rgba(200,0,0,.6)';}

  // 2페이즈 알림
  var eName=e.name||'보스';
  showNotif('☠ '+eName+' — 극한 각성!','#FF0000');


  // 2페이즈 VN 텍스트
  setTimeout(function(){
    var ov2=document.createElement('div');
    ov2.style.cssText='position:fixed;bottom:30%;left:50%;transform:translateX(-50%);'+
      'z-index:8888;text-align:center;pointer-events:none;animation:dmgFloat 2.5s ease forwards;';
    ov2.innerHTML='<div style="font-family:\'Cinzel Decorative\',serif;font-size:11px;'+
      'color:#FF2200;letter-spacing:.15em;text-shadow:0 0 20px rgba(255,0,0,.8);">— 분노 각성 —</div>';
    document.body.appendChild(ov2);
    setTimeout(function(){if(ov2.parentNode)ov2.remove();},2600);
    if(typeof SFX!=='undefined'){SFX.clock();}
    if(GS.battle)renderBattle();
  },400);
}

function _battleExitFade(cb){
  BGM.fadeToMap();
  if(typeof VFX_GLITCH!=='undefined')VFX_GLITCH.loop(false);
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9600;background:#000;opacity:0;'+
    'display:flex;align-items:center;justify-content:center;pointer-events:all;transition:opacity 0.6s;';
  document.body.appendChild(ov);
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    ov.style.opacity='1';
    setTimeout(function(){
      if(cb)cb();
      setTimeout(function(){
        ov.style.transition='opacity 1s';
        ov.style.opacity='0';
        setTimeout(function(){ov.remove();},1050);
      },200);
    },650);
  });});
}

function _battleEnterFade(eid){
  _tr=false; // doTrans 잠금 해제
  var eInfo=ENM[eid]||{};
  var eType=eInfo.type||'normal';
  var flKey=eType==='boss'?'boss_enter':eType==='elite'?'elite_enter':'battle_enter';
  var fl=NODE_FLAVOR[flKey]||['적이 나타났다.','도망칠 수 없다.'];
  var prev=document.getElementById('_bef_ov');if(prev)prev.remove();
  var ov=document.createElement('div');
  ov.id='_bef_ov';
  ov.style.cssText='position:fixed;inset:0;z-index:9600;background:#000;opacity:0;'+
    'display:flex;align-items:center;justify-content:center;pointer-events:all;transition:opacity 0.5s;';
  var txt=document.createElement('div');
  txt.style.cssText='text-align:center;pointer-events:none;opacity:0;transition:opacity 0.4s;max-width:300px;padding:0 20px;';
  var d1=document.createElement('div');
  d1.style.cssText="font-family:'Noto Serif KR',serif;font-size:15px;color:#CC4400;line-height:2;letter-spacing:.05em;";
  d1.textContent=fl[0];txt.appendChild(d1);
  if(fl[1]){var d2=document.createElement('div');
    d2.style.cssText="font-family:'Share Tech Mono',monospace;font-size:9px;color:#7a3a2a;margin-top:8px;letter-spacing:.1em;";
    d2.textContent=fl[1];txt.appendChild(d2);}
  ov.appendChild(txt);document.body.appendChild(ov);
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    ov.style.opacity='1';
    setTimeout(function(){txt.style.opacity='1';},200);
    setTimeout(function(){
      hideField();
      var _gBoss2=ENM[eid]||{};
      // 암전 오버레이 페이드아웃 후 기믹 카드 표시
      txt.style.opacity='0';
      ov.style.transition='opacity 0.5s';
      ov.style.opacity='0';
      setTimeout(function(){
        ov.remove();
        if(_gBoss2.type==='boss'&&_gBoss2.gimmick){
          _showGimmickCard(_gBoss2,function(){startBattle(eid);});
        } else {startBattle(eid);}
      },520);
    },700);
  });});
}

function _runNode(node,nodes){
  var bt=node.type==='battle'||node.type==='boss'||node.type==='elite'||node.type==='ambush'||node.type==='elite_ambush';
  if(bt){
    var eid2=node.enemy||'tick';
    if(node.type==='ambush'){
      const battleNodes=nodes.filter(n=>n.type==='battle'&&n.enemy);
      eid2=battleNodes.length?battleNodes[Math.floor(Math.random()*battleNodes.length)].enemy:'tick';
    }else if(node.type==='elite_ambush'){
      eid2=node.enemy||'boss2';
    }
    _battleEnterFade(eid2);
    return;
  }

  // 전투 외 — 암전 + 분위기 텍스트 후 모달
  var fl=NODE_FLAVOR[node.type];
  var line1=fl?fl[0]:'...';
  var line2=fl?fl[1]:'';
  _nodeEnterFade(line1,line2,function(){
    if(node.type==='timerift'){
    _tr=false;
    _nodeEnterFade('시간이 갈라진다...','흐름이 왜곡된다.',function(){
      var choices=[
        {l:'시간을 당긴다',d:'HP 30% 회복 / 기어 조각 -3',fn:function(){if((GS.gearShard||0)>=3){GS={...GS,gearShard:GS.gearShard-3,player:{...GS.player,axis:Math.min(GS.player.maxAxis,GS.player.axis+Math.floor(GS.player.maxAxis*.3))}};showNotif('HP +30%','#88FF88');}else showNotif('기어 조각 부족','#FF6644');updateFUI();}},
        {l:'시간을 밀어낸다',d:'기어 조각 +5 / HP -20%',fn:function(){GS={...GS,gearShard:(GS.gearShard||0)+5,player:{...GS.player,axis:Math.max(1,GS.player.axis-Math.floor(GS.player.maxAxis*.2))}};showNotif('기어 조각 +5','#88CCFF');updateFUI();}},
        {l:'무시한다',d:'변화 없음',fn:function(){showNotif('지나쳤다...','#888');}},
      ];
      var bd=mkBk(function(){});bd.style.cssText+='display:flex;align-items:center;justify-content:center;';
      var box=mkDiv('',{background:'rgba(4,4,14,.97)',border:'1px solid rgba(100,140,255,.3)',borderRadius:'12px',padding:'18px',maxWidth:'300px',width:'90vw',zIndex:'9700'});
      var ttl=document.createElement('div');ttl.textContent='시간 틈새';ttl.style.cssText='font-size:11px;color:#AABBFF;letter-spacing:.1em;margin-bottom:12px;';box.appendChild(ttl);
      choices.forEach(function(c){
        var btn=document.createElement('button');
        btn.style.cssText='display:block;width:100%;background:rgba(100,140,255,.08);border:1px solid rgba(100,140,255,.2);border-radius:8px;padding:10px;margin-bottom:7px;cursor:pointer;text-align:left;';
        var lt=document.createElement('div');lt.textContent=c.l;lt.style.cssText='font-size:10px;color:#AAB8FF;margin-bottom:2px;';
        var dt=document.createElement('div');dt.textContent=c.d;dt.style.cssText='font-size:8px;color:#556;';
        btn.appendChild(lt);btn.appendChild(dt);
        btn.onclick=function(){c.fn();bd.remove();setTimeout(function(){showField();},300);};
        box.appendChild(btn);
      });
      bd.appendChild(box);document.body.appendChild(bd);
    });
  }
  else if(node.type==='salvage2'){
    _tr=false;
    _nodeEnterFade('녹슨 기어들이 쌓여있다.','거래를 제안한다.',function(){
      var deck5=GS.deck.slice(0,Math.min(6,GS.deck.length));
      var bd2=mkBk(function(){});bd2.style.cssText+='display:flex;align-items:center;justify-content:center;';
      var box2=mkDiv('',{background:'rgba(4,4,14,.97)',border:'1px solid rgba(136,204,255,.2)',borderRadius:'12px',padding:'16px',maxWidth:'320px',width:'90vw',zIndex:'9700'});
      var t2=document.createElement('div');t2.textContent='고철 거래소';t2.style.cssText='font-size:11px;color:#88CCFF;margin-bottom:4px;';box2.appendChild(t2);
      var d2=document.createElement('div');d2.textContent='카드를 기어 조각으로 교환';d2.style.cssText='font-size:8px;color:#556;margin-bottom:10px;';box2.appendChild(d2);
      var g2=document.createElement('div');g2.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
      deck5.forEach(function(c){
        var sv=c.rarity==='희귀'?5:c.rarity==='고급'?3:2;
        var cb=document.createElement('div');cb.style.cssText='background:rgba(136,204,255,.05);border:1px solid rgba(136,204,255,.18);border-radius:8px;padding:8px 10px;cursor:pointer;text-align:center;font-size:9px;';
        var cn=document.createElement('div');cn.textContent=c.name;cn.style.cssText='color:#FFD700;margin-bottom:2px;font-size:10px;';
        var cv=document.createElement('div');cv.textContent='⚙ +'+sv;cv.style.cssText='color:#88CCFF;';
        cb.appendChild(cn);cb.appendChild(cv);
        cb.onclick=function(){GS={...GS,deck:GS.deck.filter(function(x){return x.uid!==c.uid;}),gearShard:(GS.gearShard||0)+sv};showNotif('기어 조각 +'+sv,'#88CCFF');bd2.remove();updateFUI();setTimeout(function(){showField();},300);};
        g2.appendChild(cb);
      });
      var sk2=document.createElement('button');sk2.textContent='그냥 나간다';sk2.style.cssText='background:none;border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#444;font-size:9px;padding:6px;width:100%;cursor:pointer;';
      sk2.onclick=function(){bd2.remove();setTimeout(function(){showField();},200);};
      box2.appendChild(g2);box2.appendChild(sk2);bd2.appendChild(box2);document.body.appendChild(bd2);
    });
  }
  else if(node.type==='clocktower'){
    _tr=false;
    _nodeEnterFade('거대한 탑이 우뚝 서있다.','기어가 맞물리는 소리.',function(){
      var upgCost=5;
      var bd3=mkBk(function(){});bd3.style.cssText+='display:flex;align-items:center;justify-content:center;';
      var box3=mkDiv('',{background:'rgba(4,4,14,.97)',border:'1px solid rgba(255,215,0,.2)',borderRadius:'12px',padding:'16px',maxWidth:'320px',width:'90vw',zIndex:'9700'});
      var t3=document.createElement('div');t3.textContent='시계탑';t3.style.cssText='font-size:11px;color:#FFD700;margin-bottom:4px;';box3.appendChild(t3);
      var d3=document.createElement('div');d3.textContent='기어 조각 '+upgCost+'개로 카드 강화 (현재: ⚙'+(GS.gearShard||0)+')';d3.style.cssText='font-size:8px;color:#776;margin-bottom:10px;';box3.appendChild(d3);
      var g3=document.createElement('div');g3.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
      GS.deck.filter(function(c){return !c._upgraded;}).slice(0,6).forEach(function(c){
        var en=(GS.gearShard||0)>=upgCost;
        var cb3=document.createElement('div');cb3.style.cssText='background:rgba(255,215,0,.04);border:1px solid rgba(255,215,0,.15);border-radius:8px;padding:8px 10px;cursor:'+(en?'pointer':'default')+';text-align:center;font-size:9px;opacity:'+(en?'1':'0.4')+';';
        var cn3=document.createElement('div');cn3.textContent=c.name;cn3.style.cssText='color:#FFD700;margin-bottom:2px;font-size:10px;';
        var cv3=document.createElement('div');cv3.textContent='⚙ -'+upgCost;cv3.style.cssText='color:#88CCFF;font-size:8px;';
        cb3.appendChild(cn3);cb3.appendChild(cv3);
        if(en){cb3.onclick=function(){var idx=GS.deck.findIndex(function(x){return x.uid===c.uid;});if(idx>=0){var nc={...GS.deck[idx],_upgraded:true,name:GS.deck[idx].name+'+',cost:Math.max(0,GS.deck[idx].cost-1)};var nd=[...GS.deck];nd[idx]=nc;GS={...GS,deck:nd,gearShard:GS.gearShard-upgCost};showNotif(c.name+'+ 강화!','#FFD700');bd3.remove();updateFUI();setTimeout(function(){showField();},300);}};}
        g3.appendChild(cb3);
      });
      if(GS.deck.filter(function(c){return !c._upgraded;}).length===0){var emp=document.createElement('div');emp.textContent='강화 가능한 카드 없음';emp.style.cssText='color:#444;font-size:9px;text-align:center;padding:12px;';box3.appendChild(emp);}
      var sk3=document.createElement('button');sk3.textContent='나간다';sk3.style.cssText='background:none;border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#444;font-size:9px;padding:6px;width:100%;cursor:pointer;';
      sk3.onclick=function(){bd3.remove();setTimeout(function(){showField();},200);};
      box3.appendChild(g3);box3.appendChild(sk3);bd3.appendChild(box3);document.body.appendChild(bd3);
    });
  }
  else if(node.type==='rest')showRestModal();
    else if(node.type==='event')showEventModal();
    else if(node.type==='shop')showShopModal();
    else if(node.type==='blackmarket')showBlackmarketModal();
    else if(node.type==='salvage')showSalvageModal();
    else if(node.type==='forge')showForgeModal();
    else if(node.type==='clinic')showClinicModal();
    else if(node.type==='implant')showImplantModal();
    else if(node.type==='abyss')showAbyssModal();
    else if(node.type==='forest')showForestModal();
    else if(node.type==='trial')showTrialModal();
    else if(node.type==='gamble')showGambleModal();
    else if(node.type==='timegate')showTimegateModal();
    else if(node.type==='hunter')showHunterModal();
    else if(node.type==='enhance')showEnhanceModal();
    else if(node.type==='relic_shrine')showRelicShrineModal();
  });
}

/* ═══════════════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════════════ */

function addCardSafe(gs, card){
  // 덱 30장 이하면 덱에, 초과면 저장소(25장 한도)로
  if(gs.deck.length<30){
    return {...gs, deck:[...gs.deck, card]};
  } else if((gs.storage||[]).length<25){
    showNotif('['+card.name+'] 저장소로 이동',DG);
    return {...gs, storage:[...(gs.storage||[]), card]};
  } else {
    showNotif('덱과 저장소가 모두 가득 찼다',CR);
    return gs;
  }
}

function initGame(){
  // 업적 카운터 초기화 (달성 기록은 유지) — 선언 후면 직접, 아니면 지연 처리
  if(typeof _achC!=='undefined'){
    _achC={crits:0,critBattle:0,restVisits:0,gambleWins:0,gambleRow:0,bossesKilled:[],
      wins:0,winRow:0,cardsTurn:0,chainMax:0,spentGold:0,fullHeals:0,bossnoDmg:false,
      bossRow:0,shopVisits:0,eventsDone:0,overloadUsed:0,poisonDmg:0,noDmgRun:true};
  } else {
    setTimeout(function(){
      if(typeof _achC!=='undefined'){
        _achC={crits:0,critBattle:0,restVisits:0,gambleWins:0,gambleRow:0,bossesKilled:[],
          wins:0,winRow:0,cardsTurn:0,chainMax:0,spentGold:0,fullHeals:0,bossnoDmg:false,
          bossRow:0,shopVisits:0,eventsDone:0,overloadUsed:0,poisonDmg:0,noDmgRun:true};
      }
    },0);
  }
  // 태엽 1번 패시브 기본 적용 (게임 시작 시)
  var cw0=CLOCK_REWARDS[0];
  var basePlayer={axis:110,maxAxis:110,cog:0,battery:0,speed:5,status:[],stacks:{},maxEnergy:4};
  var startPlayer=cw0&&cw0.apply?cw0.apply({player:basePlayer}).player:basePlayer;
  return{
    screen:'title',
    player:startPlayer,
    gold:50,fragment:0,gearShard:0,deck:shuffle(STARTER.map(mkCard)),
    realmIdx:0,curNode:'s',cleared:new Set(['s']),
    realmNodes:buildRealmNodes(0),
    evIdx:0,shopStock:shuffle(SHOP_P).slice(0,4),
    battle:null,lastEnemy:null,
    storage:[],
    relics:[],
    relicsEquipped:[],
    relicBag:[],
    clockUnlocked:1
  };
}
// 체인 콤보 전역 변수 (playCard보다 먼저 선언)
var _chainActive=false;
var _chainTimer=null;
var _chainStart=0;
var _CHAIN_DURATION=2500;

let GS=initGame();


/* ═══════════════════════════════════════════════════════
   AP COMBO SYSTEM + REACTIVE AI
   - 보스: 4 AP / 정예: 3 AP / 일반: 2 AP
   - 매 턴 AP 소진까지 연속 스킬 사용
   - 플레이어 상태 변화 시 의도 실시간 갱신
═══════════════════════════════════════════════════════ */

// 적 타입별 AP 반환
function getEnemyAP(e){
  if(!e)return 2;
  // 구역 스케일링된 AP 우선
  if(e._scaledAP)return e._scaledAP;
  if(e.type==='boss')return 4;
  if(e.type==='elite')return 3;
  return 2;
}

// 스킬 AP 비용
function getSkillAP(act){
  if(!act)return 1;
  if(act.t==='nuke'||act.t==='execute')return 3;
  if(act.t==='multi'||act.t==='phase'||act.t==='shield_break')return 2;
  if(act.t==='debuff'||act.t==='drain'||act.t==='counter')return 2;
  return 1;
}

// 상황 기반 최적 스킬 선택 (AP 비용 고려)
function pickSkill(gs, remainAP){
  const e=gs.enemy; const p=gs.player;
  const pCog=p.cog||0;
  const eHP=e.axis/e.maxAxis;
  const pHP=p.axis/p.maxAxis;
  const pOl=(p.stacks||{}).ol||0;
  const eBat=e.battery||0;

  // AP 비용 내에서 사용 가능한 스킬만
  const usable=e.pat.filter(a=>getSkillAP(a)<=remainAP);
  if(!usable.length)return null;

  // 조건 1: 플레이어 톱니 30 이상 → 톱니 파괴/관통 우선
  if(pCog>=30){
    const sb=usable.find(a=>a.t==='shield_break');
    if(sb)return sb;
    const atk=usable.find(a=>a.t==='atk'||a.t==='multi');
    if(atk)return atk;
  }
  // 조건 2: 적 HP 위기 (<25%) → 격노/위상전환
  if(eHP<0.25){
    const rage=usable.find(a=>a.t==='rage');
    if(rage&&Math.random()<0.7)return rage;
    const phase=usable.find(a=>a.t==='phase');
    if(phase&&Math.random()<0.5)return phase;
  }
  // 조건 3: 플레이어 HP 위기 (<25%) → 처형
  if(pHP<0.25){
    const exec=usable.find(a=>a.t==='execute');
    if(exec&&Math.random()<0.6)return exec;
    const nuke=usable.find(a=>a.t==='nuke');
    if(nuke&&Math.random()<0.5)return nuke;
  }
  // 조건 4: 과부하 없음 → 디버프
  if(pOl===0&&Math.random()<0.35){
    const db=usable.find(a=>a.t==='debuff'||a.t==='overload');
    if(db)return db;
  }
  // 조건 5: 에너지 높음 → 드레인
  if((gs.energy||0)>=3&&Math.random()<0.35){
    const drain=usable.find(a=>a.t==='drain');
    if(drain)return drain;
  }
  // 조건 6: 적 회복 필요
  if(eHP<0.5&&Math.random()<0.25){
    const heal=usable.find(a=>a.t==='heal');
    if(heal)return heal;
  }
  // 기본: 순환
  return usable[gs.pidx%usable.length];
}

// AP 콤보 실행 — 한 턴에 AP 소진까지 연속 스킬 사용

function _enemyAttackFlash(color1, color2){
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:8000;pointer-events:none;'+
    'background:'+color1+';animation:atkFlash .18s ease;';
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.remove(),200);
}
function _nukeScreenEffect(){
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:8500;pointer-events:none;'+
    'background:radial-gradient(ellipse at 50% 30%,#FF4400 0%,#330000 40%,#000 100%);'+
    'animation:nukeFlash .5s ease;';
  document.body.appendChild(overlay);
  // 화면 세 번 흔들림
  setTimeout(()=>VFX.shake(20),80);
  setTimeout(()=>VFX.shake(15),180);
  setTimeout(()=>overlay.remove(),520);
}

function _execSkill(gs,skill){
  const eS=(gs.enemy.status||[]).find(s=>s.t==='stasis');
  if(eS)return gs;
  const pv=skill.v||0;
  const lbl=skill.lbl||skill.t;
  const cr=gs.enemy.cr||CR;
  if(skill.t==='atk'){
    if(typeof openParryWindow!=='undefined')openParryWindow(600);
    gs=dealDmg(gs,'player',pv);
    gs=addV(gs,{type:'dmg',val:pv,tgt:'player',cr:false});
    VFX.stat('enemy',lbl,cr);VFX.shake(12+Math.min(20,pv));_enemyAttackFlash(cr||CR,'#300');
  }
  else if(skill.t==='shld'){gs=doShield(gs,'enemy',pv);gs=addV(gs,{type:'shld',val:pv,tgt:'enemy'});VFX.stat('enemy',lbl,G);}
  else if(skill.t==='heal'){gs=doHeal(gs,'enemy',pv);gs=addV(gs,{type:'heal',val:pv,tgt:'enemy'});VFX.stat('enemy',lbl,G);}
  else if(skill.t==='bat'){
    if(gs._batUsed){VFX.stat('player','방전 무효','#666');}
    else{gs=doBat(gs,'player',pv);gs={...gs,_batUsed:true};VFX.stat('player',lbl,DG);}
  }
  else if(skill.t==='nuke'){
    var maxD=Math.max(0,gs.player.axis+(gs.player.cog||0)-1);
    var nd=Math.min(pv,maxD);
    gs=dealDmgNoCrit(gs,'player',nd);gs=addV(gs,{type:'dmg',val:nd,tgt:'player',cr:false});VFX.stat('enemy',lbl,cr);VFX.shake(28);
  }
  else if(skill.t==='multi'){for(var h=0;h<(skill.hits||2);h++){gs=dealDmg(gs,'player',pv);gs=addV(gs,{type:'dmg',val:pv,tgt:'player',cr:false});}VFX.stat('enemy',lbl,cr);}
  else if(skill.t==='overload'){gs=addStack(gs,'player','ol',pv);VFX.stat('player','과부하 +'+pv,DG);}
  else if(skill.t==='wound'){gs=addStack(gs,'player','wound',pv);VFX.stat('player','상처 +'+pv,cr);}
  else if(skill.t==='reverse'){
    var n2=Math.min(pv||1,gs.hand.length);
    var drop=gs.hand.slice(0,n2);
    gs={...gs,hand:gs.hand.slice(n2),disc:[...gs.disc,...drop]};VFX.stat('player','패 '+n2+'장 버림',DG);
  }
  else if(skill.t==='purge'){
    var lose=Math.min(pv,gs.hand.length);
    gs={...gs,hand:gs.hand.slice(lose),disc:[...gs.disc,...gs.hand.slice(0,lose)]};VFX.stat('player','패 제거 -'+lose,cr);
  }
  else if(skill.t==='mirror'){gs=addStack(gs,'player','reflect_curse',2);VFX.stat('enemy','반사 준비',G);}
  else if(skill.t==='rage'){
    var ratio=gs.enemy.axis/gs.enemy.maxAxis;
    var mult=ratio<0.2?1.7:ratio<0.4?1.4:1.2;
    var dmg=Math.round(pv*mult);
    gs=dealDmg(gs,'player',dmg);gs=addV(gs,{type:'dmg',val:dmg,tgt:'player',cr:ratio<0.3});VFX.stat('enemy','격노 x'+mult.toFixed(1),cr);if(ratio<0.3)VFX.shake(24);
  }
  else if(skill.t==='drain'){
    if(!gs._drainUsed){
      var stolen=Math.min(gs.energy||0,pv);
      gs={...gs,energy:Math.max(0,(gs.energy||0)-stolen),_drainUsed:true};
      gs=doHeal(gs,'enemy',stolen*8);VFX.stat('enemy','에너지 흡수 -'+stolen,G);
    }else{VFX.stat('player','흡수 실패','#666');}
  }
  else if(skill.t==='shield_break'){
    var cogLost=gs.player.cog||0;
    gs={...gs,player:{...gs.player,cog:0}};
    var dmgSB=pv+Math.floor(cogLost*0.5);
    gs=dealDmg(gs,'player',dmgSB);gs=addV(gs,{type:'dmg',val:dmgSB,tgt:'player',cr:false});VFX.stat('enemy','관통!'+(cogLost>0?' -'+cogLost:''),cr);VFX.shake(18);
  }
  else if(skill.t==='counter'){gs=addStack(gs,'enemy','counter',pv||2);VFX.stat('enemy','반격 준비',G);}
  else if(skill.t==='phase'){gs=doHeal(gs,'enemy',pv);gs=doShield(gs,'enemy',pv);gs=addV(gs,{type:'heal',val:pv,tgt:'enemy'});VFX.stat('enemy','위상 전환',G);}
  else if(skill.t==='debuff'){gs=addStack(gs,'player','ol',pv);gs=addStack(gs,'player','wound',Math.ceil(pv/2));VFX.stat('player','복합 약화',cr);}
  else if(skill.t==='execute'){
    var pRatio=gs.player.axis/gs.player.maxAxis;
    var rawDmg=pRatio<0.3?Math.round(pv*1.8):pv;
    var _execCap=gs.enemy.type==='boss'?Math.floor(gs.enemy.axis*0.35):gs.player.axis+(gs.player.cog||0)-1;
    var dmgEx=Math.min(rawDmg,_execCap);
    gs=dealDmg(gs,'player',dmgEx);gs=addV(gs,{type:'dmg',val:dmgEx,tgt:'player',cr:false});VFX.stat('enemy',pRatio<0.3?'처형!':lbl,cr);if(pRatio<0.3)VFX.shake(20);
  }
  else if(skill.t==='phase_shield'){gs=doShield(gs,'enemy',pv);gs=addV(gs,{type:'shld',val:pv,tgt:'enemy'});VFX.stat('enemy',lbl||'분노의 갑옷',cr);}
  else if(skill.t==='buff'){gs={...gs,enemy:{...gs.enemy,_p2DmgMult:Math.min(1.5,(gs.enemy._p2DmgMult||1)+0.1)}};VFX.stat('enemy',lbl||'강화',cr);}
  // 적 콤보
  var prev_t=gs._eLastSkill;
  if(prev_t==='shld'&&skill.t==='atk'){var bonus=Math.floor((gs.enemy.cog||0)*0.1);if(bonus>0){gs=dealDmg(gs,'player',bonus);VFX.stat('enemy','방호 압박 +'+bonus,cr);}}
  if(prev_t==='overload'&&(skill.t==='atk'||skill.t==='nuke')){var bonus2=Math.floor(pv*0.2);gs={...gs,player:{...gs.player,axis:Math.max(0,gs.player.axis-bonus2)}};VFX.stat('enemy','과부하 연계 +'+bonus2,DG);}
  if(prev_t==='bat'&&skill.t==='atk'){gs=addStack(gs,'player','wound',1);VFX.stat('player','방전 상처',DG);}
  gs={...gs,_eLastSkill:skill.t};
  return gs;
}

function runEnemyCombo(gs){
  const totalAP=getEnemyAP(gs.enemy);
  let remainAP=totalAP;
  let comboCount=0;
  const maxCombo=6;
  // 스킬 시퀀스 수집
  const skills=[];
  while(remainAP>0&&comboCount<maxCombo){
    const skill=pickSkill(gs,remainAP);
    if(!skill)break;
    skills.push(skill);
    remainAP-=getSkillAP(skill);
    comboCount++;
    gs={...gs,pidx:gs.pidx+1};
    if(gs.player.axis<=0)break;
  }
  // 첫 스킬 즉시 실행
  if(skills.length>0){
    gs=_execSkill(gs,skills[0]);
    // 이후 스킬: 딜레이 후 렌더 + 실행
    for(let i=1;i<skills.length;i++){
      const sk=skills[i];
      const delay=i*380;
      setTimeout(()=>{
        if(!GS.battle)return;
        let b={...GS.battle};
        b=_execSkill(b,sk);
        const prev=GS.battle;
        GS={...GS,battle:b};
        procVFX({...GS,battle:prev},GS);
        renderBattle();
        if(GS.battle)updateIntentUI(GS.battle);
        chkEnd();
      },delay);
    }
  }
  if(skills.length>=2)setTimeout(()=>showNotif(skills.length+'연타!',CR),skills.length*380+100);
  return gs;
}

// 인텐트(의도) 계산 — 플레이어 상태 기반 실시간 예측
function calcIntent(gs){
  if(!gs||!gs.enemy||!gs.battle)return null;
  const pCog=gs.player.cog||0;
  const pHP=gs.player.axis/(gs.player.maxAxis||1);
  const eHP=gs.enemy.axis/(gs.enemy.maxAxis||1);
  const pOl=(gs.player.stacks||{}).ol||0;

  const pat=gs.enemy.pat||[];
  if(!pat.length)return null;

  const totalAP=getEnemyAP(gs.enemy);
  let remainAP=totalAP;
  const combo=[];
  let pidx=gs.pidx;

  // 다음 턴 예상 콤보 시뮬레이션
  for(let i=0;i<6&&remainAP>0;i++){
    const usable=pat.filter(a=>getSkillAP(a)<=remainAP);
    if(!usable.length)break;
    let skill=null;
    if(pCog>=30){skill=usable.find(a=>a.t==='shield_break')||usable.find(a=>a.t==='atk');}
    if(!skill&&pHP<0.25){skill=usable.find(a=>a.t==='execute')||usable.find(a=>a.t==='nuke');}
    if(!skill&&eHP<0.25){skill=usable.find(a=>a.t==='rage')||usable.find(a=>a.t==='phase');}
    if(!skill&&pOl===0){skill=usable.find(a=>a.t==='debuff');}
    if(!skill)skill=usable[pidx%usable.length];
    if(!skill)break;
    combo.push(skill);
    remainAP-=getSkillAP(skill);
    pidx++;
  }
  return combo;
}

// 인텐트 UI 업데이트
function updateIntentUI(gs){
  const el=document.getElementById('enemy-intent');
  if(!el||!gs||!gs.enemy)return;
  const combo=calcIntent(gs);
  if(!combo||!combo.length){el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML='';
  // 상단 AP HUD 업데이트
  var _apHud=document.getElementById('enemy-ap-hud');
  if(_apHud){
    _apHud.classList.add('active');
    _apHud.innerHTML='<span class="ap-label">ENEMY AP</span>';
    var _totalAP2=getEnemyAP(gs.enemy);
    for(var _ai=0;_ai<_totalAP2;_ai++){
      var _pip=document.createElement('div');
      _pip.className='ap-pip';
      _pip.style.background=_ai===0?'#FFD700':_ai===1?'#FF8800':'#FF4422';
      _pip.style.boxShadow='0 0 5px '+(_ai===0?'rgba(255,215,0,.6)':_ai===1?'rgba(255,136,0,.5)':'rgba(255,68,34,.4)');
      _apHud.appendChild(_pip);
    }
    var _apNum=document.createElement('span');
    _apNum.className='ap-count';
    _apNum.textContent=_totalAP2;
    _apHud.appendChild(_apNum);
  }

  const TYPE_KR={
    atk:'공격',shld:'방호',heal:'회복',bat:'방전',nuke:'핵폭격',multi:'연속타격',
    overload:'과부하',wound:'상처',reverse:'패버리기',purge:'패제거',
    mirror:'반사',rage:'격노',drain:'에너지흡수',shield_break:'관통',
    counter:'반격',phase:'위상전환',debuff:'복합약화',execute:'처형'
  };
  const isDmgType=t=>['atk','nuke','multi','rage','execute','shield_break'].includes(t);
  const isSupportType=t=>['shld','heal','phase','counter'].includes(t);

  const totalAP=getEnemyAP(gs.enemy);

  // AP 표시 — 눈에 띄게
  const apRow=document.createElement('div');
  apRow.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.08);';
  const apTitleEl=document.createElement('span');
  apTitleEl.style.cssText='font-size:7px;color:rgba(255,255,255,.3);font-family:"Share Tech Mono",monospace;letter-spacing:.12em;margin-right:2px;';
  apTitleEl.textContent='AP';
  apRow.appendChild(apTitleEl);
  for(let ai=0;ai<totalAP;ai++){
    const pip=document.createElement('div');
    pip.style.cssText='width:10px;height:10px;border-radius:50%;background:'+
      (ai===0?'#FFD700':ai===1?'#FF8800':'#FF4422')+
      ';box-shadow:0 0 6px '+(ai===0?'rgba(255,215,0,.7)':ai===1?'rgba(255,136,0,.6)':'rgba(255,68,34,.5)')+';';
    apRow.appendChild(pip);
  }
  const apNumEl=document.createElement('span');
  apNumEl.style.cssText='font-size:10px;font-weight:900;color:#FFD700;font-family:"Share Tech Mono",monospace;margin-left:2px;';
  apNumEl.textContent=totalAP;
  apRow.appendChild(apNumEl);
  el.appendChild(apRow);

  // 예상 타입만 간결하게
  combo.forEach(sk=>{
    const row=document.createElement('div');
    row.style.cssText='margin-bottom:2px;';
    const clr=isDmgType(sk.t)?CR:isSupportType(sk.t)?G:DG;
    const lbl=document.createElement('span');
    lbl.style.cssText='font-size:9px;color:'+clr+';font-family:"Share Tech Mono",monospace;letter-spacing:.08em;';
    lbl.textContent=TYPE_KR[sk.t]||sk.t;
    row.appendChild(lbl);
    el.appendChild(row);
  });

  // 톱니 경고
  if(gs.player&&(gs.player.cog||0)>=30){
    const warn=document.createElement('div');
    warn.style.cssText='font-size:7px;color:#FF4400;margin-top:3px;font-family:"Share Tech Mono",monospace;';
    warn.textContent='경고: 관통 공격 예상';
    el.appendChild(warn);
  }
}

function applyChainCombo(gs, card){
  const prev=gs.lastCardType;
  const cur=card.type;
  let triggered=false;

  /* ── 콤보 1: 톱니 연삭 (방어→공격)
     방어막을 공격력으로 치환 — 톱니 40% 관통 피해 ── */
  if(prev==='방어'&&cur==='공격'){
    const cog=gs.player.cog||0;
    if(cog>0){
      const pierce=Math.floor(cog*0.4);
      gs={...gs,enemy:{...gs.enemy,axis:Math.max(0,gs.enemy.axis-pierce)}};
      gs=addV(gs,{type:'dmg',val:pierce,tgt:'enemy',cr:true});
      VFX.stat('player','연삭 관통 -'+pierce,G);
      triggerComboSlice('GRIND');if(typeof _showChainSuccess!=='undefined')_cxSuccess('연삭');
      VFX.shake(16);
      triggered=true;
    }
  }

  /* ── 콤보 2: 과부하 전도 (공격→공격)
     연속 공격 가속 — 다음 피해 ×1.5, 양쪽 방전 +15 ── */
  else if(prev==='공격'&&cur==='공격'){
    gs={...gs,_comboDmgMult:1.5};
    gs={...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+5)},
              enemy:{...gs.enemy,battery:Math.min(100,(gs.enemy.battery||0)+5)}};
    VFX.stat('player','전도 x1.5 (+5)',DG);
    triggerComboSlice('OVERLOAD');if(typeof _showChainSuccess!=='undefined')_cxSuccess('전도');
    triggered=true;
  }

  /* ── 콤보 3: 철벽 중첩 (방어→방어)
     이중 방호 — 현재 톱니 추가 +30%, 방전 -10 ── */
  else if(prev==='방어'&&cur==='방어'){
    const bonus=Math.floor((gs.player.cog||0)*0.3+8);
    gs={...gs,player:{...gs.player,cog:(gs.player.cog||0)+bonus,battery:Math.max(0,(gs.player.battery||0)-10)}};
    VFX.stat('player','철벽 중첩 +'+bonus,G);
    triggerComboShield('FORTRESS');if(typeof _showChainSuccess!=='undefined')_cxSuccess('철벽');
    triggered=true;
  }

  /* ── 콤보 4: 역습 기세 (회복→공격)
     생명력을 공격력으로 — 다음 피해 ×1.3 + 회복량 보너스 ── */
  else if(prev==='회복'&&cur==='공격'){
    gs={...gs,_comboDmgMult:1.3};
    VFX.stat('player','역습 x1.3',G);
    triggerComboSlice('COUNTER');if(typeof _showChainSuccess!=='undefined')_cxSuccess('역습');
    triggered=true;
  }

  /* ── 콤보 5: 재생 요새 (회복→방어)
     치유 에너지로 방호 강화 — 톱니 +20, 방전 -10 ── */
  else if(prev==='회복'&&cur==='방어'){
    gs={...gs,player:{...gs.player,cog:(gs.player.cog||0)+20,battery:Math.max(0,(gs.player.battery||0)-10)}};
    VFX.stat('player','재생 요새 +20',G);
    triggerComboBloom('REGEN');if(typeof _showChainSuccess!=='undefined')_cxSuccess('재생 요새');
    VFX.shake(8);
    triggered=true;
  }

  /* ── 콤보 6: 재생 폭발 (회복→회복)
     이중 치유 — 현재 HP의 8% 추가 회복 ── */
  else if(prev==='회복'&&cur==='회복'){
    const bonus=Math.floor(gs.player.maxAxis*0.08);
    gs={...gs,player:{...gs.player,axis:Math.min(gs.player.maxAxis,gs.player.axis+bonus)}};
    gs=addV(gs,{type:'heal',val:bonus,tgt:'player'});
    VFX.stat('player','재생 폭발 +'+bonus,G);
    triggerComboBloom('BLOOM');if(typeof _showChainSuccess!=='undefined')_cxSuccess('재생 폭발');
    triggered=true;
  }

  /* ── 콤보 7: 장전 사격 (유틸→공격)
     준비된 공격 — 다음 피해 ×1.4 ── */
  else if((prev==='유틸'||prev==='강화')&&cur==='공격'){
    gs={...gs,_comboDmgMult:1.4};
    VFX.stat('player','장전 사격 x1.4',DG);
    triggerComboClock('LOADED');if(typeof _showChainSuccess!=='undefined')_cxSuccess('장전 사격');
    triggered=true;
  }

  /* ── 콤보 8: 전술 방어 (유틸→방어)
     기어 조율로 방호 증폭 — 톱니 +15, 방전 감소 ── */
  else if((prev==='유틸'||prev==='강화')&&cur==='방어'){
    gs={...gs,player:{...gs.player,cog:(gs.player.cog||0)+15,battery:Math.max(0,(gs.player.battery||0)-15)}};
    VFX.stat('player','전술 방어 +15',G);
    triggerComboShield('TACTICAL');if(typeof _showChainSuccess!=='undefined')_cxSuccess('전술 방어');
    triggered=true;
  }

  /* ── 콤보 9: 연쇄 작동 (유틸→유틸 / 강화→강화)
     기어 연쇄 — 에너지 1 반환 ── */
  else if((prev==='유틸'||prev==='강화')&&(cur==='유틸'||cur==='강화')){
    if(gs.energy<gs.maxEnergy){
      gs={...gs,energy:Math.min(gs.maxEnergy,gs.energy+1)};
      VFX.stat('player','연쇄 에너지 +1',G);
    }
    triggerComboClock('CASCADE');if(typeof _showChainSuccess!=='undefined')_cxSuccess('연쇄 작동');
    triggered=true;
  }

  /* ── 콤보 10: 방패 균열 봉합 (방어→회복)
     방호를 치유로 전환 — 톱니 50%를 HP 회복으로 ── */
  else if(prev==='방어'&&cur==='회복'){
    const cog=gs.player.cog||0;
    if(cog>0){
      const heal=Math.floor(cog*0.5);
      gs={...gs,player:{...gs.player,axis:Math.min(gs.player.maxAxis,gs.player.axis+heal)}};
      gs=addV(gs,{type:'heal',val:heal,tgt:'player'});
      VFX.stat('player','균열 봉합 +'+heal,G);
      triggerComboBloom('SEAL');
      triggered=true;
    }
  }

  // ── 강화→공격 콤보: 장전 발사
  if(prev==='강화'&&cur==='공격'){
    const bonus=(gs._dmgBonus||0)+5;
    gs={...gs,_comboDmgMult:(gs._comboDmgMult||1)*1.2,_dmgBonus:bonus};
    VFX.stat('player','강화 연계 ×1.2',G);
    triggerComboClock('CHARGED');
    triggered=true;
  }
  // ── 강화→강화 콤보: 과속 연쇄
  else if(prev==='강화'&&cur==='강화'){
    gs={...gs,energy:Math.min(gs.maxEnergy+1,gs.energy+1)};
    VFX.stat('player','강화 연쇄 +1',G);
    triggerComboClock('CHAIN');
    triggered=true;
  }
  // ── 강화→방어 콤보: 강화 방호
  else if(prev==='강화'&&cur==='방어'){
    const bonus=8;
    gs={...gs,player:{...gs.player,cog:(gs.player.cog||0)+bonus}};
    VFX.stat('player','강화 방호 +8',G);
    triggerComboShield('FORTIFY');
    triggered=true;
  }
  if(!triggered) gs={...gs,_comboDmgMult:1};
  if(triggered) gs={...gs,comboCount:(gs.comboCount||0)+1};
  return gs;
}

/* dealDmg에서 _comboDmgMult 반영 — 콤보 배율 적용 래퍼 */
function applyComboMult(gs, tgt, amt){
  const mult = gs._comboDmgMult || 1;
  const final = mult > 1 ? Math.round(amt * mult) : amt;
  const g2 = {...gs, _comboDmgMult:1}; // 한 번 쓰면 초기화
  return dealDmg(g2, tgt, final);
}


function _showComboBadge(txt){
  const b=document.getElementById('combo-badge');
  if(!b)return;
  b.textContent=txt;b.classList.remove('on');
  void b.offsetWidth;b.classList.add('on');
  clearTimeout(b._t);
  b._t=setTimeout(()=>b.classList.remove('on'),1600);
}


/* ════════════════════════════════════════════════════════
   CHAIN BAR ENGINE
════════════════════════════════════════════════════════ */
const _SLOT_LABEL={'공격':'공격','방어':'방어','회복':'회복','유틸':'유틸','강화':'강화'};

function updateChainBar(card){
  const bar=document.getElementById('chain-bar');
  if(!bar)return;
  bar.style.opacity='1';
  bar.style.display='flex';
  bar.classList.add('visible');
  const s0=document.getElementById('cs-0');
  const s1=document.getElementById('cs-1');
  const ar=document.getElementById('ca-0');
  const lbl=_SLOT_LABEL[card.type]||card.type;
  if(!s0.classList.contains('filled')){
    s0.textContent=lbl; s0.classList.add('filled');
  } else {
    s1.textContent=lbl; s1.classList.add('filled');
    if(ar)ar.classList.add('lit');
  }
}

function resetChainBar(delay){
  const go=()=>{
    ['cs-0','cs-1'].forEach(id=>{
      const s=document.getElementById(id);
      if(s){s.classList.remove('filled');s.textContent='\u2014';}
    });
    const ar=document.getElementById('ca-0');
    if(ar)ar.classList.remove('lit');
    const bar=document.getElementById('chain-bar');
    if(bar){bar.classList.remove('visible');bar.style.opacity='0';}
    var _tn2=document.getElementById('chain-timer-num');if(_tn2){_tn2.classList.remove('active');_tn2.style.color='rgba(255,215,0,.45)';}
    var _tb2=document.getElementById('chain-timer-bar');if(_tb2)_tb2.classList.remove('active');
  };
  delay?setTimeout(go,delay):go();
}


/* ════════════════════════════════════════════════════════
   COMBO EFFECT ENGINES
════════════════════════════════════════════════════════ */

// 회복 콤보 — 황금 파동 블룸
function triggerComboBloom(label){
  const ov=document.getElementById('combo-bloom');
  const ring=document.getElementById('combo-bloom-ring');
  const tx=document.getElementById('combo-bloom-text');
  if(!ov)return;
  ov.classList.add('active');
  tx.textContent=label||'RESTORE';
  // 배경 플래시
  ov.style.animation='none'; void ov.offsetWidth;
  ov.style.background='radial-gradient(ellipse at 50% 50%,rgba(255,215,0,.25) 0%,rgba(255,215,0,.08) 40%,transparent 70%)';
  ov.style.animation='bloomOut .7s ease .5s forwards';
  // 링 파동
  ring.style.cssText='animation:bloomRing .7s cubic-bezier(.1,0,.3,1) forwards;';
  // 텍스트
  tx.style.animation='none'; void tx.offsetWidth;
  tx.style.animation='bloomText .35s cubic-bezier(.34,1.56,.64,1) forwards';
  setTimeout(()=>{ tx.style.animation='bloomOut .3s ease forwards'; },500);
  setTimeout(()=>{
    ov.classList.remove('active');
    ov.style.background='';
    ring.style.animation='';
  },820);
}

// 방어 콤보 — 기어 방패 폭발
function triggerComboShield(label){
  const ov=document.getElementById('combo-shield');
  const hex=document.getElementById('combo-shield-hex');
  const tx=document.getElementById('combo-shield-text');
  if(!ov)return;
  tx.textContent=label||'FORTRESS';
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');
  // 헥스 팝
  hex.style.animation='none'; void hex.offsetWidth;
  hex.style.animation='hexPop .4s cubic-bezier(.34,1.56,.64,1) forwards';
  // 파편 생성
  const ctr=document.getElementById('combo-shield-center');
  for(let i=0;i<12;i++){
    const sh=document.createElement('div');
    const ang=(i/12)*Math.PI*2;
    const dist=60+Math.random()*80;
    sh.style.cssText='position:absolute;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;'+
      'background:rgba(255,215,0,.'+(0.4+Math.random()*0.5)+');border-radius:1px;'+
      'top:0;left:0;'+
      '--sx:'+(Math.cos(ang)*dist)+'px;--sy:'+(Math.sin(ang)*dist)+'px;'+
      'animation:shieldShard '+(0.4+Math.random()*0.3)+'s ease-out forwards;';
    ctr.appendChild(sh);
    setTimeout(()=>sh.remove(),800);
  }
  // 텍스트
  tx.style.animation='none'; void tx.offsetWidth;
  tx.style.animation='bloomText .35s cubic-bezier(.34,1.56,.64,1) forwards';
  setTimeout(()=>{ tx.style.animation='bloomOut .3s ease forwards'; },500);
  setTimeout(()=>{
    ov.classList.remove('active');
    hex.style.animation='';
  },820);
}

// 유틸/강화 콤보 — 기어 역류
function triggerComboClock(label){
  const ov=document.getElementById('combo-clock');
  const gc=document.getElementById('combo-clock-gear');
  const tx=document.getElementById('combo-clock-text');
  if(!ov)return;
  tx.textContent=label||'CASCADE';
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');
  // 기어 캔버스 그리기
  if(gc){
    const ctx2=gc.getContext('2d');
    const cx=90,cy=90,R=75,teeth=16;
    ctx2.clearRect(0,0,180,180);
    ctx2.strokeStyle='rgba(68,102,170,.9)';
    ctx2.fillStyle='rgba(68,102,170,.12)';
    ctx2.lineWidth=2;
    ctx2.beginPath();
    for(let i=0;i<teeth*2;i++){
      const a=(i/teeth/2)*Math.PI*2;
      const r=i%2===0?R:R-12;
      ctx2.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
    }
    ctx2.closePath();ctx2.fill();ctx2.stroke();
    // 내부 원
    ctx2.beginPath();ctx2.arc(cx,cy,30,0,Math.PI*2);
    ctx2.fillStyle='rgba(68,102,170,.15)';ctx2.fill();ctx2.stroke();
    gc.style.animation='none'; void gc.offsetWidth;
    gc.style.animation='gearSpin .6s cubic-bezier(.2,0,.4,1) forwards';
  }
  // 텍스트
  tx.style.animation='none'; void tx.offsetWidth;
  tx.style.animation='clockText .35s cubic-bezier(.34,1.56,.64,1) .1s forwards';
  setTimeout(()=>{ tx.style.animation='bloomOut .3s ease forwards'; },550);
  setTimeout(()=>{
    ov.classList.remove('active');
    if(gc)gc.style.animation='';
  },820);
}

function triggerComboSlice(label){
  const ov=document.getElementById('combo-overlay');
  const top=document.getElementById('combo-top');
  const bot=document.getElementById('combo-bot');
  const sl=document.getElementById('combo-slash');
  const tx=document.getElementById('combo-text');
  const sp=document.getElementById('combo-sparks');
  if(!ov)return;
  ov.classList.add('active');
  tx.textContent=label||'COMBO';
  // 스파크 생성
  sp.innerHTML='';
  for(let i=0;i<18;i++){
    const s=document.createElement('div');s.className='c-spark';
    const ang=Math.random()*Math.PI*2;
    const dist=30+Math.random()*120;
    const x=Math.cos(ang)*dist,y=Math.sin(ang)*dist;
    const sz=2+Math.random()*5;
    s.style.cssText='left:'+x+'px;top:'+y+'px;width:'+sz+'px;height:'+sz+'px;'+
      'opacity:'+(0.5+Math.random()*0.5)+';'+
      'animation:sparkFly '+(0.3+Math.random()*0.4)+'s ease-out forwards;'+
      '--tx:'+x+'px;--ty:'+y+'px;';
    sp.appendChild(s);
  }
  // 시퀀스
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');
  const root=document.getElementById('root');
  if(root)root.style.animation='flashInvert .18s ease';
  setTimeout(()=>{if(root)root.style.animation='';},180);
  sl.style.cssText='animation:slashLine .55s ease forwards;';
  setTimeout(()=>{
    top.style.animation='sliceTop .55s cubic-bezier(.2,0,.3,1) forwards';
    bot.style.animation='sliceBot .55s cubic-bezier(.2,0,.3,1) forwards';
  },40);
  tx.style.animation='';
  void tx.offsetWidth;
  setTimeout(()=>{tx.style.animation='comboTextIn .3s cubic-bezier(.34,1.56,.64,1) forwards';},80);
  setTimeout(()=>{tx.style.animation='comboTextOut .25s ease forwards';},600);
  setTimeout(()=>{
    top.style.animation='';bot.style.animation='';sl.style.animation='';
    ov.classList.remove('active');
    resetChainBar();
  },820);
}

function playCard(cuid){
  if(typeof SFX!=='undefined')SFX.card();
  // 카드 날아가는 애니메이션
  const _cel=document.querySelector(`.hcw [data-uid="${cuid}"]`);
  if(_cel){const _pw=_cel.closest('.hcw');if(_pw){_pw.style.animation='cardPlay 0.28s ease forwards';_pw.style.zIndex='999';}}
  let s=GS;if(!s.battle)return;
  const card=s.battle.hand.find(c=>c.uid===cuid);
  if(!card||s.battle.energy<card.cost)return;
  if(card.sealed){VFX.stat('player','봉인된 카드!','#006666');return;}
  if((s.battle.player.status||[]).find(st=>st.type==='stasis'))return;
  const eLock=(s.battle.player.stacks||{}).energy_lock||0;
  if(eLock>0&&s.battle.energy<=1&&card.cost>0)return;
  const cel=document.querySelector(`[data-cuid="${cuid}"]`);
  if(cel)VFX.dissolve(cel.closest('.hcw')||cel);

  let gs={...s.battle,
    hand:s.battle.hand.filter(c=>c.uid!==cuid),
    disc:[...s.battle.disc,{...card}],
    energy:s.battle.energy-card.cost
  };
  const prev=GS.battle;
  // 반격 판정 체크 (방어 카드 → 패링)
  var _parried=false;
  if(card.type==='방어'&&typeof tryParry!=='undefined'){
    _parried=tryParry(card);
    if(_parried){
      // 패링 성공: 반격 피해
      var _pb=typeof getParryBonus!=='undefined'?getParryBonus():15;
      gs=dealDmg({...gs},'enemy',_pb);
      VFX.stat('player','PARRY! +'+_pb,'#88DDFF');
    }
  }
  // 카드 효과 실행
  try{gs=card.fx(gs);}catch(e){console.warn(e);}
  // ── 체인 콤보 처리 (lastCardType 참조 전에 실행) ──
  gs=applyChainCombo(gs,card);
  if(typeof achCheck==='function'&&gs.comboCount)achCheck('chain',{count:gs.comboCount});
  // lastCardType 갱신 (다음 카드를 위해)
  gs={...gs,lastCardType:card.type,lastPlayed:card.id};
  // 체인 UI 업데이트
  updateChainBar(card);
  showChainOverlay(card);
  GS={...GS,battle:gs};procVFX({...GS,battle:prev},GS);
  renderBattle();if(GS.battle)updateIntentUI(GS.battle);chkEnd();
}

function startBattle(eid){
  const e=ENM[eid];if(!e)return;
  
  // 구역 하드코어 스케일링 — 패턴 변화 + AP 증가 방식
  const ri=GS.realmIdx||0;
  // ri 0~2: 원본 / ri 3~5: 패턴 강화 / ri 6+: AP 증가 + 분기 활성화
  const eType=e.type||'normal';
  // 정예/보스 전투 BGM
  BGM.fadeToBattle();
  // 보스 전투: 글리치 루프
  if(eType==='boss'&&typeof VFX_GLITCH!=='undefined')setTimeout(function(){VFX_GLITCH.loop(true);},500);
  const baseAP=eType==='boss'?4:eType==='elite'?3:2;
  // AP 증가: ri 5마다 +1, 보스 최대 5, 정예 4, 일반 3
  const apBonus=Math.floor(ri/5);
  const maxAP=eType==='boss'?5:eType==='elite'?4:3;
  const scaledAP=Math.min(baseAP+apBonus, maxAP);
  // ri 3+ : 추가 행동 패턴 잠금 해제
  const addPats=[];
  if(ri>=3&&eType!=='normal'){
    addPats.push({t:'shield_break',v:Math.round(10+ri*1.5),lbl:'구역 압박'});
  }
  if(ri>=5){
    addPats.push({t:'debuff',v:2+Math.floor(ri/3),lbl:'심층 오염'});
  }
  if(ri>=7){
    addPats.push({t:'execute',v:Math.round(20+ri*2),lbl:'심층 처형'});
  }
  // 톱니 초기값만 소폭 증가 (HP/피해 고정)
  const cogBase=Math.floor(ri*2);
  const scaledPat=[...e.pat,...addPats];
  // 적 AP를 gs에서 읽을 수 있도록 e에 저장
  // HP를 구역에 맞게 스케일
  var _hpMult=eType==='boss'?1:eType==='elite'?(1+ri*0.08):(1+ri*0.06);
  var _scaledHp=Math.round(e.axis*_hpMult);
  scaledE={...e,axis:_scaledHp,maxAxis:_scaledHp,cog:cogBase+(e.cog||0),
    pat:scaledPat,_scaledAP:scaledAP};
  let gs={
    player:{...GS.player,status:[...(GS.player.status||[])],stacks:{...(GS.player.stacks||{})}},
    enemy:{...scaledE,battery:0,status:[],stacks:{},uid:uid()},
    eid,hand:[],draw:shuffle([...GS.deck]),disc:[],
    energy:GS.player.maxEnergy||4,maxEnergy:GS.player.maxEnergy||4,
    turn:0,pidx:0,vfx:[],delayed:[],lastPlayed:null,_playingCard:null,ultDone:false,showUlt:false,
    drawUsed:false,lastCardType:null,comboCount:0,
    relicsEquipped:[...(GS.relicsEquipped||[])]
  };
  gs=applyRelicEffects(gs,'battleStart');GS={...GS,screen:'battle',battle:drawN(gs,5),lastEnemy:eid};
  hideField();
  // 체인바 초기화 (인라인 스타일 제거 + 슬롯 리셋)
  var _cbr=document.getElementById('chain-bar');
  if(_cbr){_cbr.style.display='';_cbr.style.opacity='';_cbr.classList.remove('visible');}
  resetChainBar(0);
  document.getElementById('root').style.display='block';
  initGears(Math.min(3,gs.player.speed/5),true);
  renderBattle();
}

function endTurn(){
  let s=GS;if(!s.battle)return;
  let gs={...s.battle};
  // 지연 폭탄
  const nd=[];
  for(const d of(gs.delayed||[])){if(d.turns<=1)gs=dealDmg(gs,d.tgt||'enemy',d.dmg,false);else nd.push({...d,turns:d.turns-1});}
  gs.delayed=nd;
  // 스택 틱
  gs=tickStacks(gs,'enemy');gs=tickStacks(gs,'player');
  if((gs.player.stacks||{}).energy_lock>0){gs={...gs,player:{...gs.player,stacks:{...gs.player.stacks,energy_lock:gs.player.stacks.energy_lock-1}}};}
  if((gs.player.stacks||{}).reflect_curse>0){gs={...gs,player:{...gs.player,stacks:{...gs.player.stacks,reflect_curse:gs.player.stacks.reflect_curse-1}}};}
  gs={...gs,disc:[...gs.disc,...gs.hand],hand:[]};
  gs=tickS(gs,'player');
  // 적 행동 (AP 콤보 시스템)
  const eS=(gs.enemy.status||[]).find(st=>st.type==='stasis');
  if(!eS){
    gs=runEnemyCombo(gs);
  }
  gs=tickS(gs,'enemy');
  if(gs.enemy.battery>=100){gs={...gs,enemy:{...gs.enemy,battery:50}};gs=doStat(gs,'enemy','stasis',2);gs=addV(gs,{type:'stasis',tgt:'enemy'});}
  if(gs.player.battery>=100){gs={...gs,player:{...gs.player,battery:50}};gs=doStat(gs,'player','stasis',2);gs=addV(gs,{type:'stasis',tgt:'player'});}
  const isBoss=ENM[gs.eid]?.type==='boss';
  // 극한 각성 후 차지 턴 감소
  if(isBoss&&gs.enemy._ultChargeLeft>0){
    gs={...gs,enemy:{...gs.enemy,_ultChargeLeft:gs.enemy._ultChargeLeft-1}};
    VFX.stat('enemy','차지 '+(gs.enemy._ultChargeLeft)+'→'+(gs.enemy._ultChargeLeft-1),'#FF8800');
    if(gs.enemy._ultChargeLeft<=0&&!gs.ultDone){
      gs={...gs,ultDone:true,showUlt:true};
    const prev0=GS.battle;GS={...GS,battle:gs};
    procVFX({...GS,battle:prev0},GS);renderBattle();showUltOverlay();return;
    }
  }
  gs.turn+=1;
  const hv=gs.turn%5===0;
  gs={...gs,energy:gs.maxEnergy+(hv?1:0)};
  if(hv){VFX.stat('player','천상의 턴!',G);PS.spawnGear(Math.min(430,window.innerWidth)/2,window.innerHeight*.7,8);}
  else{VFX.stat('player',`에너지 ${gs.energy}`,DG);}
  // 수명 만료 카드 묘지
  const expired=gs.hand.filter(c=>(c.drawnAt!==undefined)&&(c.drawnAt+1<gs.turn));
  const alive=gs.hand.filter(c=>(c.drawnAt===undefined)||(c.drawnAt+1>=gs.turn));
  if(expired.length>0){
    gs={...gs,hand:alive,disc:[...gs.disc,...expired]};
    VFX.stat('player',`카드 ${expired.length}장 소멸`,CR);
  }
  try{gs=applyRelicEffects(gs,'turnStart');}catch(e){console.warn('relic turnStart err',e);}gs=drawN(gs,3);
  try{gs=applyRelicEffects(gs,'turnEnd');}catch(e){console.warn('relic turnEnd err',e);}
  // 보스 기믹 효과
  if(typeof applyBossGimmick==='function'){try{gs=applyBossGimmick(gs,'turnEnd');}catch(_ge){console.error('기믹 오류:',_ge.message);}}gs={...gs,drawUsed:false,lastCardType:null,comboCount:0,_comboDmgMult:1,_eLastSkill:null,_drainUsed:false,_batUsed:false};
  // 면역 턴 감소
  if(gs.enemy&&gs.enemy._immuneTurns&&gs.enemy._immuneTurns>0){
    const newImm=gs.enemy._immuneTurns-1;
    gs={...gs,enemy:{...gs.enemy,_immuneTurns:newImm}};
    if(newImm===0)showNotif('면역 해제!','#FFAA44');
  }
  resetChainBar();
  const prev=GS.battle;GS={...GS,battle:gs};
  procVFX({...GS,battle:prev},GS);
  renderBattle();if(GS.battle)updateIntentUI(GS.battle);chkEnd();
}

function showUltOverlay(gs){
  if(!gs)gs=GS.battle;
  if(!gs||!gs.eid)return;
  const e=ENM[gs.eid]||{};
  const ult=e.ult||{name:'필살기',desc:'강력한 공격이 닥쳐온다.'};
  const eData=ENM[gs.eid]||{};
  const ultAnim=eData.ultAnim||{};
  const ultClr=ultAnim.color||'#FF2200';
  const ultClr2=ultAnim.color2||'#440000';
  const ultEffect=ultAnim.effect||'';

  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9200;pointer-events:none;'+
    'background:rgba(0,0,0,0);display:flex;flex-direction:column;align-items:center;justify-content:center;';
  document.body.appendChild(ov);

  // 배경
  const bgLayer=document.createElement('div');
  bgLayer.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .4s ease;'+
    'background:radial-gradient(ellipse at 50% 40%,var(--uc2,rgba(120,0,0,.95)) 0%,rgba(0,0,0,.98) 60%,rgba(0,0,0,1) 100%);';
  ov.appendChild(bgLayer);

  // 균열 라인들
  for(let i=0;i<7;i++){
    const crack=document.createElement('div');
    const ang=-35+Math.random()*70;
    crack.style.cssText='position:absolute;left:'+Math.random()*90+'%;top:0;'+
      'width:1px;height:130%;background:linear-gradient(180deg,transparent,rgba(255,60,0,.7),transparent);'+
      'transform:rotate('+ang+'deg);transform-origin:50% 0;opacity:0;transition:opacity .25s '+(i*0.05)+'s;';
    ov.appendChild(crack);
  }

  // WARNING
  const warn=document.createElement('div');
  warn.style.cssText='position:relative;z-index:2;font-size:10px;color:rgba(255,100,0,.9);'+
    'font-family:"Share Tech Mono",monospace;letter-spacing:.4em;margin-bottom:16px;'+
    'opacity:0;transform:scaleX(0);transition:all .3s .35s cubic-bezier(.34,1.56,.64,1);';
  warn.textContent='⚠ WARNING ⚠';
  ov.appendChild(warn);

  // 보스 이름
  // 효과 설명
  const effectEl=document.createElement('div');
  effectEl.style.cssText='position:relative;z-index:2;font-size:9px;color:'+ultClr+
    ';font-family:"Share Tech Mono",monospace;letter-spacing:.25em;margin-bottom:8px;'+
    'opacity:0;transition:opacity .3s .3s;';
  effectEl.textContent=ultEffect;
  ov.appendChild(effectEl);
  const bossNm=document.createElement('div');
  bossNm.style.cssText='position:relative;z-index:2;font-size:12px;color:rgba(255,150,100,.8);'+
    'font-family:"Cinzel",serif;letter-spacing:.2em;margin-bottom:10px;'+
    'opacity:0;transform:translateY(8px);transition:all .3s .55s ease;';
  bossNm.textContent=e.name||'???';
  ov.appendChild(bossNm);

  // 분리선
  const line=document.createElement('div');
  line.style.cssText='position:relative;z-index:2;width:0;height:1px;'+
    'background:linear-gradient(90deg,transparent,'+ultClr+',transparent);margin:0 0 12px;'+
    'transition:width .5s .65s ease;';
  ov.appendChild(line);

  // 필살기 이름
  const ultNm=document.createElement('div');
  ultNm.style.cssText='position:relative;z-index:2;font-size:28px;color:#fff;'+
    'font-family:"Cinzel Decorative",serif;font-weight:900;letter-spacing:.18em;'+
    'text-shadow:0 0 30px '+ultClr+',0 0 60px '+ultClr+',0 0 90px rgba(255,0,0,.4);'+
    'opacity:0;transform:scale(.5);transition:all .5s .7s cubic-bezier(.34,1.56,.64,1);'+
    'max-width:320px;text-align:center;word-break:keep-all;';
  ultNm.textContent=ult.name;
  ov.appendChild(ultNm);

  // 설명
  const ultDesc=document.createElement('div');
  ultDesc.style.cssText='position:relative;z-index:2;font-size:10px;color:rgba(200,100,100,.8);'+
    'font-family:"Noto Serif KR",serif;text-align:center;max-width:260px;line-height:1.9;'+
    'margin-top:14px;opacity:0;transition:opacity .4s 1.1s;';
  ultDesc.textContent=ult.desc;
  ov.appendChild(ultDesc);

  // 보스별 파티클 이펙트
  var _at=ultAnim.type||'default';
  var _pc=_at==='infinite'?35:_at==='zodiac'?28:20;
  for(var _pi=0;_pi<_pc;_pi++){
    var _p=document.createElement('div');
    var _sz=2+Math.random()*5;
    var _pc2='';
    if(_at==='void')_pc2='rgba('+(80+Math.floor(Math.random()*100))+',0,'+Math.floor(Math.random()*255)+',.9)';
    else if(_at==='mirror')_pc2='rgba('+Math.floor(Math.random()*80)+','+Math.floor(Math.random()*80)+',255,.9)';
    else if(_at==='light')_pc2='rgba(255,255,'+(150+Math.floor(Math.random()*105))+',.9)';
    else if(_at==='zodiac')_pc2='hsl('+(Math.random()*360)+',100%,70%)';
    else if(_at==='storm')_pc2='rgba(0,'+Math.floor(Math.random()*80)+',255,.9)';
    else if(_at==='infinite')_pc2='rgba('+Math.floor(Math.random()*255)+',0,'+Math.floor(Math.random()*255)+',.8)';
    else _pc2='rgba(255,'+(50+Math.floor(Math.random()*100))+',0,.8)';
    _p.style.cssText='position:absolute;width:'+_sz+'px;height:'+_sz+'px;'+
      'border-radius:'+(_at==='zodiac'?'0':'50%')+';background:'+_pc2+';'+
      'left:'+(Math.random()*100)+'%;top:'+(Math.random()*100)+'%;pointer-events:none;'+
      'opacity:0;transition:opacity .3s '+(0.3+Math.random()*.8)+'s;z-index:1;';
    ov.appendChild(_p);
  }
  // 보스별 중앙 이펙트
  if(_at==='void'){
    var _vfx=document.createElement('div');
    _vfx.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);'+
      'width:10px;height:10px;border-radius:50%;background:rgba(136,0,255,.3);'+
      'box-shadow:0 0 20px 10px rgba(136,0,255,.4);transition:all 1.5s .4s;z-index:1;';
    ov.appendChild(_vfx);
    setTimeout(function(){_vfx.style.width='180px';_vfx.style.height='180px';_vfx.style.background='rgba(136,0,255,.08)';_vfx.style.boxShadow='0 0 60px 30px rgba(136,0,255,.3)';},400);
  } else if(_at==='light'){
    var _lfx=document.createElement('div');
    _lfx.style.cssText='position:absolute;top:0;left:50%;transform:translateX(-50%);'+
      'width:3px;height:0;background:linear-gradient(180deg,rgba(255,255,150,.9),transparent);'+
      'box-shadow:0 0 20px rgba(255,255,150,.6);transition:height 1.2s .3s;z-index:1;';
    ov.appendChild(_lfx);
    setTimeout(function(){_lfx.style.height='100%';},300);
  } else if(_at==='storm'){
    var _sfx=document.createElement('div');
    _sfx.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);'+
      'width:10px;height:10px;border-radius:50%;border:2px solid rgba(0,68,255,.8);'+
      'box-shadow:0 0 20px rgba(0,68,255,.5);animation:stormExpand 2s ease forwards;z-index:1;';
    ov.appendChild(_sfx);
  }
  // ── 자동 애니메이션 시퀀스 ──
  setTimeout(()=>{
    bgLayer.style.opacity='1';
    VFX.shake(20);
    ov.querySelectorAll('div').forEach(el=>{
      if(el.style.width==='1px')el.style.opacity='1';   // 균열선
      if(el.style.borderRadius==='50%')el.style.opacity='1'; // 파티클
    });
  },80);
  setTimeout(()=>{if(effectEl)effectEl.style.opacity='1';},300);
  setTimeout(()=>{warn.style.opacity='1';warn.style.transform='scaleX(1)';},350);
  setTimeout(()=>{bossNm.style.opacity='1';bossNm.style.transform='translateY(0)';},550);
  setTimeout(()=>{line.style.width='200px';},650);
  setTimeout(()=>{ultNm.style.opacity='1';ultNm.style.transform='scale(1)';VFX.shake(28);},700);
  setTimeout(()=>{ultDesc.style.opacity='1';},1100);
  setTimeout(()=>VFX.shake(15),1300);

  // ── 자동 페이드아웃 (2.2초 후) ──
  setTimeout(()=>{
    ov.style.transition='opacity .35s';
    ov.style.opacity='0';
    setTimeout(()=>{
      ov.remove();
      GS={...GS,battle:{...GS.battle,showUlt:false}};
      _applyUltEffects();
      renderBattle();
    },360);
  },2200);
}

function triggerUlt(){
  document.getElementById('uo').classList.remove('on');
  const s=GS;if(!s.battle)return;
  const eD=ENM[s.battle.eid];let gs={...s.battle,showUlt:false,energy:s.battle.maxEnergy};
  const prev=gs;try{if(eD?.ultFx)gs=eD.ultFx(gs);}catch(e){}
  gs=drawN(gs,5);GS={...GS,battle:gs};procVFX({...GS,battle:prev},GS);
  renderBattle();chkEnd();
}

function chkEnd(){
  _checkBossPhase2();
  const s=GS;if(!s.battle)return;
  if(s.battle.player.axis<=0){setTimeout(()=>{GS={...GS,screen:'gameover',battle:null};hideField();renderScreen();},900);return;}
  if(s.battle.enemy.axis<=0){
    let wonGs=null;try{wonGs=applyRelicEffects(GS.battle||{},'battleEnd');}catch(e){console.warn('battleEnd 유물 오류',e);}
if(wonGs&&wonGs.player)GS={...GS,battle:wonGs};
    const eid=s.lastEnemy;const wonPl={...GS.battle.player};const wonGold=GS.gold||0;const wonDeck=[...GS.deck];
    setTimeout(()=>{
      const e=ENM[eid];
      if(!e||!e.gold||!e.drops){GS={...GS,screen:'field',battle:null};_battleExitFade(()=>{document.getElementById('root').innerHTML='';showField();setInBattle(false);});return;}
      const gs_shard=rng(1,3+Math.floor((GS.realmIdx||0)/3));
      GS={...GS,gearShard:(GS.gearShard||0)+gs_shard};
      if(typeof showNotif==='function'&&gs_shard>0)setTimeout(()=>showNotif('기어 조각 +'+gs_shard,'#88CCFF'),800);
      const gold=rng(e.gold[0],e.gold[1]);
      const loot=e.drops&&e.drops.length?e.drops[rng(0,e.drops.length-1)]:null;
      const isBoss=e.type==='boss';
      const isFinalBoss=eid==='boss12';
      if(typeof achCheck==='function')achCheck('battle_win',{noDamage:wonPl.axis>=wonPl.maxAxis,lowHp:wonPl.axis/wonPl.maxAxis<=0.1,bossId:isBoss?eid:null,phase2:!!(s.battle&&s.battle.enemy&&s.battle.enemy._phase2Done),turn1:(s.battle&&s.battle.turn<=1)});
      GS={...GS,player:wonPl,gold:wonGold+gold,deck:wonDeck,battle:null};
      if(isFinalBoss){GS={...GS,screen:'victory'};hideField();renderScreen();return;}
      if(isBoss){
        const cwIdx=(GS.realmIdx||0);
        if(cwIdx<12){
          const nr2=cwIdx+1;
          const hcP=nr2>=4?Math.floor(nr2*5):0;
          applyClockReward(cwIdx,nr2,hcP,loot,gold);return;
        }
        const nextRealm=(GS.realmIdx||0)+1;
        if(nextRealm>=REALMS.length){GS={...GS,screen:'victory'};hideField();renderScreen();return;}
        // 하드코어: 구역 4 이상부터 클리어 시 패널티
  const hcPenalty=nextRealm>=4?Math.floor(nextRealm*5):0;
  const newAxis=Math.max(1,GS.player.axis-hcPenalty);
  GS={...GS,
    realmIdx:nextRealm,curNode:'s',
    cleared:new Set(['s']),
    realmNodes:buildRealmNodes(nextRealm),
    shopStock:shuffle(SHOP_P).slice(0,4),
    player:{...GS.player,axis:newAxis}
  };
  if(hcPenalty>0)showNotif(`구역 전환 패널티 -${hcPenalty} 축`,CR);
        showRealmBanner(nextRealm,()=>{_battleExitFade(()=>{document.getElementById('root').innerHTML='';showField();setInBattle(false);showNotif(`[${CARDS[loot].name}] 획득! +${gold} 황금`,G);});});
      } else {
        GS={...GS,screen:'field'};
        _battleExitFade(()=>{document.getElementById('root').innerHTML='';showField();setInBattle(false);showNotif(`승리! +${gold} 황금 [${CARDS[loot].name}] 획득`,G);});
      }
    },900);
  }
}

/* ═══════════════════════════════════════════════════════
   REALM BANNER (구역 전환 연출)
═══════════════════════════════════════════════════════ */
function showRealmBanner(idx,cb){
  const r=REALMS[idx];if(!r)return cb&&cb();
  const bn=document.getElementById('realm-banner');
  document.getElementById('rb-num').textContent=r.num;
  document.getElementById('rb-num').style.cssText=`font-size:80px;font-family:'Cinzel Decorative',serif;font-weight:900;background:linear-gradient(155deg,${r.gearClr},#FFF0AA,${r.gearClr}88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 30px ${r.gearClr}88);`;
  document.getElementById('rb-name').textContent=r.name;
  const danger=['안전','경계','위험','극위험','치명','절멸','공포','붕괴','심연','파국','종말'];
  document.getElementById('rb-theme').textContent=r.theme;
  document.getElementById('rb-num').title=`위험도: ${danger[Math.min(idx,danger.length-1)]}`;
  document.getElementById('rb-num').style.filter=`drop-shadow(0 0 30px ${r.gearClr}88)`;
  bn.style.background=`radial-gradient(ellipse at center,${r.bgMid} 0%,#000 100%)`;bn.classList.add('on');
  setTimeout(()=>{bn.classList.remove('on');if(cb)cb();},2800);
}

/* ═══════════════════════════════════════════════════════
   FIELD MODALS
═══════════════════════════════════════════════════════ */


function _nodeEnterFade(line1, line2, cb){
  _tr=false; // doTrans 잠금 해제
  var prev=document.getElementById('_nef_ov');if(prev)prev.remove();

  /* ─ 1: 효과음 즉시 재생 ─ */
  if(typeof SFX!=='undefined')SFX.walk();

  /* ─ 오버레이 (불투명 검정, 처음엔 opacity:0) ─ */
  var ov=document.createElement('div');
  ov.id='_nef_ov';
  ov.style.cssText='position:fixed;inset:0;z-index:9600;background:#000;opacity:0;'+
    'pointer-events:all;transition:opacity 0.9s;';
  document.body.appendChild(ov);

  /* ─ 2: 2.25초 뒤 opacity 1로 → 암전 ─ */
  setTimeout(function(){
    ov.style.opacity='1';

    /* ─ 3: 암전 완료 후 VN 소환 ─ */
    setTimeout(function(){
      if(cb)cb();

      /* ─ 4: 서서히 밝아짐 ─ */
      setTimeout(function(){
        ov.style.transition='opacity 1.05s';
        ov.style.opacity='0';
        setTimeout(function(){ov.remove();},1100);
      },600);
    },940);
  },2250);
}

function _nodeTransFade(cb){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9600;background:#000;opacity:0;pointer-events:all;transition:opacity 0.4s;';
  document.body.appendChild(ov);
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    ov.style.opacity='0.95';
    setTimeout(function(){
      if(cb)cb();
      setTimeout(function(){
        ov.style.transition='opacity 0.5s';ov.style.opacity='0';
        setTimeout(function(){ov.remove();},520);
      },100);
    },430);
  });});
}

function showRestModal(){
  if(typeof achCheck==='function')achCheck('rest',{});
  SFX.riverStart();
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'330px'});
  box.appendChild(mkDiv('evt-title',{},'◇ 휴식 장소'));
  box.appendChild(mkDiv('',{fontSize:'11px',color:'#D4C49A',fontFamily:"'Noto Serif KR',serif",lineHeight:'1.9',textAlign:'center',marginBottom:'16px'},'부서진 톱니바퀴 사이에서\n잠시 숨을 돌릴 수 있다.'));
  [['회복 (축 +30)','gold',()=>{bd.remove();_nodeTransFade(function(){GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+30)}}));updateFUI();showNotif('축 +30 회복','#44BB66');});}],
   ['정비 (톱니 +20)','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,cog:Math.min(100,(s.player.cog||0)+20)}}));updateFUI();bd.remove();showNotif('톱니 +20 획득','#4488FF');}],
   ['방전 해소','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,battery:Math.max(0,(s.player.battery||0)-40)}}));updateFUI();bd.remove();showNotif('방전 -40','#8888FF');}],
   ['떠나다','neutral',()=>bd.remove()],
  ].forEach(([txt,type,fn])=>{const b=mkDiv(`evt-btn evt-btn-${type}`,{},txt);b.onclick=fn;box.appendChild(b);});
  bd.appendChild(box);document.body.appendChild(bd);
}

function showEventModal(){
  const ev=EVENTS[Math.floor(Math.random()*EVENTS.length)]||EVENTS[0];
  if(!ev)return;
  const bd=mkBk();
  const box=mkDiv('evt-box');
  box.appendChild(mkDiv('evt-title',{},`◈ ${ev.title}`));
  box.appendChild(mkDiv('evt-body',{},ev.body));
  ev.options.forEach(opt=>{
    const b=mkDiv(`evt-btn evt-btn-${opt.type}`);
    b.innerHTML=`<span class="evt-tag tag-${opt.type==='danger'?'risk':opt.type==='neutral'?'neutral':'reward'}">${opt.tag}</span>${opt.label}`;
    b.onclick=()=>{
      bd.remove();
      _nodeTransFade(function(){
        const result=opt.fx(GS,(id)=>mkCard(id));
        GS=result.s;updateFUI();
        showNotif(result.msg,opt.type==='danger'?'#FF8888':G);
      });
    };
    box.appendChild(b);
  });
  bd.appendChild(box);document.body.appendChild(bd);
}

function showShopModal(){
  BGM.fadeToShop();
  // 매 방문마다 새 재고 생성 (새로고침 1회)
  const shopKey='shop_'+(GS.realmIdx||0)+'_'+GS.curNode;
  if(!GS.shopStock||GS.shopKey!==shopKey){
    const newCardIds=['snapshot','gutpunch','timebomb','shadowblade','geargrind','voltwave','detonator','bladerain',
      'overcog2','timeguard','ecoguard','adaptshield','nullfield','battlecry','overclock_h2','sacrifice','regenfield',
      'clone','purge2','overclock_draw','mastermind','powercharge','overclock4','battleharden','focusfire',
      'overclock_all','warform','apexstrike','voltblade','chainsaw','deathmark','wrathstrike','ricochet',
      'timecut','doubleedge','voidstrike','chronosheart','apocalypse'];
    const weighted=[];
    SHOP_P.forEach(e=>{const w=newCardIds.includes(e.id)?3:1;for(let i=0;i<w;i++)weighted.push(e);});
    const shuf=a=>[...a].sort(()=>Math.random()-.5);
    GS={...GS,shopStock:shuf(weighted).slice(0,6),shopKey,shopRefreshed:false,clockUnlocked:0,endingPhase:0};
  }
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('',{background:DOB,borderRadius:'10px',padding:'16px',width:'100%',maxWidth:'390px',maxHeight:'90vh',display:'flex',flexDirection:'column'});
  box.style.border=`1px solid rgba(255,215,0,.25)`;
  box.appendChild(mkDiv('',{textAlign:'center',color:G,fontFamily:"'Cinzel',serif",fontSize:'14px',fontWeight:'900',marginBottom:'4px',letterSpacing:'.2em'},'상점'));
  const goldEl=mkDiv('',{textAlign:'center',color:DG,fontFamily:"'Share Tech Mono',monospace",fontSize:'9px',marginBottom:'10px'},'황금: '+GS.gold);
  box.appendChild(goldEl);
  const scrollArea=document.createElement('div');
  scrollArea.style.cssText='flex:1;overflow-y:auto;';
  box.appendChild(scrollArea);
  function renderStock(){
    scrollArea.innerHTML='';
    const grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,90px);justify-content:center;gap:10px;margin-bottom:10px;';
    (GS.shopStock||[]).forEach(entry=>{
      const c=CARDS[entry.id];if(!c)return;
      const price=entry.p||50;
      const wrap=document.createElement('div');
      wrap.style.cssText='position:relative;cursor:pointer;';
      const ce=mkCardEl(c,false);
      ce.style.height='120px';
      // 가격 태그
      const pTag=document.createElement('div');
      pTag.style.cssText='position:absolute;bottom:0;left:0;right:0;text-align:center;'+
        'background:rgba(0,0,0,.85);font-size:8px;color:'+G+';font-family:"Share Tech Mono",monospace;'+
        'padding:3px 0;font-weight:700;';
      pTag.textContent=price+'G';
      wrap.appendChild(ce);wrap.appendChild(pTag);
      wrap.onclick=()=>{
        if(GS.gold<price){showNotif('황금이 부족하다',CR);return;}
        GS=upd(GS,s=>({...s,gold:s.gold-price,shopStock:(s.shopStock||[]).filter(e2=>e2!==entry)}));
        GS=upd(GS,s=>addCardSafe(s,mkCard(entry.id)));
        goldEl.textContent='황금: '+GS.gold;updateFUI();renderStock();
      };
      grid.appendChild(wrap);
    });
    scrollArea.appendChild(grid);
    if(!GS.shopRefreshed){
      const rb=document.createElement('button');
      rb.textContent='재고 새로고침 (1회)';
      rb.style.cssText='width:100%;padding:6px;border:1px solid rgba(255,215,0,.2);border-radius:4px;'+
        'background:transparent;color:#666;font-family:"Share Tech Mono",monospace;font-size:8px;cursor:pointer;margin-bottom:6px;';
      rb.onclick=()=>{
        const shuf=a=>[...a].sort(()=>Math.random()-.5);
        GS={...GS,shopRefreshed:true,shopStock:shuf([...SHOP_P]).slice(0,6)};
        renderStock();
      };
      scrollArea.appendChild(rb);
    }
  }
  renderStock();
  const cl=mkDiv('',{textAlign:'center',color:'#555',cursor:'pointer',marginTop:'6px',fontFamily:"'Share Tech Mono',monospace",fontSize:'8px',letterSpacing:'.1em'},'닫기');
  cl.onclick=()=>{BGM.playMap();bd.remove();};
  box.appendChild(cl);
  bd.appendChild(box);document.body.appendChild(bd);
}


/* ── 신규 노드 모달 8종 ── */

// ① 암시장 — 희귀 카드 3장 선택 구매 (가격 높음)
function showBlackmarketModal(){
  BGM.fadeToShop();
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'380px',maxHeight:'92vh',display:'flex',flexDirection:'column'});
  box.appendChild(mkDiv('evt-title',{},'◈ 암시장'));
  box.appendChild(mkDiv('',{fontSize:'9px',color:'#AA8800',fontFamily:"'Noto Serif KR',serif",textAlign:'center',marginBottom:'12px'},
    '이곳의 거래는 되돌릴 수 없다.\n전설과 유물 등급만 취급한다.'));

  const goldEl=mkDiv('',{textAlign:'center',color:DG,fontFamily:"'Share Tech Mono',monospace",fontSize:'9px',marginBottom:'10px'},'황금: '+GS.gold);
  box.appendChild(goldEl);

  // 전설/유물 카드 전용 풀 + 새 카드 우선
  const newIds=['annihilate','timerewind','deathmark','clockstop','apexstrike','mastermind',
    'nullfield','overclock4','void_echo','time_recall','abyss_gaze','paradox_strike',
    'overclock_h2','focusfire','warform','powercharge','battleharden','overclock_all',
    'detonator','bladerain','adaptshield','gutpunch','timebomb','shadowblade','voltwave'];
  const legPool=SHOP_P.filter(e=>{
    const c=CARDS[e.id];return c&&(c.rarity==='전설'||c.rarity==='유물');
  });
  const shuf=a=>[...a].sort(()=>Math.random()-.5);
  // 새 카드 3배 가중치
  const weighted=[];
  legPool.forEach(e=>{const w=newIds.includes(e.id)?3:1;for(let i=0;i<w;i++)weighted.push(e);});
  const stock=shuf(weighted).slice(0,3+Math.floor(Math.random()*3)); // 3~5개

  const scrollArea=document.createElement('div');
  scrollArea.style.cssText='flex:1;overflow-y:auto;';
  box.appendChild(scrollArea);

  function renderBMStock(){
    scrollArea.innerHTML='';
    if(!stock.length){
      scrollArea.appendChild(mkDiv('',{color:'#444',fontSize:'10px',textAlign:'center',padding:'20px'},'재고 없음'));
    } else {
      const grid=document.createElement('div');
      grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,90px);justify-content:center;gap:10px;margin-bottom:10px;';
      stock.forEach((entry,idx)=>{
        const c=CARDS[entry.id];if(!c)return;
        // 암시장 가격: 전설 80~120, 유물 100~150
        const base=c.rarity==='유물'?130:90;
        const price=base+Math.floor(Math.random()*30);
        const wrap=document.createElement('div');
        wrap.style.cssText='position:relative;cursor:pointer;';
        const ce=mkCardEl(c,false);ce.style.height='120px';
        // 가격 태그
        const pTag=document.createElement('div');
        pTag.style.cssText='position:absolute;bottom:0;left:0;right:0;text-align:center;'+
          'background:rgba(0,0,0,.85);font-size:8px;color:'+G+';font-family:"Share Tech Mono",monospace;'+
          'padding:3px 0;font-weight:700;border-top:1px solid rgba(255,215,0,.2);';
        pTag.textContent=price+'G ◈';
        wrap.appendChild(ce);wrap.appendChild(pTag);
        wrap.onclick=()=>{
          if(GS.gold<price){showNotif('황금이 부족하다',CR);return;}
          GS=upd(GS,s=>({...s,gold:s.gold-price}));
          GS=upd(GS,s=>addCardSafe(s,mkCard(entry.id)));
          stock.splice(idx,1);
          goldEl.textContent='황금: '+GS.gold;updateFUI();renderBMStock();
        };
        grid.appendChild(wrap);
      });
      scrollArea.appendChild(grid);
    }
  }
  renderBMStock();

  const cl=mkDiv('',{textAlign:'center',color:'#555',cursor:'pointer',marginTop:'8px',
    fontFamily:"'Share Tech Mono',monospace",fontSize:'8px',letterSpacing:'.1em'},'떠난다');
  cl.onclick=()=>{BGM.playMap();bd.remove();};box.appendChild(cl);
  bd.appendChild(box);document.body.appendChild(bd);
}

// ② 기습 — 적 기습, 선공 없이 전투 돌입 (에너지 -1)
function showAmbushBattle(enemyId){
  GS=upd(GS,s=>({...s,player:{...s.player}}));
  doTrans(()=>{hideField();
    const e=ENM[enemyId]||(()=>{const k=Object.keys(ENM)[0];return ENM[k];})();
    if(!e||!e.id)return;
    startBattle(e.id);
    // 기습: 첫 턴 에너지 -1
    if(GS.battle)GS={...GS,battle:{...GS.battle,energy:Math.max(0,GS.battle.energy-1)}};
    showNotif('기습! 에너지 -1',CR);
  });
}

// ③ 폐기장 — 덱에서 카드 1장 파괴 (영구), 황금 보상
function showSalvageModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'370px'});
  box.appendChild(mkDiv('evt-title',{},'⛏ 폐기장'));
  box.appendChild(mkDiv('',{fontSize:'9px',color:'#886633',fontFamily:"'Noto Serif KR',serif",
    lineHeight:'2',textAlign:'center',marginBottom:'14px'},
    '파괴된 것들은 돌아오지 않는다.\n하지만 그 자리에 더 강한 것이 들어온다.'));

  const rarityGold={일반:15,희귀:30,고급:60,전설:100,유물:150};
  const rarityLabel={일반:'일반',희귀:'희귀',고급:'고급',전설:'전설',유물:'유물'};

  // 모드 1: 선택 파괴 — 카드 선택 + 황금 + 보너스 선택
  const makeBtn=(lbl,detail,clr,fn)=>{
    const b=document.createElement('div');
    b.style.cssText='padding:10px 14px;border:1px solid '+clr+'44;border-radius:6px;'+
      'margin-bottom:6px;cursor:pointer;transition:background .12s;';
    b.onmouseenter=()=>b.style.background=clr+'16';
    b.onmouseleave=()=>b.style.background='';
    const t=mkDiv('',{fontSize:'10px',color:clr,fontFamily:"'Share Tech Mono',monospace",fontWeight:'700'},lbl);
    const d=mkDiv('',{fontSize:'8px',color:'#555',fontFamily:"'Noto Serif KR',serif",marginTop:'3px'},detail);
    b.appendChild(t);b.appendChild(d);b.onclick=fn;return b;
  };

  // 모드: 카드 선택 파괴
  box.appendChild(makeBtn('카드 녹이기',
    '선택한 카드 파괴 → 황금 획득 + 보너스 선택 (HP/에너지/카드)','#FFCC00',()=>{
      bd.remove();showSalvageSelectMode();
    }));

  // 모드: 무작위 파괴 (더 많은 황금)
  box.appendChild(makeBtn('강제 경매',
    '무작위 카드 파괴 → 황금 2배 + 임시 버프','#FF8800',()=>{
      if(!GS.deck.length){showNotif('덱이 비어있다',CR);return;}
      const idx=Math.floor(Math.random()*GS.deck.length);
      const card=GS.deck[idx];
      const gold=(rarityGold[card.rarity]||20)*2;
      GS=upd(GS,s=>({...s,gold:s.gold+gold,deck:s.deck.filter((_,i)=>i!==idx)}));
      // 임시 버프 (이번 전투 피해+5)
      showNotif('['+card.name+'] 강제 매각 +'+gold+'G. 다음 전투 피해+5',G);
      GS={...GS,_nextBattleDmgBonus:(GS._nextBattleDmgBonus||0)+5};
      bd.remove();
    }));

  // 모드: 3장 대량 파괴 → 랜덤 고급 카드 1장
  box.appendChild(makeBtn('대량 처분',
    '카드 3장 파괴 → 랜덤 고급/전설 카드 1장 획득','#AA44FF',()=>{
      if(GS.deck.length<3){showNotif('카드가 3장 미만',CR);return;}
      // 3장 선택 화면
      bd.remove();showSalvageBulkMode();
    }));

  const cl=mkDiv('evt-btn evt-btn-neutral',{},'그냥 떠난다');cl.onclick=()=>bd.remove();box.appendChild(cl);
  bd.appendChild(box);document.body.appendChild(bd);
}

function showForgeModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'360px'});
  const modes=[
    {title:'⚒ 구축소 — 카드 강화',body:'선택한 카드의 비용을 1 낮춘다. 강화된 카드는 이름에 + 가 붙는다.',mode:'upgrade'},
    {title:'⚒ 구축소 — 이중 단련',body:'카드 하나를 두 번 강화한다. 비용 -2. 하지만 덱에서 랜덤 카드 1장 소각.',mode:'double'},
    {title:'⚒ 구축소 — 황금 단련',body:'황금 30을 내면 원하는 카드를 강화해준다.',mode:'paid'},
    {title:'⚒ 구축소 — 전면 강화',body:'덱의 모든 카드 비용을 1씩 낮춘다. 하지만 최대 축 -10.',mode:'all'},
    {title:'⚒ 구축소 — 복제 단련',body:'강화하는 대신 카드를 복제한다. 덱에 같은 카드가 하나 더 들어간다.',mode:'copy'},
  ];
  const m=modes[Math.floor(Math.random()*modes.length)]||modes[0];
  if(!m)return;
  box.appendChild(mkDiv('evt-title',{},m.title||''));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#6688AA',fontFamily:"'Noto Serif KR',serif",lineHeight:'1.8',textAlign:'center',marginBottom:'12px'},m.body));

  const upgradeable=GS.deck.filter(c=>!c.upgraded);

  if(m.mode==='upgrade'){
    if(!upgradeable.length){box.appendChild(mkDiv('',{color:'#555',fontSize:'10px',textAlign:'center'},'강화 가능한 카드가 없다.'));bd.appendChild(box);document.body.appendChild(bd);return;}
    const grid=mkDiv('',{display:'flex',flexWrap:'wrap',gap:'7px',justifyContent:'center',maxHeight:'240px',overflowY:'auto',marginBottom:'12px'});
    GS.deck.forEach((card,i)=>{
      if(card.upgraded)return;
      const wrap=mkDiv('',{cursor:'pointer'});
      const ce=mkCardEl(card,false);ce.style.cssText+='width:64px;height:90px;';
      wrap.appendChild(ce);
      wrap.onclick=()=>{const up={...card,upgraded:true,cost:Math.max(0,(card.cost||1)-1),name:card.name+'+'};GS=upd(GS,s=>({...s,deck:s.deck.map((c,j)=>j===i?up:c)}));updateFUI();bd.remove();showNotif('['+card.name+'+] 강화',G);};
      grid.appendChild(wrap);
    });
    box.appendChild(grid);
  } else if(m.mode==='double'){
    if(!upgradeable.length){box.appendChild(mkDiv('',{color:'#555',fontSize:'10px',textAlign:'center'},'강화 가능한 카드가 없다.'));bd.appendChild(box);document.body.appendChild(bd);return;}
    const grid=mkDiv('',{display:'flex',flexWrap:'wrap',gap:'7px',justifyContent:'center',maxHeight:'240px',overflowY:'auto',marginBottom:'12px'});
    GS.deck.forEach((card,i)=>{
      if(card.upgraded)return;
      const wrap=mkDiv('',{cursor:'pointer'});
      const ce=mkCardEl(card,false);ce.style.cssText+='width:64px;height:90px;';
      wrap.appendChild(ce);
      wrap.onclick=()=>{const up={...card,upgraded:true,cost:Math.max(0,(card.cost||1)-2),name:card.name+'++'};let newDeck=GS.deck.map((c,j)=>j===i?up:c);if(newDeck.length>1){const ri=Math.floor(Math.random()*newDeck.length);const lost=newDeck[ri];newDeck=newDeck.filter((_,j)=>j!==ri);showNotif('['+card.name+'++] 이중 강화. ['+lost.name+'] 소각.',G);}GS=upd(GS,s=>({...s,deck:newDeck}));updateFUI();bd.remove();};
      grid.appendChild(wrap);
    });
    box.appendChild(grid);
  } else if(m.mode==='paid'){
    const btn=mkDiv('evt-btn evt-btn-gold',{},`황금 30 지불하고 강화 (${(GS.gold||0)>=30?'가능':'황금 부족'})`);
    btn.onclick=()=>{if((GS.gold||0)<30){showNotif('황금이 부족하다',DG);return;}if(!upgradeable.length){showNotif('강화 가능 카드 없음',DG);return;}const card=upgradeable[Math.floor(Math.random()*upgradeable.length)];const idx=GS.deck.findIndex(c=>c.uid===card.uid);const up={...card,upgraded:true,cost:Math.max(0,(card.cost||1)-1),name:card.name+'+'};GS=upd(GS,s=>({...s,gold:s.gold-30,deck:s.deck.map((c,i)=>i===idx?up:c)}));updateFUI();bd.remove();showNotif('황금 -30. ['+card.name+'+] 강화',G);};
    box.appendChild(btn);
  } else if(m.mode==='all'){
    const btn=mkDiv('evt-btn evt-btn-danger',{},'전체 강화 (최대 축 -10)');
    btn.onclick=()=>{GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:Math.max(20,s.player.maxAxis-10)},deck:s.deck.map(c=>({...c,cost:Math.max(0,(c.cost||1)-1)}))}));updateFUI();bd.remove();showNotif('전체 비용 -1. 최대 축 -10.',G);};
    box.appendChild(btn);
  } else {
    // copy
    const grid=mkDiv('',{display:'flex',flexWrap:'wrap',gap:'7px',justifyContent:'center',maxHeight:'240px',overflowY:'auto',marginBottom:'12px'});
    GS.deck.forEach((card)=>{
      const wrap=mkDiv('',{cursor:'pointer'});
      const ce=mkCardEl(card,false);ce.style.cssText+='width:64px;height:90px;';
      wrap.appendChild(ce);
      wrap.onclick=()=>{if(GS.deck.length>=25){showNotif('덱이 가득 찼다',DG);return;}GS=upd(GS,s=>({...s,deck:[...s.deck,mkCard(card.id)]}));updateFUI();bd.remove();showNotif('['+card.name+'] 복제',G);};
      grid.appendChild(wrap);
    });
    box.appendChild(grid);
  }
  const cl=mkDiv('evt-btn evt-btn-neutral',{},'떠난다');
  cl.onclick=()=>bd.remove();box.appendChild(cl);bd.appendChild(box);document.body.appendChild(bd);
}

function showClinicModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  // 랜덤 시나리오 선택
  const scenarios=[
    {title:'⚕ 의료실 — 기본 처치',body:'낡은 기계가 당신의 손상을 인식한다. 두 가지를 선택할 수 있다.',pick:2,opts:[
      ['완전 회복 (축+50)','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+50)}}));showNotif('축 +50',G);}],
      ['최대 축+10','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:s.player.maxAxis+10,axis:Math.min(s.player.maxAxis+10,s.player.axis+10)}}));showNotif('최대 축 +10',G);}],
      ['방전 완전 해소','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,battery:0}}));showNotif('방전 해소',G);}],
      ['톱니 +30','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,cog:Math.min(100,(s.player.cog||0)+30)}}));showNotif('톱니 +30',G);}],
    ]},
    {title:'⚕ 의료실 — 긴급 수혈',body:'심각한 손상 감지. 즉각 처치가 필요하다. 하나를 선택하라.',pick:1,opts:[
      ['축 80 즉각 회복 (대신 방전+20)','danger',()=>{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+80),battery:Math.min(100,(s.player.battery||0)+20)}}));showNotif('축 +80, 방전 +20',G);}],
      ['최대 축+20, 현재 축+20','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:s.player.maxAxis+20,axis:Math.min(s.player.maxAxis+20,s.player.axis+20)}}));showNotif('최대/현재 축 +20',G);}],
      ['속도+2, 축+25','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,speed:s.player.speed+2,axis:Math.min(s.player.maxAxis,s.player.axis+25)}}));showNotif('속도 +2, 축 +25',G);}],
    ]},
    {title:'⚕ 의료실 — 기계 이식 제안',body:'의료 기계가 특수 이식을 제안한다. 하지만 대가가 따른다.',pick:1,opts:[
      ['에너지 이식 (최대에너지+1, 방전+30)','danger',()=>{GS=upd(GS,s=>({...s,player:{...s.player,maxEnergy:(s.player.maxEnergy||3)+1,battery:Math.min(100,(s.player.battery||0)+30)}}));showNotif('최대 에너지 +1, 방전 +30',G);}],
      ['장갑 이식 (최대 축+20)','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:s.player.maxAxis+20,axis:s.player.axis+20}}));showNotif('최대 축 +20',G);}],
      ['이식 거부 — 그냥 축 회복만 (+30)','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+30)}}));showNotif('축 +30',G);}],
    ]},
    {title:'⚕ 의료실 — 실험적 처치',body:'847년간 운영된 기계가 새로운 처치법을 제안한다. 결과는 불확실하다.',pick:1,opts:[
      ['실험 처치 (완전 랜덤)','danger',()=>{const r=Math.random();if(r<0.4){GS=upd(GS,s=>({...s,player:{...s.player,axis:s.player.maxAxis}}));showNotif('완전 회복!',G);}else if(r<0.7){GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:s.player.maxAxis+15,speed:s.player.speed+2}}));showNotif('최대 축+15, 속도+2',G);}else{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.max(1,s.player.axis-20)}}));showNotif('실험 실패. 축 -20',CR);}}],
      ['안전한 처치 (축+40)','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+40)}}));showNotif('축 +40',G);}],
    ]},
    {title:'⚕ 의료실 — 특수 재활',body:'재활 프로그램이 가동됐다. 세 가지 중 두 가지를 선택할 수 있다.',pick:2,opts:[
      ['축+35 회복','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+35)}}));showNotif('축 +35',G);}],
      ['방전 -45','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,battery:Math.max(0,(s.player.battery||0)-45)}}));showNotif('방전 -45',G);}],
      ['속도+3 (3턴)','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,speed:s.player.speed+3}}));showNotif('속도 +3',G);}],
      ['덱 카드 1장 강화 (비용-1)','gold',()=>{const c=GS.deck.find(x=>!x.upgraded);if(c){GS=upd(GS,s=>({...s,deck:s.deck.map(x=>x.uid===c.uid?{...x,upgraded:true,cost:Math.max(0,x.cost-1),name:x.name+'+'}:x)}));showNotif('['+c.name+'+] 강화',G);}else showNotif('강화 가능 카드 없음',DG);}],
    ]},
  ];
  const sc=scenarios[Math.floor(Math.random()*scenarios.length)]||scenarios[0];
  if(!sc)return;
  box.appendChild(mkDiv('evt-title',{},sc.title||''));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#339966',fontFamily:"'Noto Serif KR',serif",lineHeight:'1.9',textAlign:'center',marginBottom:'14px'},sc.body));
  if(sc.pick>1){const note=mkDiv('',{fontSize:'8px',color:'#444',textAlign:'center',marginBottom:'8px',fontFamily:"'Share Tech Mono',monospace"});note.textContent=`${sc.pick}가지 선택 가능`;box.appendChild(note);}
  let chosen=0;
  sc.opts.forEach(([txt,type,fn])=>{
    const b=mkDiv(`evt-btn evt-btn-${type}`,{},txt);
    b.onclick=()=>{fn();chosen++;if(chosen>=sc.pick){bd.remove();updateFUI();}else{b.style.opacity='.3';b.style.pointerEvents='none';}};
    box.appendChild(b);
  });
  bd.appendChild(box);document.body.appendChild(bd);
}

function showImplantModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'340px'});
  box.appendChild(mkDiv('evt-title',{},'◉ 이식소'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#9944CC',fontFamily:"'Noto Serif KR',serif",lineHeight:'1.9',textAlign:'center',marginBottom:'14px'},'기계를 당신에게 이식한다. 이것은 되돌릴 수 없다.'));
  [
    ['시간 기어 이식 (최대 에너지 +1)','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,maxEnergy:(s.player.maxEnergy||3)+1}}));showNotif('최대 에너지 +1',G);}],
    ['강화 외골격 (최대 축 +20)','gold',()=>{GS=upd(GS,s=>({...s,player:{...s.player,maxAxis:s.player.maxAxis+20,axis:s.player.axis+20}}));showNotif('최대 축 +20',G);}],
    ['속도 조율 (속도 +2)','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,speed:(s.player.speed||5)+2}}));showNotif('속도 +2',G);}],
    ['피해 증폭기 (공격 배율 1.15×)','neutral',()=>{GS=upd(GS,s=>({...s,player:{...s.player,dmgMult:(s.player.dmgMult||1)*1.15}}));showNotif('공격 배율 ×1.15',G);}],
  ].forEach(([txt,type,fn])=>{
    const b=mkDiv(`evt-btn evt-btn-${type}`,{},txt);
    b.onclick=()=>{fn();updateFUI();bd.remove();};
    box.appendChild(b);
  });
  bd.appendChild(box);document.body.appendChild(bd);
}

// ⑦ 심연 — 랜덤 효과 (좋음 or 나쁨 반반)
function showAbyssModal(){
  const bd=mkBk(e=>{if(e.target===bd)bd.remove();});
  const box=mkDiv('evt-box',{maxWidth:'320px'});
  box.appendChild(mkDiv('evt-title',{},'▽ 심연'));
  box.appendChild(mkDiv('',{fontSize:'10px',color:'#AAA',fontFamily:"'Noto Serif KR',serif",lineHeight:'2',textAlign:'center',marginBottom:'16px'},'심연은 무엇이든 돌려준다. 아니면 앗아간다.'));
  const plunge=mkDiv('evt-btn evt-btn-gold',{},'심연에 발을 디딘다');
  plunge.onclick=()=>{
    const outcomes=[
      ()=>{GS=upd(GS,s=>({...s,gold:(s.gold||0)+rng(60,120)}));showNotif(`황금 +${rng(60,120)} 발견`,G);},
      ()=>{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.min(s.player.maxAxis,s.player.axis+40)}}));showNotif('축 +40 회복',G);},
      ()=>{const id=shuffle(SHOP_P)[0].id;GS=upd(GS,s=>({...s,deck:[...s.deck,mkCard(id)]}));showNotif(`[${CARDS[id]?.name}] 획득`,G);},
      ()=>{GS=upd(GS,s=>({...s,player:{...s.player,axis:Math.max(1,s.player.axis-rng(20,35))}}));showNotif(`축 -${rng(20,35)} 대가`,CR);},
      ()=>{GS=upd(GS,s=>({...s,gold:Math.max(0,(s.gold||0)-rng(30,60))}));showNotif(`황금 손실`,CR);},
      ()=>{const ri=Math.floor(Math.random()*GS.deck.length);if(ri>=0)GS=upd(GS,s=>({...s,deck:s.deck.filter((_,i)=>i!==ri)}));showNotif('카드 1장 소멸',CR);},
    ];
    outcomes[Math.floor(Math.random()*outcomes.length)]();
    updateFUI();bd.remove();
  };
  box.appendChild(plunge);
  box.appendChild(mkDiv(`evt-btn evt-btn-neutral`,{},'물러선다')).onclick=()=>bd.remove();
  bd.appendChild(box);document.body.appendChild(bd);
}
// 유물 시스템 — 착용(최대 5개) + 보관함(최대 10개)
// 유물은 착용 시 대가(패널티)가 있지만 강력한 버프 제공

const RELICS = [
  // ── 전투 강화 유물 ──
  {id:'relic_gear_heart', name:'기어의 심장', rarity:'희귀',
   desc:'매 턴 시작 시 에너지 +1.',
   cost:'매 턴 방전 +8.',
   clr:'#FFAA00',
   onTurnStart:(gs)=>({...gs, energy:(gs.energy||0)+1, player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+8)}}),
  },
  {id:'relic_iron_core', name:'철의 코어', rarity:'영웅',
   desc:'전투 시작 시 톱니 +25.',
   cost:'최대 HP -15.',
   clr:'#4488BB',
   onBattleStart:(gs)=>({...gs, player:{...gs.player, maxAxis:Math.max(30,gs.player.maxAxis-15), cog:(gs.player.cog||0)+25}}),
  },
  {id:'relic_blood_pact', name:'피의 서약', rarity:'희귀',
   desc:'공격 카드 피해 +4.',
   cost:'매 턴 HP -4.',
   clr:'#CC2200',
   dmgBonus:{type:'공격', bonus:4},
   onTurnStart:(gs)=>({...gs, player:{...gs.player, axis:Math.max(1,gs.player.axis-4)}}),
  },
  {id:'relic_void_eye', name:'공허의 눈', rarity:'전설',
   desc:'크리티컬 확률 +15%, 배율 +0.3.',
   cost:'방어 카드 효과 -5.',
   clr:'#9900CC',
   critBonus:{rate:0.15, mult:0.3},
  },
  {id:'relic_chrono_lens', name:'시간의 렌즈', rarity:'영웅',
   desc:'매 전투 시작 시 패 +2장 드로우.',
   cost:'최대 에너지 -1.',
   clr:'#4466CC',
   onBattleStart:(gs)=>{gs=drawN(gs,2);return {...gs, maxEnergy:Math.max(1,gs.maxEnergy-1), energy:Math.min(gs.maxEnergy-1,gs.energy)};},
  },
  {id:'relic_decay_mark', name:'부식의 낙인', rarity:'희귀',
   desc:'매 턴 적에게 상처 1 자동 부여.',
   cost:'매 턴 자신도 방전 +5.',
   clr:'#886622',
   onTurnEnd:(gs)=>{gs=addStack(gs,'enemy','wound',1);return {...gs, player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+5)}};},
  },
  {id:'relic_mirror_soul', name:'거울 영혼', rarity:'영웅',
   desc:'받은 피해의 25%를 적에게 반사.',
   cost:'회복 카드 효과 -8.',
   clr:'#88AAFF',
   reflectRatio:0.25,
  },
  {id:'relic_storm_core', name:'폭풍의 코어', rarity:'전설',
   desc:'방전이 50 이상일 때 모든 피해 +6.',
   cost:'방전이 80 이상이면 매 턴 HP -8.',
   clr:'#FFCC00',
   onDmg:(gs,v)=>(gs.player.battery||0)>=50?v+6:v,
   onTurnStart:(gs)=>(gs.player.battery||0)>=80?{...gs,player:{...gs.player,axis:Math.max(1,gs.player.axis-8)}}:gs,
  },
  {id:'relic_ancient_cog', name:'고대의 기어', rarity:'영웅',
   desc:'전투 종료 시 HP +20 회복.',
   cost:'전투 시작 시 톱니 0으로 초기화.',
   clr:'#AA7700',
   onBattleStart:(gs)=>({...gs,player:{...gs.player,cog:0}}),
   onBattleEnd:(gs)=>doHeal(gs,'player',20),
  },
  {id:'relic_phantom_blade', name:'유령 검', rarity:'전설',
   desc:'공격 후 30% 확률로 추가 타격 (피해의 50%).',
   cost:'방어 카드 비용 +1.',
   clr:'#CC44AA',
   procChance:0.3,
  },
  {id:'relic_time_fragment', name:'시간 조각', rarity:'희귀',
   desc:'매 3턴마다 에너지 +2.',
   cost:'1턴과 2턴은 에너지 -1.',
   clr:'#4488CC',
   onTurnStart:(gs)=>{const t=gs.turn||0;if(t%3===0)return{...gs,energy:gs.energy+2};if(t%3!==0&&t>0)return{...gs,energy:Math.max(0,gs.energy-1)};return gs;},
  },
  {id:'relic_death_mark', name:'죽음의 각인', rarity:'전설',
   desc:'적 HP 20% 미만 시 모든 피해 2배.',
   cost:'자신 HP 30% 미만 시 받는 피해 +4.',
   clr:'#FF0000',
   condDmgBonus:{enemyBelowRatio:0.2, mult:2},
  },
  {id:'relic_scrap_heart', name:'고철 심장', rarity:'희귀',
   desc:'카드를 버릴 때마다 HP +3.',
   cost:'드로우 패 -1장.',
   clr:'#887755',
   onDiscard:(gs)=>doHeal(gs,'player',3),
   drawPenalty:-1,
  },
  {id:'relic_volt_mantle', name:'전압 망토', rarity:'영웅',
   desc:'방전이 증가할 때마다 적에게 2 피해.',
   cost:'최대 HP -20.',
   clr:'#FFDD00',
   onBattleStart:(gs)=>({...gs,player:{...gs.player,maxAxis:Math.max(1,gs.player.maxAxis-20)}}),
  },
  {id:'relic_gear_spine',name:'기어 척추',rarity:'영웅',
   desc:'방어 카드 효과 +5.',cost:'공격 카드 비용 +1.',clr:'#4466AA',
   shieldBonus:5},
  {id:'relic_cursed_eye',name:'저주받은 눈',rarity:'희귀',
   desc:'매 턴 적에게 과부하 1 부여.',cost:'자신도 방전 +5.',clr:'#662244',
   onTurnEnd:(gs)=>{gs=addStack(gs,'enemy','ol',1);return{...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+5)}};}},
  {id:'relic_clockwork_arm',name:'태엽 팔',rarity:'영웅',
   desc:'공격 시 추가 상처 1.',cost:'방어 카드 효과 -3.',clr:'#CC5500'},
  {id:'relic_dead_star',name:'죽은 별',rarity:'전설',
   desc:'처음 받는 치명타 무효화.',cost:'최대 HP -25.',clr:'#334466',
   onBattleStart:(gs)=>({...gs,player:{...gs.player,maxAxis:Math.max(1,gs.player.maxAxis-25)},_nullFirstCrit:true})},
  {id:'relic_rusty_gear',name:'녹슨 기어',rarity:'일반',
   desc:'전투 시작 시 황금 +15.',cost:'최대 에너지 -1.',clr:'#886633',
   onBattleStart:(gs)=>{setTimeout(()=>{GS={...GS,gold:(GS.gold||0)+15};updateFUI();},0);return{...gs,maxEnergy:Math.max(1,gs.maxEnergy-1)};}},
  {id:'relic_time_crystal',name:'시간 결정',rarity:'전설',
   desc:'매 5턴마다 패 전체 회수.',cost:'방전 +20 즉시.',clr:'#4488FF',
   onBattleStart:(gs)=>({...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+20)}}),
   onTurnStart:(gs)=>gs.turn>0&&gs.turn%5===0?{...gs,hand:[...gs.hand,...gs.disc],disc:[]}:gs},
  {id:'relic_wound_badge',name:'상처 훈장',rarity:'희귀',
   desc:'상처를 받을 때마다 공격력 +1.',cost:'체력 회복 -3.',clr:'#AA2233'},
  {id:'relic_echo_core',name:'메아리 코어',rarity:'영웅',
   desc:'콤보 발동 시 에너지 +1.',cost:'방전 +8.',clr:'#8844BB',
   onCombo:(gs)=>({...gs,energy:Math.min(gs.maxEnergy+1,gs.energy+1),player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+8)}})},
  {id:'relic_iron_will',name:'강철 의지',rarity:'희귀',
   desc:'HP 20% 이하일 때 받는 피해 -4.',cost:'HP 50% 이상일 때 피해 +2.',clr:'#334477'},
  {id:'relic_void_core',name:'공허 코어',rarity:'전설',
   desc:'전투 시작 시 덱 섞기. 첫 5장 드로우.',cost:'최대 HP -30.',clr:'#550088',
   onBattleStart:(gs)=>{gs={...gs,player:{...gs.player,maxAxis:Math.max(1,gs.player.maxAxis-30)}};gs={...gs,draw:[...gs.draw,...gs.hand,...gs.disc],hand:[],disc:[]};return drawN(gs,5);}},
  {id:'relic_eternal_flame', name:'영원의 불꽃', rarity:'전설',
   desc:'매 턴 방전이 완전히 해소되고 HP +10.',
   cost:'최대 에너지 -2.',
   clr:'#FF6600',
   onTurnStart:(gs)=>{gs=doHeal(gs,'player',10);return {...gs,player:{...gs.player,battery:0}};},
   onBattleStart:(gs)=>({...gs,maxEnergy:Math.max(1,gs.maxEnergy-2)})
  },
  // ── 톱니/방어막 아키타입 ──
  {id:'rl_cog_engine',cost:'방전 소비 없음',name:'기어 엔진',rarity:'희귀',tag:'gear',clr:'#FFAA00',
   desc:'방어막 카드 사용 시 방전 +15.',
   onCardPlay:(gs,card)=>card.type==='방어'?{...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+15)}}:gs},
  {id:'rl_iron_will',cost:'없음',name:'철의 의지',rarity:'희귀',tag:'gear',clr:'#AAAAFF',
   desc:'방어막이 30 이상이면 모든 피해 -3.',
   onDamage:(gs,amt)=>((gs.player.cog||0)>=30?Math.max(0,amt-3):amt)},
  {id:'rl_gear_wall',cost:'없음',name:'기어 장벽',rarity:'영웅',tag:'gear',clr:'#FFCC00',
   desc:'매 전투 시작 시 방어막 +15.',
   onBattleStart:(gs)=>({...gs,player:{...gs.player,cog:(gs.player.cog||0)+15}})},
  {id:'rl_thorns',cost:'방어막 소모 없음',name:'역가시',rarity:'영웅',tag:'gear',clr:'#FF6600',
   desc:'방어막이 피해를 막을 때 그 양의 30%를 적에게 반사.',
   passive:true},
  {id:'rl_fortress_core',cost:'방어막 50 유지 필요',name:'요새 코어',rarity:'전설',tag:'gear',clr:'#FFD700',
   desc:'방어막이 50 이상이면 공격 카드 피해 +40%.',
   onCardPlay:(gs,card)=>card.type==='공격'&&(gs.player.cog||0)>=50?{...gs,_comboDmgMult:((gs._comboDmgMult||1)*1.4)}:gs},

  // ── 과부하 아키타입 ──
  {id:'rl_overload_lens',cost:'없음',name:'과부하 렌즈',rarity:'희귀',tag:'overload',clr:'#FF4400',
   desc:'과부하 스택 2 이상이면 공격력 +20%.',
   passive:true},
  {id:'rl_static_core',cost:'전투 시작 과부하 +2',name:'정전기 코어',rarity:'희귀',tag:'overload',clr:'#FF8800',
   desc:'전투 시작 시 과부하 +2.',
   onBattleStart:(gs)=>({...gs,player:{...gs.player,stacks:{...(gs.player.stacks||{}),ol:((gs.player.stacks||{}).ol||0)+2}}})},
  {id:'rl_discharge_gem',cost:'없음',name:'방전 보석',rarity:'영웅',tag:'overload',clr:'#FFAA44',
   desc:'과부하 스택이 폭발할 때 피해 +50%.',
   passive:true},
  {id:'rl_overload_heart',cost:'턴당 1회 제한',name:'과부하의 심장',rarity:'영웅',tag:'overload',clr:'#FF2200',
   desc:'과부하 카드 사용 시 에너지 +1 (턴당 1회).',
   onCardPlay:(gs,card)=>card.tag==='overload'&&!gs._olEnergyUsed?{...gs,energy:(gs.energy||0)+1,_olEnergyUsed:true}:gs},
  {id:'rl_chain_reaction',cost:'없음',name:'연쇄 반응',rarity:'전설',tag:'overload',clr:'#FF0000',
   desc:'과부하 스택 5 이상이면 공격 카드가 추가로 과부하 +1 부여.',
   onCardPlay:(gs,card)=>card.type==='공격'&&((gs.player.stacks||{}).ol||0)>=5?{...gs,player:{...gs.player,stacks:{...(gs.player.stacks||{}),ol:((gs.player.stacks||{}).ol||0)+1}}}:gs},

  // ── 방전 아키타입 ──
  {id:'rl_capacitor',cost:'없음',name:'축전기',rarity:'희귀',tag:'battery',clr:'#88DDFF',
   desc:'방전 50% 이상이면 공격 피해 +15%.',
   passive:true},
  {id:'rl_battery_boost',cost:'없음',name:'배터리 부스트',rarity:'희귀',tag:'battery',clr:'#44AAFF',
   desc:'방전 카드 사용 시 방전 +10 추가.',
   onCardPlay:(gs,card)=>card.tag==='battery'?{...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+10)}}:gs},
  {id:'rl_lightning_rod',cost:'없음',name:'피뢰침',rarity:'영웅',tag:'battery',clr:'#AAEEFF',
   desc:'스테이시스에서 풀릴 때 즉시 에너지 +3.',
   passive:true},
  {id:'rl_static_shield',cost:'없음',name:'정전기 방패',rarity:'영웅',tag:'battery',clr:'#66BBFF',
   desc:'방전이 가득 찰 때마다 방어막 +20.',
   onBatteryFull:(gs)=>({...gs,player:{...gs.player,cog:(gs.player.cog||0)+20}})},
  {id:'rl_storm_battery',cost:'스테이시스 대신 발동',name:'폭풍 배터리',rarity:'전설',tag:'battery',clr:'#0088FF',
   desc:'방전 100% 도달 시 스테이시스 대신 적에게 40 피해.',
   passive:true},

  // ── 상처 아키타입 ──
  {id:'rl_wound_blade',cost:'없음',name:'상처 검',rarity:'희귀',tag:'wound',clr:'#CC2200',
   desc:'상처 스택 1당 공격력 +1.',
   passive:true},
  {id:'rl_hemorrhage',cost:'없음',name:'출혈 촉진',rarity:'희귀',tag:'wound',clr:'#AA1100',
   desc:'상처 카드 사용 시 적에게 즉시 상처 스택×1 피해.',
   onCardPlay:(gs,card)=>card.tag==='wound'?{...gs,enemy:{...gs.enemy,axis:Math.max(0,gs.enemy.axis-((gs.enemy.stacks||{}).wound||0))}}:gs},
  {id:'rl_butchers_mark',cost:'없음',name:'도살자의 낙인',rarity:'영웅',tag:'wound',clr:'#FF1100',
   desc:'적 상처 스택 5 이상이면 모든 피해 +30%.',
   passive:true},
  {id:'rl_execution_seal',name:'처형 인장',rarity:'영웅',tag:'wound',clr:'#880000',
   desc:'처형 카드 비용 -1. 최소 0.',
   onDraw:(gs,card)=>card.tag==='wound'&&card.id==='execute'?{...card,cost:Math.max(0,(card.cost||1)-1)}:card},
  {id:'rl_death_sentence',cost:'없음',name:'사형 선고',rarity:'전설',tag:'wound',clr:'#550000',
   desc:'상처 스택 10 이상인 적 처치 시 다음 전투 무료 시작.',
   passive:true},

  // ── 시간 아키타입 ──
  {id:'rl_time_dilation',cost:'없음',name:'시간 팽창',rarity:'희귀',tag:'time',clr:'#8844FF',
   desc:'매 5턴마다 에너지 +2 (기존 +1에 추가).',
   onTurnStart:(gs)=>gs.turn>0&&gs.turn%5===0?{...gs,energy:(gs.energy||0)+1}:gs},
  {id:'rl_chrono_loop',cost:'없음',name:'시간 루프',rarity:'희귀',tag:'time',clr:'#AA66FF',
   desc:'턴 시작 시 덱이 비어있으면 에너지 +2.',
   onTurnStart:(gs)=>gs.draw.length===0?{...gs,energy:(gs.energy||0)+2}:gs},
  {id:'rl_paradox_engine',cost:'없음',name:'역설 엔진',rarity:'영웅',tag:'time',clr:'#6622CC',
   desc:'0코스트 카드 사용 시 다음 카드 비용 -1.',
   onCardPlay:(gs,card)=>card.cost===0?{...gs,_costReduce:(gs._costReduce||0)+1}:gs},
  {id:'rl_time_anchor',cost:'없음',name:'시간 닻',rarity:'영웅',tag:'time',clr:'#4400AA',
   desc:'지연 카드 피해 +50%.',
   passive:true},
  {id:'rl_eternity',cost:'없음',name:'영원의 조각',rarity:'전설',tag:'time',clr:'#CC88FF',
   desc:'매 10턴마다 패를 전부 다시 뽑음.',
   onTurnStart:(gs)=>gs.turn>0&&gs.turn%10===0?{...gs,disc:[...gs.disc,...gs.hand],hand:[]}:gs},

  // ── 콤보 아키타입 ──
  {id:'rl_combo_engine',cost:'없음',name:'콤보 엔진',rarity:'희귀',tag:'combo',clr:'#00FFAA',
   desc:'콤보 발동 시 에너지 +1.',
   passive:true},
  {id:'rl_chain_link',cost:'없음',name:'연쇄 고리',rarity:'희귀',tag:'combo',clr:'#00DDAA',
   desc:'연속 2장 같은 타입 카드 사용 시 피해 +25%.',
   passive:true},
  {id:'rl_momentum',cost:'없음',name:'모멘텀',rarity:'영웅',tag:'combo',clr:'#00AA88',
   desc:'콤보 창 시간 +0.5초.',
   passive:true},
  {id:'rl_perfect_chain',cost:'없음',name:'퍼펙트 체인',rarity:'전설',tag:'combo',clr:'#00FFCC',
   desc:'3콤보 이상 달성 시 이번 턴 모든 카드 비용 0.',
   passive:true},

  // ── 범용 유물 ──
  {id:'rl_medkit',cost:'없음',name:'응급 키트',rarity:'일반',clr:'#FF4444',
   desc:'전투 후 HP +8 회복.',
   onBattleEnd:(gs)=>({...gs,player:{...gs.player,axis:Math.min(gs.player.maxAxis,(gs.player.axis||0)+8)}})},
  {id:'rl_spare_parts',cost:'없음',name:'예비 부품',rarity:'일반',clr:'#AAAAAA',
   desc:'덱에 카드 추가 시 방전 +5.',
   onCardGain:(gs)=>({...gs,player:{...gs.player,battery:Math.min(100,(gs.player.battery||0)+5)}})},
  {id:'rl_rusted_key',cost:'없음',name:'녹슨 열쇠',rarity:'일반',clr:'#886644',
   desc:'상점 가격 10% 감소.',
   passive:true},
  {id:'rl_focus_lens',cost:'없음',name:'집중 렌즈',rarity:'희귀',clr:'#FFFF88',
   desc:'카드 뽑기 +1 (매 턴 4장 뽑음).',
   onTurnStart:(gs)=>gs},
  {id:'rl_battle_hymn',cost:'없음',name:'전투 찬가',rarity:'희귀',clr:'#FF8844',
   desc:'보스 전투 시작 시 에너지 +2.',
   onBattleStart:(gs)=>gs.enemy&&gs.enemy.type==='boss'?{...gs,energy:(gs.energy||0)+2}:gs},
  {id:'rl_black_market',cost:'없음',name:'암시장 패스',rarity:'희귀',clr:'#CC00CC',
   desc:'상점에서 카드 1개 무료.',
   passive:true},
  {id:'rl_war_trophy',cost:'없음',name:'전쟁 전리품',rarity:'영웅',clr:'#CC4400',
   desc:'정예 적 처치 시 추가 골드 +15.',
   passive:true},
  {id:'rl_adrenaline',cost:'없음',name:'아드레날린',rarity:'영웅',clr:'#FF2244',
   desc:'HP 30% 이하이면 모든 피해 +30%.',
   passive:true},
  {id:'rl_last_stand',cost:'1회 한정',name:'최후의 저항',rarity:'전설',clr:'#FF0044',
   desc:'HP 1이 될 때 한 번 방어막 +50.',
   passive:true},
  {id:'rl_phoenix_core',cost:'1회 한정',name:'불사조 코어',rarity:'전설',clr:'#FF4400',
   desc:'첫 사망 시 HP 30%로 부활. (1회)',
   passive:true},

];

// 유물 효과 적용 함수
function applyRelicEffects(gs, timing){
  const equipped=(gs&&gs.relicsEquipped)||GS.relicsEquipped||[];
  for(const relic of equipped){
    const r=RELICS.find(x=>x.id===relic.id);
    if(!r)continue;
    try{
      if(timing==='battleStart' && r.onBattleStart) gs=r.onBattleStart(gs)||gs;
      if(timing==='turnStart'   && r.onTurnStart)   gs=r.onTurnStart(gs)||gs;
      if(timing==='turnEnd'     && r.onTurnEnd)      gs=r.onTurnEnd(gs)||gs;
      if(timing==='onHeal'      && r.onHeal)         gs=r.onHeal(gs)||gs;
      if(timing==='onBlock'     && r.onBlock)        gs=r.onBlock(gs)||gs;
      if(timing==='onKill'      && r.onKill)         gs=r.onKill(gs)||gs;
      if(timing==='battleEnd'    && r.onBattleEnd)    gs=r.onBattleEnd(gs)||gs;
    }catch(e){console.warn('유물 오류:',r.id,e);}
  }
  return gs;
}
function applyRelicDmgBonus(gs, cardType, dmgVal){
  let v = dmgVal;
  const equipped = (GS.relicsEquipped||[]);
  for(const relic of equipped){
    const r = RELICS.find(x=>x.id===relic.id);
    if(!r) continue;
    if(r.dmgBonus && r.dmgBonus.type===cardType) v+=r.dmgBonus.bonus;
    if(r.onDmg) v=r.onDmg(gs,v);
  }
  return v;
}

// 유물 인벤토리 UI
function showRelicInventory(content, refreshTabBtns){
  const equipped = GS.relicsEquipped||[];
  const bag = GS.relicBag||[];

  content.innerHTML='';

  // ── 착용 중 (최대 5개) ──
  const eqHd = document.createElement('div');
  eqHd.style.cssText='display:flex;justify-content:space-between;margin-bottom:8px;';
  const eqTl = document.createElement('span');
  eqTl.style.cssText='font-size:9px;color:rgba(255,215,0,.7);font-family:"Share Tech Mono",monospace;letter-spacing:.1em;';
  eqTl.textContent='착용 중  '+equipped.length+'/5';
  eqHd.appendChild(eqTl);
  const eqHint = document.createElement('span');
  eqHint.style.cssText='font-size:7px;color:#444;font-family:"Share Tech Mono",monospace;';
  eqHint.textContent='탭 → 해제';
  eqHd.appendChild(eqHint);
  content.appendChild(eqHd);

  if(!equipped.length){
    const em = document.createElement('div');
    em.style.cssText='text-align:center;color:#333;font-size:9px;padding:12px;font-family:"Noto Serif KR",serif;';
    em.textContent='착용 중인 유물이 없다.';
    content.appendChild(em);
  } else {
    const eqGrid = document.createElement('div');
    eqGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;';
    equipped.forEach((relic,i)=>{
      const r=RELICS.find(x=>x.id===relic.id)||relic;
      const card = mkRelicCard(r, true, ()=>{
        // 해제 → 보관함으로
        if(bag.length>=10){showNotif('유물 보관함이 가득 찼다',CR);return;}
        GS=upd(GS,s=>({...s,relicsEquipped:s.relicsEquipped.filter((_,j)=>j!==i),relicBag:[...(s.relicBag||[]),relic]}));
        showRelicInventory(content,refreshTabBtns);if(refreshTabBtns)refreshTabBtns();
      });
      eqGrid.appendChild(card);
    });
    content.appendChild(eqGrid);
  }

  // ── 보관함 (최대 10개) ──
  const separator = document.createElement('div');
  separator.style.cssText='border-top:1px solid rgba(255,215,0,.08);margin:8px 0 10px;';
  content.appendChild(separator);

  const bgHd = document.createElement('div');
  bgHd.style.cssText='display:flex;justify-content:space-between;margin-bottom:8px;';
  const bgTl = document.createElement('span');
  bgTl.style.cssText='font-size:9px;color:#666;font-family:"Share Tech Mono",monospace;letter-spacing:.1em;';
  bgTl.textContent='보관함  '+bag.length+'/10';
  bgHd.appendChild(bgTl);
  const bgHint = document.createElement('span');
  bgHint.style.cssText='font-size:7px;color:#444;font-family:"Share Tech Mono",monospace;';
  bgHint.textContent='탭 → 착용';
  bgHd.appendChild(bgHint);
  content.appendChild(bgHd);

  if(!bag.length){
    const em2 = document.createElement('div');
    em2.style.cssText='text-align:center;color:#2a2a2a;font-size:9px;padding:12px;font-family:"Noto Serif KR",serif;';
    em2.textContent='보관함이 비어 있다.';
    content.appendChild(em2);
  } else {
    const bgGrid = document.createElement('div');
    bgGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;';
    bag.forEach((relic,i)=>{
      const r=RELICS.find(x=>x.id===relic.id)||relic;
      const card=mkRelicCard(r,false,()=>{
        if(equipped.length>=5){showNotif('최대 5개까지 착용 가능',CR);return;}
        GS=upd(GS,s=>({...s,relicBag:s.relicBag.filter((_,j)=>j!==i),relicsEquipped:[...(s.relicsEquipped||[]),relic]}));
        showRelicInventory(content,refreshTabBtns);if(refreshTabBtns)refreshTabBtns();
      });
      bgGrid.appendChild(card);
    });
    content.appendChild(bgGrid);
  }
}

function mkRelicCard(r, equipped, onClick){
  const wrap = document.createElement('div');
  const clr = r.clr||'#888';
  wrap.style.cssText='border:1px solid '+clr+'66;border-radius:7px;padding:10px 9px;background:'+clr+'0D;cursor:pointer;transition:all .15s;position:relative;';
  if(equipped) wrap.style.boxShadow='0 0 10px '+clr+'44';
  wrap.onmouseenter=()=>wrap.style.background=clr+'22';
  wrap.onmouseleave=()=>wrap.style.background=clr+'0D';
  wrap.onclick=onClick;

  const nm=document.createElement('div');
  nm.style.cssText='font-size:9px;color:'+clr+';font-family:"Share Tech Mono",monospace;font-weight:700;margin-bottom:4px;letter-spacing:.05em;';
  nm.textContent=r.name;

  const desc=document.createElement('div');
  desc.style.cssText='font-size:7.5px;color:#888;font-family:"Noto Serif KR",serif;line-height:1.5;margin-bottom:4px;';
  desc.textContent=r.desc;

  const cost=document.createElement('div');
  cost.style.cssText='font-size:7px;color:#CC3300;font-family:"Noto Serif KR",serif;line-height:1.4;';
  cost.textContent=r.cost?'대가: '+r.cost:'';

  const badge=document.createElement('div');
  badge.style.cssText='position:absolute;top:6px;right:6px;font-size:6px;color:'+clr+';font-family:"Share Tech Mono",monospace;opacity:.7;';
  badge.textContent=equipped?'착용':'보관';

  [nm,desc,cost,badge].forEach(el=>wrap.appendChild(el));
  return wrap;
}


function showInventoryModal(){
  // HUD 숨기기
  const _fuiI=document.getElementById('fui');if(_fuiI){_fuiI.style.opacity='0';_fuiI.style.pointerEvents='none';}
  const bd=mkBk(e=>{if(e.target===bd){
    bd.remove();
    // 닫힐 때 HUD 복원
    if(GS.screen==='field'){const _fuiI2=document.getElementById('fui');if(_fuiI2){_fuiI2.style.opacity='';_fuiI2.style.pointerEvents='';}}
    return;
  }});
  const box=document.createElement('div');
  box.style.cssText='background:'+DOB+';border-radius:10px;padding:16px;width:100%;max-width:390px;max-height:90vh;display:flex;flex-direction:column;border:1px solid rgba(255,215,0,.2);';

  let activeTab=0;
  const TABS=['덱','유물','저장소'];

  // ── 1. 콘텐츠 영역 먼저 선언 ──
  const content=document.createElement('div');
  content.style.cssText='flex:1;overflow-y:auto;overflow-x:hidden;min-height:0;';

  // ── 2. 탭 헤더 ──
  const tabBar=document.createElement('div');
  tabBar.style.cssText='display:flex;gap:6px;margin-bottom:12px;flex-shrink:0;';

  function refreshTabBtns(){
    tabBtns.forEach((b,j)=>{
      const cnt=j===0?GS.deck.length:(j===1?((GS.relicsEquipped||[]).length+'/'+(GS.relicBag||[]).length):(GS.storage||[]).length);
      const max=j===0?30:(j===1?99:25);
      b.textContent=TABS[j]+' ('+cnt+(j===1?'/25':'')+')';
      b.style.color=j===activeTab?G:'#666';
      b.style.borderColor=j===activeTab?G:'rgba(255,215,0,.15)';
      b.style.background=j===activeTab?'rgba(255,215,0,.08)':'transparent';
    });
  }

  const tabBtns=TABS.map((name,i)=>{
    const btn=document.createElement('button');
    btn.style.cssText='flex:1;padding:7px 0;border-radius:5px;font-size:9px;'+
      'font-family:"Share Tech Mono",monospace;letter-spacing:.06em;cursor:pointer;'+
      'border:1px solid rgba(255,215,0,.15);background:transparent;transition:all .15s;';
    btn.onclick=()=>{activeTab=i;refreshTabBtns();renderTab();};
    tabBar.appendChild(btn);
    return btn;
  });

  // ── 3. 렌더 함수들 ──
  function renderTab(){
    content.innerHTML='';
    if(activeTab===0) renderDeckTab();
    else if(activeTab===1) renderRelicTab();
    else renderStorageTab();
  }

  function renderRelicTab(){
    showRelicInventory(content, refreshTabBtns);
  }

  function makeCardGrid(cards, onTap, tapLabel){
    if(!cards.length){
      const empty=document.createElement('div');
      empty.style.cssText='text-align:center;color:#333;font-size:10px;padding:28px;'+
        'font-family:"Noto Serif KR",serif;line-height:2;';
      empty.textContent='비어 있다.';
      return empty;
    }
    const grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding-bottom:4px;';
    cards.forEach((card,i)=>{
      const wrap=document.createElement('div');
      wrap.style.cssText='position:relative;cursor:pointer;';
      const ce=mkCardEl(card,false);
      ce.style.width='100%';ce.style.height='108px';
      wrap.onclick=()=>onTap(card,i);
      const lbl=document.createElement('div');
      lbl.style.cssText='position:absolute;bottom:2px;left:0;right:0;text-align:center;'+
        'font-size:6px;color:rgba(255,215,0,.35);pointer-events:none;'+
        'font-family:"Share Tech Mono",monospace;';
      lbl.textContent=tapLabel;
      wrap.appendChild(ce);wrap.appendChild(lbl);
      grid.appendChild(wrap);
    });
    return grid;
  }

  function renderDeckTab(){
    const hd=document.createElement('div');
    hd.style.cssText='display:flex;justify-content:space-between;margin-bottom:8px;';
    const tl=document.createElement('span');
    tl.style.cssText='font-size:8px;color:#555;font-family:"Share Tech Mono",monospace;';
    tl.textContent='덱  '+GS.deck.length+'/30장';
    const ht=document.createElement('span');
    ht.style.cssText='font-size:7px;color:#333;font-family:"Share Tech Mono",monospace;';
    ht.textContent='탭 → 저장소로';
    hd.appendChild(tl);hd.appendChild(ht);
    content.appendChild(hd);
    const grid=makeCardGrid(GS.deck,(card,i)=>{
      if((GS.storage||[]).length>=25){showNotif('저장소가 가득 찼다',CR);return;}
      GS=upd(GS,s=>({...s,
        deck:s.deck.filter((_,j)=>j!==i),
        storage:[...(s.storage||[]),card]
      }));
      updateFUI();refreshTabBtns();renderTab();
    },'탭→저장소');
    content.appendChild(grid);
  }

  function renderStorageTab(){
    const hd=document.createElement('div');
    hd.style.cssText='display:flex;justify-content:space-between;margin-bottom:8px;';
    const tl=document.createElement('span');
    tl.style.cssText='font-size:8px;color:#555;font-family:"Share Tech Mono",monospace;';
    tl.textContent='저장소  '+(GS.storage||[]).length+'/25';
    const ht=document.createElement('span');
    ht.style.cssText='font-size:7px;color:#333;font-family:"Share Tech Mono",monospace;';
    ht.textContent='탭 → 덱으로';
    hd.appendChild(tl);hd.appendChild(ht);
    content.appendChild(hd);
    const grid=makeCardGrid(GS.storage||[],(card,i)=>{
      if(GS.deck.length>=30){showNotif('덱이 가득 찼다 (30장)',CR);return;}
      GS=upd(GS,s=>({...s,
        storage:s.storage.filter((_,j)=>j!==i),
        deck:[...s.deck,card]
      }));
      updateFUI();refreshTabBtns();renderTab();
    },'탭→덱');
    content.appendChild(grid);
  }

  // ── 4. 닫기 ──
  const closeBtn=document.createElement('button');
  closeBtn.textContent='닫기';
  closeBtn.style.cssText='margin-top:10px;width:100%;padding:7px;border-radius:5px;'+
    'border:1px solid rgba(255,215,0,.15);background:transparent;color:#555;'+
    'font-family:"Share Tech Mono",monospace;font-size:9px;cursor:pointer;flex-shrink:0;';
  closeBtn.onclick=()=>{
    bd.remove();
    if(GS.screen==='field'){const _fuiC=document.getElementById('fui');if(_fuiC){_fuiC.style.opacity='';_fuiC.style.pointerEvents='';}}
  };

  // ── 5. DOM 조립 (모든 선언 완료 후) ──
  box.appendChild(tabBar);
  box.appendChild(content);
  box.appendChild(closeBtn);
  bd.appendChild(box);
  document.body.appendChild(bd);

  // ── 6. 초기 렌더 (DOM 조립 이후) ──
  refreshTabBtns();
  renderTab();
}

function showDeckModal(){showInventoryModal();}

function showTip(card){
  const tp=document.getElementById('tip'),inn=document.getElementById('tipinn');
  inn.innerHTML='';inn.style.cssText=`border:2px solid ${card.clr};background:linear-gradient(150deg,${card.clr}22,${DOB});box-shadow:0 0 28px ${card.clr}66;`;
  const ico=mkDiv('',{width:'44px',height:'44px',margin:'0 auto 10px',color:card.clr,filter:`drop-shadow(0 0 6px ${card.clr})`});ico.innerHTML=IC[card.icon]||IC.atk;inn.appendChild(ico);
  inn.appendChild(mkDiv('',{color:G,fontSize:'15px',fontWeight:'700',fontFamily:"'Cinzel',serif",textAlign:'center',marginBottom:'4px'},card.name));
  const rm={legendary:'★★★ 전설',rare:'★★ 고급',uncommon:'★ 희귀',common:'일반'};
  inn.appendChild(mkDiv('',{color:card.clr,fontSize:'9px',textAlign:'center',fontFamily:"'Share Tech Mono',monospace",letterSpacing:'.14em',marginBottom:'12px'},`${rm[card.rarity]||''} · ${card.type} · 비용 ${card.cost}`));
  inn.appendChild(mkDiv('',{width:'100%',height:'1px',background:`${card.clr}44`,marginBottom:'10px'}));
  inn.appendChild(mkDiv('',{color:'#EEE',fontSize:'11px',fontFamily:"'Noto Serif KR',serif",lineHeight:'1.8',marginBottom:'10px'},card.desc));
  if(card.lore)inn.appendChild(mkDiv('',{color:'#444',fontSize:'10px',fontFamily:"'Noto Serif KR',serif",lineHeight:'1.8',fontStyle:'italic'},card.lore));
  inn.appendChild(mkDiv('',{marginTop:'14px',textAlign:'center',color:'#222',fontSize:'9px',fontFamily:"'Share Tech Mono',monospace"},'아무 곳이나 눌러 닫기'));
  tp.className='on';tp.onclick=()=>tp.className='';
}

const _notifQ=[];let _notifBusy=false;
function showNotif(txt,c){
  _notifQ.push({txt,c});
  if(!_notifBusy)_notifFlush();
}
function _notifFlush(){
  if(!_notifQ.length){_notifBusy=false;return;}
  _notifBusy=true;
  const {txt,c}=_notifQ.shift();
  const e=document.createElement('div');
  e.className='notif-bar';
  e.style.cssText=
    'position:fixed;top:42%;left:50%;transform:translateX(-50%) translateY(-50%);'+
    'z-index:6000;background:'+DOB+';border:1px solid '+c+';border-radius:6px;'+
    'padding:9px 22px;color:'+c+';font-size:11px;'+
    'font-family:"Noto Serif KR",serif;font-weight:700;letter-spacing:.1em;'+
    'animation:slideUp .25s ease;white-space:nowrap;'+
    'box-shadow:0 0 16px '+c+'55,inset 0 0 10px '+c+'11;'+
    'max-width:340px;text-align:center;pointer-events:none;';
  e.textContent=txt;
  document.body.appendChild(e);
  setTimeout(()=>{
    e.style.transition='opacity .25s';e.style.opacity='0';
    setTimeout(()=>{e.remove();_notifFlush();},260);
  },1400);
}

/* ═══════════════════════════════════════════════════════
   DOM HELPERS
═══════════════════════════════════════════════════════ */
function mkDiv(cls='',styles={},txt=''){
  const e=document.createElement('div');
  if(cls)e.className=cls;Object.assign(e.style,styles);
  if(txt)e.textContent=txt;return e;
}
function mkBk(clickFn){
  const bd=mkDiv('mbk');
  const _origFn=clickFn;
  bd.addEventListener('click',_origFn||null);
  // MutationObserver로 bd 제거 시 HUD 복원
  const _mo=new MutationObserver(()=>{
    if(!document.body.contains(bd)){
      _mo.disconnect();
      if(GS&&GS.screen==='field'){const _f=document.getElementById('fui');if(_f){_f.style.opacity='';_f.style.pointerEvents='';}}
    }
  });
  _mo.observe(document.body,{childList:true,subtree:true});
  return bd;
}
// mkBar replaced by mkBarSimple
function mkBarSimple(v,max,color,label,spark=false){
  const pct=cl(v/max*100,0,100);
  const w=document.createElement('div');w.className='bw';
  const lbl=document.createElement('div');lbl.className='bl2';lbl.textContent=`${label}: ${Math.round(v)}/${max}`;
  const track=document.createElement('div');track.className='bt';
  const fill=document.createElement('div');fill.className='bf';fill.style.cssText=`width:${pct}%;background:${color};`;
  track.appendChild(fill);if(spark&&pct>=80){const sp=document.createElement('div');sp.className='bsp';track.appendChild(sp);}
  w.appendChild(lbl);w.appendChild(track);return w;
}

function mkCardEl(card,dimmed=false){
  const rg={'일반':'','희귀':'runc','고급':'rrar','전설':'rleg','유물':'rleg card-relic',common:'',uncommon:'runc',rare:'rrar',legendary:'rleg'};
  const e=document.createElement('div');e.className=`card ${rg[card.rarity]||''} ${dimmed?'dim':''}`;
  e.style.borderColor=dimmed?'#2a2a2a':card.clr;e.style.background=`linear-gradient(155deg,${card.clr}22 0%,${DOB} 55%,${card.clr}14 100%)`;
  if(card.uid)e.setAttribute('data-cuid',card.uid);
  const cst=document.createElement('div');cst.className='ccst';cst.style.cssText=`background:radial-gradient(circle,${card.clr},${OB});border:1px solid ${card.clr};color:${G};`;cst.textContent=card.cost;
  const ico=document.createElement('div');ico.className='cico';ico.style.cssText=`color:${card.clr};filter:drop-shadow(0 0 4px ${card.clr});`;ico.innerHTML=IC[card.icon]||IC.atk;
  const nm=document.createElement('div');nm.className='cnm';nm.textContent=card.name;
  const dv=document.createElement('div');dv.className='cdv';dv.style.background=`${card.clr}55`;
  const ds=document.createElement('div');ds.className='cds';ds.textContent=card.desc;
  const rm={legendary:'★★★',rare:'★★',uncommon:'★',common:''};
  const rr=document.createElement('div');rr.className='crr';rr.style.color=card.clr;rr.textContent=rm[card.rarity]||'';
  const sh=document.createElement('div');sh.className='csh';
  [cst,ico,nm,dv,ds,rr,sh].forEach(c=>e.appendChild(c));
  return e;
}

/* ═══════════════════════════════════════════════════════
   SCREENS
═══════════════════════════════════════════════════════ */
function renderScreen(){
  const s=GS;document.getElementById('uo').classList.remove('on');
  const tp=document.getElementById('tip');if(tp)tp.className='';
  if(s.screen==='title'){hideField();renderTitle();}
  else if(s.screen==='field'){const r2=document.getElementById('root');r2.innerHTML='';r2.style.display='none';showField();}
  else if(s.screen==='battle'){hideField();renderBattle();}
  else if(s.screen==='gameover'){hideField();renderGO();}
  else if(s.screen==='ending_map'){renderEndingMap();}
  else if(s.screen==='victory'){hideField();renderVic();}
}

/* ── TITLE ── */
function renderTitle(){
  if(typeof SFX!=='undefined')SFX.clock();
  setInBattle(false);
  const old=document.getElementById('title-overlay');if(old)old.remove();
  ['fui','map-clock'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});

  const W=Math.min(window.innerWidth,430);
  const H=window.innerHeight||700;

  const ov=document.createElement('div');
  ov.id='title-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:8000;overflow:hidden;background:#020208;';
  document.body.appendChild(ov);

  /* ══════════════ SVG 레이어 ══════════════ */
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','100%');svg.setAttribute('height','100%');
  svg.style.cssText='position:absolute;inset:0;pointer-events:none;';
  ov.appendChild(svg);

  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML=`
    <filter id="tglow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="tglow2"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="tblur"><feGaussianBlur stdDeviation="12"/></filter>
    <radialGradient id="tgrd" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,215,0,.12)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <style>
      @keyframes tRot{from{transform-origin:inherit;transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes tRotR{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
      @keyframes tFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes tPulse{0%,100%{opacity:.6}50%{opacity:1}}
      @keyframes tFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      @keyframes tSpark{0%{opacity:1;transform:scale(1) translate(0,0)}100%{opacity:0;transform:scale(0) translate(var(--tx),var(--ty))}}
    </style>
  `;
  svg.appendChild(defs);

  /* 배경 그라디언트 원 */
  const bgGrd=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
  bgGrd.setAttribute('cx','50%');bgGrd.setAttribute('cy','45%');
  bgGrd.setAttribute('rx','45%');bgGrd.setAttribute('ry','40%');
  bgGrd.setAttribute('fill','url(#tgrd)');bgGrd.style.animation='tPulse 3s ease infinite';
  svg.appendChild(bgGrd);

  /* ── 기어 생성 함수 ── */
  function makeGear(cx,cy,r,teeth,dir,dur,clr,opacity){
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('transform-origin',`${cx} ${cy}`);
    g.style.cssText=`transform-origin:${cx}px ${cy}px;animation:${dir?'tRot':'tRotR'} ${dur}s linear infinite;opacity:${opacity};`;
    // 외부 원
    const outer=document.createElementNS('http://www.w3.org/2000/svg','circle');
    outer.setAttribute('cx',cx);outer.setAttribute('cy',cy);outer.setAttribute('r',r);
    outer.setAttribute('fill','none');outer.setAttribute('stroke',clr);outer.setAttribute('stroke-width','1.5');
    g.appendChild(outer);
    // 내부 원
    const inner=document.createElementNS('http://www.w3.org/2000/svg','circle');
    inner.setAttribute('cx',cx);inner.setAttribute('cy',cy);inner.setAttribute('r',r*.4);
    inner.setAttribute('fill','none');inner.setAttribute('stroke',clr);inner.setAttribute('stroke-width','1');
    g.appendChild(inner);
    // 중심 원
    const ctr=document.createElementNS('http://www.w3.org/2000/svg','circle');
    ctr.setAttribute('cx',cx);ctr.setAttribute('cy',cy);ctr.setAttribute('r',r*.12);
    ctr.setAttribute('fill',clr);g.appendChild(ctr);
    // 이빨
    for(let i=0;i<teeth;i++){
      const a=(i/teeth)*Math.PI*2,a2=((i+.5)/teeth)*Math.PI*2;
      const x1=cx+Math.cos(a)*r,y1=cy+Math.sin(a)*r;
      const x2=cx+Math.cos(a)*(r+r*.18),y2=cy+Math.sin(a)*(r+r*.18);
      const x3=cx+Math.cos(a2)*(r+r*.18),y3=cy+Math.sin(a2)*(r+r*.18);
      const x4=cx+Math.cos(a2)*r,y4=cy+Math.sin(a2)*r;
      const tooth=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      tooth.setAttribute('points',`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`);
      tooth.setAttribute('fill',clr);g.appendChild(tooth);
    }
    // 스포크 (8개)
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const spk=document.createElementNS('http://www.w3.org/2000/svg','line');
      spk.setAttribute('x1',cx+Math.cos(a)*r*.15);spk.setAttribute('y1',cy+Math.sin(a)*r*.15);
      spk.setAttribute('x2',cx+Math.cos(a)*r*.7);spk.setAttribute('y2',cy+Math.sin(a)*r*.7);
      spk.setAttribute('stroke',clr);spk.setAttribute('stroke-width','1');g.appendChild(spk);
    }
    if(opacity>0.15)g.setAttribute('filter','url(#tglow)');
    svg.appendChild(g);
    return g;
  }

  const vw=window.innerWidth, vh=window.innerHeight;
  // 큰 기어들
  makeGear(vw*.08, vh*.25, 70, 16, true, 22, 'rgba(255,215,0,.35)', .7);
  makeGear(vw*.92, vh*.2, 55, 14, false, 18, 'rgba(255,215,0,.3)', .65);
  makeGear(vw*.05, vh*.75, 50, 12, false, 20, 'rgba(255,215,0,.25)', .55);
  makeGear(vw*.94, vh*.78, 65, 16, true, 25, 'rgba(255,215,0,.3)', .6);
  // 중간 기어들 (맞물리게)
  makeGear(vw*.2, vh*.22, 32, 10, false, 14, 'rgba(255,215,0,.2)', .5);
  makeGear(vw*.82, vh*.36, 28, 8, true, 12, 'rgba(255,215,0,.18)', .45);
  makeGear(vw*.18, vh*.78, 24, 8, true, 10, 'rgba(255,215,0,.18)', .4);
  // 소형 기어들
  makeGear(vw*.35, vh*.1, 16, 8, true, 8, 'rgba(255,215,0,.15)', .35);
  makeGear(vw*.7, vh*.88, 18, 8, false, 9, 'rgba(255,215,0,.15)', .35);
  makeGear(vw*.55, vh*.05, 12, 6, true, 6, 'rgba(255,215,0,.12)', .3);

  /* ── 시계판 ── */
  const clkCX=vw*.5, clkCY=vh*.38, clkR=Math.min(vw*.28,120);
  const clkG=document.createElementNS('http://www.w3.org/2000/svg','g');

  // 외부 링 (글로우)
  const clkGlow=document.createElementNS('http://www.w3.org/2000/svg','circle');
  clkGlow.setAttribute('cx',clkCX);clkGlow.setAttribute('cy',clkCY);clkGlow.setAttribute('r',clkR+8);
  clkGlow.setAttribute('fill','none');clkGlow.setAttribute('stroke','rgba(255,215,0,.15)');
  clkGlow.setAttribute('stroke-width','16');clkGlow.setAttribute('filter','url(#tblur)');
  clkG.appendChild(clkGlow);
  // 시계 배경
  const clkBg=document.createElementNS('http://www.w3.org/2000/svg','circle');
  clkBg.setAttribute('cx',clkCX);clkBg.setAttribute('cy',clkCY);clkBg.setAttribute('r',clkR);
  clkBg.setAttribute('fill','rgba(2,2,8,.9)');
  clkBg.setAttribute('stroke','rgba(255,215,0,.5)');clkBg.setAttribute('stroke-width','2');
  clkG.appendChild(clkBg);
  // 내부 링
  const clkIn=document.createElementNS('http://www.w3.org/2000/svg','circle');
  clkIn.setAttribute('cx',clkCX);clkIn.setAttribute('cy',clkCY);clkIn.setAttribute('r',clkR*.85);
  clkIn.setAttribute('fill','none');clkIn.setAttribute('stroke','rgba(255,215,0,.15)');clkIn.setAttribute('stroke-width','1');
  clkG.appendChild(clkIn);

  // 12개 눈금 + 숫자
  const nums=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  for(let i=0;i<12;i++){
    const ang=(i*30-90)*Math.PI/180;
    const isMaj=i%3===0;
    const lx1=clkCX+Math.cos(ang)*clkR*.88, ly1=clkCY+Math.sin(ang)*clkR*.88;
    const lx2=clkCX+Math.cos(ang)*clkR*(isMaj?.75:.82), ly2=clkCY+Math.sin(ang)*clkR*(isMaj?.75:.82);
    const tick=document.createElementNS('http://www.w3.org/2000/svg','line');
    tick.setAttribute('x1',lx1);tick.setAttribute('y1',ly1);tick.setAttribute('x2',lx2);tick.setAttribute('y2',ly2);
    tick.setAttribute('stroke',isMaj?'rgba(255,215,0,.7)':'rgba(255,215,0,.3)');
    tick.setAttribute('stroke-width',isMaj?'2':'1');clkG.appendChild(tick);
    if(isMaj){
      const tx=clkCX+Math.cos(ang)*clkR*.62, ty=clkCY+Math.sin(ang)*clkR*.62;
      const tn=document.createElementNS('http://www.w3.org/2000/svg','text');
      tn.setAttribute('x',tx);tn.setAttribute('y',ty+4);tn.setAttribute('text-anchor','middle');
      tn.setAttribute('fill','rgba(255,215,0,.6)');tn.setAttribute('font-size',clkR*.12);
      tn.setAttribute('font-family','Share Tech Mono,monospace');tn.textContent=nums[i];
      clkG.appendChild(tn);
    }
  }

  // 시침
  const hrHand=document.createElementNS('http://www.w3.org/2000/svg','line');
  hrHand.setAttribute('stroke','rgba(255,215,0,.85)');hrHand.setAttribute('stroke-width','3');
  hrHand.setAttribute('stroke-linecap','round');hrHand.setAttribute('filter','url(#tglow)');
  clkG.appendChild(hrHand);
  // 분침
  const mnHand=document.createElementNS('http://www.w3.org/2000/svg','line');
  mnHand.setAttribute('stroke','rgba(255,215,0,.6)');mnHand.setAttribute('stroke-width','2');
  mnHand.setAttribute('stroke-linecap','round');
  clkG.appendChild(mnHand);
  // 초침
  const scHand=document.createElementNS('http://www.w3.org/2000/svg','line');
  scHand.setAttribute('stroke',CR);scHand.setAttribute('stroke-width','1.5');
  scHand.setAttribute('stroke-linecap','round');
  clkG.appendChild(scHand);
  // 중심
  const clkCtr=document.createElementNS('http://www.w3.org/2000/svg','circle');
  clkCtr.setAttribute('cx',clkCX);clkCtr.setAttribute('cy',clkCY);clkCtr.setAttribute('r',4);
  clkCtr.setAttribute('fill',G);clkCtr.setAttribute('filter','url(#tglow)');
  clkG.appendChild(clkCtr);

  svg.appendChild(clkG);

  // 시계 바늘 애니메이션
  let animId;
  function tickClock(){
    const now=new Date();
    const s=now.getSeconds()+now.getMilliseconds()/1000;
    const m=now.getMinutes()+s/60;
    const h=(now.getHours()%12)+m/60;
    const sAng=(s/60*360-90)*Math.PI/180;
    const mAng=(m/60*360-90)*Math.PI/180;
    const hAng=(h/12*360-90)*Math.PI/180;
    const rl=clkR;
    hrHand.setAttribute('x1',clkCX-Math.cos(hAng)*rl*.12);hrHand.setAttribute('y1',clkCY-Math.sin(hAng)*rl*.12);
    hrHand.setAttribute('x2',clkCX+Math.cos(hAng)*rl*.5);hrHand.setAttribute('y2',clkCY+Math.sin(hAng)*rl*.5);
    mnHand.setAttribute('x1',clkCX-Math.cos(mAng)*rl*.1);mnHand.setAttribute('y1',clkCY-Math.sin(mAng)*rl*.1);
    mnHand.setAttribute('x2',clkCX+Math.cos(mAng)*rl*.7);mnHand.setAttribute('y2',clkCY+Math.sin(mAng)*rl*.7);
    scHand.setAttribute('x1',clkCX-Math.cos(sAng)*rl*.15);scHand.setAttribute('y1',clkCY-Math.sin(sAng)*rl*.15);
    scHand.setAttribute('x2',clkCX+Math.cos(sAng)*rl*.82);scHand.setAttribute('y2',clkCY+Math.sin(sAng)*rl*.82);
    animId=requestAnimationFrame(tickClock);
  }
  tickClock();

  /* ── 파티클 스파크 ── */
  function spawnSpark(){
    if(!document.getElementById('title-overlay'))return;
    const p=document.createElementNS('http://www.w3.org/2000/svg','circle');
    const x=vw*.1+Math.random()*vw*.8, y=vh*.8+Math.random()*vh*.2;
    const tx=(Math.random()-0.5)*80, ty=-(40+Math.random()*80);
    p.setAttribute('cx',x);p.setAttribute('cy',y);p.setAttribute('r',1.5+Math.random()*2);
    p.setAttribute('fill',Math.random()<0.7?'rgba(255,215,0,.7)':'rgba(255,140,0,.6)');
    p.style.cssText=`--tx:${tx}px;--ty:${ty}px;animation:tSpark ${1+Math.random()}s ease-out forwards;`;
    svg.appendChild(p);
    setTimeout(()=>{try{svg.removeChild(p);}catch(e){}},1200);
  }
  const sparkInterval=setInterval(()=>{
    if(!document.getElementById('title-overlay')){clearInterval(sparkInterval);return;}
    for(let i=0;i<2;i++)spawnSpark();
  },200);

  /* ── 수평 스캔라인 ── */
  const scan=document.createElement('div');
  scan.style.cssText='position:absolute;inset:0;pointer-events:none;'+
    'background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.08) 3px,rgba(0,0,0,.08) 4px);'+
    'z-index:1;';
  ov.appendChild(scan);

  /* ── 중앙 텍스트 콘텐츠 ── */
  const content=document.createElement('div');
  content.style.cssText='position:absolute;bottom:0;left:0;right:0;z-index:3;'+
    'display:flex;flex-direction:column;align-items:center;text-align:center;'+
    'padding:20px 24px '+(vh*.12)+'px;';

  // 구분선
  const divLine=document.createElement('div');
  divLine.style.cssText='width:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,.5),transparent);'+
    'margin:0 auto 14px;transition:width 1s .5s ease;';
  content.appendChild(divLine);

  // 메인 타이틀
  const titleEl=document.createElement('div');
  titleEl.style.cssText='font-size:56px;font-weight:900;color:transparent;'+
    'font-family:"Cinzel Decorative",serif;letter-spacing:.1em;line-height:1;'+
    'background:linear-gradient(180deg,rgba(255,225,100,1) 0%,rgba(255,180,0,.8) 100%);'+
    '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;'+
    'filter:drop-shadow(0 0 20px rgba(255,215,0,.4));'+
    'margin-bottom:4px;opacity:0;transform:translateY(12px);transition:opacity .7s .3s,transform .7s .3s;';
  titleEl.id='title-logo';titleEl.textContent='I — XII';titleEl.setAttribute('data-text','I — XII');titleEl.classList.add('glitch-text');
  content.appendChild(titleEl);

  const subEl=document.createElement('div');
  subEl.style.cssText='font-size:11px;color:rgba(255,215,0,.45);font-family:"Cinzel",serif;'+
    'letter-spacing:.35em;margin-bottom:6px;opacity:0;transition:opacity .7s .5s;';
  subEl.textContent='파괴된 시계';subEl.style.cssText+='text-shadow:0 0 20px rgba(200,100,50,.5);letter-spacing:.25em;';
  content.appendChild(subEl);

  const tagEl=document.createElement('div');
  tagEl.style.cssText='font-size:7px;color:rgba(255,255,255,.2);font-family:"Share Tech Mono",monospace;'+
    'letter-spacing:.2em;margin-bottom:20px;opacity:0;transition:opacity .7s .7s;';
  tagEl.textContent='BROKEN CLOCK — CHRONOS ENGINE v11';
  content.appendChild(tagEl);

  // 시작 버튼
  const btn=document.createElement('div');
  btn.style.cssText='padding:13px 34px;border:1px solid rgba(255,215,0,.45);border-radius:3px;'+
    'color:rgba(255,215,0,.9);font-family:"Share Tech Mono",monospace;font-size:10px;'+
    'letter-spacing:.22em;cursor:pointer;'+
    'background:linear-gradient(135deg,rgba(255,215,0,.06),rgba(255,140,0,.04));'+
    'box-shadow:0 0 20px rgba(255,215,0,.1);'+
    'transition:all .25s;opacity:0;transition:opacity .7s .9s,all .25s;';
  btn.textContent='여정을 시작하다';

  // 튜토리얼 버튼
  var tutBtn=document.createElement('button');
  tutBtn.style.cssText='margin-top:10px;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.18);'+
    'color:rgba(255,215,0,.45);font-family:\'Share Tech Mono\',monospace;font-size:9px;'+
    'padding:7px 20px;border-radius:7px;cursor:pointer;letter-spacing:.1em;display:block;width:100%;';
  tutBtn.textContent='? 튜토리얼';
  tutBtn.onclick=function(){
    cancelAnimationFrame(animId);clearInterval(sparkInterval);
    var _a=BGM._mk('map');if(_a){_a.currentTime=0;_a.loop=true;_a.volume=0.75;BGM.setCur('map');var _p=_a.play();if(_p&&_p.catch)_p.catch(function(){});}
    if(typeof EQ!=='undefined')EQ.setMode('map');
    ov.style.transition='opacity .5s';ov.style.opacity='0';
    setTimeout(function(){ov.remove();showClockIntro(0,function(){
      showRealmBanner(0,function(){
        doTrans(function(){document.getElementById('root').innerHTML='';showField();
          setTimeout(function(){if(typeof startTutorial==='function')startTutorial();},900);
        },true);
      });
    });},500);
  };
  btn.onmouseenter=()=>{
    btn.style.background='linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,140,0,.1))';
    btn.style.boxShadow='0 0 30px rgba(255,215,0,.3)';
    btn.style.borderColor='rgba(255,215,0,.8)';
    btn.style.color='rgba(255,225,100,1)';
  };
  btn.onmouseleave=()=>{
    btn.style.background='linear-gradient(135deg,rgba(255,215,0,.06),rgba(255,140,0,.04))';
    btn.style.boxShadow='0 0 20px rgba(255,215,0,.1)';
    btn.style.borderColor='rgba(255,215,0,.45)';
    btn.style.color='rgba(255,215,0,.9)';
  };
  btn.ontouchstart=()=>btn.onmouseenter();
  btn.ontouchend=()=>btn.onmouseleave();
  btn.onclick=()=>{
    // 직접 map 오디오 생성 + play (user gesture 안에서)
    var _a=BGM._mk('map');
    if(_a){
      _a.currentTime=0;_a.loop=true;_a.volume=0.75;
      BGM.setCur('map');
      var _p=_a.play();
      if(_p)_p.catch(function(){});
      if(typeof EQ!=='undefined')EQ.setMode('map');
      BGM._mk('battle');BGM._mk('shop');
    }
    cancelAnimationFrame(animId);clearInterval(sparkInterval);
    setTimeout(function(){if(typeof TUT!=='undefined')TUT.start();},1500);
    ov.style.transition='opacity .5s';ov.style.opacity='0';
    setTimeout(()=>{
      ov.remove();
      if(typeof _achC!=='undefined'){_achC={crits:0,critBattle:0,restVisits:0,gambleWins:0,gambleRow:0,bossesKilled:[],wins:0,winRow:0,cardsTurn:0,chainMax:0,spentGold:0,fullHeals:0,bossnoDmg:false,bossRow:0,shopVisits:0,eventsDone:0,overloadUsed:0,poisonDmg:0,noDmgRun:true};}
      showClockIntro(()=>{GS={...GS,screen:'field'};showRealmBanner(0,()=>{renderScreen();});});
    },500);
  };
  content.appendChild(btn);
  ov.appendChild(content);

  // 페이드인 트리거
  requestAnimationFrame(()=>{
    setTimeout(()=>{divLine.style.width='140px';},200);
    setTimeout(()=>{titleEl.style.opacity='1';titleEl.style.transform='translateY(0)';},300);
    setTimeout(()=>{subEl.style.opacity='1';},500);
    setTimeout(()=>{tagEl.style.opacity='1';},700);
    setTimeout(()=>{btn.style.opacity='1';},900);
  });
}

/* ── BATTLE ── */

function showHandViewer(hand,energy,stasis){
  // 기존 뷰어 제거
  const old=document.getElementById('hand-viewer');if(old)old.remove();
  const bd=document.createElement('div');
  bd.id='hand-viewer';
  bd.style.cssText=`position:fixed;inset:0;z-index:8500;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:20px;`;
  bd.addEventListener('click',e=>{if(e.target===bd)bd.remove();});
  // 헤더
  const hdr=document.createElement('div');
  hdr.style.cssText=`width:100%;max-width:430px;display:flex;justify-content:space-between;align-items:center;padding:12px 18px 8px;border-bottom:1px solid #2a2a2a;`;
  const ttl=document.createElement('div');ttl.style.cssText=`font-size:10px;color:${G};font-family:'Share Tech Mono',monospace;letter-spacing:.3em;`;ttl.textContent='현재 손패 ('+hand.length+'/15)';
  const cls=document.createElement('div');cls.style.cssText='font-size:11px;color:#444;cursor:pointer;font-family:"Share Tech Mono",monospace;border:1px solid #222;border-radius:3px;padding:4px 10px;';cls.textContent='닫기';cls.onclick=()=>bd.remove();
  hdr.appendChild(ttl);hdr.appendChild(cls);bd.appendChild(hdr);
  // 카드 그리드
  const grid=document.createElement('div');
  grid.style.cssText='width:100%;max-width:430px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:14px 12px;max-height:70vh;overflow-y:auto;';
  hand.forEach(card=>{
    const can=energy>=card.cost&&!stasis;
    const ce=mkCardEl(card,!can);
    ce.style.cssText+='width:68px;height:96px;flex-shrink:0;';
    ce.addEventListener('click',()=>{
      if(can){bd.remove();playCard(card.uid);}
      else showTip(card);
    });
    grid.appendChild(ce);
  });
  bd.appendChild(grid);
  // 안내
  const hint=document.createElement('div');hint.style.cssText='font-size:8px;color:#1e1e1e;font-family:"Share Tech Mono",monospace;margin-top:6px;';hint.textContent='카드 클릭 = 사용  |  빈 곳 클릭 = 닫기';
  bd.appendChild(hint);
  document.body.appendChild(bd);
}

function renderBattle(){
  // 인텐트 div 표시 (배틀 중에만)
  const intentEl=document.getElementById('enemy-intent');
  if(intentEl)intentEl.style.display='block';
  // 체인바 display 복구
  const _cb=document.getElementById('chain-bar');
  if(_cb){
    const _s0=document.getElementById('cs-0'),_s1=document.getElementById('cs-1');
    const _ar=document.getElementById('ca-0');
    // 전투 렌더링마다 chain-bar 상태 유지 (visible 클래스는 updateChainBar가 관리)
  }
  const s=GS;const b=s.battle;if(!b)return;
  const eD=ENM[b.eid]||{};
  const root=document.getElementById('root');root.innerHTML='';root.style.display='block';
  hideField();initGears(Math.min(3,b.player.speed/5),true);
  const sc=document.createElement('div');sc.className='screen';sc.style.background=OB;sc.style.minHeight='100vh';
  const pS=(b.player.status||[]).find(s=>s.type==='stasis');
  const eS=(b.enemy.status||[]).find(s=>s.type==='stasis');
  const nA=b.enemy.pat?.[b.pidx%b.enemy.pat.length];
  // realm tint background
  const realm=REALMS[GS.realmIdx||0];
  const bgTint=document.createElement('div');bgTint.style.cssText=`position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,${realm.accent}88 0%,transparent 65%);pointer-events:none;z-index:0;`;sc.appendChild(bgTint);
  const nScan=document.createElement('div');nScan.className='battle-neon-scan';sc.appendChild(nScan);
  const _hpR=b.player.axis/(b.player.maxAxis||1);
  if(_hpR<0.3){
    const magVig=document.createElement('div');
    const magAlpha=_hpR<0.15?'44':'1A';
    const magSpd=_hpR<0.15?'.8':'1.8';
    magVig.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:2;'+'background:radial-gradient(ellipse at center,transparent 40%,'+CR+magAlpha+' 100%)'+'animation:magFlare '+magSpd+'s ease infinite;';
    sc.appendChild(magVig);
  }
  // BG gears
  const bg1=document.createElement('div');bg1.style.cssText='position:absolute;right:-40px;top:10%;opacity:.04;pointer-events:none;z-index:0;';bg1.appendChild(mkgs(220,realm.gearClr,false,.22));sc.appendChild(bg1);
  const bg2=document.createElement('div');bg2.style.cssText='position:absolute;left:-40px;bottom:18%;opacity:.03;pointer-events:none;z-index:0;';bg2.appendChild(mkgs(170,CR,true,.16));sc.appendChild(bg2);
  // ENEMY
  const eSec=document.createElement('div');eSec.style.cssText='padding:56px 18px 0;display:flex;flex-direction:column;gap:8px;position:relative;z-index:1;';
  if(eD.type==='boss'){const aura=document.createElement('div');aura.style.cssText='position:absolute;top:28px;left:50%;transform:translateX(-50%);width:260px;height:260px;pointer-events:none;z-index:0;';[120,165,210].forEach((sz,i)=>{const g=document.createElement('div');g.style.cssText=`position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:.055;animation:${i%2?'gL':'gR'} ${8+i*3}s linear infinite;transform-box:fill-box;transform-origin:50% 50%;`;const asvg=document.createElementNS('http://www.w3.org/2000/svg','svg');asvg.setAttribute('width',sz);asvg.setAttribute('height',sz);asvg.setAttribute('viewBox',`0 0 ${sz} ${sz}`);const agg=document.createElementNS('http://www.w3.org/2000/svg','g');agg.setAttribute('style',`animation:${i%2?'gL':'gR'} ${8+i*3}s linear infinite;transform-origin:50% 50%;transform-box:fill-box;`);const ap=document.createElementNS('http://www.w3.org/2000/svg','path');ap.setAttribute('d',gp(sz/2,sz/2,sz*.46,sz*.3,12+i*2));ap.setAttribute('fill',eD.cr||CR);agg.appendChild(ap);asvg.appendChild(agg);g.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:.055;';g.appendChild(asvg);aura.appendChild(g);});eSec.appendChild(aura);}
  // intent
  const intent=document.createElement('div');intent.style.cssText='text-align:center;min-height:18px;position:relative;z-index:1;';
  if(eS)intent.innerHTML=`<div style="font-size:10px;color:#AAAAFF;font-family:'Share Tech Mono',monospace;animation:pulse 1s ease infinite;">시간 정지 (${eS.turns}턴 남음)</div>`;
  else if(nA){const at=nA.t==='atk'?`${nA.lbl} (${nA.v} 피해)`:nA.t==='multi'?`${nA.lbl} (${nA.v}×${nA.hits}회)`:nA.lbl;intent.innerHTML=`<div style="font-size:9px;color:${CR};font-family:'Share Tech Mono',monospace;letter-spacing:.08em;">다음: ${at}</div>`;}
  eSec.appendChild(intent);
  // enemy entity
  const eEW=document.createElement('div');eEW.style.cssText='display:flex;justify-content:center;margin-bottom:8px;z-index:1;position:relative;';
  const eSp=document.createElement('div');eSp.id='ent-enemy';eSp.className='ew';
  const eSpB=document.createElement('div');eSpB.className='esp';eSpB.style.cssText=`width:96px;height:96px;border:2px solid ${eD.cr||CR};background:radial-gradient(circle at 40% 38%,${(eD.cr||CR)}44,${OB});box-shadow:0 0 24px ${(eD.cr||CR)}66;color:${eD.cr||CR};font-family:'Cinzel Decorative',serif;font-size:24px;font-weight:900;animation:bossIn .6s cubic-bezier(.34,1.56,.64,1);`;
  eSpB.textContent=eD.glyph||'?';
  const eGW=document.createElement('div');eGW.style.cssText='position:absolute;opacity:.08;pointer-events:none;';eGW.appendChild(mkgs(90,eD.cr||CR,false,.32));eSpB.appendChild(eGW);
  eSp.appendChild(eSpB);
  const eNm=document.createElement('div');eNm.className='enm';eNm.style.color=eD.cr||CR;eNm.textContent=b.enemy.name;eSp.appendChild(eNm);
  const eSt=document.createElement('div');eSt.className='est';
  if(eS){const sb=document.createElement('div');sb.className='sbg';sb.style.cssText='color:#AAAAFF;border:1px solid #AAAAFF;background:rgba(100,100,200,.1);';sb.textContent='정지';eSt.appendChild(sb);}
  if((b.enemy.status||[]).find(s=>s.type==='speed_up')){const sb=document.createElement('div');sb.className='sbg';sb.style.cssText=`color:${G};border:1px solid ${G};`;sb.textContent='속도↑';eSt.appendChild(sb);}
  // 과부하 스택
  const eOv=(b.enemy.stacks||{}).overload||0;if(eOv>0){const sb=document.createElement('div');sb.className='stack-badge stack-overload';sb.textContent=`과부하 ${eOv}`;eSt.appendChild(sb);}
  const eWd=(b.enemy.stacks||{}).wound||0;if(eWd>0){const sb=document.createElement('div');sb.className='stack-badge stack-wound';sb.textContent=`상처 ${eWd}`;eSt.appendChild(sb);}
  eSp.appendChild(eSt);eEW.appendChild(eSp);eSec.appendChild(eEW);
  const eBs=document.createElement('div');eBs.style.cssText='padding:0 16px;display:flex;flex-direction:column;gap:5px;z-index:1;position:relative;';
  eBs.appendChild(mkBarSimple(b.enemy.axis,b.enemy.maxAxis,`linear-gradient(90deg,${CR},#CC2222)`,'축'));
  eBs.appendChild(mkBarSimple(b.enemy.cog,100,'linear-gradient(90deg,#2244AA,#3366CC)','톱니'));
  eBs.appendChild(mkBarSimple(b.enemy.battery,100,'linear-gradient(90deg,#333366,#AAAAFF)','방전',true));
  eSec.appendChild(eBs);sc.appendChild(eSec);
  // divider
  const dv=document.createElement('div');dv.className='dvl';
  dv.style.cssText+='position:relative;';
  const dvGlow=document.createElement('div');dvGlow.style.cssText=`position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60%;height:1px;background:linear-gradient(90deg,transparent,${DG}44,${G}88,${DG}44,transparent);filter:blur(1px);pointer-events:none;`;
  dv.appendChild(dvGlow);const dl=document.createElement('div');dl.className='dvl-l';const dr=document.createElement('div');dr.className='dvl-l';dv.appendChild(dl);dv.appendChild(mkgs(16,DG,false,.8));dv.appendChild(dr);sc.appendChild(dv);
  // PLAYER
  const pSec=document.createElement('div');pSec.style.cssText='padding:0 18px;display:flex;flex-direction:column;gap:7px;z-index:1;position:relative;';
  const pRow=document.createElement('div');pRow.style.cssText='display:flex;align-items:center;gap:12px;';
  const pEnt=document.createElement('div');pEnt.id='ent-player';pEnt.className='ew';
  const pSpB=document.createElement('div');pSpB.className='esp';pSpB.style.cssText=`width:70px;height:70px;border-radius:50%;border:2px solid ${G};background:radial-gradient(circle at 40% 38%,${G}1F,${OB});box-shadow:0 0 16px ${G}66;color:${G};font-family:'Cinzel Decorative',serif;font-size:18px;font-weight:900;`;pSpB.textContent='I';
  pEnt.appendChild(pSpB);const pNm=document.createElement('div');pNm.className='enm';pNm.style.color=G;pNm.textContent='I';pEnt.appendChild(pNm);
  const pSt=document.createElement('div');pSt.className='est';
  if(pS){const sb=document.createElement('div');sb.className='sbg';sb.style.cssText='color:#AAAAFF;border:1px solid #AAAAFF;';sb.textContent='정지';pSt.appendChild(sb);}
  if((b.player.status||[]).find(s=>s.type==='speed_up')){const sb=document.createElement('div');sb.className='sbg';sb.style.cssText=`color:${G};border:1px solid ${G};`;sb.textContent='속도↑';pSt.appendChild(sb);}
  const pOv=(b.player.stacks||{}).overload||0;if(pOv>0){const sb=document.createElement('div');sb.className='stack-badge stack-overload';sb.textContent=`과부하 ${pOv}`;pSt.appendChild(sb);}
  const pWd=(b.player.stacks||{}).wound||0;if(pWd>0){const sb=document.createElement('div');sb.className='stack-badge stack-wound';sb.textContent=`상처 ${pWd}`;pSt.appendChild(sb);}
  const pRg=(b.player.stacks||{}).regen||0;if(pRg>0){const sb=document.createElement('div');sb.className='stack-badge stack-rg';sb.style.cssText='background:rgba(180,140,0,.2);color:#FFD700;border:1px solid #B8860B;font-size:8px;padding:1px 5px;border-radius:2px;font-family:\'Share Tech Mono\',monospace;';sb.textContent=`재생 ${pRg}`;pSt.appendChild(sb);}
  const pEl=(b.player.stacks||{}).energy_lock||0;if(pEl>0){const sb=document.createElement('div');sb.className='sbg';sb.style.cssText='color:#FF8888;border:1px solid #CC4444;';sb.textContent=`에너지 잠금 ${pEl}`;pSt.appendChild(sb);}
  pEnt.appendChild(pSt);pRow.appendChild(pEnt);
  const pBs=document.createElement('div');pBs.style.cssText='flex:1;display:flex;flex-direction:column;gap:5px;';
  pBs.appendChild(mkBarSimple(b.player.axis,b.player.maxAxis,'linear-gradient(90deg,#117733,#33CC66)','축'));
  pBs.appendChild(mkBarSimple(b.player.cog,100,'linear-gradient(90deg,#2244AA,#4488FF)','톱니'));
  pBs.appendChild(mkBarSimple(b.player.battery,100,'linear-gradient(90deg,#333366,#8888FF)','방전',true));
  pRow.appendChild(pBs);pSec.appendChild(pRow);
  // turn/energy
  const iRow=document.createElement('div');iRow.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-top:2px;';
  const iL=document.createElement('div');iL.style.cssText=`font-size:9px;color:#333;font-family:'Share Tech Mono',monospace;`;iL.textContent=`속도:${b.player.speed}  턴:${b.turn}`;
  if(b.turn%5===4){const sp=document.createElement('span');sp.style.cssText=`color:${G};margin-left:5px;`;sp.textContent='★다음: 천상의 턴';iL.appendChild(sp);}
  iRow.appendChild(iL);
  const eRow=document.createElement('div');eRow.style.cssText='display:flex;gap:3px;align-items:center;';
  const eMax=b.maxEnergy+(pEl>0?-1:0);
  for(let i=0;i<=b.maxEnergy;i++){const d=document.createElement('div');d.style.cssText=`width:13px;height:13px;border-radius:50%;background:${i<b.energy?`radial-gradient(circle,${G},${DG})`:'#111'};border:1px solid ${i<b.energy?G:'#222'};box-shadow:${i<b.energy?`0 0 5px ${G}`:'none'};transition:all .2s;`;eRow.appendChild(d);}
  const eCnt=document.createElement('span');eCnt.style.cssText=`font-size:9px;color:${G};font-family:'Share Tech Mono',monospace;margin-left:2px;`;eCnt.textContent=b.energy;eRow.appendChild(eCnt);
  // 에너지 도트 인디케이터
  const enDots=document.createElement('div');
  enDots.style.cssText='display:flex;gap:2px;margin-left:4px;align-items:center;';
  const maxEn=b.maxEnergy+(b.turn%5===0?1:0);
  for(let di=0;di<maxEn;di++){
    const dot=document.createElement('span');
    dot.className='en-dot '+(di<b.energy?'full':'used');
    enDots.appendChild(dot);
  }
  eRow.appendChild(enDots);
  iRow.appendChild(eRow);pSec.appendChild(iRow);
  if((b.delayed||[]).length){const dl=document.createElement('div');dl.style.cssText=`font-size:9px;color:#AA44AA;font-family:'Share Tech Mono',monospace;text-align:center;`;dl.textContent=`지연 폭탄 ${b.delayed.length}개 활성`;pSec.appendChild(dl);}
  sc.appendChild(pSec);
  // ACTION BUTTONS
  const aRow=document.createElement('div');aRow.style.cssText='padding:8px 18px 0;display:flex;gap:8px;justify-content:flex-end;';
  const dBtn=document.createElement('div');dBtn.className='btn btn-a';dBtn.style.cssText=`border-color:${b.drawUsed?DG:DG};color:${b.drawUsed?DG:DG};cursor:pointer;opacity:${b.drawUsed?.45:1};`;dBtn.textContent='드로우  [F]';
  dBtn.onclick=()=>{
    if(typeof SFX!=='undefined')SFX.draw();
    if(!GS.battle)return;
    if(GS.battle.drawUsed){showNotif('이번 턴 드로우 사용 완료',DG);return;}
    if(GS.battle.hand.length>=15){showNotif('손패 가득 (MAX 15장)',DG);return;}
    const prev=GS.battle;
    GS={...GS,battle:{...drawN(GS.battle,3),drawUsed:true}};
    procVFX({...GS,battle:prev},GS);renderBattle();
  };
  const eBtn=document.createElement('div');eBtn.className='btn btn-a';eBtn.style.cssText=`border-color:${CR};color:${CR};cursor:pointer;`;eBtn.textContent='턴 종료  [G]';eBtn.onclick=endTurn;
  aRow.appendChild(dBtn);aRow.appendChild(eBtn);sc.appendChild(aRow);
  const cInfo=document.createElement('div');cInfo.style.cssText=`display:flex;justify-content:center;gap:18px;padding:5px 0;font-size:9px;color:#222;font-family:'Share Tech Mono',monospace;`;const expiring=b.hand.filter(c=>(c.drawnAt!==undefined)&&(c.drawnAt+1===b.turn)).length;
  cInfo.textContent=`덱:${b.draw.length}  손패:${b.hand.length}  묘지:${b.disc.length}  T${b.turn}`;
  if(expiring>0){cInfo.style.color=CR;cInfo.textContent+=`  ⚠${expiring}소멸예정`;}
  else{cInfo.style.color='#222';}sc.appendChild(cInfo);
  // HAND FAN
  const hc=document.createElement('div');hc.style.cssText='position:relative;height:152px;display:flex;justify-content:center;align-items:flex-end;padding-bottom:8px;overflow:visible;z-index:2;';
  // 10장 초과: 최근 10장만 부채꼴 표시, 나머지는 더미 뱃지
  const SHOW_MAX=10;
  const overflowCards=b.hand.length>SHOW_MAX?b.hand.slice(0,b.hand.length-SHOW_MAX):[];
  const visCards=b.hand.length>SHOW_MAX?b.hand.slice(b.hand.length-SHOW_MAX):b.hand;
  const mid=(visCards.length-1)/2;
  visCards.forEach((card,i)=>{
    const off=i-mid;const rot=off*5.5,tx=off*30,ty=Math.abs(off)*5.5;
    const can=b.energy>=card.cost&&!pS;
    const isExpiring=(card.drawnAt!==undefined)&&(card.drawnAt+1===b.turn);
    const wrap=document.createElement('div');wrap.className='hcw';wrap.style.cssText=`position:absolute;bottom:8px;left:50%;transform:translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg);transform-origin:50% 145%;z-index:${i+10};`;
    const ce=mkCardEl(card,!can);
    if(isExpiring){
      ce.style.boxShadow=`0 0 14px ${CR},0 0 4px ${CR}`;
      ce.style.animation='magFlare .7s ease infinite';
      // 소멸 카운트 뱃지
      const exBadge=document.createElement('div');
      exBadge.style.cssText=`position:absolute;top:-8px;right:-6px;background:${CR};color:#fff;font-size:7px;font-family:'Share Tech Mono',monospace;font-weight:700;border-radius:3px;padding:1px 4px;z-index:10;white-space:nowrap;box-shadow:0 0 6px ${CR};`;
      exBadge.textContent='소멸';ce.style.position='relative';ce.appendChild(exBadge);
    }
    let pt=null;
    ce.addEventListener('mousedown',()=>{pt=setTimeout(()=>showTip(card),520);});
    ce.addEventListener('mouseup',()=>clearTimeout(pt));
    ce.addEventListener('touchstart',()=>{pt=setTimeout(()=>showTip(card),520);},{passive:true});
    ce.addEventListener('touchend',()=>clearTimeout(pt));
    ce.addEventListener('click',()=>{if(can)playCard(card.uid);});
    wrap.appendChild(ce);hc.appendChild(wrap);
  });
  // 10장 초과 시 좌측에 카드 더미 뱃지 표시
  if(overflowCards.length>0){
    const pile=document.createElement('div');
    pile.className='hand-pile-btn';pile.style.cssText=`position:absolute;left:4px;bottom:12px;width:44px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(155deg,${G}22,${DOB});border:1.5px solid ${G};border-radius:7px;cursor:pointer;z-index:50;`;
    const pNum=document.createElement('div');pNum.style.cssText=`font-size:16px;font-weight:700;color:${G};font-family:'Share Tech Mono',monospace;`;pNum.textContent='+'+overflowCards.length;
    const pLbl=document.createElement('div');pLbl.style.cssText='font-size:7px;color:#888;font-family:"Share Tech Mono",monospace;margin-top:2px;letter-spacing:.05em;';pLbl.textContent='손패';
    pile.appendChild(pNum);pile.appendChild(pLbl);
    pile.addEventListener('click',()=>showHandViewer(b.hand,b.energy,!!pS));
    hc.appendChild(pile);
  }
  sc.appendChild(hc);root.appendChild(sc);
  if(b.showUlt)showUltOverlay();
  // AP HUD 업데이트
  if(GS.battle)updateIntentUI(GS.battle);
}

/* ── GAME OVER ── */
function renderGO(){
  const root=document.getElementById('root');root.innerHTML='';root.style.display='block';initGears(0.3,true);
  const sc=document.createElement('div');sc.className='screen';sc.style.cssText=`background:radial-gradient(ellipse at center,#0d0004 0%,#020204 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:40px;text-align:center;min-height:100vh;position:relative;overflow:hidden;`;
  const ico=document.createElement('div');ico.style.cssText=`width:68px;height:68px;margin:0 auto;color:${CR};animation:pulse 2.5s ease infinite;filter:drop-shadow(0 0 20px ${CR});`;ico.innerHTML=IC.clock;sc.appendChild(ico);
  const ht=document.createElement('div');ht.style.cssText=`font-size:26px;font-weight:900;font-family:'Cinzel',serif;color:${CR};letter-spacing:.22em;text-shadow:0 0 24px ${CR};`;ht.textContent='시간 정지';sc.appendChild(ht);
  const sub=document.createElement('div');sub.style.cssText=`font-size:10px;color:#2a2a2a;font-family:'Noto Serif KR',serif;line-height:2.2;max-width:280px;white-space:pre-line;`;sub.textContent='축이 붕괴되었다.\n톱니가 멈춘다.\n이것은 끝이 아니다—\n탈출구 없는 정지.';sc.appendChild(sub);
  const realm=REALMS[GS.realmIdx||0];if(realm){const rl=document.createElement('div');rl.style.cssText=`font-size:9px;color:#2a2a2a;font-family:'Share Tech Mono',monospace;letter-spacing:.2em;`;rl.textContent=`구역 ${realm.num} — ${realm.name}에서 종말`;sc.appendChild(rl);}
  const btn=document.createElement('div');btn.className='btn btn-a';btn.style.cssText=`margin-top:20px;border-color:${CR};color:${CR};padding:12px 40px;font-size:12px;cursor:pointer;letter-spacing:.18em;`;btn.textContent='시스템 재시작';btn.onclick=()=>{if(typeof _achC!=='undefined'){_achC={crits:0,critBattle:0,restVisits:0,gambleWins:0,gambleRow:0,bossesKilled:[],wins:0,winRow:0,cardsTurn:0,chainMax:0,spentGold:0,fullHeals:0,bossnoDmg:false,bossRow:0,shopVisits:0,eventsDone:0,overloadUsed:0,poisonDmg:0,noDmgRun:true};}GS=initGame();renderScreen();};sc.appendChild(btn);root.appendChild(sc);
}

/* ── VICTORY ── */
function renderVic(){
  const root=document.getElementById('root');root.innerHTML='';root.style.display='block';initGears(1.5,false);
  const sc=document.createElement('div');sc.className='screen';sc.style.cssText=`background:${OB};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;text-align:center;min-height:100vh;position:relative;overflow:hidden;`;
  [0,1,2,3,4].forEach(i=>{const gw=document.createElement('div');gw.style.cssText=`position:absolute;left:${5+i*18}%;top:${8+(i%2)*35}%;opacity:${.05+i*.02};pointer-events:none;`;gw.appendChild(mkgs(45+i*28,G,i%2===0,.28+i*.14));sc.appendChild(gw);});
  const sl=document.createElement('div');sl.style.cssText=`font-size:10px;color:${DG};font-family:'Share Tech Mono',monospace;letter-spacing:.4em;margin-bottom:8px;z-index:2;`;sl.textContent='시스템 해결됨';sc.appendChild(sl);
  const mt=document.createElement('div');mt.style.cssText=`font-size:52px;font-weight:900;font-family:'Cinzel Decorative',serif;background:linear-gradient(155deg,${G},#FFF0AA,${DG});-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 30px ${G}99);z-index:2;`;mt.textContent='XII';sc.appendChild(mt);
  const st=document.createElement('div');st.style.cssText=`font-size:12px;color:${G};font-family:'Cinzel',serif;letter-spacing:.18em;margin-bottom:6px;z-index:2;`;st.textContent='조디악이 쓰러지다';sc.appendChild(st);
  const ln=document.createElement('div');ln.style.cssText=`width:80px;height:1px;background:${G}44;z-index:2;`;sc.appendChild(ln);
  const bd=document.createElement('div');bd.style.cssText=`font-size:10px;color:#444;font-family:'Noto Serif KR',serif;line-height:2.2;max-width:290px;z-index:2;margin-top:8px;white-space:pre-line;`;bd.textContent='최후의 시계가 산산이 부서진다.\n시간이 수정되었기 때문이 아니라—\n당신이 그것을 어떻게 정의할지 선택했기 때문에.\n\n남은 것은 당신의 것이다.';sc.appendChild(bd);
  const btn=document.createElement('div');btn.className='btn btn-g';btn.style.cssText='margin-top:16px;z-index:2;cursor:pointer;';btn.textContent='다시 시작';btn.onclick=()=>{if(typeof _achC!=='undefined'){_achC={crits:0,critBattle:0,restVisits:0,gambleWins:0,gambleRow:0,bossesKilled:[],wins:0,winRow:0,cardsTurn:0,chainMax:0,spentGold:0,fullHeals:0,bossnoDmg:false,bossRow:0,shopVisits:0,eventsDone:0,overloadUsed:0,poisonDmg:0,noDmgRun:true};}GS=initGame();renderScreen();};sc.appendChild(btn);root.appendChild(sc);
}

/* ═══════════════════════════════════════════════════════
   KEYBOARD
═══════════════════════════════════════════════════════ */
document.addEventListener('keydown',e=>{
  const s=GS;
  if(s.screen==='battle'&&s.battle){
    if(e.key==='f'||e.key==='F'){const prev=GS.battle;GS={...GS,battle:drawN(GS.battle,1)};procVFX({...GS,battle:prev},GS);renderBattle();}
    if(e.key==='g'||e.key==='G')endTurn();
  }
});
window.addEventListener('scroll',()=>{updateFUI();},true);
window.addEventListener('resize',()=>{if(GS.screen==='field'){drawFieldBg(GS.realmIdx||0);renderNodes();}});


/* ════════════ 4면 이퀄라이저 ════════════ */
var EQ=(function(){
  var _mode='idle',_raf=null,_opacity=0;
  var IDS=['eq-top','eq-bottom','eq-left','eq-right'];

  /* eq-bottom 위치 업데이트 */
  function _repoBottom(){
    var cvB=document.getElementById('eq-bottom');if(!cvB)return;
    var fui=document.getElementById('fui');
    var fuiH=(fui&&fui.style.display!=='none'&&fui.offsetHeight>0)?fui.offsetHeight:0;
    cvB.style.bottom=fuiH+'px';
  }

  function setMode(m){
    _mode=m;
    if(m==='idle'){
      _fadeOutEQ();
    } else {
      IDS.forEach(function(id){
        var c=document.getElementById(id);if(c){c.style.display='block';c.style.opacity='0';}
      });
      _repoBottom();
      _opacity=0;
      if(!_raf)_tick();
    }
  }

  function reposition(){_repoBottom();}

  function _fadeOutEQ(){
    var start=Date.now();
    var iv=setInterval(function(){
      var p=Math.max(0,1-(Date.now()-start)/600);
      IDS.forEach(function(id){
        var c=document.getElementById(id);if(c)c.style.opacity=p;
      });
      if(p<=0){
        clearInterval(iv);
        IDS.forEach(function(id){
          var c=document.getElementById(id);if(c)c.style.display='none';
        });
        if(_raf){cancelAnimationFrame(_raf);_raf=null;}
        for(var i=0;i<_v.length;i++)_v[i]=0;
      }
    },30);
  }

  var _v=new Float32Array(64);

  function _tick(){
    if(_mode==='idle'){return;}
    _raf=requestAnimationFrame(_tick);
    var T=Date.now()*0.001;

    // 전투: 빨강/주황, 맵: 골드, 상점: 민트
    var hB=_mode==='battle'?0:_mode==='shop'?140:42;
    var sat=_mode==='battle'?95:88;
    var lit=_mode==='battle'?58:62;

    // 주파수 데이터
    var an=window._eqAn||null;
    var buf=an?new Uint8Array(an.frequencyBinCount):null;
    if(an&&buf){an.getByteFrequencyData(buf);}

    // 페이드인
    if(_opacity<1)_opacity=Math.min(1,_opacity+0.04);
    IDS.forEach(function(id){
      var c=document.getElementById(id);if(c)c.style.opacity=_opacity*(id==='eq-top'||id==='eq-left'||id==='eq-right'?0.75:0.9);
    });

    // 스무딩
    for(var i=0;i<_v.length;i++){
      var raw;
      if(buf){
        var idx=Math.floor(i/_v.length*buf.length*0.75);
        raw=buf[idx]/255;
      } else {
        var f=i/_v.length;
        raw=Math.max(0,Math.sin(T*2.9+f*7.8)*0.3+Math.sin(T*1.4+f*11)*0.2+0.1);
      }
      _v[i]+=(Math.min(1,raw*0.63)-_v[i])*0.28;
    }

    function dH(id,flip){
      var cv=document.getElementById(id);if(!cv)return;
      var W=cv.offsetWidth||cv.width,H=cv.offsetHeight||cv.height;
      if(cv.width!==W&&W>0)cv.width=W;
      if(cv.height!==H&&H>0)cv.height=H;
      var ctx=cv.getContext('2d'),N=36,bw=W/N-0.8;
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<N;i++){
        var vi=Math.floor((flip?N-1-i:i)/N*(_v.length-1));
        var val=_v[vi],h=Math.max(2,val*H),hue=hB+val*25;
        var grd=ctx.createLinearGradient(0,flip?0:H,0,flip?h:H-h);
        grd.addColorStop(0,'hsla('+hue+','+sat+'%,'+(lit+10)+'%,'+(0.15+val*0.5)+')');
        grd.addColorStop(1,'hsla('+hue+','+sat+'%,'+lit+'%,'+(0.55+val*0.4)+')');
        ctx.fillStyle=grd;
        flip?ctx.fillRect(i*(bw+0.8),0,bw,h):ctx.fillRect(i*(bw+0.8),H-h,bw,h);
        // 피크 하이라이트
        if(h>6){
          ctx.fillStyle='hsla('+(hue+10)+','+(sat+5)+'%,85%,'+(val*0.8)+')';
          flip?ctx.fillRect(i*(bw+0.8),h-2,bw,2):ctx.fillRect(i*(bw+0.8),H-h,bw,2);
        }
      }
    }
    function dV(id,rev){
      var cv=document.getElementById(id);if(!cv)return;
      var W=cv.offsetWidth||cv.width,H=cv.offsetHeight||cv.height;
      if(cv.width!==W&&W>0)cv.width=W;
      if(cv.height!==H&&H>0)cv.height=H;
      var ctx=cv.getContext('2d'),N=32,bh=H/N-0.8;
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<N;i++){
        var vi=Math.floor((rev?N-1-i:i)/N*(_v.length-1));
        var val=_v[vi],w=Math.max(2,val*W),hue=hB+val*25;
        var grd=ctx.createLinearGradient(rev?W:0,0,rev?W-w:w,0);
        grd.addColorStop(0,'hsla('+hue+','+sat+'%,'+(lit+10)+'%,'+(0.15+val*0.5)+')');
        grd.addColorStop(1,'hsla('+hue+','+sat+'%,'+lit+'%,'+(0.5+val*0.4)+')');
        ctx.fillStyle=grd;
        rev?ctx.fillRect(W-w,i*(bh+0.8),w,bh):ctx.fillRect(0,i*(bh+0.8),w,bh);
        if(w>6){
          ctx.fillStyle='hsla('+(hue+10)+','+(sat+5)+'%,85%,'+(val*0.75)+')';
          rev?ctx.fillRect(W-w,i*(bh+0.8),2,bh):ctx.fillRect(w-2,i*(bh+0.8),2,bh);
        }
      }
    }

    dH('eq-bottom',false);dH('eq-top',true);
    dV('eq-left',false);dV('eq-right',true);
  }

  return{setMode:setMode,reposition:reposition};
})();
function stopEQ(){if(typeof EQ!=='undefined')EQ.setMode('idle');}
function drawEQ(){}

function stopEQ(){if(typeof EQ!=='undefined')EQ.stop();}
function drawEQ(){}

function stopEQ(){if(typeof EQ!=="undefined")EQ.stop();}
function drawEQ(){}

/* ════════════ SFX 효과음 시스템 ════════════ */
var SFX=(function(){
  var _vol=0.7;
  var _riverPlaying=false;

  function play(id, vol){
    var el=document.getElementById(id);
    if(!el)return;
    try{
      el.currentTime=0;
      el.volume=Math.min(1,(vol||_vol));
      var p=el.play();
      if(p&&p.catch)p.catch(function(){});
    }catch(e){}
  }

  function riverStart(){
    var el=document.getElementById('sfx-river');
    if(!el||_riverPlaying)return;
    _riverPlaying=true;
    el.volume=0.22;
    el.currentTime=0;
    var p=el.play();if(p&&p.catch)p.catch(function(){});
  }
  function riverStop(){
    var el=document.getElementById('sfx-river');
    if(!el||!_riverPlaying)return;
    _riverPlaying=false;
    // 부드럽게 페이드아웃
    var v=el.volume;
    var iv=setInterval(function(){
      v-=0.03;if(v<=0){clearInterval(iv);el.pause();el.volume=0.22;}
      else el.volume=v;
    },60);
  }

  return{
    draw:  function(){play('sfx-draw', 0.65);},
    card:  function(){play('sfx-card', 0.55);},
    walk:  function(){play('sfx-walk', 0.5);},
    hit:   function(){play('sfx-hit',  0.7);},
    clock: function(){play('sfx-clock', 0.8);},
    riverStart: riverStart,
    riverStop:  riverStop
  };
})();

/* ════════════ 튜토리얼 시스템 ════════════ */
var TUT={
  _step:0,_active:false,_ov:null,
  steps:[
    {
      title:'어리석은 자의 시계에 오신 것을 환영합니다',
      body:'당신은 파괴된 시계 세계를 여행합니다.\n태엽이 다 풀리기 전에 12개 구역을 돌파하세요.',
      target:null,pos:'center'
    },
    {
      title:'맵 이동',
      body:'빛나는 노드를 탭하여 이동하세요.\n각 노드마다 다른 사건이 기다립니다.',
      target:'fnodes',pos:'top'
    },
    {
      title:'어리석은 자의 시계',
      body:'오른쪽 아래 시계를 탭하면 현재 태엽 상태를 볼 수 있습니다.\n보스를 처치할 때마다 태엽이 감깁니다.',
      target:'map-clock',pos:'left'
    },
    {
      title:'전투 기초',
      body:'에너지를 소비해 카드를 냅니다.\n턴 종료 버튼으로 적의 차례가 됩니다.\n적의 의도를 읽고 대응하세요!',
      target:null,pos:'center'
    },
    {
      title:'카드 시스템',
      body:'⚔ 공격: 적에게 피해\n🛡 방어: 이번 턴 피해 감소\n⚙ 기술: 특수 효과\n✦ 콤보: 조건 달성 시 강화',
      target:null,pos:'center'
    },
    {
      title:'카드 덱',
      body:'전투 후 새 카드를 획득합니다.\n상점에서 카드를 구매하고\n휴식 노드에서 카드를 제거하세요.',
      target:null,pos:'center'
    },
    {
      title:'준비됐습니까?',
      body:'시계는 멈추지 않습니다.\n행운을 빕니다.',
      target:null,pos:'center'
    }
  ],

  start:function(){
    if(localStorage.getItem('tut_done'))return;
    TUT._active=true;TUT._step=0;TUT._show();
  },
  skip:function(){
    localStorage.setItem('tut_done','1');
    if(TUT._ov)TUT._ov.remove();
    TUT._active=false;
  },
  next:function(){
    TUT._step++;
    if(TUT._step>=TUT.steps.length){TUT.skip();return;}
    TUT._show();
  },
  _show:function(){
    if(TUT._ov)TUT._ov.remove();
    var s=TUT.steps[TUT._step];
    if(!s){TUT.skip();return;}
    var ov=document.createElement('div');
    TUT._ov=ov;
    ov.style.cssText='position:fixed;inset:0;z-index:9800;pointer-events:all;';

    // 반투명 배경
    var bg=document.createElement('div');
    bg.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(2px);';
    bg.onclick=function(e){if(e.target===bg)TUT.next();};
    ov.appendChild(bg);

    // 말풍선 박스
    var box=document.createElement('div');
    box.style.cssText='position:absolute;left:50%;transform:translateX(-50%);'+
      'width:min(340px,90vw);background:rgba(4,4,14,0.98);'+
      'border:1px solid rgba(255,215,0,0.3);border-radius:14px;padding:22px 20px;'+
      'box-shadow:0 0 30px rgba(255,215,0,0.12),0 0 60px rgba(0,0,0,0.5);'+
      'animation:popIn 0.3s ease;';
    box.style.top=s.pos==='top'?'15%':'50%';
    if(s.pos==='center')box.style.transform='translate(-50%,-50%)';

    // 진행 표시
    var prog=document.createElement('div');
    prog.style.cssText='display:flex;gap:5px;margin-bottom:14px;';
    for(var i=0;i<TUT.steps.length;i++){
      var dot=document.createElement('div');
      dot.style.cssText='width:'+(i===TUT._step?'18':'6')+'px;height:6px;border-radius:3px;'+
        'background:'+(i===TUT._step?'#FFD700':i<TUT._step?'rgba(255,215,0,0.4)':'rgba(255,255,255,0.1)')+';'+
        'transition:all 0.3s;';
      prog.appendChild(dot);
    }
    box.appendChild(prog);

    // 제목
    var title=document.createElement('div');
    title.style.cssText="font-family:'Cinzel Decorative',serif;font-size:12px;color:#FFD700;"+
      "letter-spacing:.08em;margin-bottom:10px;line-height:1.6;";
    title.textContent=s.title;box.appendChild(title);

    // 내용
    var body=document.createElement('div');
    body.style.cssText="font-family:'Noto Serif KR',serif;font-size:10px;color:rgba(212,196,154,0.85);"+
      "line-height:2.1;white-space:pre-line;margin-bottom:18px;";
    body.textContent=s.body;box.appendChild(body);

    // 버튼 영역
    var btns=document.createElement('div');
    btns.style.cssText='display:flex;gap:8px;justify-content:flex-end;';

    // 건너뛰기
    if(TUT._step===0){
      var skip=document.createElement('button');
      skip.style.cssText='font-family:\'Share Tech Mono\',monospace;font-size:8px;color:#666;'+
        'background:none;border:1px solid #333;border-radius:6px;padding:6px 12px;cursor:pointer;'+
        'letter-spacing:.1em;';
      skip.textContent='건너뛰기';
      skip.onclick=function(){TUT.skip();};
      btns.appendChild(skip);
    }

    // 다음/완료
    var next=document.createElement('button');
    var isLast=(TUT._step===TUT.steps.length-1);
    next.style.cssText='font-family:\'Share Tech Mono\',monospace;font-size:9px;'+
      'background:rgba(255,215,0,0.12);border:1px solid rgba(255,215,0,0.4);'+
      'color:#FFD700;border-radius:6px;padding:7px 16px;cursor:pointer;letter-spacing:.12em;'+
      'animation:btnClick 0.2s ease;';
    next.textContent=isLast?'시작하기 ▶':'다음 →';
    next.onclick=function(){TUT.next();};
    btns.appendChild(next);
    box.appendChild(btns);

    // 탭 힌트
    var hint=document.createElement('div');
    hint.style.cssText='text-align:center;font-family:\'Share Tech Mono\',monospace;'+
      'font-size:7px;color:rgba(255,255,255,0.2);margin-top:10px;letter-spacing:.15em;';
    hint.textContent='화면 탭으로 넘기기';
    box.appendChild(hint);

    ov.appendChild(box);
    document.body.appendChild(ov);
  }
};

/* ════════════════════ 튜토리얼 ════════════════════ */
var TUTORIAL_STEPS=[
  {
    target:'#fui',anchor:'top',
    title:'전투 인터페이스',
    text:'이곳이 전투 화면입니다.\n아래 손패에서 카드를 선택해 적을 공격하세요.'
  },
  {
    target:'#hand',anchor:'top',
    title:'손패 (Hand)',
    text:'매 턴 시작 시 카드를 뽑습니다.\n카드를 탭하면 선택되고 다시 탭하면 사용합니다.'
  },
  {
    target:'.energy-label',anchor:'bottom',
    title:'에너지',
    text:'카드를 사용하면 에너지를 소모합니다.\n에너지가 부족하면 카드를 낼 수 없습니다.\n턴 종료 시 에너지가 초기화됩니다.'
  },
  {
    target:'#enemy-intent',anchor:'bottom',
    title:'적의 의도',
    text:'적이 다음 턴에 무엇을 할지 표시됩니다.\n공격 전에 미리 파악하고 대응하세요.'
  },
  {
    target:'[data-btn="end-turn"]',anchor:'top',
    title:'턴 종료',
    text:'카드를 다 냈거나 에너지가 부족하면\n턴 종료 버튼을 눌러 적의 차례로 넘기세요.'
  },
  {
    target:'#map-clock',anchor:'left',
    title:'어리석은 자의 시계',
    text:'보스를 처치할 때마다 시계 바늘이 움직입니다.\nXII개의 태엽을 모두 해금하면 무언가 일어납니다...',
    special:'clock'
  }
];

var _tutActive=false,_tutIdx=0,_tutOv=null;

function startTutorial(){
  if(_tutActive)return;
  _tutActive=true;_tutIdx=0;
  GS.tutorialDone=true;
  _showTutStep();
}

function _showTutStep(){
  if(_tutOv){_tutOv.remove();_tutOv=null;}
  if(_tutIdx>=TUTORIAL_STEPS.length){_tutActive=false;return;}
  var step=TUTORIAL_STEPS[_tutIdx];
  if(!step){_tutActive=false;return;}
  // 오버레이
  var ov=document.createElement('div');
  _tutOv=ov;
  ov.style.cssText='position:fixed;inset:0;z-index:19999;pointer-events:none;';

  // 반투명 배경 (타겟 제외)
  var bg=document.createElement('div');
  bg.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,0.72);transition:opacity 0.3s;';
  ov.appendChild(bg);

  // 말풍선 박스
  var box=document.createElement('div');
  box.style.cssText='position:absolute;background:rgba(4,4,14,.98);border:1.5px solid rgba(255,215,0,.5);'+
    'border-radius:14px;padding:16px 18px;max-width:280px;pointer-events:all;'+
    'box-shadow:0 8px 32px rgba(0,0,0,.8),0 0 20px rgba(255,215,0,.08);'+
    'font-family:\'Noto Serif KR\',serif;';

  // 제목
  var ttl=document.createElement('div');
  ttl.style.cssText='font-family:\'Cinzel Decorative\',serif;font-size:11px;color:rgba(255,215,0,.9);'+
    'letter-spacing:.1em;margin-bottom:8px;';
  ttl.textContent=step.title;

  // 내용
  var txt=document.createElement('div');
  txt.style.cssText='font-size:10px;color:#c0b090;line-height:1.9;white-space:pre-line;';
  txt.textContent=step.text;

  // 버튼 영역
  var btns=document.createElement('div');
  btns.style.cssText='display:flex;gap:8px;margin-top:12px;justify-content:flex-end;';

  var skip=document.createElement('button');
  skip.textContent='건너뛰기';
  skip.style.cssText='background:none;border:1px solid rgba(255,255,255,.15);color:#666;'+
    'font-size:9px;padding:5px 10px;border-radius:6px;cursor:pointer;font-family:\'Share Tech Mono\',monospace;';
  skip.onclick=function(){_tutActive=false;if(_tutOv){_tutOv.remove();_tutOv=null;}};

  var next=document.createElement('button');
  next.textContent=(_tutIdx===TUTORIAL_STEPS.length-1)?'완료 ✓':'다음 →';
  next.style.cssText='background:rgba(255,215,0,.15);border:1px solid rgba(255,215,0,.4);color:#FFD700;'+
    'font-size:9px;padding:5px 12px;border-radius:6px;cursor:pointer;font-family:\'Share Tech Mono\',monospace;'+
    'transition:background .15s;';
  next.onmouseenter=function(){next.style.background='rgba(255,215,0,.25)';};
  next.onmouseleave=function(){next.style.background='rgba(255,215,0,.15)';};
  next.onclick=function(){_tutIdx++;_showTutStep();};

  btns.appendChild(skip);btns.appendChild(next);
  box.appendChild(ttl);box.appendChild(txt);box.appendChild(btns);

  // 진행 점
  var prog=document.createElement('div');
  prog.style.cssText='display:flex;gap:4px;margin-top:10px;justify-content:center;';
  TUTORIAL_STEPS.forEach(function(_,i){
    var dot=document.createElement('div');
    dot.style.cssText='width:5px;height:5px;border-radius:50%;background:'+(i===_tutIdx?'rgba(255,215,0,.8)':'rgba(255,255,255,.2)')+';';
    prog.appendChild(dot);
  });
  box.appendChild(prog);
  ov.appendChild(box);
  document.body.appendChild(ov);

  // 박스 위치 결정
  setTimeout(function(){
    var W=window.innerWidth,H=window.innerHeight;
    var bw=box.offsetWidth||260,bh=box.offsetHeight||180;
    var x=W/2-bw/2,y=H/2-bh/2; // 기본: 중앙
    var tEl=step.target?document.querySelector(step.target):null;
    if(tEl){
      var r=tEl.getBoundingClientRect();
      if(step.anchor==='top'){y=r.bottom+14;x=Math.max(10,Math.min(W-bw-10,r.left+r.width/2-bw/2));}
      else if(step.anchor==='bottom'){y=r.top-bh-14;x=Math.max(10,Math.min(W-bw-10,r.left+r.width/2-bw/2));}
      else if(step.anchor==='left'){x=r.right+14;y=Math.max(10,Math.min(H-bh-10,r.top+r.height/2-bh/2));}
    }
    y=Math.max(10,Math.min(H-bh-10,y));
    box.style.left=x+'px';box.style.top=y+'px';
  },50);
}


/* ═══ 업적 시스템 v2 ═══ */
const ACHIEVEMENTS=[
/* ── 전투: 일반 ── */
{id:'first_blood', name:'첫 번째 피',     desc:'첫 전투에서 승리',             icon:'⚔',  s:false, diff:1, reward:{type:'gold',v:80}},
{id:'no_damage',   name:'무결',           desc:'피해 없이 전투 클리어',          icon:'◈',  s:false, diff:2, reward:{type:'gold',v:150}},
{id:'low_hp_win',  name:'기사회생',       desc:'체력 10% 이하로 전투 승리',      icon:'♥',  s:true,  diff:3, reward:{type:'maxHp',v:15}},
{id:'turn1_win',   name:'전격전',         desc:'1턴 안에 적 처치',               icon:'◎',  s:true,  diff:3, reward:{type:'gold',v:200}},
{id:'no_card',     name:'맨손',           desc:'카드 0장으로 턴 종료 후 승리',   icon:'∅',  s:true,  diff:4, reward:{type:'energy',v:1}},
{id:'win10',       name:'백전노장',       desc:'전투 10회 승리',                 icon:'⚔',  s:false, diff:2, reward:{type:'gold',v:120}},
{id:'win30',       name:'전쟁의 신',      desc:'전투 30회 승리',                 icon:'⚔',  s:false, diff:3, reward:{type:'maxHp',v:10}},
{id:'win5_row',    name:'무패 행진',      desc:'연속 5회 전투 승리',             icon:'★',  s:true,  diff:3, reward:{type:'gold',v:250}},
/* ── 전투: 크리/콤보 ── */
{id:'crit_king',   name:'크리티컬 사냥꾼',desc:'한 전투에서 크리티컬 5회',       icon:'★',  s:false, diff:2, reward:{type:'gold',v:100}},
{id:'crit_master', name:'크리 머신',      desc:'한 전투에서 크리티컬 10회',      icon:'★',  s:true,  diff:4, reward:{type:'critRate',v:0.05}},
{id:'chain10',     name:'체인 마스터',    desc:'콤보 체인 10회 연속',            icon:'∞',  s:false, diff:2, reward:{type:'gold',v:100}},
{id:'chain20',     name:'체인 왕',        desc:'콤보 체인 20회 연속',            icon:'∞',  s:true,  diff:4, reward:{type:'energy',v:1}},
{id:'zero_cost',   name:'무한 엔진',      desc:'한 턴에 5장 이상 사용',          icon:'♾',  s:false, diff:2, reward:{type:'gold',v:100}},
{id:'zero_cost2',  name:'카드 폭풍',      desc:'한 턴에 8장 이상 사용',          icon:'♾',  s:true,  diff:4, reward:{type:'maxHp',v:20}},
{id:'dmg999',      name:'단타 999',       desc:'한 번에 999 이상 피해',          icon:'⚡',  s:true,  diff:5, reward:{type:'energy',v:1}},
{id:'survive_ult', name:'불굴',           desc:'보스 필살기를 생존',             icon:'▲',  s:true,  diff:3, reward:{type:'maxHp',v:20}},
/* ── 보스 ── */
{id:'boss_slayer', name:'지배자의 종말',  desc:'첫 보스 처치',                   icon:'☿',  s:false, diff:1, reward:{type:'gold',v:150}},
{id:'boss_all',    name:'시계의 파괴자',  desc:'모든 12 보스 처치',              icon:'XII',s:true,  diff:5, reward:{type:'maxHp',v:30}},
{id:'phase2_win',  name:'분노를 넘어서',  desc:'보스 2페이즈 격파',              icon:'☠',  s:true,  diff:3, reward:{type:'gold',v:300}},
{id:'boss_noDmg',  name:'완벽한 처형',   desc:'보스를 피해 없이 처치',           icon:'☿',  s:true,  diff:5, reward:{type:'energy',v:1}},
{id:'boss3_row',   name:'연속 격파',      desc:'보스 3연속 처치',                icon:'☿',  s:true,  diff:4, reward:{type:'maxHp',v:25}},
/* ── 덱 / 유물 ── */
{id:'deck20',      name:'카드 수집가',    desc:'덱을 20장으로',                  icon:'≡',  s:false, diff:1, reward:{type:'gold',v:80}},
{id:'deck30',      name:'도서관',         desc:'덱을 30장으로',                  icon:'≡',  s:false, diff:2, reward:{type:'gold',v:150}},
{id:'relic1',      name:'유물 입문',      desc:'유물 1개 장착',                  icon:'◈',  s:false, diff:1, reward:{type:'gold',v:60}},
{id:'relic3',      name:'유물 수집가',    desc:'유물 3개 장착',                  icon:'◈',  s:false, diff:2, reward:{type:'gold',v:150}},
{id:'relic5',      name:'유물의 왕',      desc:'유물 5개 장착',                  icon:'◈',  s:true,  diff:4, reward:{type:'maxHp',v:20}},
{id:'upgrade3',    name:'강화 장인',      desc:'카드 강화 3회',                  icon:'⬆',  s:false, diff:2, reward:{type:'gold',v:120}},
/* ── 탐험 ── */
{id:'realm2',      name:'탐험 시작',      desc:'2번째 구역 도달',                icon:'≈',  s:false, diff:1, reward:{type:'gold',v:80}},
{id:'realm3',      name:'심층 탐험가',    desc:'3번째 구역 도달',                icon:'≈',  s:false, diff:2, reward:{type:'gold',v:120}},
{id:'realm6',      name:'시계의 심장',    desc:'6번째 구역 도달',                icon:'⚙',  s:true,  diff:3, reward:{type:'maxHp',v:15}},
{id:'realm9',      name:'심연의 여행자',  desc:'9번째 구역 도달',                icon:'⚙',  s:true,  diff:4, reward:{type:'energy',v:1}},
{id:'realm12',     name:'끝의 시작',      desc:'마지막 구역 도달',               icon:'XII',s:true,  diff:5, reward:{type:'maxHp',v:30}},
{id:'rest5',       name:'쉼터',           desc:'휴식 노드 5회 방문',             icon:'✦',  s:false, diff:1, reward:{type:'gold',v:80}},
{id:'rest10',      name:'방랑자',         desc:'휴식 노드 10회 방문',            icon:'✦',  s:false, diff:2, reward:{type:'maxHp',v:10}},
{id:'shop10',      name:'단골 고객',      desc:'상점 10회 방문',                 icon:'$',  s:false, diff:2, reward:{type:'gold',v:100}},
{id:'event20',     name:'사건 기록자',    desc:'이벤트 20회 완료',               icon:'?',  s:false, diff:2, reward:{type:'gold',v:120}},
{id:'gamble_win',  name:'타고난 도박사',  desc:'도박 연속 3회 승리',             icon:'◆',  s:true,  diff:3, reward:{type:'gold',v:200}},
{id:'gamble_win5', name:'황금 손',        desc:'도박 연속 5회 승리',             icon:'◆',  s:true,  diff:5, reward:{type:'gold',v:500}},
/* ── 시계 ── */
{id:'clock3',      name:'시작',           desc:'시계 태엽 3개 해금',             icon:'III',s:false, diff:1, reward:{type:'gold',v:80}},
{id:'clock6',      name:'태엽 감는 자',   desc:'시계 태엽 6개 해금',             icon:'VI', s:false, diff:2, reward:{type:'gold',v:150}},
{id:'clock9',      name:'시간의 흐름',    desc:'시계 태엽 9개 해금',             icon:'IX', s:true,  diff:3, reward:{type:'maxHp',v:20}},
{id:'clock12',     name:'XII',           desc:'모든 태엽 해금',                  icon:'XII',s:true,  diff:5, reward:{type:'energy',v:1}},
/* ── 경제 ── */
{id:'gold500',     name:'부자',           desc:'황금 500 이상 보유',             icon:'$',  s:false, diff:2, reward:{type:'gold',v:100}},
{id:'gold999',     name:'황금 귀족',      desc:'황금 999 이상 보유',             icon:'$',  s:false, diff:3, reward:{type:'gold',v:200}},
{id:'gold2000',    name:'황금왕',         desc:'황금 2000 이상 보유',            icon:'$',  s:true,  diff:4, reward:{type:'maxHp',v:15}},
{id:'spend1000',   name:'큰 손',          desc:'누적 황금 1000 소비',            icon:'$',  s:false, diff:2, reward:{type:'gold',v:150}},
/* ── 특수 ── */
{id:'full_heal',   name:'완전 회복',      desc:'최대 체력으로 회복',             icon:'+',  s:false, diff:1, reward:{type:'gold',v:80}},
{id:'full_heal3',  name:'불사조',         desc:'완전 회복 3회',                  icon:'+',  s:false, diff:2, reward:{type:'maxHp',v:10}},
{id:'overload5',   name:'오버로드 중독',  desc:'오버로드 카드 5회 사용',         icon:'⚡',  s:false, diff:2, reward:{type:'gold',v:100}},
{id:'poison10',    name:'독의 달인',      desc:'독으로 100 이상 피해',           icon:'☠',  s:true,  diff:3, reward:{type:'gold',v:150}},
{id:'perfect_run', name:'퍼펙트 런',      desc:'전투 피해 없이 보스까지',        icon:'◎',  s:true,  diff:5, reward:{type:'energy',v:1}},
{id:'all_clear',   name:'파괴된 시계',    desc:'게임 클리어',                    icon:'⌛',s:true,  diff:5, reward:{type:'maxHp',v:50}}
];
var _achs={};var _achsClaimed={};
var _achC={crits:0,critBattle:0,restVisits:0,gambleWins:0,gambleRow:0,bossesKilled:[],
  wins:0,winRow:0,cardsTurn:0,chainCount:0,spentGold:0,fullHeals:0,bossnoDmg:false,
  bossRow:0,shopVisits:0,eventsDone:0,overloadUsed:0,poisonDmg:0,noDmgRun:true};
function _loadAch(){try{var d=localStorage.getItem('chronos_ach2');if(d){var p=JSON.parse(d);_achs=p.a||{};_achsClaimed=p.c||{};}}catch(e){}}
function _saveAch(){try{localStorage.setItem('chronos_ach2',JSON.stringify({a:_achs,c:_achsClaimed}));}catch(e){}}
function _unlockAch(id){
  if(_achs[id])return;
  var a=ACHIEVEMENTS.find(function(x){return x.id===id;});if(!a)return;
  _achs[id]=Date.now();_saveAch();
  var p=document.createElement('div');
  p.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(50px);z-index:99999;'+
    'background:rgba(4,4,14,.97);border:1px solid rgba(255,215,0,.5);border-radius:12px;'+
    'padding:10px 16px;display:flex;align-items:center;gap:10px;opacity:0;'+
    'transition:opacity .35s,transform .35s;pointer-events:none;min-width:220px;max-width:300px;'+
    'box-shadow:0 4px 24px rgba(0,0,0,.8);';
  var dBar='★'.repeat(a.diff||1)+'☆'.repeat(5-(a.diff||1));
  p.innerHTML='<div style="font-size:18px;flex-shrink:0;">'+a.icon+'</div>'+
    '<div><div style="font-size:7px;color:rgba(255,215,0,.5);letter-spacing:.1em;margin-bottom:2px;">업적 달성 '+dBar+'</div>'+
    '<div style="font-size:11px;color:#FFD700;">'+a.name+'</div>'+
    '<div style="font-size:8px;color:#888;margin-top:1px;">'+a.desc+'</div>'+
    '<div style="font-size:8px;color:#FFAA44;margin-top:2px;">보상 → 업적 화면에서 수령</div></div>';
  document.body.appendChild(p);
  requestAnimationFrame(function(){requestAnimationFrame(function(){p.style.opacity='1';p.style.transform='translateX(-50%) translateY(0)';});});
  setTimeout(function(){p.style.opacity='0';p.style.transform='translateX(-50%) translateY(30px)';setTimeout(function(){p.remove();},380);},3200);
}
function _applyReward(reward){
  if(!reward)return;
  var v=reward.v||0;
  if(reward.type==='gold'){
    GS={...GS,gold:(GS.gold||0)+v};
    updateFUI();
    showNotif('황금 +'+v,'#FFD700');
  }
  if(reward.type==='maxHp'){
    var p=GS.player||{};
    GS={...GS,player:{...p,maxAxis:(p.maxAxis||80)+v,axis:Math.min((p.axis||80)+v,(p.maxAxis||80)+v)}};
    updateFUI();
    showNotif('최대 체력 +'+v,'#FF6644');
  }
  if(reward.type==='energy'){
    var p2=GS.player||{};
    GS={...GS,player:{...p2,maxEnergy:(p2.maxEnergy||3)+v}};
    if(GS.battle)GS={...GS,battle:{...GS.battle,maxEnergy:(GS.battle.maxEnergy||3)+v,energy:Math.min((GS.battle.energy||3),(GS.battle.maxEnergy||3)+v)}};
    updateFUI();
    showNotif('최대 에너지 +'+v,'#44AAFF');
  }
  if(reward.type==='critRate'){
    showNotif('크리티컬 확률 +'+(v*100|0)+'% 적용!','#FFD700');
  }
}
function _rewardLabel(r){
  if(!r)return '';
  if(r.type==='gold')return '황금 +'+r.v;
  if(r.type==='maxHp')return '최대 체력 +'+r.v;
  if(r.type==='energy')return '에너지 +'+r.v;
  if(r.type==='critRate')return '크리율 +'+(r.v*100|0)+'%';
  return '';
}
function _rewardColor(r){
  if(!r)return '#888';
  if(r.type==='gold')return '#FFD700';
  if(r.type==='maxHp')return '#FF6644';
  if(r.type==='energy')return '#44AAFF';
  return '#AAFFAA';
}
function achCheck(ev,d){
  d=d||{};
  if(ev==='battle_win'){
    _unlockAch('first_blood');_achC.wins++;_achC.winRow++;
    if(_achC.wins>=10)_unlockAch('win10');
    if(_achC.wins>=30)_unlockAch('win30');
    if(_achC.winRow>=5)_unlockAch('win5_row');
    if(d.noDamage){_unlockAch('no_damage');if(d.bossId)_unlockAch('boss_noDmg');}
    if(d.lowHp)_unlockAch('low_hp_win');
    if(d.turn1)_unlockAch('turn1_win');
    if(d.phase2)_unlockAch('phase2_win');
    if(d.bossId){
      if(_achC.bossesKilled.indexOf(d.bossId)<0)_achC.bossesKilled.push(d.bossId);
      _unlockAch('boss_slayer');_achC.bossRow++;
      if(_achC.bossesKilled.length>=12)_unlockAch('boss_all');
      if(_achC.bossRow>=3)_unlockAch('boss3_row');
    }else{_achC.bossRow=0;}
    _achC.critBattle=0;
  }
  if(ev==='battle_lose'){_achC.winRow=0;_achC.noDmgRun=false;}
  if(ev==='crit'){_achC.crits++;_achC.critBattle++;if(_achC.critBattle>=5)_unlockAch('crit_king');if(_achC.critBattle>=10)_unlockAch('crit_master');}
  if(ev==='chain'&&d.count>=10)_unlockAch('chain10');
  if(ev==='chain'&&d.count>=20)_unlockAch('chain20');
  if(ev==='cards_turn'){if(d.count>=5)_unlockAch('zero_cost');if(d.count>=8)_unlockAch('zero_cost2');}
  if(ev==='big_dmg'&&d.v>=999)_unlockAch('dmg999');
  if(ev==='deck_size'){if(d.size>=20)_unlockAch('deck20');if(d.size>=30)_unlockAch('deck30');}
  if(ev==='relic_equip'){var n=(GS.relicsEquipped||[]).length;if(n>=1)_unlockAch('relic1');if(n>=3)_unlockAch('relic3');if(n>=5)_unlockAch('relic5');}
  if(ev==='upgrade')_achC.upgrades=((_achC.upgrades||0)+1),_achC.upgrades>=3&&_unlockAch('upgrade3');
  if(ev==='realm'){if(d.idx>=1)_unlockAch('realm2');if(d.idx>=2)_unlockAch('realm3');if(d.idx>=5)_unlockAch('realm6');if(d.idx>=8)_unlockAch('realm9');if(d.idx>=11)_unlockAch('realm12');}
  if(ev==='clock'){if(d.n>=3)_unlockAch('clock3');if(d.n>=6)_unlockAch('clock6');if(d.n>=9)_unlockAch('clock9');if(d.n>=12)_unlockAch('clock12');}
  if(ev==='gold'){if(d.v>=500)_unlockAch('gold500');if(d.v>=999)_unlockAch('gold999');if(d.v>=2000)_unlockAch('gold2000');}
  if(ev==='spend'){_achC.spentGold=((_achC.spentGold||0)+d.v);if(_achC.spentGold>=1000)_unlockAch('spend1000');}
  if(ev==='rest'){_achC.restVisits++;if(_achC.restVisits>=5)_unlockAch('rest5');if(_achC.restVisits>=10)_unlockAch('rest10');}
  if(ev==='shop')_achC.shopVisits=((_achC.shopVisits||0)+1),_achC.shopVisits>=10&&_unlockAch('shop10');
  if(ev==='event')_achC.eventsDone=((_achC.eventsDone||0)+1),_achC.eventsDone>=20&&_unlockAch('event20');
  if(ev==='full_heal'){_unlockAch('full_heal');_achC.fullHeals++;if(_achC.fullHeals>=3)_unlockAch('full_heal3');}
  if(ev==='gamble_win'){_achC.gambleWins++;_achC.gambleRow=(_achC.gambleRow||0)+1;if(_achC.gambleRow>=3)_unlockAch('gamble_win');if(_achC.gambleRow>=5)_unlockAch('gamble_win5');}
  if(ev==='gamble_lose')_achC.gambleRow=0;
  if(ev==='survive_ult')_unlockAch('survive_ult');
  if(ev==='overload'){_achC.overloadUsed=((_achC.overloadUsed||0)+1);if(_achC.overloadUsed>=5)_unlockAch('overload5');}
  if(ev==='poison'&&d.v>0){_achC.poisonDmg=((_achC.poisonDmg||0)+d.v);if(_achC.poisonDmg>=100)_unlockAch('poison10');}
  if(ev==='game_clear')_unlockAch('all_clear');
}
function showAchievementModal(){
  _loadAch();
  var bd=document.createElement('div');
  bd.style.cssText='position:fixed;inset:0;z-index:19000;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;';
  var box=document.createElement('div');
  box.style.cssText='background:rgba(4,4,14,.99);border:1px solid rgba(255,215,0,.2);border-radius:16px;'+
    'width:360px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;'+
    'box-shadow:0 8px 48px rgba(0,0,0,.95);';
  // 헤더
  var done=Object.keys(_achs).length;
  var claimedN=Object.keys(_achsClaimed).length;
  var claimable=ACHIEVEMENTS.filter(function(a){return _achs[a.id]&&!_achsClaimed[a.id];}).length;
  var hdr=document.createElement('div');
  hdr.style.cssText='padding:14px 18px 10px;border-bottom:1px solid rgba(255,215,0,.1);flex-shrink:0;';
  hdr.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;">'+
    '<div style="font-size:11px;color:rgba(255,215,0,.85);letter-spacing:.1em;">업적</div>'+
    '<div style="display:flex;align-items:center;gap:8px;">'+
    (claimable>0?'<div style="font-size:8px;color:#FFAA44;background:rgba(255,170,68,.12);border:1px solid rgba(255,170,68,.3);border-radius:4px;padding:2px 7px;">수령 가능 '+claimable+'</div>':'')+'<div style="font-size:9px;color:#555;">'+done+'/'+ACHIEVEMENTS.length+'</div>'+
    '<button id="_ach_x" style="background:none;border:none;color:#555;font-size:16px;cursor:pointer;padding:0 0 0 10px;" id="_ach_x">✕</button></div></div>'+
    // 진행바
    '<div style="margin-top:8px;height:3px;background:rgba(255,255,255,.06);border-radius:2px;">'+
    '<div style="height:3px;width:'+(done/ACHIEVEMENTS.length*100|0)+'%;background:linear-gradient(90deg,rgba(255,215,0,.6),rgba(255,215,0,.3));border-radius:2px;transition:width .5s;"></div></div>';
  // 필터 탭
  // ✕ 버튼 클릭 이벤트 연결 (innerHTML의 onclick 대신)
  var _xb=hdr.querySelector('#_ach_x');if(_xb)_xb.onclick=function(){bd.remove();};
  var tabs=document.createElement('div');
  tabs.style.cssText='display:flex;gap:4px;padding:8px 12px 6px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.04);overflow-x:auto;';
  ['전체','미수령','완료','미완'].forEach(function(tab,ti){
    var tb=document.createElement('button');
    tb.textContent=tab;tb.dataset.tab=ti;
    tb.style.cssText='background:'+(ti===0?'rgba(255,215,0,.15)':'none')+';border:1px solid '+(ti===0?'rgba(255,215,0,.35)':'rgba(255,255,255,.08)')+';'+
      'border-radius:5px;padding:3px 10px;font-size:8px;color:'+(ti===0?'#FFD700':'#555')+';cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;';
    tb.onclick=function(){
      tabs.querySelectorAll('button').forEach(function(b){b.style.background='none';b.style.borderColor='rgba(255,255,255,.08)';b.style.color='#555';});
      this.style.background='rgba(255,215,0,.15)';this.style.borderColor='rgba(255,215,0,.35)';this.style.color='#FFD700';
      renderList(parseInt(this.dataset.tab));
    };
    tabs.appendChild(tb);
  });
  // 목록
  var list=document.createElement('div');
  list.style.cssText='overflow-y:auto;padding:6px 10px 12px;flex:1;';
  function renderList(filter){
    list.innerHTML='';
    var items=ACHIEVEMENTS.filter(function(a){
      if(filter===1)return _achs[a.id]&&!_achsClaimed[a.id]; // 미수령
      if(filter===2)return !!_achs[a.id]; // 완료
      if(filter===3)return !_achs[a.id]; // 미완
      return true; // 전체
    });
    if(items.length===0){
      var emp=document.createElement('div');
      emp.style.cssText='text-align:center;color:#333;font-size:9px;padding:30px;font-family:\'Share Tech Mono\',monospace;';
      emp.textContent='없음';list.appendChild(emp);return;
    }
    items.forEach(function(a){
      var isDone=!!_achs[a.id];
      var isClaimed=!!_achsClaimed[a.id];
      var canClaim=isDone&&!isClaimed;
      var item=document.createElement('div');
      item.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;margin-bottom:5px;'+
        'background:'+(canClaim?'rgba(255,170,68,.08)':isDone?'rgba(255,215,0,.04)':'rgba(0,0,0,.2)')+';'+
        'border:1px solid '+(canClaim?'rgba(255,170,68,.3)':isDone?'rgba(255,215,0,.15)':'rgba(255,255,255,.03)')+';'+
        'transition:background .15s;';
      var ico=document.createElement('div');
      ico.style.cssText='font-size:18px;flex-shrink:0;width:26px;text-align:center;'+(isDone?'':'filter:grayscale(1) opacity(.18);');
      ico.textContent=(a.s&&!isDone)?'?':a.icon;
      var mid=document.createElement('div');mid.style.cssText='flex:1;min-width:0;';
      var dBar='★'.repeat(a.diff||1)+'☆'.repeat(5-(a.diff||1));
      var nm=a.s&&!isDone?'???':a.name;var dc=a.s&&!isDone?'비밀 업적':a.desc;
      var rc=_rewardColor(a.reward);var rl=_rewardLabel(a.reward);
      mid.innerHTML='<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">'+
        '<div style="font-size:10px;color:'+(isDone?'#FFD700':'#333')+';">'+nm+'</div>'+
        '<div style="font-size:7px;color:#444;letter-spacing:-.05em;">'+dBar+'</div></div>'+
        '<div style="font-size:8px;color:'+(isDone?'#666':'#222')+';font-family:\'Share Tech Mono\',monospace;margin-bottom:'+(isDone?'3':'0')+'px;">'+dc+'</div>'+
        (isDone&&rl?'<div style="font-size:8px;color:'+(isClaimed?'#444':rc)+';font-family:\'Share Tech Mono\',monospace;">'+(isClaimed?'✓ 수령완료':'보상: '+rl)+'</div>':'');
      item.appendChild(ico);item.appendChild(mid);
      if(canClaim){
        var btn=document.createElement('button');
        btn.textContent='받기';
        btn.style.cssText='background:rgba(255,170,68,.2);border:1px solid rgba(255,170,68,.5);color:#FFAA44;'+
          'font-size:9px;padding:5px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;flex-shrink:0;'+
          'font-family:\'Share Tech Mono\',monospace;transition:background .15s;';
        btn.onmouseenter=function(){this.style.background='rgba(255,170,68,.35)';};
        btn.onmouseleave=function(){this.style.background='rgba(255,170,68,.2)';};
        btn.onclick=function(){
          _achsClaimed[a.id]=Date.now();_saveAch();
          _applyReward(a.reward);
          showNotif((a.reward?_rewardLabel(a.reward)+' ':' ')+'획득!',_rewardColor(a.reward));
          renderList(filter);
          // 헤더 업데이트
          var cl2=ACHIEVEMENTS.filter(function(x){return _achs[x.id]&&!_achsClaimed[x.id];}).length;
          var clEl=hdr.querySelector('div[style*="수령 가능"]');
          if(clEl){if(cl2>0)clEl.textContent='수령 가능 '+cl2;else clEl.remove();}
        };
        item.appendChild(btn);
      }else if(isClaimed){
        var ck=document.createElement('div');ck.style.cssText='color:rgba(255,215,0,.3);font-size:14px;flex-shrink:0;';ck.textContent='✓';item.appendChild(ck);
      }
      list.appendChild(item);
    });
  }
  renderList(0);
  var _acl=hdr.querySelector('#_ach_close')||hdr.querySelector('button:last-child');if(_acl)_acl.onclick=function(){bd.remove();};
  box.appendChild(hdr);box.appendChild(tabs);box.appendChild(list);bd.appendChild(box);
  bd.onclick=function(e){if(e.target===bd)bd.remove();};
  document.body.appendChild(bd);
  var _acb=document.getElementById('_ach_x');if(_acb)_acb.onclick=function(){bd.remove();};
}
_loadAch();


/* ════════ 새 체인 콤보 UI 시스템 ════════ */
var _chainTimer=null;   // 타이머 RAF ID


// 콤보 가능한 다음 카드 힌트 텍스트
var _COMBO_HINT={
  '공격':{'방어':'연삭 (방→공)','회복':'역습 (회→공)','유틸':'장전 사격 (유→공)','강화':'강화 연계'},
  '방어':{'공격':'과부하 전도 (공→공)','방어':'철벽 중첩 (방→방)','회복':'균열 봉합 (방→회)'},
  '회복':{'공격':'역습 기세 (회→공)','방어':'재생 요새 (회→방)','회복':'재생 폭발 (회→회)'},
  '유틸':{'공격':'장전 사격 (유→공)','방어':'전술 방어 (유→방)','유틸':'연쇄 작동 (유→유)'},
  '강화':{'공격':'강화 연계 (강→공)','방어':'강화 방호 (강→방)','강화':'과속 연쇄 (강→강)'},
};

function _getComboHint(prevType){
  var h=_COMBO_HINT[prevType];
  if(!h)return{combo:'아무 카드나',or:''};
  var combos=Object.values(h);
  return{combo:combos[0]||'—',or:combos.length>1?'외 '+(combos.length-1)+'종':''};
}

function _showChainUI(card){
  var ov=document.getElementById('chain-overlay');
  if(!ov)return;
  if(_chainTimer)cancelAnimationFrame(_chainTimer);
  clearTimeout(window._chainTimeout);

  // 새 패널 요소
  var pName=document.getElementById('chain-prev-name');
  var pType=document.getElementById('chain-prev-type');
  var nHint=document.getElementById('chain-next-hint');
  var result=document.getElementById('chain-result');
  var cancel=document.getElementById('chain-cancel');

  if(pName)pName.textContent=card.name||'—';
  if(pType)pType.textContent=card.type||'—';
  var h=_getComboHint(card.type);
  if(nHint)nHint.textContent=h.combo+(h.or?(' '+h.or):'');
  if(result){result.style.animation='none';result.style.transform='translate(-50%,-50%) scale(0)';result.style.opacity='0';}
  if(cancel){cancel.style.animation='none';cancel.style.transform='translate(-50%,-50%) scale(0)';}

  // 슬래시 효과 (1회성)
  var sf=document.getElementById('chain-slash-full');
  if(sf){sf.classList.add('active');setTimeout(function(){sf.classList.remove('active');},400);}

  _chainActive=true;
  _chainStart=performance.now();
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');

  // 타이머 RAF
  function timerTick(now){
    if(!_chainActive){return;}
    var elapsed=now-_chainStart;
    var remaining=Math.max(0,_CHAIN_DURATION-elapsed);
    var pct=remaining/_CHAIN_DURATION;

    var numEl=document.getElementById('chain-timer-num');
    var fillEl=document.getElementById('chain-timer-fill');
    if(numEl)numEl.textContent=(remaining/1000).toFixed(2);
    if(fillEl){
      fillEl.style.width=(pct*100)+'%';
      // 색상: 초록→노랑→빨강
      if(pct>0.5)fillEl.style.background='linear-gradient(90deg,#FFD700,#FFAA00)';
      else if(pct>0.25)fillEl.style.background='linear-gradient(90deg,#FFAA00,#FF6633)';
      else fillEl.style.background='linear-gradient(90deg,#FF4422,#FF2200)';
    }
    // 0.5초 미만: 타이머 빨간 펄스
    if(numEl&&pct<0.2){
      numEl.style.color='#FF4422';
      numEl.style.textShadow='0 0 20px rgba(255,68,34,.9),0 0 40px rgba(255,68,34,.4)';
    }

    if(remaining<=0){
      _chainActive=false;
      _showChainBreak();
      return;
    }
    _chainTimer=requestAnimationFrame(timerTick);
  }
  _chainTimer=requestAnimationFrame(timerTick);
}

function _cxSuccess(label){
  if(!_chainActive)return;
  _chainActive=false;
  if(_chainTimer)cancelAnimationFrame(_chainTimer);
  var ov=document.getElementById('chain-overlay');
  var result=document.getElementById('chain-result');
  if(!result)return;
  // 텍스트 크기 — 짧은 이름은 크게
  var txt=label||'COMBO';
  var sz=txt.length<=4?42:txt.length<=6?34:26;
  result.textContent=txt;
  result.style.fontSize=sz+'px';
  // 파티클
  _chainParticles();
  result.style.animation='none';void result.offsetWidth;
  result.style.animation='chainResultIn .4s cubic-bezier(.34,1.56,.64,1) forwards';
  setTimeout(function(){
    result.style.animation='chainResultOut .28s ease forwards';
    setTimeout(function(){
      if(ov)ov.classList.remove('active');
      result.style.transform='translate(-50%,-50%) scale(0)';
      resetChainBar();
    },300);
  },750);
}

function _chainParticles(){
  var pc=document.getElementById('chain-particles');
  if(!pc)return;
  pc.innerHTML='';
  var cx=window.innerWidth/2,cy=window.innerHeight*0.28;
  for(var i=0;i<22;i++){
    var sp=document.createElement('div');
    sp.className='cp-spark';
    var ang=Math.random()*Math.PI*2;
    var dist=40+Math.random()*120;
    var tx=Math.cos(ang)*dist,ty=Math.sin(ang)*dist;
    var sz=2+Math.random()*5;
    var dur=.3+Math.random()*.4;
    var clr=Math.random()>.5?'#FFD700':'#FFFFFF';
    sp.style.cssText='left:'+(cx-sz/2)+'px;top:'+(cy-sz/2)+'px;width:'+sz+'px;height:'+sz+'px;background:'+clr+';--tx:'+tx+'px;--ty:'+ty+'px;--dur:'+dur+'s;';
    pc.appendChild(sp);
  }
  setTimeout(function(){pc.innerHTML='';},800);
}

function _showChainBreak(){
  var ov=document.getElementById('chain-overlay');
  var cancel=document.getElementById('chain-cancel');
  var numEl=document.getElementById('ct-num');
  if(numEl){numEl.textContent='0.00';numEl.style.color='#FF4422';}
  if(cancel){cancel.style.animation='chainCancelIn .3s cubic-bezier(.34,1.56,.64,1) forwards';}
  if(ov){
    setTimeout(function(){
      ov.classList.remove('active');
      if(cancel){cancel.style.animation='';cancel.style.transform='translate(-50%,-50%) scale(0)';}
    },600);
  }
  // 체인 취소 — lastCardType 리셋
  if(GS.battle){GS={...GS,battle:{...GS.battle,lastCardType:null}};}
}

function showChainOverlay(card){
  if(_chainTimer)cancelAnimationFrame(_chainTimer);
  _chainActive=false;
  var ov=document.getElementById('cx-overlay');
  if(!ov){console.warn('cx-overlay not found');return;}
  ov.style.display='none';
  setTimeout(function(){
    if(!GS.battle)return;
    // 즉시 취소 조건 체크: AP=0 또는 사용 가능 카드 없음
    var gs_b=GS.battle;
    var playable=gs_b.hand.filter(function(c){return c.cost<=gs_b.energy;});
    if(gs_b.energy<=0||playable.length===0){
      // 조용히 취소 (패널티 없음)
      if(GS.battle)GS={...GS,battle:{...GS.battle,lastCardType:null}};
      resetChainBar();
      return;
    }
    // 타이머 UI 표시
    var time=document.getElementById('cx-time');
    var fail=document.getElementById('cx-fail');
    var cnm=document.getElementById('cx-card-name-disp');
    var ctp=document.getElementById('cx-card-type-disp');
    if(cnm)cnm.textContent=card.name||'—';
    if(ctp)ctp.textContent=card.type||'—';
    if(time){time.textContent='2.50';time.classList.remove('danger');time.style.color='';}
    if(fail)fail.style.display='none';
    ov.style.display='block';
    _chainActive=true;
    _chainStart=performance.now();
    function tick(now){
      if(!_chainActive)return;
      // 중간에도 조건 체크
      if(GS.battle){
        var gb=GS.battle;
        var pl2=gb.hand.filter(function(c){return c.cost<=gb.energy;});
        if(gb.energy<=0||pl2.length===0){
          _chainActive=false;
          ov.style.display='none';
          if(GS.battle)GS={...GS,battle:{...GS.battle,lastCardType:null}};
          resetChainBar();
          return;
        }
      }
      var rem=Math.max(0,_CHAIN_DURATION-(now-_chainStart));
      if(time){
        time.textContent=(rem/1000).toFixed(2);
        if(rem<800)time.classList.add('danger');
      }
      if(rem<=0){_chainActive=false;_cxFail();return;}
      _chainTimer=requestAnimationFrame(tick);
    }
    _chainTimer=requestAnimationFrame(tick);
  },16);
}

function _cxFail(){
  var ov=document.getElementById('cx-overlay');
  var fail=document.getElementById('cx-fail');
  if(!ov)return;
  // 조각 파괴 연출
  var W=window.innerWidth;
  var H=window.innerHeight;
  ov.style.background='transparent';
  var pos=[[0,0,W*.58,H*.58,0],[W*.42,0,W*.58,H*.58,1],[0,H*.42,W*.58,H*.58,2],[W*.42,H*.42,W*.58,H*.58,3],[W*.22,H*.22,W*.56,H*.56,4]];
  pos.forEach(function(p){
    var d=document.createElement('div');d.className='cx-shard';
    d.style.cssText='left:'+p[0]+'px;top:'+p[1]+'px;width:'+p[2]+'px;height:'+p[3]+'px;animation:cxShard'+p[4]+' .45s ease .05s forwards;';
    ov.appendChild(d);
  });
  // COMBO DESTROYED
  setTimeout(function(){
    if(fail){
      fail.style.display='block';
      fail.style.animation='none';void fail.offsetWidth;
      fail.style.animation='cxFailIn .3s cubic-bezier(.34,1.56,.64,1) forwards';
    }
  },80);
  // -10 HP
  if(GS.battle){
    var newAxis=Math.max(0,GS.battle.player.axis-10);
    GS={...GS,battle:{...GS.battle,player:{...GS.battle.player,axis:newAxis},lastCardType:null}};
    VFX.stat('player','-10','#FF4422');VFX.shake(14);
    renderBattle();
  }
  // 정리
  setTimeout(function(){
    ov.style.display='none';
    Array.from(document.querySelectorAll('.cx-shard')).forEach(function(d){d.remove();});
    if(fail){
      fail.style.animation='cxFailOut .22s ease forwards';
      setTimeout(function(){fail.style.display='none';fail.style.animation='';},240);
    }
    resetChainBar();
  },850);
}

function _cxSuccess(label){
  _chainActive=false;
  if(_chainTimer)cancelAnimationFrame(_chainTimer);
  var ov=document.getElementById('cx-overlay');
  var time=document.getElementById('cx-time');
  if(ov)ov.style.display='none';
  if(time)time.classList.remove('danger');
  resetChainBar();
}

function _cxFail(){
  var ov=document.getElementById('cx-overlay');
  var tf=document.getElementById('cx-fail');
  // 화면 조각 효과
  _cxShatter(ov);
  // COMBO DESTROYED 텍스트
  setTimeout(function(){
    if(tf){
      tf.style.animation='none';void tf.offsetWidth;
      tf.style.animation='cxFailIn .3s cubic-bezier(.34,1.56,.64,1) forwards';
    }
  },120);
  // 플레이어 -10 HP
  if(GS.battle){
    GS={...GS,battle:{...GS.battle,
      player:{...GS.battle.player, axis:Math.max(0,GS.battle.player.axis-10)},
      lastCardType:null
    }};
    VFX.stat('player','-10','#FF4422');
    VFX.shake(14);
    renderBattle();
  }
  setTimeout(function(){
    if(ov){ov.classList.remove('active');ov.style.display='none';}
    if(tf){
      tf.style.animation='cxFailOut .25s ease forwards';
      setTimeout(function(){tf.style.transform='translate(-50%,-50%) scale(0)';tf.style.animation='';},280);
    }
    resetChainBar();
  },900);
}

function _cxShatter(ov){
  if(!ov)return;
  var W=ov.offsetWidth||window.innerWidth;
  var H=ov.offsetHeight||window.innerHeight;
  // 5개 조각 생성
  var shards=[
    {l:0,    t:0,    w:W*.55,h:H*.55, anim:'cxShardTL'},
    {l:W*.45,t:0,    w:W*.55,h:H*.55, anim:'cxShardTR'},
    {l:0,    t:H*.45,w:W*.55,h:H*.55, anim:'cxShardBL'},
    {l:W*.45,t:H*.45,w:W*.55,h:H*.55, anim:'cxShardBR'},
    {l:W*.25,t:H*.25,w:W*.5, h:H*.5,  anim:'cxShardC'},
  ];
  ov.style.background='transparent';
  shards.forEach(function(s){
    var d=document.createElement('div');
    d.className='cx-shard';
    d.style.cssText='left:'+s.l+'px;top:'+s.t+'px;width:'+s.w+'px;height:'+s.h+'px;'+
      'animation:'+s.anim+' .5s ease .1s forwards;';
    ov.appendChild(d);
  });
  setTimeout(function(){
    Array.from(document.querySelectorAll('.cx-shard')).forEach(function(d){d.remove();});
  },700);
}

function _cxSuccess(label){
  // 콤보 성공 — 오버레이 조용히 닫힘
  _chainActive=false;
  if(_chainTimer)cancelAnimationFrame(_chainTimer);
  var ov=document.getElementById('cx-overlay');
  var time=document.getElementById('cx-time');
  if(ov){ov.classList.remove('active');ov.style.display='none';}
  if(time){time.classList.remove('danger');}
  // 기존 콤보 VFX는 triggerComboSlice 등이 처리
  resetChainBar();
}

/* ════════ 반격 판정 시스템 ════════ */
var _parryWindow=false;  // 반격 가능 상태
var _parryTimeout=null;

function openParryWindow(durationMs){
  // 적이 공격 직전일 때 호출 — durationMs 동안 반격 가능
  _parryWindow=true;
  clearTimeout(_parryTimeout);
  _parryTimeout=setTimeout(function(){_parryWindow=false;},durationMs||800);
}

function tryParry(card){
  // 방어 카드 낼 때 반격 창이 열려있으면 패링
  if(!_parryWindow)return false;
  if(card.type!=='방어')return false;
  _parryWindow=false;
  clearTimeout(_parryTimeout);
  // 패링 연출
  var pov=document.getElementById('parry-overlay');
  var ptx=document.getElementById('parry-text');
  var pfl=document.getElementById('parry-flash');
  if(pov&&ptx&&pfl){
    pov.classList.add('active');
    ptx.style.animation='parryIn .35s cubic-bezier(.34,1.56,.64,1) forwards';
    pfl.style.opacity='1';pfl.style.transition='opacity .15s';
    setTimeout(function(){pfl.style.opacity='0';},150);
    setTimeout(function(){
      ptx.style.animation='';ptx.style.transform='scale(0)';
      pov.classList.remove('active');
    },900);
  }
  if(typeof SFX!=='undefined'&&SFX.card)SFX.card();
  return true;
}

function getParryBonus(){
  // 반격 성공 시 플레이어→적 반격 피해
  return Math.floor((GS.battle&&GS.battle.player?GS.battle.player.cog||0:0)*0.5+15);
}


/* ════════ 글리치 효과 시스템 ════════ */
var VFX_GLITCH={
  // 짧은 글리치 (0.3초)
  quick:function(){
    var ov=document.getElementById('glitch-overlay');
    var sc=document.getElementById('glitch-scan');
    if(!ov)return;
    
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');
    if(sc){sc.style.animation='glitchScreen .3s steps(1) forwards';}
    setTimeout(function(){
      ov.classList.remove('active');
      if(sc)sc.style.animation='';
    },320);
  },
  // 강한 글리치 (0.8초) — 2페이즈, 보스 처치 등
  heavy:function(){
    var ov=document.getElementById('glitch-overlay');
    var sc=document.getElementById('glitch-scan');
    var rgb=document.getElementById('glitch-rgb');
    if(!ov)return;
    
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');
    if(sc){sc.style.animation='glitchScreen .8s steps(1) forwards';}
    if(rgb){rgb.style.animation='glitchRGB .8s steps(1) forwards';}
    // 화면 흔들기
    var root=document.getElementById('root');
    if(root){
      root.style.animation='none';
      var shakeKf='@keyframes glitchShake{0%,100%{transform:translate(0)}20%{transform:translate(-6px,3px)}40%{transform:translate(6px,-3px)}60%{transform:translate(-4px,2px)}80%{transform:translate(4px,-2px)}}';
      root.style.animation='glitchShake .4s ease';
    }
    setTimeout(function(){
      ov.classList.remove('active');
      if(sc)sc.style.animation='';
      if(rgb)rgb.style.animation='';
      if(root)root.style.animation='';
    },850);
  },
  // 지속 글리치 (보스 전투 배경)
  loop:function(on){
    var sc=document.getElementById('glitch-scan');
    var bars=document.querySelectorAll('.g-bar');
    var ov=document.getElementById('glitch-overlay');
    if(!ov)return;
    if(on){
      
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');
      if(sc)sc.style.opacity='.35';
      bars.forEach(function(b){b.style.opacity='1';});
    }else{
      if(sc)sc.style.opacity='0';
      bars.forEach(function(b){b.style.opacity='0';});
      setTimeout(function(){ov.classList.remove('active');},100);
    }
  },
  // 텍스트에 글리치 클래스 적용
  text:function(el,on){
    if(!el)return;
    if(on){
      el.classList.add('glitch-text');
      el.setAttribute('data-text',el.textContent);
    }else{
      el.classList.remove('glitch-text');
      el.removeAttribute('data-text');
    }
  }
};


/* ════ 글리치 VFX ════ */
var _glitchRaf=null;
function triggerGlitch(durationMs,intensity){
  durationMs=durationMs||600;intensity=intensity||1;
  var ov=document.getElementById('glitch-overlay');
  var cv=document.getElementById('glitch-canvas');
  if(!ov||!cv)return;
  var _ctb=document.getElementById('chain-timer-bar');if(_ctb)_ctb.classList.add('active');
  var _ctn=document.getElementById('chain-timer-num');if(_ctn)_ctn.classList.add('active');
  var ctx=cv.getContext('2d');
  var W=window.innerWidth,H=window.innerHeight;
  cv.width=W;cv.height=H;
  var start=performance.now();
  var scanY=0;
  if(_glitchRaf)cancelAnimationFrame(_glitchRaf);
  function glitchFrame(now){
    var t=(now-start)/durationMs;
    if(t>=1){ctx.clearRect(0,0,W,H);ov.classList.remove('active');_glitchRaf=null;return;}
    ctx.clearRect(0,0,W,H);
    // 수평 스캔라인 노이즈
    var lines=Math.floor(8+intensity*12);
    for(var i=0;i<lines;i++){
      var y=Math.random()*H;
      var h2=1+Math.random()*4;
      var shift=(Math.random()-.5)*intensity*60;
      var alpha=Math.random()*.5;
      ctx.fillStyle='rgba(255,255,255,'+alpha+')';
      ctx.fillRect(shift,y,W,h2);
    }
    // RGB 채널 분리
    if(Math.random()<.4*intensity){
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(255,0,50,.06)';
      ctx.fillRect(Math.random()*10-5,0,W,H);
      ctx.fillStyle='rgba(0,50,255,.06)';
      ctx.fillRect(-(Math.random()*10-5),0,W,H);
      ctx.globalCompositeOperation='source-over';
    }
    // 수직 블록 왜곡
    if(Math.random()<.3*intensity){
      var by=Math.floor(Math.random()*H);
      var bh=Math.floor(20+Math.random()*80);
      var bx=Math.floor((Math.random()-.5)*intensity*40);
      ctx.drawImage(cv,0,by,W,bh,bx,by,W,bh);
    }
    // 스캔라인 (어두운 줄)
    ctx.fillStyle='rgba(0,0,0,.06)';
    for(var s=0;s<H;s+=4){ctx.fillRect(0,s,W,1);}
    _glitchRaf=requestAnimationFrame(glitchFrame);
  }
}

/* ═══ 기믹 설명 카드 ═══ */
function _showGimmickCard(boss, cb){
  var g=boss.gimmick;
  if(!g){if(cb)cb();return;}
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:19000;display:flex;flex-direction:column;'+
    'align-items:center;justify-content:center;background:rgba(0,0,0,.97);'+
    'pointer-events:all;cursor:pointer;opacity:0;transition:opacity .3s;';
  var bg=document.createElement('div');
  bg.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .5s .1s;'+
    'background:radial-gradient(ellipse at 50% 50%,'+(g.color||'#110000')+' 0%,transparent 70%);';
  ov.appendChild(bg);
  var card=document.createElement('div');
  card.style.cssText='position:relative;z-index:1;width:290px;border:1px solid rgba(255,255,255,.12);'+
    'background:rgba(4,4,18,.95);padding:30px 24px;text-align:center;'+
    'transform:translateY(24px);opacity:0;transition:all .45s .25s cubic-bezier(.2,.8,.2,1);';
  var icon=document.createElement('div');
  icon.style.cssText='font-size:42px;margin-bottom:12px;';
  icon.textContent=g.icon||'⚠';
  card.appendChild(icon);
  var lbl=document.createElement('div');
  lbl.style.cssText='font-size:7px;color:rgba(255,150,0,.55);font-family:"Share Tech Mono",monospace;'+
    'letter-spacing:.3em;margin-bottom:8px;';
  lbl.textContent='BOSS GIMMICK';
  card.appendChild(lbl);
  var nm=document.createElement('div');
  nm.style.cssText='font-size:19px;font-weight:900;color:#FFD700;font-family:"Noto Serif KR",serif;'+
    'text-shadow:0 0 18px rgba(255,215,0,.5);margin-bottom:14px;line-height:1.3;';
  nm.textContent=g.name;
  card.appendChild(nm);
  var line=document.createElement('div');
  line.style.cssText='width:0;height:1px;background:rgba(255,150,0,.35);margin:0 auto 14px;transition:width .55s .65s;';
  card.appendChild(line);
  var desc=document.createElement('div');
  desc.style.cssText='font-size:11px;color:rgba(255,255,255,.6);font-family:"Noto Serif KR",serif;'+
    'line-height:1.85;opacity:0;transition:opacity .4s .95s;word-break:keep-all;';
  desc.textContent=g.desc;
  card.appendChild(desc);
  var tap=document.createElement('div');
  tap.style.cssText='margin-top:22px;font-size:8px;color:rgba(255,255,255,.2);'+
    'font-family:"Share Tech Mono",monospace;letter-spacing:.2em;opacity:0;transition:opacity .3s 1.4s;';
  tap.textContent='TAP TO CONTINUE';
  card.appendChild(tap);
  ov.appendChild(card);
  document.body.appendChild(ov);
  // 등장
  requestAnimationFrame(function(){
    ov.style.opacity='1';
    bg.style.opacity='1';
    setTimeout(function(){
      card.style.transform='translateY(0)';card.style.opacity='1';
    },50);
    setTimeout(function(){line.style.width='160px';},650);
    setTimeout(function(){desc.style.opacity='1';},950);
    setTimeout(function(){tap.style.opacity='1';},1400);
  });
  var done=false;
  function proceed(){
    if(done)return;done=true;
    ov.style.opacity='0';
    setTimeout(function(){if(ov.parentNode)ov.remove();if(cb)cb();},320);
  }
  ov.addEventListener('click',proceed);
  // 플레이어가 탭해야만 닫힘 — 자동 닫기 없음
}

function _applyUltEffects(){
  if(!GS.battle) return;
  var _ub=GS.battle;
  var _ue=ENM[_ub.eid]||{};
  // 보스 고유 ultFx 적용
  if(_ue.ultFx){
    try{var _ugs=_ue.ultFx(GS.battle);if(_ugs)GS={...GS,battle:_ugs};}
    catch(_uerr){console.warn(_uerr);}
  }
  // 극한 각성 필살기 — 복합 디버프
  var _b=GS.battle;
  // 1. 방어막 완전 파괴
  _b={..._b,player:{..._b.player,cog:0}};
  // 2. 상태이상 덕지덕지
  _b=addStack(_b,'player','wound',3);          // 상처 +3
  _b=addStack(_b,'player','ol',3);              // 과부하 +3
  // 3. 에너지 1 흡수
  _b={..._b,energy:Math.max(0,(_b.energy||0)-1)};
  // 4. 봉인: 패 1장 무작위 봉인
  if(_b.hand.length>0){
    var _si=Math.floor(Math.random()*_b.hand.length);
    _b={..._b,hand:_b.hand.map(function(c,i){return i===_si?{...c,sealed:true}:c;})};
  }
  // 5. 특수 저주: 다음 1턴 회복 불가
  _b=doStat(_b,'player','no_heal',1);
  // 6. 보스 강화
  if(_ue.type==='boss'&&_b.enemy){
    _b={..._b,enemy:{..._b.enemy,
      _p2DmgMult:Math.min(2.0,(_b.enemy._p2DmgMult||1.2)+0.3),
      cog:Math.floor(_b.enemy.maxAxis*0.15)
    }};
  }
  GS={...GS,battle:_b};
  VFX.stat('player','방어막 파괴!','#FF4422');
  VFX.stat('player','상처+6 과부하+5','#FF2200');
  VFX.stat('player','에너지 -2 봉인!','#CC0044');
  VFX.stat('enemy','강화 완료!','#FF8800');
  VFX.shake(35);
  if(typeof triggerGlitch!=='undefined') triggerGlitch(800,1.8);
}

/* ═══ 보스 기믹 효과 시스템 ═══ */
function applyBossGimmick(gs, phase){
  if(!gs.enemy||gs.enemy.type!=='boss')return gs;
  if(!gs.vfx)gs={...gs,vfx:[]};  // vfx 배열 보장
  var bid=gs.eid;
  var turn=gs.turn||0;

  // II 공허자 — 공허 침식
  if(bid==='boss2'){
    if(phase==='turnEnd'&&turn%2===0){
      if((gs.energy||0)>0){gs={...gs,energy:Math.max(0,gs.energy-1)};VFX.stat('player','에너지 흡수 -1','#8800FF');}
      else{gs=dealDmg(gs,'player',8);VFX.stat('player','공허 침식 -8','#6600CC');}
    }
  }
  // III 붕괴의 삼지 — 과부하 폭발
  else if(bid==='boss3'){
    if(phase==='turnEnd'){
      var ol=(gs.player.stacks||{}).ol||0;
      if(ol>=10){gs=dealDmg(gs,'player',Math.floor(gs.player.maxAxis*0.15));VFX.stat('player','삼중 폭발!','#FF4400');VFX.shake(20);}
      else if(ol>2){gs=dealDmg(gs,'player',ol*2);VFX.stat('player','붕괴 -'+(ol*2),'#FF6600');}
    }
  }
  // IV 녹슨 왕 — 부식
  else if(bid==='boss4'){
    if(phase==='turnEnd'){
      gs=addStack(gs,'player','wound',1);
      var w=(gs.player.stacks||{}).wound||0;
      if(w>=10){gs={...gs,player:{...gs.player,cog:0}};VFX.stat('player','방어막 부식!','#885500');}
    }
    if(phase==='playerDamaged'){
      var w2=(gs.player.stacks||{}).wound||0;
      if(w2>=8&&gs.player.cog<=0)gs={...gs,_rustBonus:1.3};
    }
  }
  // V 역류의 군주 — 역류 속박
  else if(bid==='boss5'){
    if(phase==='turnEnd'){
      var ratio=gs.player.axis/gs.player.maxAxis;
      gs={...gs,enemy:{...gs.enemy,_p2DmgMult:Math.min(2.0,1.0+(1-ratio)*1.2)}};
      // 최대 HP 제한
      var cap=Math.floor(gs.player.maxAxis*0.6);
      if(gs.player.axis>cap){gs={...gs,player:{...gs.player,axis:cap}};VFX.stat('player','역류 속박','#00AA88');}
    }
  }
  // VI 황금 사슬자
  else if(bid==='boss6'){
    if(phase==='turnEnd'&&turn%2===0){
      if(gs.hand.length>0){
        var dropIdx=Math.floor(Math.random()*gs.hand.length);
        var dropped=gs.hand[dropIdx];
        gs={...gs,hand:gs.hand.filter((_,i)=>i!==dropIdx),disc:[...gs.disc,dropped]};
        VFX.stat('player','사슬 -'+dropped.name,'#FFAA00');
      }
      if(gs.hand.length<=2){
        gs=dealDmg(gs,'player',20);
        VFX.stat('player','황금 사슬 -20!','#FF8800');
      }
    }
  }
  // VII 거울의 저주 — 반사
  else if(bid==='boss7'){
    if(phase==='playerAttack'){
      var cog=gs.player.cog||0;
      var reflectRate=cog>=10?0.5:0.25;
      var reflect=Math.floor((gs._lastDmgToEnemy||0)*reflectRate);
      if(reflect>0){gs=dealDmg(gs,'player',reflect);VFX.stat('player','반사 -'+reflect,'#0088FF');}
    }
  }
  // VIII 무한자 — 무한 소생
  else if(bid==='boss8'){
    if(phase==='turnEnd'){
      if(gs.enemy._phase2Done){
        var regen=Math.floor(gs.enemy.maxAxis*0.03);
        gs=doHeal(gs,'enemy',regen);
        VFX.stat('enemy','무한 재생 +'+regen,'#AA00FF');
      }
    }
  }
  // IX 침묵의 서기 — 봉인
  else if(bid==='boss9'){
    if(phase==='turnEnd'&&turn%2===0&&gs.hand.length>0){
      var sealIdx=Math.floor(Math.random()*gs.hand.length);
      var newHand=gs.hand.map(function(c,i){return i===sealIdx?{...c,sealed:true}:c;});
      gs={...gs,hand:newHand};
      VFX.stat('player','카드 봉인!','#006666');
      var sealedCount=newHand.filter(function(c){return c.sealed;}).length;
      if(sealedCount>=3){
        gs=dealDmg(gs,'player',sealedCount*8);
        gs={...gs,hand:gs.hand.map(function(c){return{...c,sealed:false};})};
        VFX.stat('player','봉인 폭발! -'+(sealedCount*8),'#FF0066');
      }
    }
  }
  // X 폭풍의 눈 — 누적
  else if(bid==='boss10'){
    if(phase==='turnEnd'){
      var st=(gs.enemy._stormStack||0)+3;
      gs={...gs,enemy:{...gs.enemy,_stormStack:Math.min(st,25)}};
      var stDmg=Math.min(st,30);
      VFX.stat('enemy','폭풍 +'+stDmg,'#0044FF');
      if(stDmg>4){
        gs=dealDmg(gs,'player',stDmg);
        VFX.stat('player','폭풍 -'+stDmg,'#0066FF');
      }
    }
  }
  // XI 빛의 심판자
  else if(bid==='boss11'){
    if(phase==='turnEnd'){
      var cog2=gs.player.cog||0;
      if(cog2<=0){gs=dealDmg(gs,'player',5);VFX.stat('player','노출 -5','#FFFF44');}
      else if(cog2>=20){gs={...gs,enemy:{...gs.enemy,_lightJudge:true}};VFX.stat('enemy','역광 심판 ×2','#FFFF88');}
    }
  }
  // XII 조디악
  else if(bid==='boss12'){
    if(phase==='turnEnd'){
      var types=['공격','방어','기술','지원'];
      var newType=types[Math.floor(turn/3)%types.length];
      if((gs.enemy._zodiacType||'')!==newType){
        gs={...gs,enemy:{...gs.enemy,_zodiacType:newType}};
        VFX.stat('enemy','조디악: '+newType,'#FF0088');
      }
    }
  }
  // I 용광로
  else if(bid==='boss_forge'){
    if(phase==='turnEnd'){
      var heat=(gs.enemy._heatStack||0)+1;
      gs={...gs,enemy:{...gs.enemy,_heatStack:heat}};
      VFX.stat('enemy','과열 '+heat,'#FF4400');
      if(heat>=5){
        gs={...gs,enemy:{...gs.enemy,_heatStack:0}};
        gs=dealDmg(gs,'player',35);
        gs=addStack(gs,'player','ol',3);
        VFX.stat('player','폭발! -35','#FF2200');VFX.shake(22);
      }
    }
  }
  return gs;
}

/* ═══ 카드 보상 풀 시스템 ═══ */
var _CARD_POOL = {
  일반: ['strike', 'heavy', 'axis', 'pierce', 'tempo', 'bulwark', 'field_repair', 'scrap', 'rend', 'smash', 'spike', 'lacerate', 'steadfast', 'brace', 'mend', 'patchup', 'cycle2', 'discharge2', 'gearshot', 'hardcase', 'selfrepair', 'snapshot'],
  희귀: ['regen', 'barrage', 'crush', 'shock', 'mirror_coat', 'parry', 'phase_shield', 'overclock_heal', 'accelerate', 'entropy', 'gearshift', 'flurry', 'ignite', 'phantom', 'backstab', 'ironwall', 'reactive', 'coverfire', 'surge', 'lifetap', 'analyze', 'recall', 'empowerment', 'voltblade', 'chainsaw', 'ricochet', 'doubleedge', 'bulkup', 'clockshield', 'energywall', 'deepmend', 'batteryboost', 'overcycle', 'scrapyard', 'gearboost', 'gutpunch', 'shadowblade', 'geargrind', 'overcog2', 'ecoguard', 'battlecry', 'purge2', 'overclock_draw', 'powercharge', 'battleharden'],
  영웅: ['reroll', 'execute2', 'reinforce', 'blood_cost', 'resonance', 'overclock2', 'timelock', 'heavyblow', 'cull', 'absorb', 'stonewall', 'restoration', 'vampiric', 'deathmark', 'wrathstrike', 'timecut', 'overdrive', 'crushblow', 'mirrorshield', 'shieldwall', 'counterform', 'chronospulse', 'drawengine', 'timerewind', 'timebomb', 'voltwave', 'bladerain', 'timeguard', 'adaptshield', 'overclock_h2', 'sacrifice', 'regenfield', 'clone', 'focusfire', 'overclock_all', 'warform'],
  전설: ['doom', 'overhaul', 'annihilate', 'clockstop', 'celldivide', 'voidstrike', 'chronosheart', 'apocalypse', 'detonator', 'nullfield', 'mastermind', 'overclock4', 'apexstrike']
};

function _pickCardPool(enemyType, realmIdx){
  // 구역과 적 타입에 따른 카드 등급 확률
  var ri = realmIdx||0;
  var pool = [];
  if(enemyType==='boss'){
    // 보스: 영웅 50%, 전설 35%, 희귀 15%
    pool = pool.concat(_CARD_POOL['영웅']||[]);
    pool = pool.concat(_CARD_POOL['영웅']||[]);  // 2배 weight
    var leg = _CARD_POOL['전설']||[];
    for(var i=0;i<leg.length;i++) pool.push(leg[i],leg[i]);
    var rar = _CARD_POOL['희귀']||[];
    pool = pool.concat(rar);
  } else if(enemyType==='elite'){
    // 정예: 희귀 50%, 영웅 40%, 전설 10%
    var rare = _CARD_POOL['희귀']||[];
    pool = pool.concat(rare,rare);
    var epic = _CARD_POOL['영웅']||[];
    pool = pool.concat(epic);
    if(ri>=3) pool = pool.concat(_CARD_POOL['전설']||[]);
  } else {
    // 일반: 일반 40%, 희귀 45%, 영웅 15%
    var com = _CARD_POOL['일반']||[];
    pool = pool.concat(com, com);
    var rare2 = _CARD_POOL['희귀']||[];
    pool = pool.concat(rare2, rare2);
    if(ri>=2) pool = pool.concat(_CARD_POOL['영웅']||[]);
  }
  return pool;
}

function _pickCardChoices(enemyType, realmIdx, count){
  var pool = _pickCardPool(enemyType, realmIdx);
  if(!pool.length) return [];
  var choices = [], seen = new Set();
  var attempts = 0;
  while(choices.length < count && attempts < 100){
    attempts++;
    var cid = pool[Math.floor(Math.random()*pool.length)];
    if(!seen.has(cid) && CARDS[cid]){
      seen.add(cid);
      choices.push({...CARDS[cid], uid:uid()});
    }
  }
  return choices;
}

function showCardChoiceModal(choices, onPick){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9800;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,6,.97);pointer-events:all;';
  var title=document.createElement('div');
  title.style.cssText='font-size:10px;color:rgba(255,215,0,.5);font-family:"Share Tech Mono",monospace;letter-spacing:.3em;margin-bottom:18px;';
  title.textContent='CARD REWARD — 1장 선택';
  ov.appendChild(title);
  var row=document.createElement('div');
  row.style.cssText='display:flex;gap:12px;justify-content:center;flex-wrap:wrap;max-width:420px;';
  choices.forEach(function(card){
    var rarClr=card.rarity==='전설'?'#FFD700':card.rarity==='영웅'?'#AA44FF':card.rarity==='희귀'?'#44AAFF':'#888888';
    var el=document.createElement('div');
    el.style.cssText='width:110px;min-height:150px;border:1px solid '+rarClr+';background:rgba(4,4,18,.95);padding:12px 8px;text-align:center;cursor:pointer;transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column;gap:6px;';
    var rDiv=document.createElement('div');
    rDiv.style.cssText='font-size:7px;color:'+rarClr+';font-family:"Share Tech Mono",monospace;letter-spacing:.2em;';
    rDiv.textContent=(card.rarity||'일반').toUpperCase();
    var nDiv=document.createElement('div');
    nDiv.style.cssText='font-size:14px;font-weight:900;color:#FFF;font-family:"Noto Serif KR",serif;line-height:1.2;';
    nDiv.textContent=card.name;
    var cDiv=document.createElement('div');
    cDiv.style.cssText='font-size:8px;color:rgba(255,255,255,.4);font-family:"Share Tech Mono",monospace;';
    cDiv.textContent='['+card.cost+'] '+card.type;
    var dDiv=document.createElement('div');
    dDiv.style.cssText='font-size:9px;color:rgba(255,255,255,.6);line-height:1.6;margin-top:4px;';
    dDiv.textContent=card.desc||'';
    el.appendChild(rDiv);el.appendChild(nDiv);el.appendChild(cDiv);el.appendChild(dDiv);
    el.addEventListener('mouseenter',function(){el.style.transform='translateY(-4px)';el.style.boxShadow='0 8px 24px '+rarClr+'66';});
    el.addEventListener('mouseleave',function(){el.style.transform='';el.style.boxShadow='';});
    el.addEventListener('click',function(){ov.remove();if(onPick)onPick(card);});
    row.appendChild(el);
  });
  ov.appendChild(row);
  var skip=document.createElement('div');
  skip.style.cssText='margin-top:16px;font-size:8px;color:rgba(255,255,255,.2);font-family:"Share Tech Mono",monospace;cursor:pointer;letter-spacing:.15em;';
  skip.textContent='SKIP — 카드 추가 안함';
  skip.onclick=function(){ov.remove();if(onPick)onPick(null);};
  ov.appendChild(skip);
  document.body.appendChild(ov);
}

/* BOOT */
SD.init();
renderScreen();
