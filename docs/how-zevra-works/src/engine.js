(function(){
'use strict';
var ZG = window.ZG;
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function num(n){return Number(n).toLocaleString('en-US');}
function safe(fn){try{return fn();}catch(e){return null;}}

var IDX={A:0,B:1,C:2,D:3,E:4};
var TAGS={ai:['t-ai','AI call'],rule:['t-rule','Zevra rule · no AI'],src:['t-src','Reads your database'],zdb:['t-zdb','Zevra database'],vec:['t-vec','Vector search'],human:['t-human','A person decides']};
function tagHTML(t){var p=t.split(':'),k=p[0],m=p.slice(1).join(':'),d=TAGS[k];if(!d)return'';
  var label=k==='ai'&&m?'AI · '+m:d[1];return '<span class="tag '+d[0]+'">'+esc(label)+'</span>';}
function kindOf(st){var t=st.tags||[];
  if(t.some(function(x){return x.indexOf('ai')===0;}))return'k-ai';
  if(st.from==='D'||st.to==='D')return'k-src';
  if(st.from==='C'||st.to==='C')return'k-zdb';
  if(t.indexOf('human')>-1)return'k-human';
  return'k-rule';}
function trackHTML(st){var f=IDX[st.from],t=IDX[st.to],k=kindOf(st);
  if(f===t)return'<div class="track" aria-hidden="true"><span class="node '+k+'" style="left:'+((f+.5)*20)+'%"></span></div>';
  var a=Math.min(f,t),b=Math.max(f,t);
  return'<div class="track" aria-hidden="true"><span class="bar-line '+k+' '+(t>f?'r':'l')+'" style="left:'+((a+.5)*20)+'%;width:'+((b-a)*20)+'%"></span></div>';}

/* ---------- step detail ---------- */
function list(items,cls){return'<ul'+(cls?' class="'+cls+'"':'')+'>'+items.map(function(i){return'<li>'+i+'</li>';}).join('')+'</ul>';}
function movesHTML(m){return'<ul class="moves">'+m.map(function(x){
  var lab={out:'to OpenAI',in:'from your DB',stay:'stays in Zevra',no:'never sent',ok:'safe'}[x.d]||x.d;
  return'<li><span class="mv '+x.d+'">'+lab+'</span><span>'+x.t+'</span></li>';}).join('')+'</ul>';}
function detailHTML(st,ov){
  ov=ov||{};var what=ov.what||st.what,ex=ov.ex!==undefined?ov.ex:st.ex,ai=ov.ai||st.ai,moves=ov.moves||st.moves,never=ov.never||st.never,why=ov.why||st.why;
  var h='<div class="dgrid">';
  h+='<div><div class="blk"><h5>What happens</h5>'+what+'</div>';
  if(ex)h+='<div class="blk exbox" style="margin-top:12px"><h5>'+esc(ex.label||'Example')+'</h5>'+(ex.say?'<p class="q say">'+ex.body+'</p>':'<pre>'+ex.body+'</pre>')+'</div>';
  if(st.peek)h+='<details class="peek"><summary>'+esc(st.peek.label)+'</summary><pre>'+esc(st.peek.body)+'</pre></details>';
  if(st.widget)h+='<div class="widget" data-w="'+st.widget+'" style="margin-top:12px"></div>';
  h+='</div><div style="display:grid;gap:12px;align-content:start">';
  if(moves&&moves.length)h+='<div class="blk"><h5>What moves where</h5>'+movesHTML(moves)+'</div>';
  if(never&&never.length)h+='<div class="blk"><h5>What does not happen</h5>'+list(never)+'</div>';
  if(why)h+='<div class="blk"><h5>Why it works this way</h5><p>'+why+'</p></div>';
  h+='</div>';
  if(ai)h+='<div class="aicard"><h5>The AI call, in plain terms</h5><dl><dt>Model</dt><dd>'+ai.model+'</dd><dt>It sees</dt><dd>'+ai.sees+'</dd><dt>It decides</dt><dd>'+ai.decides+'</dd><dt>It cannot</dt><dd>'+ai.cant+'</dd></dl></div>';
  return h+'</div>';}

/* ---------- lane diagram ---------- */
function laneHead(){return'<div class="lane-head"><span></span><div class="cols"><span class="cA">People<br>(browser)</span><span class="cB">Zevra<br>app</span><span class="cC">Zevra<br>database</span><span class="cD">Your<br>database</span><span class="cE">OpenAI</span></div>'
  +'<div class="tools"><button class="btn" data-a="prev" type="button">‹ Back</button><button class="btn pri" data-a="play" type="button">▶ Play tour</button><button class="btn" data-a="next" type="button">Next ›</button></div></div>';}

function Flow(host,def){
  var self=this;this.host=host;this.def=def;this.cur=-1;this.timer=null;this.ex=def.examples?def.examples[0]:null;
  host.innerHTML='<div class="lanes">'+laneHead()+'<div class="steps"></div></div>';
  this.stepsEl=$('.steps',host);
  host.addEventListener('click',function(e){
    var b=e.target.closest('[data-a]');
    if(b){var a=b.getAttribute('data-a');if(a==='prev')self.go(self.cur-1);else if(a==='next')self.go(self.cur+1);else if(a==='play')self.play();return;}
    var r=e.target.closest('.srow');
    if(r){self.stop();var i=+r.getAttribute('data-i');self.go(self.cur===i?-1:i,true);}
  });
  this.render();
}
Flow.prototype.render=function(){
  var self=this,def=this.def,ex=this.ex,stopIdx=-1;
  if(ex&&ex.stopAt)stopIdx=def.steps.findIndex(function(s){return s.id===ex.stopAt;});
  var html=def.steps.map(function(st,i){
    var ov=ex&&ex.over&&ex.over[st.id],skip=ex&&ex.skip&&ex.skip[st.id],dim=stopIdx>-1&&i>stopIdx;
    var cls='step'+(skip?' skip':'')+(dim?' dim':'');
    var note=skip?('Skipped for this question: '+skip):(dim?(ex.stopNote||'Not reached for this question.'):'');
    var tags=(ov&&ov.tags)||st.tags||[];
    var cond=st.cond?' <span class="cond">· '+esc(st.cond)+'</span>':'';
    return'<div class="'+cls+'" data-id="'+st.id+'"><button class="srow" type="button" data-i="'+i+'" aria-expanded="false" aria-controls="d-'+def.id+'-'+i+'">'
      +'<span class="num">'+(i+1)+'</span>'+trackHTML(st)
      +'<span class="stitle"><strong>'+esc(st.t)+cond+'</strong><span class="tags">'+tags.map(tagHTML).join('')+'</span></span></button>'
      +(note?'<div class="skipnote">'+esc(note)+'</div>':'')
      +'<div class="detail" id="d-'+def.id+'-'+i+'" role="region" aria-label="Details of step '+(i+1)+'">'+detailHTML(st,ov)+'</div></div>';
  }).join('');
  this.stepsEl.innerHTML=html+'<div style="padding:12px 14px">'+(def.after||'')+'</div>';
  this.cur=-1;
  $$('.widget',this.stepsEl).forEach(function(w){var f=ZG.widgets[w.getAttribute('data-w')];if(f)f(w,self);});
};
Flow.prototype.go=function(i,noScroll){
  var n=this.def.steps.length;if(i>=n)i=n-1;
  var els=$$('.step',this.stepsEl);
  els.forEach(function(s,k){var on=k===i;s.classList.toggle('open',on);$('.srow',s).setAttribute('aria-expanded',on?'true':'false');});
  this.cur=i;
  if(i>-1&&!noScroll){var el=els[i];if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  this.sync();
};
Flow.prototype.sync=function(){
  var b=this.host,n=this.def.steps.length;
  var prev=$('[data-a="prev"]',b),next=$('[data-a="next"]',b),play=$('[data-a="play"]',b);
  if(prev)prev.disabled=this.cur<=0;if(next)next.disabled=this.cur>=n-1;
  if(play)play.textContent=this.timer?'⏸ Pause':'▶ Play tour';
};
Flow.prototype.play=function(){
  var self=this;if(this.timer){this.stop();return;}
  if(this.cur>=this.def.steps.length-1)this.cur=-1;
  this.go(this.cur+1);
  this.timer=setInterval(function(){if(self.cur>=self.def.steps.length-1){self.stop();return;}self.go(self.cur+1);},6500);
  this.sync();
};
Flow.prototype.stop=function(){if(this.timer){clearInterval(this.timer);this.timer=null;}this.sync();};
Flow.prototype.setExample=function(ex){this.stop();this.ex=ex;this.render();this.sync();};

/* ---------- tabs, theme ---------- */
function showTab(id,fromHash){
  var ok=false;$$('.panel').forEach(function(p){var on=p.id==='p-'+id;p.classList.toggle('on',on);if(on)ok=true;});
  if(!ok){id='overview';$('#p-overview').classList.add('on');}
  $$('.tab').forEach(function(t){t.setAttribute('aria-selected',t.getAttribute('data-tab')===id?'true':'false');});
  Object.keys(ZG.flows).forEach(function(k){if(k!==id&&ZG.flows[k].inst)ZG.flows[k].inst.stop();});
  if(!fromHash){try{history.replaceState(null,'','#'+id);}catch(e){location.hash=id;}}
  window.scrollTo({top:0,behavior:'auto'});
}
function initTabs(){
  $$('.tab').forEach(function(t){t.addEventListener('click',function(){showTab(t.getAttribute('data-tab'));});});
  $$('[data-goto]').forEach(function(b){b.addEventListener('click',function(){showTab(b.getAttribute('data-goto'));});});
  var h=(location.hash||'').replace('#','');showTab(h||'overview',true);
  window.addEventListener('hashchange',function(){showTab((location.hash||'').replace('#','')||'overview',true);});
}
function initTheme(){
  var btn=$('#themeBtn'),modes=['auto','light','dark'],cur='auto';
  safe(function(){cur=localStorage.getItem('zg-theme')||'auto';});
  function apply(){var r=document.documentElement;if(cur==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',cur);
    btn.textContent='Theme: '+cur;}
  btn.addEventListener('click',function(){cur=modes[(modes.indexOf(cur)+1)%3];safe(function(){localStorage.setItem('zg-theme',cur);});apply();});
  apply();
}

/* ---------- overview ---------- */
function initOverview(){
  var P=ZG.places,pl=$('#places'),box=$('#placebox');
  pl.innerHTML=P.map(function(p){return'<button class="place" type="button" data-p="'+p.k+'" aria-pressed="false"><strong>'+esc(p.name)+'</strong><small>'+esc(p.short)+'</small></button>';}).join('');
  function sel(k){
    var p=P.filter(function(x){return x.k===k;})[0];
    $$('.place',pl).forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-p')===k?'true':'false');});
    box.style.setProperty('--c',{A:'var(--you)',B:'var(--app)',C:'var(--zdb)',D:'var(--src)',E:'var(--ai)'}[k]);
    box.innerHTML='<h4>'+esc(p.name)+'</h4><p style="margin-top:6px">'+p.what+'</p><div class="cols2"><div><h5>Lives here</h5>'+list(p.has)+'</div><div><h5>Never held here</h5>'+list(p.not)+'</div></div>';}
  pl.addEventListener('click',function(e){var b=e.target.closest('.place');if(b)sel(b.getAttribute('data-p'));});
  sel('B');
  $('#flowcards').innerHTML=ZG.flowCards.map(function(c){
    return'<div class="card"><div class="eyebrow">'+esc(c.n)+'</div><h4>'+esc(c.t)+'</h4><p class="muted" style="margin:8px 0">'+c.d+'</p><p style="margin:0 0 12px"><span class="tag '+(c.ai?'t-ai':'t-rule')+'">'+esc(c.aiText)+'</span></p><button class="btn" type="button" data-goto="'+c.go+'">Open this flow ›</button></div>';}).join('');
  var filt=['All','Setup','Questions','Agents','Learning'],cur='All',fe=$('#aiFilter');
  fe.innerHTML=filt.map(function(f){return'<button class="chip" type="button" aria-pressed="'+(f===cur)+'" data-f="'+f+'">'+f+'</button>';}).join('');
  function drawAI(){
    var rows=ZG.aiUses.filter(function(r){return cur==='All'||r.area===cur;});
    $('#aiTable tbody').innerHTML=rows.map(function(r,i){return'<tr><td>'+r.n+'</td><td><strong>'+r.what+'</strong><br><span class="muted">'+r.area+'</span></td><td class="mono">'+r.model+'</td><td>'+r.when+'</td><td>'+r.sees+'</td><td>'+r.decides+'</td></tr>';}).join('');
    $$('.chip',fe).forEach(function(c){c.setAttribute('aria-pressed',c.getAttribute('data-f')===cur?'true':'false');});}
  fe.addEventListener('click',function(e){var c=e.target.closest('.chip');if(c){cur=c.getAttribute('data-f');drawAI();}});
  drawAI();
}

/* ---------- boundary widget ---------- */
function boundary(host){
  var S=ZG.bnd,cur=0;
  host.innerHTML='<div class="chips" role="group" aria-label="Moments"></div><div class="callout info" data-cap></div><div class="bnd"><div><div class="legend" style="margin:0 0 8px"><span class="tag t-ai">Sent to OpenAI</span><span class="tag t-src">Summarised, then sent</span><span class="tag t-zdb">Stays in your database or Zevra</span></div><div style="overflow-x:auto"><table class="dt"></table></div></div><div><div class="legend" style="margin:0 0 8px"><span class="tag t-ai">What OpenAI actually receives</span></div><div class="rcv"></div></div></div>';
  var chips=$('.chips',host);
  chips.innerHTML=S.map(function(s,i){return'<button class="chip" type="button" data-i="'+i+'" aria-pressed="'+(i===cur)+'">'+esc(s.label)+'</button>';}).join('');
  function draw(){
    var s=S[cur];$$('.chip',chips).forEach(function(c,i){c.setAttribute('aria-pressed',i===cur?'true':'false');});
    $('[data-cap]',host).innerHTML=s.caption;
    var t='<tr>'+s.cols.map(function(c,j){return'<th class="'+(s.hmask[j]==='out'?'cell-out':'cell-stay')+'">'+esc(c)+'</th>';}).join('')+'</tr>';
    s.rows.forEach(function(r,i){t+='<tr>'+r.map(function(v,j){var m=s.mask[i][j];return'<td class="cell-'+m+'">'+esc(v)+'</td>';}).join('')+'</tr>';});
    $('.dt',host).innerHTML=t;$('.rcv',host).textContent=s.received;}
  chips.addEventListener('click',function(e){var b=e.target.closest('.chip');if(b){cur=+b.getAttribute('data-i');draw();}});
  draw();
}

/* ---------- widgets used inside flow steps ---------- */
ZG.widgets=ZG.widgets||{};
ZG.widgets.isolation=function(w){
  var users=[{e:'ana@acmeretail.com',s:'tenant_acme_retail',r:'ADMIN',t:['purchase_orders','suppliers','products','learned terms: "overdue"']},
             {e:'ben@globex-logistics.com',s:'tenant_globex_logistics',r:'ANALYST',t:['shipments','carriers','routes','learned terms: "late pickup"']}];
  var cur=0;
  w.innerHTML='<div class="blk"><h5>Try it: two people sign in</h5><div class="chips" style="margin-top:0"></div><div data-o></div></div>';
  var ch=$('.chips',w);
  ch.innerHTML=users.map(function(u,i){return'<button class="chip" type="button" data-i="'+i+'" aria-pressed="'+(i===cur)+'">'+u.e+'</button>';}).join('');
  function draw(){var u=users[cur];$$('.chip',ch).forEach(function(c,i){c.setAttribute('aria-pressed',i===cur?'true':'false');});
    $('[data-o]',w).innerHTML='<p style="margin:6px 0"><strong>1.</strong> Token verified &rarr; email found in the shared profile table &rarr; room <code>'+u.s+'</code>, role '+u.r+'.</p><p style="margin:6px 0"><strong>2.</strong> Every database call in this request starts with <code>SET search_path = '+u.s+', public</code>.</p><p style="margin:6px 0 4px"><strong>3.</strong> So this person can only reach:</p>'+list(u.t)+'<p class="muted" style="margin:8px 0 0">The other company\'s room is simply not on the path. If no room can be established, Zevra refuses the request instead of falling back to shared space.</p>';}
  ch.addEventListener('click',function(e){var b=e.target.closest('.chip');if(b){cur=+b.getAttribute('data-i');draw();}});draw();
};

/* ---------- chat examples ---------- */
function initChat(){
  var def=ZG.flows.f3,inst=def.inst,ex=def.examples;
  var pick=$('#qpick');
  pick.innerHTML=ex.map(function(e,i){return'<button class="chip" type="button" data-i="'+i+'" aria-pressed="'+(i===0)+'">'+esc(e.label)+'</button>';}).join('');
  function draw(i){var e=ex[i];$$('.chip',pick).forEach(function(c,k){c.setAttribute('aria-pressed',k===i?'true':'false');});
    $('#qintro').innerHTML='<div class="eyebrow">The question</div><p class="say" style="font-size:1.35rem;margin:2px 0 8px;max-width:none">&ldquo;'+esc(e.question)+'&rdquo;</p><p class="muted" style="margin:0">'+e.intro+'</p><p style="margin:10px 0 0"><strong>Outcome:</strong> '+e.outcome+'</p>';
    inst.setExample(e);ledger(e);}
  pick.addEventListener('click',function(e){var b=e.target.closest('.chip');if(b)draw(+b.getAttribute('data-i'));});
  draw(0);
}
function ledger(e){
  var host=$('#ledger'),rows=e.ledger,max=0,tin=0,tout=0,ai=0,emb=0;
  rows.forEach(function(r){if(r.in>max)max=r.in;tin+=r.in;tout+=r.out;if(r.k==='e')emb++;else ai++;});
  var h='<p style="margin:0 0 10px"><strong>'+(ai+emb)+' calls</strong>: '+ai+' language-model call'+(ai===1?'':'s')+' and '+emb+' embedding call'+(emb===1?'':'s')+' &middot; '+num(tin)+' tokens in, '+num(tout)+' tokens out. '+(e.ledgerNote||'')+'</p>';
  h+=rows.map(function(r){var w=Math.max(2,Math.round(r.in/max*100));
    return'<div class="lrow"><span>'+esc(r.n)+' <span class="muted">· '+esc(r.m)+'</span></span><span><i class="'+(r.k||'')+'" style="width:'+w+'%"></i></span><span>'+num(r.in)+'</span></div>';}).join('');
  host.innerHTML=h+'<p class="muted" style="margin:10px 0 0;font-size:.82rem">Bar length = input size in tokens (about ¾ of a word each). Violet = main model, blue = embedding, amber = small model.</p>';
}

/* ---------- agent simulator ---------- */
function agentSim(){
  var host=$('#agentsim'),S=ZG.agentRun,i=0;
  host.innerHTML='<div class="sim"><div><div class="card"><div class="eyebrow">The request</div><p class="say" style="font-size:1.2rem;margin:0 0 6px;max-width:none">&ldquo;'+esc(S.task)+'&rdquo;</p><p class="muted" style="margin:0"><span class="pill">Illustrative run</span> Wording is illustrative; the figures are from Acme\'s demo retail data.</p><div class="stat" data-st></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-a="n" type="button">Next ›</button><button class="btn" data-a="r" type="button">Restart</button></div></div><div data-log style="margin-top:12px"></div></div><div class="card"><h4>What the agent is allowed to do</h4>'+list(S.rules)+'</div></div>';
  var log=$('[data-log]',host),st=$('[data-st]',host);
  function draw(){
    var shown=S.steps.slice(0,i),calls=shown.filter(function(s){return s.t==='ai'||s.t==='fin';}).length,tools=shown.filter(function(s){return s.t==='tool';}).length;
    st.innerHTML='<div><b>'+calls+'</b><small>AI reasoning calls</small></div><div><b>'+tools+'</b><small>tool uses</small></div><div><b>'+Math.min(calls,S.max)+' / '+S.max+'</b><small>step limit</small></div>';
    log.innerHTML=shown.map(function(s){var lab={ai:'The agent thinks (OpenAI gpt-4o)',tool:'The agent asks Zevra to run a tool',obs:'Zevra returns the result',fin:'The agent gives its final answer'}[s.t];
      return'<div class="thought '+s.t+'"><b>'+lab+(s.tool?' · '+esc(s.tool):'')+'</b>'+s.x+(s.sql?'<pre>'+esc(s.sql)+'</pre>':'')+(s.note?'<div class="muted" style="margin-top:4px;font-size:.8rem">'+s.note+'</div>':'')+'</div>';}).join('');
    $('[data-a="n"]',host).disabled=i>=S.steps.length;}
  host.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b)return;var a=b.getAttribute('data-a');if(a==='n'&&i<S.steps.length)i++;if(a==='r')i=0;draw();});
  draw();
}

/* ---------- background features ---------- */
function bgFeatures(){
  var host=$('#bg'),F=ZG.bg,cur=0;
  host.innerHTML='<div class="chips"></div><div class="card" data-b></div>';
  var ch=$('.chips',host);
  ch.innerHTML=F.map(function(f,i){return'<button class="chip" type="button" data-i="'+i+'" aria-pressed="'+(i===cur)+'">'+esc(f.name)+'</button>';}).join('');
  function draw(){var f=F[cur];$$('.chip',ch).forEach(function(c,i){c.setAttribute('aria-pressed',i===cur?'true':'false');});
    $('[data-b]',host).innerHTML='<h4>'+esc(f.name)+'</h4><p style="margin:6px 0 10px">'+f.what+'</p><div class="legend" style="margin:0 0 12px">'+f.tags.map(tagHTML).join('')+'</div><div class="cols2"><div><h5>How it runs</h5>'+list(f.how)+'</div><div><h5>Where AI is, and is not, involved</h5>'+list(f.ai)+'</div></div>';}
  ch.addEventListener('click',function(e){var b=e.target.closest('.chip');if(b){cur=+b.getAttribute('data-i');draw();}});draw();
}

/* ---------- learning simulator ---------- */
function learnSim(){
  var host=$('#learnsim'),S=ZG.learn;
  var st;function reset(){st={c:.5,u:1,state:'cand',promoted:false,hasConcept:true,log:['Learned from a clarification: &ldquo;overdue&rdquo; now maps to a SQL rule. Confidence 0.50, used 1 time.']};}
  reset();
  host.innerHTML='<div class="sim"><div class="card"><div class="eyebrow">A learned term</div><div class="term">&ldquo;overdue&rdquo;</div><p class="mono muted" style="margin:4px 0 12px">expected_delivery_date &lt; CURRENT_DATE AND actual_delivery_date IS NULL</p><div data-state></div><div class="stat" data-s></div><div class="meter" aria-label="Confidence"><i data-bar></i><span class="mk lo" style="left:20%"><span>0.20 purge line</span></span><span class="mk hi" style="left:80%"><span>0.80 promotion line</span></span></div><div style="display:flex;gap:8px;flex-wrap:wrap" data-btns></div><p class="muted" style="font-size:.82rem;margin:10px 0 0">Promotion needs both at least 10 uses and confidence of 0.80 or more. A term is dropped when it has at least 5 uses and confidence below 0.20. The nightly job runs at 02:45.</p></div><div><div class="card"><h4>What happens, in order</h4><ul class="log" data-log></ul></div><div class="card" style="margin-top:12px"><h4>Who can see it now?</h4><label style="display:flex;gap:8px;align-items:center;margin:6px 0 2px;font-size:.88rem"><input type="checkbox" id="hasConcept" checked> This term is tied to a business concept (Purchase Order)</label><div class="sees" data-sees></div></div></div></div>';
  var btns=[['reuse','Used again (+0.05)'],['up','Thumbs up (+0.08)'],['corr','User correction (−0.20)'],['night','Run the nightly job'],['reset','Reset']];
  $('[data-btns]',host).innerHTML=btns.map(function(b){return'<button class="btn'+(b[0]==='night'?' pri':'')+'" type="button" data-a="'+b[0]+'">'+b[1]+'</button>';}).join('');
  function f2(x){return x.toFixed(2);}
  function draw(){
    var s=st;
    $('[data-bar]',host).style.width=Math.round(s.c*100)+'%';
    $('[data-s]',host).innerHTML='<div><b>'+f2(s.c)+'</b><small>confidence</small></div><div><b>'+s.u+'</b><small>times used</small></div>';
    var lab={cand:'Candidate (not yet vocabulary)',prom:'Promoted to company vocabulary',purge:'Dropped (never earned trust)'};
    $('[data-state]',host).innerHTML='<span class="state '+s.state+'">'+lab[s.state]+'</span>';
    $('[data-log]',host).innerHTML=s.log.slice().reverse().map(function(l){return'<li>'+l+'</li>';}).join('');
    var p=s.state==='prom',hc=$('#hasConcept',host).checked;
    function row(y,t){return'<div class="'+(y?'yes':'no')+'">'+(y?'✓ ':'✗ ')+t+'</div>';}
    $('[data-sees]',host).innerHTML=s.state==='purge'?row(false,'Nobody: the term was deleted')
      :row(p,'Word-matching step (company vocabulary): '+(p?'will recognise &ldquo;overdue&rdquo;':'not yet'))
      +row(p&&hc,'Concept-picking AI call: '+(p&&hc?'the concept text now includes this term':'needs promotion and a concept'))
      +row(p&&hc,'Query-writing AI call: '+(p&&hc?'shown as &ldquo;learned business knowledge&rdquo; evidence':'needs promotion and a concept'));
    $$('[data-a]',host).forEach(function(b){var a=b.getAttribute('data-a');b.disabled=(a!=='reset'&&s.state!=='cand');});
  }
  host.addEventListener('click',function(e){
    var b=e.target.closest('[data-a]');if(!b||b.disabled)return;var a=b.getAttribute('data-a');
    if(a==='reset'){reset();draw();return;}
    if(a==='reuse'){st.c=Math.min(1,st.c+.05);st.u+=1;st.log.push('The same term was learned again: confidence +0.05, used +1 → <strong>'+f2(st.c)+'</strong>, '+st.u+' uses.');}
    if(a==='up'){st.c=Math.min(1,st.c+.08);st.u+=1;st.log.push('A person gave a thumbs up on an answer that used it: +0.08, used +1 → <strong>'+f2(st.c)+'</strong>, '+st.u+' uses.');}
    if(a==='corr'){st.c=Math.max(0,st.c-.20);st.log.push('A user corrected an answer that relied on it (an AI call detected the correction): −0.20 → <strong>'+f2(st.c)+'</strong>.');}
    if(a==='night'){
      if(st.u>=10&&st.c>=.8){st.state='prom';st.log.push('<strong>Nightly job:</strong> '+st.u+' uses and confidence '+f2(st.c)+' → promoted. A vocabulary entry is created; the concept index refreshes automatically.');}
      else if(st.u>=5&&st.c<.2){st.state='purge';st.log.push('<strong>Nightly job:</strong> '+st.u+' uses but confidence '+f2(st.c)+' → deleted.');}
      else{var need=[];if(st.u<10)need.push('needs '+(10-st.u)+' more use'+(10-st.u===1?'':'s'));if(st.c<.8)need.push('confidence must reach 0.80');st.log.push('<strong>Nightly job:</strong> nothing to do yet ('+need.join(' and ')+').');}
    }
    draw();});
  host.addEventListener('change',function(e){if(e.target.id==='hasConcept')draw();});
  draw();
}

/* ---------- trust tab ---------- */
function trust(){
  boundary($('#bnd-trust'));
  $('#storeTable tbody').innerHTML=ZG.store.map(function(r){return'<tr><td><strong>'+r[0]+'</strong></td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td></tr>';}).join('');
  $('#guards').innerHTML=ZG.guards.map(function(g,i){return'<div class="card"><div class="eyebrow">Check '+(i+1)+'</div><h4>'+g[0]+'</h4><p class="muted" style="margin:6px 0 0">'+g[1]+'</p></div>';}).join('');
  $('#limits').innerHTML=ZG.limits.map(function(g){return'<div class="card"><h4>'+g[0]+'</h4><p class="muted" style="margin:6px 0 0">'+g[1]+'</p></div>';}).join('');
  $('#faq').innerHTML=ZG.faq.map(function(q){return'<details><summary>'+q[0]+'</summary><p>'+q[1]+'</p></details>';}).join('');
}

/* ---------- boot ---------- */
function boot(){
  $$('.js-reviewed').forEach(function(e){e.textContent=ZG.meta.reviewed;});
  ['f1','f2','f3','f4','f5'].forEach(function(k){var d=ZG.flows[k];d.inst=new Flow($('#flow-'+k),d);});
  initOverview();initChat();agentSim();bgFeatures();learnSim();trust();boundary($('#bnd-f2'));
  initTheme();initTabs();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
