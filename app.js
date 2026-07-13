
(function(){
'use strict';
const BANK=window.QUESTION_BANK,CARDS=window.FLASHCARDS,KEY='pmpAcademy';
const today=()=>new Date().toISOString().slice(0,10);
const empty=()=>({theme:'dark',lessonComplete:false,totalAnswered:0,totalCorrect:0,sessions:[],topics:{},reviewIds:[],flaggedIds:[],daily:{},streak:0,lastGoalDate:null,mastered:[],cardReviews:0,achievements:[]});
let old=null;try{old=JSON.parse(localStorage.getItem('pmpAcademyV20')||localStorage.getItem('pmpAcademyV12')||'null')}catch(e){}
let state=load();if(old&&state.totalAnswered===0){state=Object.assign(empty(),old);saveRaw()}

(function cleanupLegacyKeys(){
 const legacy=['pmpAcademyV11','pmpAcademyV12','pmpAcademyV20','pmpAcademyV21','pmpAcademyV30'];
 legacy.forEach(k=>{if(k!==KEY)localStorage.removeItem(k)});
})();

let session=null,mode='custom',cardOrder=CARDS.map((_,i)=>i),cardPos=0,cardBack=false,strikeMode=false;
function sanitize(raw){
 const s=Object.assign(empty(),raw||{});
 s.sessions=Array.isArray(s.sessions)?s.sessions.filter(x=>{
   const total=Number(x.total),correct=Number(x.correct),score=Number(x.score);
   return Number.isFinite(total)&&total>0&&Number.isFinite(correct)&&correct>=0&&correct<=total&&Number.isFinite(score)&&score>=0&&score<=100;
 }):[];
 s.totalAnswered=Math.max(0,Number(s.totalAnswered)||0);
 s.totalCorrect=Math.max(0,Math.min(Number(s.totalCorrect)||0,s.totalAnswered));
 s.reviewIds=Array.isArray(s.reviewIds)?[...new Set(s.reviewIds.filter(Number.isInteger))]:[];
 s.flaggedIds=Array.isArray(s.flaggedIds)?[...new Set(s.flaggedIds.filter(Number.isInteger))]:[];
 s.mastered=Array.isArray(s.mastered)?[...new Set(s.mastered.filter(Number.isInteger))]:[];
 s.achievements=Array.isArray(s.achievements)?[...new Set(s.achievements)]:[];
 s.topics=(s.topics&&typeof s.topics==='object')?s.topics:{};
 Object.keys(s.topics).forEach(k=>{
   const d=s.topics[k]||{};
   d.answered=Math.max(0,Number(d.answered)||0);
   d.correct=Math.max(0,Math.min(Number(d.correct)||0,d.answered));
   s.topics[k]=d;
 });
 return s;
}
function load(){
 try{return sanitize(JSON.parse(localStorage.getItem(KEY)||'{}'))}
 catch(e){return empty()}
}
function saveRaw(){state=sanitize(state);localStorage.setItem(KEY,JSON.stringify(state))}
function save(){saveRaw();renderAll()}
function purgeAllProgress(){
 const keys=[];
 for(let i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
 keys.filter(k=>k&&(/^pmpAcademy/i.test(k)||/^pmp-academy/i.test(k))).forEach(k=>localStorage.removeItem(k));
 state=empty();
 localStorage.setItem(KEY,JSON.stringify(state));
 try{
   if('caches' in window)caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('pmp-academy')).map(n=>caches.delete(n))));
 }catch(e){}
}
function pct(a,b){return b?Math.round(a/b*100):0}
function best(){const valid=state.sessions.map(x=>Number(x.score)).filter(x=>Number.isFinite(x)&&x>=0&&x<=100);return valid.length?Math.max(...valid):null}
function accuracy(){return pct(state.totalCorrect,state.totalAnswered)}
function readiness(){const a=Math.max(0,Math.min(100,accuracy())),lesson=state.lessonComplete?15:0,sessions=Math.min(state.sessions.length*4,20),mastery=Math.min(state.mastered.length*2,20);return Math.max(0,Math.min(100,Math.round(a*.45+lesson+sessions+mastery)))}
function currentDaily(){return state.daily[today()]||0}
function haptic(){try{if(navigator.vibrate)navigator.vibrate(20)}catch(e){}}
function confetti(){const box=document.getElementById('confetti');for(let i=0;i<60;i++){const p=document.createElement('i');p.className='confetti-piece';p.style.left=Math.random()*100+'%';p.style.animationDelay=Math.random()*.5+'s';p.style.background=['#843db6','#551f7c','#f1b93a','#48a36b'][i%4];box.appendChild(p);setTimeout(()=>p.remove(),2200)}}
window.addEventListener('load',()=>setTimeout(()=>document.getElementById('splash').classList.add('hide'),500));
function updateStreak(){const d=today(),count=currentDaily();if(count<10||state.lastGoalDate===d)return;const y=new Date();y.setDate(y.getDate()-1);state.streak=state.lastGoalDate===y.toISOString().slice(0,10)?state.streak+1:1;state.lastGoalDate=d;confetti()}
document.querySelectorAll('[data-view],[data-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view||b.dataset.jump)));
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='review')renderReview()}
document.getElementById('themeToggle').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';applyTheme();save()}
function applyTheme(){document.body.classList.toggle('dark',state.theme==='dark')}applyTheme();
const hour=new Date().getHours();document.getElementById('greeting').textContent=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
document.getElementById('markLesson').onclick=()=>{state.lessonComplete=true;unlock('Lesson Complete');save();confetti()}
function populateTopics(){const s=document.getElementById('topicFilter');[...new Set(BANK.map(q=>q.topic))].sort().forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;s.appendChild(o)})}populateTopics();
function shuffled(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('selected',x===b));document.getElementById('topicLabel').classList.toggle('hidden',mode==='adaptive')})
function weakest(){const entries=Object.entries(state.topics).filter(([,d])=>d.answered>=2);if(!entries.length)return null;return entries.sort((a,b)=>pct(a[1].correct,a[1].answered)-pct(b[1].correct,b[1].answered))[0]}
function buildAdaptive(n){const weak=weakest();let weighted=[];BANK.forEach((q,i)=>{let w=1;if(weak&&q.topic===weak[0])w=5;else if(state.topics[q.topic])w=Math.max(1,4-Math.floor(pct(state.topics[q.topic].correct,state.topics[q.topic].answered)/25));for(let k=0;k<w;k++)weighted.push(i)});let chosen=[];while(chosen.length<Math.min(n,BANK.length)&&weighted.length){const i=weighted[Math.floor(Math.random()*weighted.length)];if(!chosen.includes(i))chosen.push(i)}return chosen.map(i=>({...BANK[i],id:i}))}
function startPractice(forceAdaptive=false,forceTopic=null){if(forceAdaptive)mode='adaptive';const n=Number(document.getElementById('questionCount').value||20);let pool;if(mode==='adaptive')pool=buildAdaptive(n);else{const topic=forceTopic||document.getElementById('topicFilter').value;pool=shuffled(BANK.map((q,i)=>({...q,id:i})).filter(q=>topic==='All'||q.topic===topic)).slice(0,n)}const randomAnswers=document.getElementById('shuffleAnswers').checked;pool=pool.map(q=>({...q,displayChoices:randomAnswers?shuffled(q.choices.map((c,i)=>({text:c,orig:i}))):q.choices.map((c,i)=>({text:c,orig:i}))}));session={questions:pool,pos:0,results:[],started:Date.now(),locked:false,answers:{}};document.getElementById('practiceSetup').classList.add('hidden');document.getElementById('practiceSession').classList.remove('hidden');document.getElementById('sessionResult').classList.add('hidden');showView('practice');renderQuestion()}
document.getElementById('beginPractice').onclick=()=>startPractice();document.getElementById('adaptiveStart').onclick=()=>startPractice(true);document.getElementById('weakPractice').onclick=()=>{const w=weakest();if(w){mode='custom';startPractice(false,w[0])}else startPractice(true)}
function sessionStats(){
 const answers=Object.values(session.answers||{});
 return {answered:answers.length,correct:answers.filter(a=>a.ok).length};
}
function renderQuestion(){
 const q=session.questions[session.pos],card=document.getElementById('questionCard'),saved=session.answers[session.pos];
 const stats=sessionStats();
 document.getElementById('sessionTitle').textContent=`Question ${session.pos+1}`;
 document.getElementById('sessionProgress').textContent=`${session.pos+1}/${session.questions.length}`;
 document.getElementById('sessionLive').textContent=`${stats.correct} correct`;
 document.getElementById('flagQuestion').textContent=state.flaggedIds.includes(q.id)?'★ Flagged':'☆ Flag';
 document.getElementById('previousQuestion').disabled=session.pos===0;
 document.getElementById('nextQuestion').textContent=session.pos===session.questions.length-1?'Finish Session':'Next Question';
 card.innerHTML=`<div class="meta"><span>${q.topic}</span><span>${q.difficulty}</span></div><h3>${q.q}</h3><div id="choices">${q.displayChoices.map((c,i)=>`<button type="button" class="option" data-orig="${c.orig}"><strong>${String.fromCharCode(65+i)}.</strong> ${c.text}</button>`).join('')}</div><div id="feedback"></div>`;
 session.locked=Boolean(saved);
 strikeMode=false;
 document.getElementById('strikeToggle').classList.remove('active');
 if(saved) applySaved(saved,q);
}
function applySaved(saved,q){
 document.querySelectorAll('.option').forEach(o=>{
   const orig=Number(o.dataset.orig);
   o.classList.remove('correct','incorrect');
   if(orig===q.answer) o.classList.add('correct');
   else if(orig===saved.picked) o.classList.add('incorrect');
   o.disabled=true;
 });
 renderFeedback(saved.ok,q,saved.picked);
}
function renderFeedback(ok,q,picked){const fb=document.getElementById('feedback');fb.className='feedback '+(ok?'good':'bad');let analysis=`<div class="analysis-box"><strong>Question clue:</strong> ${q.clue}<br><strong>Related lesson:</strong> ${q.lesson}</div>`;if(ok)fb.innerHTML=`<strong>Correct.</strong> ${q.explanation}${analysis}`;else{let rows=q.choices.map((c,i)=>`<li><strong>${c}:</strong> ${i===q.answer?'Correct — '+q.explanation:q.whyWrong[i]}</li>`).join('');fb.innerHTML=`<strong>Incorrect.</strong> Best answer: <strong>${q.choices[q.answer]}</strong><ul>${rows}</ul>${analysis}`}}
document.getElementById('questionCard').addEventListener('click',e=>{
 const btn=e.target.closest('.option');
 if(!btn || !session) return;
 if(strikeMode && !session.locked){btn.classList.toggle('struck');return}
 if(session.answers[session.pos]) return;

 const q=session.questions[session.pos],picked=Number(btn.dataset.orig),ok=picked===q.answer;
 session.answers[session.pos]={id:q.id,picked,ok,topic:q.topic};
 session.locked=true;
 haptic();

 document.querySelectorAll('.option').forEach(o=>{
   const orig=Number(o.dataset.orig);
   o.classList.remove('correct','incorrect');
   if(orig===q.answer) o.classList.add('correct');
   else if(orig===picked) o.classList.add('incorrect');
   o.disabled=true;
 });
 renderFeedback(ok,q,picked);

 // Persist lifetime statistics exactly once for this question.
 state.totalAnswered++;
 if(ok) state.totalCorrect++;
 state.topics[q.topic]=state.topics[q.topic]||{answered:0,correct:0};
 state.topics[q.topic].answered++;
 if(ok) state.topics[q.topic].correct++;
 state.daily[today()]=(state.daily[today()]||0)+1;

 if(!ok && !state.reviewIds.includes(q.id)) state.reviewIds.push(q.id);
 updateStreak();
 checkAchievements();
 save();

 const stats=sessionStats();
 document.getElementById('sessionLive').textContent=`${stats.correct} correct`;
})
document.getElementById('strikeToggle').onclick=()=>{if(session&&session.locked)return;strikeMode=!strikeMode;document.getElementById('strikeToggle').classList.toggle('active',strikeMode)}
document.getElementById('flagQuestion').onclick=()=>{const id=session.questions[session.pos].id,i=state.flaggedIds.indexOf(id);if(i>=0)state.flaggedIds.splice(i,1);else state.flaggedIds.push(id);save();document.getElementById('flagQuestion').textContent=state.flaggedIds.includes(id)?'★ Flagged':'☆ Flag'}
document.getElementById('previousQuestion').onclick=()=>{if(session.pos>0){session.pos--;renderQuestion()}}
document.getElementById('nextQuestion').onclick=()=>{if(!session.answers[session.pos]){alert('Select an answer before continuing.');return}if(session.pos<session.questions.length-1){session.pos++;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}else finishSession()}
function finishSession(){
 const stats=sessionStats();
 const total=session.questions.length;
 const score=pct(stats.correct,total);

 // Reconcile review queue from the final answer map in case the user navigated backward/forward.
 Object.values(session.answers).forEach(a=>{
   if(!a.ok && !state.reviewIds.includes(a.id)) state.reviewIds.push(a.id);
 });

 state.sessions.push({
   date:new Date().toISOString(),
   score,
   correct:stats.correct,
   total,
   duration:Math.round((Date.now()-session.started)/1000),
   mode
 });
 checkAchievements();
 save();

 document.getElementById('practiceSession').classList.add('hidden');
 const r=document.getElementById('sessionResult');
 r.classList.remove('hidden');
 r.innerHTML=`<h2>${score}%</h2><p>${stats.correct} of ${total} correct</p><p>${score>=90?'Excellent performance.':score>=75?'Good foundation. Review the missed questions.':'Review Lesson 1 and complete a targeted session.'}</p><div class="button-row"><button class="secondary" data-new>New Session</button><button class="primary" data-review>Review Missed</button></div>`;
 if(score>=90) confetti();
 r.querySelector('[data-new]').onclick=()=>{document.getElementById('practiceSetup').classList.remove('hidden');r.classList.add('hidden')};
 r.querySelector('[data-review]').onclick=()=>showView('review');
}
function renderReview(){const ids=[...new Set([...state.reviewIds,...state.flaggedIds])],box=document.getElementById('reviewList');box.innerHTML='';if(!ids.length){box.innerHTML='<p class="muted">Your review queue is empty.</p>';return}ids.forEach(id=>{const q=BANK[id],d=document.createElement('div');d.className='review-item';d.innerHTML=`<div class="meta"><span>${q.topic}</span><span>${state.flaggedIds.includes(id)?'Flagged':'Missed'}</span></div><h4>${q.q}</h4><p class="answer">${q.choices[q.answer]}</p><p>${q.explanation}</p><details><summary>Why the other choices are weaker</summary><ul>${q.choices.map((c,i)=>i===q.answer?'':`<li><strong>${c}:</strong> ${q.whyWrong[i]}</li>`).join('')}</ul></details><div class="analysis-box"><strong>Question clue:</strong> ${q.clue}<br><strong>PMI mindset:</strong> Understand first, engage the right people, follow governance, and protect value.<br><strong>Related section:</strong> ${q.lesson}</div><button class="secondary" data-remove="${id}">Mark Reviewed</button>`;box.appendChild(d)});box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.remove);state.reviewIds=state.reviewIds.filter(x=>x!==id);state.flaggedIds=state.flaggedIds.filter(x=>x!==id);save();renderReview()})}
document.getElementById('clearReview').onclick=()=>{state.reviewIds=[];state.flaggedIds=[];save();renderReview()}
function activeCards(){return document.getElementById('unmasteredOnly').checked?cardOrder.filter(i=>!state.mastered.includes(i)):cardOrder}
function renderCard(){const list=activeCards();if(!list.length){document.getElementById('cardFace').textContent='All cards mastered';document.getElementById('cardTopic').textContent='GREAT WORK';return}cardPos=Math.min(cardPos,list.length-1);const id=list[cardPos],c=CARDS[id];document.getElementById('cardCounter').textContent=`${cardPos+1}/${list.length}`;document.getElementById('cardTopic').textContent=c.topic;document.getElementById('cardFace').textContent=cardBack?c.back:c.front;document.getElementById('flashcard').classList.toggle('mastered',state.mastered.includes(id))}
document.getElementById('flashcard').onclick=()=>{cardBack=!cardBack;if(cardBack){state.cardReviews++;save()}renderCard()};document.getElementById('nextCard').onclick=()=>{const l=activeCards();if(l.length){cardPos=(cardPos+1)%l.length;cardBack=false;renderCard()}};document.getElementById('prevCard').onclick=()=>{const l=activeCards();if(l.length){cardPos=(cardPos-1+l.length)%l.length;cardBack=false;renderCard()}};document.getElementById('shuffleCards').onclick=()=>{cardOrder=shuffled(cardOrder);cardPos=0;cardBack=false;renderCard()};document.getElementById('unmasteredOnly').onchange=()=>{cardPos=0;cardBack=false;renderCard()};document.getElementById('markMastered').onclick=()=>{const l=activeCards();if(!l.length)return;const id=l[cardPos];if(!state.mastered.includes(id))state.mastered.push(id);checkAchievements();save();renderCard()};document.getElementById('needsWork').onclick=()=>{const l=activeCards();if(!l.length)return;state.mastered=state.mastered.filter(x=>x!==l[cardPos]);save();renderCard()}
function unlock(name){if(!state.achievements.includes(name))state.achievements.push(name)}
function checkAchievements(){if(state.totalAnswered>=10)unlock('First 10');if(state.totalAnswered>=50)unlock('50 Questions');if(best()>=90)unlock('90% Club');if(state.mastered.length>=5)unlock('Card Master');if(state.streak>=3)unlock('3-Day Streak');if(state.lessonComplete)unlock('Lesson Complete')}
function renderAchievements(){const all=[['First 10','Answer 10 questions'],['50 Questions','Answer 50 questions'],['90% Club','Score at least 90%'],['Card Master','Master 5 flashcards'],['3-Day Streak','Complete the daily goal 3 days'],['Lesson Complete','Complete Lesson 1']];document.getElementById('achievements').innerHTML=all.map(a=>`<div class="achievement ${state.achievements.includes(a[0])?'unlocked':''}"><b>${state.achievements.includes(a[0])?'🏆':'🔒'} ${a[0]}</b><small>${a[1]}</small></div>`).join('')}
function renderDashboard(){const r=readiness(),b=best(),daily=currentDaily(),weak=weakest();document.getElementById('readiness').textContent=r+'%';document.querySelector('.readiness-ring').style.setProperty('--ring',r+'%');document.getElementById('dailyTitle').textContent=`${Math.min(daily,10)} of 10 questions`;document.getElementById('dailyBar').style.width=Math.min(daily/10*100,100)+'%';document.getElementById('streakBadge').textContent=`${state.streak}-day streak`;document.getElementById('dashBest').textContent=b===null?'—':b+'%';document.getElementById('dashAccuracy').textContent=state.totalAnswered?accuracy()+'%':'—';document.getElementById('dashMissed').textContent=new Set([...state.reviewIds,...state.flaggedIds]).size;document.getElementById('lessonProgress').style.width=(state.lessonComplete?100:state.totalAnswered?65:25)+'%';document.getElementById('lessonBadge').textContent=state.lessonComplete?'Complete':'In progress';document.getElementById('markLesson').textContent=state.lessonComplete?'Lesson Completed ✓':'Mark Lesson Complete';document.getElementById('weakBadge').textContent=weak?weak[0]:'Collecting data';document.getElementById('weakText').textContent=weak?`${pct(weak[1].correct,weak[1].answered)}% accuracy across ${weak[1].answered} questions. An adaptive session will prioritize this area.`:'Complete practice questions to identify your next focus area.'}
function renderProgress(){document.getElementById('progressReadiness').textContent=readiness()+'%';document.getElementById('progressAttempts').textContent=state.sessions.length;document.getElementById('progressAccuracy').textContent=state.totalAnswered?accuracy()+'%':'—';const box=document.getElementById('topicStats');box.innerHTML='';const topics=Object.keys(state.topics).sort();if(!topics.length)box.innerHTML='<p class="muted">Complete practice questions to see topic performance.</p>';topics.forEach(t=>{const d=state.topics[t],p=pct(d.correct,d.answered);box.innerHTML+=`<div class="topic-row"><div class="topic-line"><strong>${t}</strong><span>${p}% (${d.correct}/${d.answered})</span></div><div class="progress-track"><div style="width:${p}%"></div></div></div>`});const h=document.getElementById('historyList');h.innerHTML=state.sessions.length?'':'<p class="muted">No completed sessions yet.</p>';state.sessions.slice(-8).reverse().forEach(s=>h.innerHTML+=`<div class="history-item"><span>${new Date(s.date).toLocaleDateString()} • ${s.mode||'custom'}</span><strong>${s.score}% • ${s.correct}/${s.total}</strong></div>`);renderAchievements()}
function renderAll(){renderDashboard();renderProgress();renderCard()}document.getElementById('resetProgress').onclick=()=>{
 if(confirm('Reset all PMP Academy progress? This removes scores, readiness, streaks, flashcards, review items, achievements, and previous-version data.')){
   purgeAllProgress();
   location.reload();
 }
}
checkAchievements();renderAll();renderReview();renderCard();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();

document.addEventListener('click',function(e){
 const mini=e.target.closest('[data-mini]');
 if(mini){
   const box=mini.closest('.checkpoint');
   const fb=box.querySelector('.mini-feedback');
   const ok=mini.dataset.mini==='correct';
   fb.className='mini-feedback '+(ok?'ok':'no');
   fb.textContent=ok?'Correct — the Standard is broadly applicable and tailored to context.':'Not quite — the Standard does not prescribe one mandatory life cycle.';
 }
 const rel=e.target.closest('.match-label');
 if(rel){
   document.querySelectorAll('.match-label').forEach(b=>b.classList.remove('active'));
   rel.classList.add('active');
   const defs={
     portfolio:'Portfolio management selects, prioritizes, and balances investments to support strategy and maximize value.',
     program:'Program management coordinates related projects and activities to achieve combined benefits.',
     project:'Project management directs a temporary endeavor that creates a unique product, service, or result.',
     operations:'Operations management sustains ongoing products, services, and business functions.'
   };
   const target=document.getElementById('relationshipDefinition');
   if(target) target.textContent=defs[rel.dataset.rel];
 }
});
