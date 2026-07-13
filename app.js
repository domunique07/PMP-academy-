
(function(){
'use strict';
const BANK=window.QUESTION_BANK, CARDS=window.FLASHCARDS, KEY='pmpAcademyV11';
const today=()=>new Date().toISOString().slice(0,10);
const empty=()=>({theme:'dark',lessonComplete:false,totalAnswered:0,totalCorrect:0,sessions:[],topics:{},reviewIds:[],flaggedIds:[],daily:{},streak:0,lastGoalDate:null,mastered:[],cardReviews:0});
let state=load(), session=null, cardOrder=CARDS.map((_,i)=>i), cardPos=0, cardBack=false;
function load(){try{return Object.assign(empty(),JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return empty();}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll();}
function pct(a,b){return b?Math.round(a/b*100):0}
function best(){return state.sessions.length?Math.max(...state.sessions.map(x=>x.score)):null}
function accuracy(){return pct(state.totalCorrect,state.totalAnswered)}
function readiness(){let a=accuracy(), lesson=state.lessonComplete?15:0, sessions=Math.min(state.sessions.length*4,20), mastery=Math.min(state.mastered.length*2,20);return Math.min(100,Math.round(a*.45+lesson+sessions+mastery))}
function currentDaily(){return state.daily[today()]||0}
function updateStreak(){
 const d=today(), count=currentDaily();
 if(count<10)return;
 if(state.lastGoalDate===d)return;
 const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
 const y=yesterday.toISOString().slice(0,10);
 state.streak=state.lastGoalDate===y?state.streak+1:1;
 state.lastGoalDate=d;
}
document.querySelectorAll('[data-view],[data-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view||b.dataset.jump)));
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='review')renderReview()}
document.getElementById('themeToggle').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';applyTheme();save()}
function applyTheme(){document.body.classList.toggle('dark',state.theme==='dark')}
applyTheme();

document.getElementById('markLesson').onclick=()=>{state.lessonComplete=true;save()}
function populateTopics(){const s=document.getElementById('topicFilter');[...new Set(BANK.map(q=>q.topic))].sort().forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;s.appendChild(o)})}
populateTopics();

