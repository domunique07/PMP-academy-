
const PATH='./'; const STORE='pmpAcademy4';
const S={curriculum:null,chapters:{},questions:{},activities:{},view:'dashboard',chapter:'chapter1',state:loadState()};
function baseState(){return{theme:'dark',completedSections:{},checkpointResults:{},activityResults:{},answers:{},sessions:[],chapterMastery:{},lastLocation:null}}
function loadState(){try{return Object.assign(baseState(),JSON.parse(localStorage.getItem(STORE)||'{}'))}catch(e){return baseState()}}
function save(){localStorage.setItem(STORE,JSON.stringify(S.state));renderProgress()}
async function getJSON(url){const r=await fetch(PATH+url);if(!r.ok)throw new Error(url);return r.json()}
async function boot(){
 S.curriculum=await getJSON('data/curriculum.json');
 for(const id of ['chapter1','chapter2']){
  S.chapters[id]=await getJSON(`chapters/${id}.json`);
  S.questions[id]=(await getJSON(`questions/${id}.json`)).questions;
  S.activities[id]=(await getJSON(`activities/${id}.json`)).activities;
 }
 renderNav(); show('dashboard');
 document.body.classList.toggle('dark',S.state.theme==='dark');
 document.getElementById('theme').onclick=()=>{S.state.theme=S.state.theme==='dark'?'light':'dark';document.body.classList.toggle('dark',S.state.theme==='dark');save()}
}
function renderNav(){
 const nav=document.getElementById('nav');
 nav.innerHTML=['dashboard','curriculum','lesson','practice','progress'].map(v=>`<button class="navbtn" data-view="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('');
 nav.onclick=e=>{const b=e.target.closest('[data-view]');if(b)show(b.dataset.view)}
}
function show(v){
 S.view=v; document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v));
 document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
 if(v==='dashboard')renderDashboard(); if(v==='curriculum')renderCurriculum(); if(v==='lesson')renderLesson(); if(v==='practice')renderPractice(); if(v==='progress')renderProgress();
 window.scrollTo({top:0,behavior:'smooth'});
}
function sectionProgress(ch){const total=ch.sections.filter(s=>s.blocks&&s.blocks.length).length;const done=ch.sections.filter(s=>S.state.completedSections[`${ch.id}:${s.id}`]).length;return total?Math.round(done/total*100):0}
function renderDashboard(){
 const c1=sectionProgress(S.chapters.chapter1),c2=sectionProgress(S.chapters.chapter2);
 const answered=Object.keys(S.state.answers).length; const correct=Object.values(S.state.answers).filter(x=>x.correct).length; const acc=answered?Math.round(correct/answered*100):0;
 document.getElementById('dashboard').innerHTML=`<div class="card hero"><div class="eyebrow">4.0 FOUNDATION</div><h2>Data-driven PMP curriculum</h2><p>Chapter 1 has been migrated. Chapter 2 has started in the guide's published order, beginning with Creating Value, Value Delivery Components, and Assessing Project Success.</p><button class="primary" data-open="chapter1">Continue Chapter 1</button></div>
 <div class="stats"><div class="card stat"><strong>${answered}</strong><span>questions answered</span></div><div class="card stat"><strong>${answered?acc+'%':'—'}</strong><span>accuracy</span></div><div class="card stat"><strong>${Object.keys(S.state.activityResults).length}</strong><span>activities completed</span></div></div>
 <div class="grid"><div class="card"><h3>Chapter 1</h3><div class="progressbar"><div style="width:${c1}%"></div></div><p>${c1}% complete</p><button class="secondary" data-open="chapter1">Open</button></div>
 <div class="card"><h3>Chapter 2</h3><div class="progressbar"><div style="width:${c2}%"></div></div><p>${c2}% complete • in development</p><button class="secondary" data-open="chapter2">Open</button></div></div>`;
 document.getElementById('dashboard').onclick=e=>{const b=e.target.closest('[data-open]');if(b){S.chapter=b.dataset.open;show('lesson')}}
}
function renderCurriculum(){
 document.getElementById('curriculum').innerHTML=`<div class="card"><div class="eyebrow">GUIDE ORDER</div><h2>Curriculum</h2><p class="muted">The curriculum follows the uploaded PMBOK® Guide, Eighth Edition chapter and subsection order.</p></div><div class="grid">${S.curriculum.chapters.map(ch=>`<article class="card chapter-card ${ch.status==='planned'?'locked':''}"><span class="badge">${ch.status}</span><h3>${ch.number}. ${ch.title}</h3>${ch.sections?`<p class="muted">${ch.sections.join(' • ')}</p>`:''}${ch.id==='chapter1'||ch.id==='chapter2'?`<button class="secondary" data-open="${ch.id}">Open</button>`:''}</article>`).join('')}</div>`;
 document.getElementById('curriculum').onclick=e=>{const b=e.target.closest('[data-open]');if(b){S.chapter=b.dataset.open;show('lesson')}}
}
function renderLesson(){
 const ch=S.chapters[S.chapter];
 document.getElementById('lesson').innerHTML=`<div class="card lesson-head"><div class="eyebrow">CHAPTER ${ch.number}</div><h1>${ch.title}</h1><p>${ch.objectives.map(x=>'• '+x).join('<br>')}</p></div>
 ${ch.sections.map(sec=>sec.blocks&&sec.blocks.length?`<section class="card section" id="sec-${sec.id}"><span class="badge">${sec.id}</span><h2>${sec.title}</h2>${sec.blocks.map(b=>renderBlock(b,ch,sec)).join('')}<button class="secondary complete-section" data-sec="${sec.id}">${S.state.completedSections[`${ch.id}:${sec.id}`]?'Completed ✓':'Mark subsection complete'}</button></section>`:`<section class="card section"><span class="badge">${sec.id}</span><h2>${sec.title}</h2><p class="muted">Content development starts in the next release.</p></section>`).join('')}`;
 const box=document.getElementById('lesson');
 box.onclick=e=>{
  const c=e.target.closest('.complete-section');if(c){S.state.completedSections[`${ch.id}:${c.dataset.sec}`]=true;save();renderLesson();return}
  const cp=e.target.closest('[data-cp-choice]');if(cp)answerCheckpoint(cp); const check=e.target.closest('[data-check-activity]');if(check)checkActivity(check.dataset.checkActivity);
 };
 setupDragDrop();
 S.state.lastLocation={chapter:S.chapter};save();
}
function renderBlock(b,ch,sec){
 if(b.type==='objective'||b.type==='explanation'||b.type==='pmi'||b.type==='trap'||b.type==='example')return `<div class="block ${b.type}"><h3>${b.title}</h3><p>${b.text}</p></div>`;
 if(b.type==='terms')return `<div class="terms">${b.items.map(x=>`<div class="term"><strong>${x[0]}</strong><p>${x[1]}</p></div>`).join('')}</div>`;
 if(b.type==='compare')return `<div class="compare"><div><h3>${b.left.title}</h3><ul>${b.left.items.map(x=>`<li>${x}</li>`).join('')}</ul></div><div><h3>${b.right.title}</h3><ul>${b.right.items.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`;
 if(b.type==='flow')return `<div class="flow">${b.items.map((x,i)=>`${i?'<b>→</b>':''}<span>${x}</span>`).join('')}</div>`;
 if(b.type==='checkpoint'){const key=`${ch.id}:${sec.id}:${b.question}`;const old=S.state.checkpointResults[key];return `<div class="block checkpoint" data-cp-key="${encodeURIComponent(key)}"><h3>Checkpoint</h3><p>${b.question}</p>${b.choices.map((x,i)=>`<button data-cp-choice="${i}" data-answer="${b.answer}" data-explanation="${encodeURIComponent(b.explanation)}">${x}</button>`).join('')}${old?`<div class="feedback ${old.correct?'ok':'no'}">${old.correct?'Correct. ':'Not quite. '}${b.explanation}</div>`:''}</div>`}
 if(b.type==='activity')return renderActivity(b.activityId);
 return '';
}
function answerCheckpoint(btn){
 const wrap=btn.closest('.checkpoint'),key=decodeURIComponent(wrap.dataset.cpKey),correct=Number(btn.dataset.cpChoice)===Number(btn.dataset.answer),ex=decodeURIComponent(btn.dataset.explanation);
 S.state.checkpointResults[key]={correct};save();wrap.querySelectorAll('button').forEach(x=>x.disabled=true);wrap.insertAdjacentHTML('beforeend',`<div class="feedback ${correct?'ok':'no'}">${correct?'Correct. ':'Not quite. '}${ex}</div>`);
}
function findActivity(id){return [...S.activities.chapter1,...S.activities.chapter2].find(x=>x.id===id)}
function renderActivity(id){
 const a=findActivity(id);
 if(a.type==='drag-match')return `<div class="block activity" data-activity="${id}"><h3>${a.title}</h3><p>${a.instructions}</p><div class="drag-bank">${a.items.map(i=>`<div class="drag-item" draggable="true" data-item="${i.id}">${i.label}</div>`).join('')}</div>${a.targets.map(t=>`<div class="drop-target" data-target="${t.id}"><strong>${t.text}</strong></div>`).join('')}<button class="primary wide" data-check-activity="${id}">Check Answers</button><div class="activity-feedback"></div></div>`;
 if(a.type==='sequence')return `<div class="block activity" data-activity="${id}"><h3>${a.title}</h3><p>${a.instructions}</p><div class="sequence-list">${a.items.map(i=>`<div class="sequence-item" draggable="true" data-item="${i.id}">${i.label}</div>`).join('')}</div><button class="primary wide" data-check-activity="${id}">Check Order</button><div class="activity-feedback"></div></div>`;
}
function setupDragDrop(){
 let dragged=null;
 document.querySelectorAll('[draggable=true]').forEach(el=>{
  el.addEventListener('dragstart',()=>dragged=el);
  el.addEventListener('touchstart',()=>dragged=el,{passive:true});
 });
 document.querySelectorAll('.drop-target,.sequence-list').forEach(t=>{
  t.addEventListener('dragover',e=>{e.preventDefault();t.classList.add('over')});
  t.addEventListener('dragleave',()=>t.classList.remove('over'));
  t.addEventListener('drop',e=>{e.preventDefault();t.classList.remove('over');if(dragged)t.appendChild(dragged)});
 });
 // iPhone-friendly tap fallback: tap item, then target.
 let selected=null;
 document.querySelectorAll('.drag-item,.sequence-item').forEach(el=>el.addEventListener('click',()=>{selected=el;document.querySelectorAll('[draggable=true]').forEach(x=>x.style.outline='');el.style.outline='3px solid #f3b43d'}));
 document.querySelectorAll('.drop-target').forEach(t=>t.addEventListener('click',()=>{if(selected){t.appendChild(selected);selected.style.outline='';selected=null}}));
 document.querySelectorAll('.sequence-item').forEach(t=>t.addEventListener('click',()=>{if(selected&&selected!==t){t.parentElement.insertBefore(selected,t);selected.style.outline='';selected=null}}));
}
function checkActivity(id){
 const a=findActivity(id),wrap=document.querySelector(`[data-activity="${id}"]`),fb=wrap.querySelector('.activity-feedback');let correct=true;
 if(a.type==='drag-match'){a.items.forEach(i=>{const el=wrap.querySelector(`[data-item="${i.id}"]`),target=el.closest('.drop-target');const ok=target&&target.dataset.target===i.target;if(target)target.classList.add(ok?'correct':'incorrect');if(!ok)correct=false})}
 if(a.type==='sequence'){const order=[...wrap.querySelectorAll('.sequence-item')].map(x=>x.dataset.item);correct=JSON.stringify(order)===JSON.stringify(a.correctOrder);wrap.querySelector('.sequence-list').classList.add(correct?'correct':'incorrect')}
 S.state.activityResults[id]={correct};save();fb.className=`activity-feedback feedback ${correct?'ok':'no'}`;fb.textContent=correct?'Correct — activity mastered.':'Not quite. Review the relationships and try again.';
}
function renderPractice(){
 const qs=S.questions[S.chapter]||[];document.getElementById('practice').innerHTML=`<div class="card"><div class="eyebrow">PRACTICE</div><h2>${S.chapters[S.chapter].title}</h2><p>${qs.length} questions available in this development build.</p></div><div id="qbox">${qs.slice(0,20).map((q,i)=>`<div class="card question" data-qid="${q.id}"><span class="badge">${q.section||q.topic}</span><h3>${i+1}. ${q.q}</h3>${q.choices.map((c,j)=>`<button class="choice" data-choice="${j}">${c}</button>`).join('')}<div class="qfeedback"></div></div>`).join('')}</div>`;
 document.getElementById('qbox').onclick=e=>{const b=e.target.closest('.choice');if(!b)return;const card=b.closest('.question');if(card.dataset.locked)return;card.dataset.locked='1';const q=qs.find(x=>String(x.id)===card.dataset.qid),picked=Number(b.dataset.choice),correct=picked===q.answer;card.querySelectorAll('.choice').forEach((x,i)=>{x.disabled=true;if(i===q.answer)x.classList.add('correct');else if(i===picked)x.classList.add('incorrect')});card.querySelector('.qfeedback').innerHTML=`<div class="feedback ${correct?'ok':'no'}">${correct?'Correct. ':'Incorrect. '}${q.explanation}</div>`;S.state.answers[`${S.chapter}:${q.id}`]={correct,picked};save()}
}
function renderProgress(){
 const answered=Object.keys(S.state.answers).length,correct=Object.values(S.state.answers).filter(x=>x.correct).length,acc=answered?Math.round(correct/answered*100):0;
 document.getElementById('progress').innerHTML=`<div class="stats"><div class="card stat"><strong>${answered}</strong><span>answered</span></div><div class="card stat"><strong>${answered?acc+'%':'—'}</strong><span>accuracy</span></div><div class="card stat"><strong>${Object.keys(S.state.checkpointResults).length}</strong><span>checkpoints</span></div></div><div class="card"><h3>Chapter progress</h3><p>Chapter 1: ${sectionProgress(S.chapters.chapter1)}%</p><div class="progressbar"><div style="width:${sectionProgress(S.chapters.chapter1)}%"></div></div><p>Chapter 2: ${sectionProgress(S.chapters.chapter2)}%</p><div class="progressbar"><div style="width:${sectionProgress(S.chapters.chapter2)}%"></div></div></div><button class="danger wide" id="reset">Reset development progress</button>`;
 const r=document.getElementById('reset');if(r)r.onclick=()=>{if(confirm('Reset all Version 4.0 development progress?')){localStorage.removeItem(STORE);location.reload()}}
}
boot().catch(err=>{document.body.innerHTML=`<main style="padding:30px"><h1>Unable to load PMP Academy</h1><p>${err.message}</p><p>Confirm all data, chapters, questions, and activities folders were uploaded.</p></main>`});