function shuffled(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
document.getElementById('beginPractice').onclick=()=>{
 const n=Number(document.getElementById('questionCount').value), topic=document.getElementById('topicFilter').value, randomAnswers=document.getElementById('shuffleAnswers').checked;
 let pool=BANK.map((q,i)=>({...q,id:i})).filter(q=>topic==='All'||q.topic===topic);
 pool=shuffled(pool).slice(0,Math.min(n,pool.length)).map(q=>{
  if(!randomAnswers)return {...q,displayChoices:q.choices.map((c,i)=>({text:c,orig:i}))};
  return {...q,displayChoices:shuffled(q.choices.map((c,i)=>({text:c,orig:i})))};
 });
 session={questions:pool,pos:0,correct:0,answered:0,results:[],started:Date.now(),locked:false};
 document.getElementById('practiceSetup').classList.add('hidden');document.getElementById('practiceSession').classList.remove('hidden');document.getElementById('sessionResult').classList.add('hidden');renderQuestion();
}
function renderQuestion(){
 const q=session.questions[session.pos], card=document.getElementById('questionCard');
 document.getElementById('sessionTitle').textContent=`Question ${session.pos+1}`;
 document.getElementById('sessionProgress').textContent=`${session.pos+1}/${session.questions.length}`;
 document.getElementById('sessionLive').textContent=`${session.correct} correct`;
 document.getElementById('flagQuestion').textContent=state.flaggedIds.includes(q.id)?'★ Flagged':'☆ Flag';
 document.getElementById('nextQuestion').textContent=session.pos===session.questions.length-1?'Finish Session':'Next Question';
 card.innerHTML=`<div class="meta"><span>${q.topic}</span><span>${q.difficulty}</span></div><h3>${q.q}</h3><div id="choices">${q.displayChoices.map((c,i)=>`<button class="option" data-orig="${c.orig}"><strong>${String.fromCharCode(65+i)}.</strong> ${c.text}</button>`).join('')}</div><div id="feedback"></div>`;
 session.locked=false;
}
document.getElementById('questionCard').addEventListener('click',e=>{
 const btn=e.target.closest('.option');if(!btn||session.locked)return;session.locked=true;
 const q=session.questions[session.pos], picked=Number(btn.dataset.orig), ok=picked===q.answer;
 session.answered++;if(ok)session.correct++;
 document.querySelectorAll('.option').forEach(o=>{const orig=Number(o.dataset.orig);o.classList.add(orig===q.answer?'correct':orig===picked?'incorrect':'')});
 const fb=document.getElementById('feedback');fb.className='feedback '+(ok?'good':'bad');
 let wrongDetails='';
 if(!ok){wrongDetails='<ul class="why-list">'+q.displayChoices.map(c=>c.orig===q.answer?'':`<li><strong>${c.text}:</strong> ${q.whyWrong[c.orig]}</li>`).join('')+'</ul>'}
 fb.innerHTML=ok?`<strong>Correct.</strong> ${q.explanation}`:`<strong>Incorrect.</strong> Best answer: <strong>${q.choices[q.answer]}</strong><br>${q.explanation}${wrongDetails}`;
 session.results.push({id:q.id,ok,picked,topic:q.topic});
 state.totalAnswered++;if(ok)state.totalCorrect++;
 state.topics[q.topic]=state.topics[q.topic]||{answered:0,correct:0};state.topics[q.topic].answered++;if(ok)state.topics[q.topic].correct++;
 state.daily[today()]=(state.daily[today()]||0)+1;
 if(!ok&&!state.reviewIds.includes(q.id))state.reviewIds.push(q.id);
 updateStreak();save();
});
document.getElementById('flagQuestion').onclick=()=>{
 const id=session.questions[session.pos].id, i=state.flaggedIds.indexOf(id);if(i>=0)state.flaggedIds.splice(i,1);else state.flaggedIds.push(id);save();document.getElementById('flagQuestion').textContent=state.flaggedIds.includes(id)?'★ Flagged':'☆ Flag';
}
document.getElementById('nextQuestion').onclick=()=>{
 if(!session.locked){alert('Select an answer before continuing.');return}
 if(session.pos<session.questions.length-1){session.pos++;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}else finishSession()
}
function finishSession(){
 const score=pct(session.correct,session.questions.length);
 state.sessions.push({date:new Date().toISOString(),score,correct:session.correct,total:session.questions.length,duration:Math.round((Date.now()-session.started)/1000)});
 save();document.getElementById('practiceSession').classList.add('hidden');
 const r=document.getElementById('sessionResult');r.classList.remove('hidden');r.innerHTML=`<h2>${score}%</h2><p>${session.correct} of ${session.questions.length} correct</p><p>${score>=90?'Excellent performance.':score>=75?'Good foundation. Review missed questions.':'Review Lesson 1 and your missed explanations.'}</p><div class="button-row"><button class="secondary" onclick="location.reload()">New Session</button><button class="primary" data-review-now>Review Missed</button></div>`;
 r.querySelector('[data-review-now]').onclick=()=>showView('review');
 document.getElementById('practiceSetup').classList.remove('hidden');
}
function renderReview(){
 const ids=[...new Set([...state.reviewIds,...state.flaggedIds])], box=document.getElementById('reviewList');box.innerHTML='';
 if(!ids.length){box.innerHTML='<p class="muted">Your review queue is empty.</p>';return}
 ids.forEach(id=>{const q=BANK[id], d=document.createElement('div');d.className='review-item';d.innerHTML=`<div class="meta"><span>${q.topic}</span><span>${state.flaggedIds.includes(id)?'Flagged':'Missed'}</span></div><h4>${q.q}</h4><p class="answer">${q.choices[q.answer]}</p><p>${q.explanation}</p><button class="secondary" data-remove="${id}">Mark Reviewed</button>`;box.appendChild(d)})
 box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.remove);state.reviewIds=state.reviewIds.filter(x=>x!==id);state.flaggedIds=state.flaggedIds.filter(x=>x!==id);save();renderReview()})
}
document.getElementById('clearReview').onclick=()=>{state.reviewIds=[];state.flaggedIds=[];save();renderReview()}

function activeCards(){return document.getElementById('unmasteredOnly').checked?cardOrder.filter(i=>!state.mastered.includes(i)):cardOrder}
function renderCard(){
 const list=activeCards();if(!list.length){document.getElementById('cardFace').textContent='All cards mastered';document.getElementById('cardTopic').textContent='GREAT WORK';return}
 cardPos=Math.min(cardPos,list.length-1);const id=list[cardPos], c=CARDS[id];
 document.getElementById('cardCounter').textContent=`${cardPos+1}/${list.length}`;
 document.getElementById('cardTopic').textContent=c.topic;
 document.getElementById('cardFace').textContent=cardBack?c.back:c.front;
 document.getElementById('flashcard').classList.toggle('mastered',state.mastered.includes(id));
}
document.getElementById('flashcard').onclick=()=>{cardBack=!cardBack;if(cardBack){state.cardReviews++;save()}renderCard()}
document.getElementById('nextCard').onclick=()=>{const l=activeCards();if(l.length){cardPos=(cardPos+1)%l.length;cardBack=false;renderCard()}}
document.getElementById('prevCard').onclick=()=>{const l=activeCards();if(l.length){cardPos=(cardPos-1+l.length)%l.length;cardBack=false;renderCard()}}
document.getElementById('shuffleCards').onclick=()=>{cardOrder=shuffled(cardOrder);cardPos=0;cardBack=false;renderCard()}
document.getElementById('unmasteredOnly').onchange=()=>{cardPos=0;cardBack=false;renderCard()}
document.getElementById('markMastered').onclick=()=>{const l=activeCards();if(!l.length)return;const id=l[cardPos];if(!state.mastered.includes(id))state.mastered.push(id);save();renderCard()}
document.getElementById('needsWork').onclick=()=>{const l=activeCards();if(!l.length)return;const id=l[cardPos];state.mastered=state.mastered.filter(x=>x!==id);save();renderCard()}
renderCard();

function weakest(){
 const entries=Object.entries(state.topics).filter(([,d])=>d.answered>=2);if(!entries.length)return null;
 return entries.sort((a,b)=>pct(a[1].correct,a[1].answered)-pct(b[1].correct,b[1].answered))[0]
}
function renderDashboard(){
 const r=readiness(), b=best(), daily=currentDaily(), weak=weakest();
 document.getElementById('readiness').textContent=r+'%';document.querySelector('.readiness-ring').style.setProperty('--ring',r+'%');
 document.getElementById('dailyTitle').textContent=`${Math.min(daily,10)} of 10 questions`;document.getElementById('dailyBar').style.width=Math.min(daily/10*100,100)+'%';document.getElementById('streakBadge').textContent=`${state.streak}-day streak`;
 document.getElementById('dashBest').textContent=b===null?'—':b+'%';document.getElementById('dashAccuracy').textContent=state.totalAnswered?accuracy()+'%':'—';document.getElementById('dashMissed').textContent=new Set([...state.reviewIds,...state.flaggedIds]).size;
 document.getElementById('lessonProgress').style.width=(state.lessonComplete?100:state.totalAnswered?65:25)+'%';document.getElementById('markLesson').textContent=state.lessonComplete?'Lesson Completed ✓':'Mark Lesson Complete';
 document.getElementById('weakBadge').textContent=weak?weak[0]:'Not enough data';document.getElementById('weakText').textContent=weak?`${pct(weak[1].correct,weak[1].answered)}% accuracy across ${weak[1].answered} answered questions.`:'Complete practice questions to identify a weak area.';
}
function renderProgress(){
 document.getElementById('progressReadiness').textContent=readiness()+'%';document.getElementById('progressAttempts').textContent=state.sessions.length;document.getElementById('progressAccuracy').textContent=state.totalAnswered?accuracy()+'%':'—';
 const box=document.getElementById('topicStats');box.innerHTML='';const topics=Object.keys(state.topics).sort();
 if(!topics.length)box.innerHTML='<p class="muted">Complete practice questions to see topic-level performance.</p>';
 topics.forEach(t=>{const d=state.topics[t],p=pct(d.correct,d.answered);box.innerHTML+=`<div class="topic-row"><div class="topic-line"><strong>${t}</strong><span>${p}% (${d.correct}/${d.answered})</span></div><div class="progress-track"><div style="width:${p}%"></div></div></div>`});
 const h=document.getElementById('historyList');h.innerHTML=state.sessions.length?'':'<p class="muted">No completed sessions yet.</p>';
 state.sessions.slice(-8).reverse().forEach(s=>{h.innerHTML+=`<div class="history-item"><span>${new Date(s.date).toLocaleDateString()}</span><strong>${s.score}% • ${s.correct}/${s.total}</strong></div>`})
}
function renderAll(){renderDashboard();renderProgress();renderCard()}
document.getElementById('resetProgress').onclick=()=>{if(confirm('Reset all PMP Academy progress?')){state=empty();save();applyTheme();location.reload()}}
renderAll();renderReview();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
