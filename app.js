
(function(){
'use strict';
const Q = window.QUIZ_DATA;
const F = window.FLASHCARDS;
const KEY='pmpAcademyProgressV1';
let state = load();
let cardIndex=0, cardBack=false;

function emptyState(){return {lessonComplete:false,attempts:[],answered:0,correct:0,flashReviewed:0,topics:{},theme:'light'};}
function load(){try{return Object.assign(emptyState(),JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return emptyState();}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderDashboard();renderProgress();}
function pct(a,b){return b?Math.round(a/b*100):0;}

document.querySelectorAll('[data-view], [data-jump]').forEach(btn=>btn.addEventListener('click',()=>{
 const target=btn.dataset.view||btn.dataset.jump;
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===target));
 document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===target));
 window.scrollTo({top:0,behavior:'smooth'});
}));

document.getElementById('themeToggle').addEventListener('click',()=>{
 state.theme=state.theme==='dark'?'light':'dark'; applyTheme(); save();
});
function applyTheme(){document.body.classList.toggle('dark',state.theme==='dark');}
applyTheme();

document.getElementById('markLesson').addEventListener('click',()=>{
 state.lessonComplete=true; save();
 document.getElementById('markLesson').textContent='Lesson Completed ✓';
});

function renderQuiz(){
 const c=document.getElementById('quizContainer'); c.innerHTML='';
 Q.forEach((item,i)=>{
  const sec=document.createElement('section'); sec.className='card question';
  sec.innerHTML=`<div class="meta"><span>${item.topic}</span><span>${item.difficulty}</span></div>
   <h3>${i+1}. ${item.q}</h3>
   ${item.choices.map((ch,j)=>`<label class="option"><input type="radio" name="q${i}" value="${j}"> <strong>${String.fromCharCode(65+j)}.</strong> ${ch}</label>`).join('')}
   <div id="fb${i}" class="feedback"></div>`;
  c.appendChild(sec);
 });
 updateQuizCount();
}
renderQuiz();

document.getElementById('quizContainer').addEventListener('change',e=>{
 if(e.target.type!=='radio')return;
 const i=Number(e.target.name.slice(1)); showFeedback(i); updateQuizCount();
});
function selected(i){return document.querySelector(`input[name="q${i}"]:checked`);}
function showFeedback(i){
 const s=selected(i), fb=document.getElementById('fb'+i); if(!s)return;
 const ok=Number(s.value)===Q[i].answer;
 fb.className='feedback '+(ok?'good':'bad');
 fb.innerHTML=ok?`<strong>Correct.</strong> ${Q[i].explanation}`:
 `<strong>Incorrect.</strong> Best answer: <strong>${String.fromCharCode(65+Q[i].answer)}. ${Q[i].choices[Q[i].answer]}</strong><br>${Q[i].explanation}`;
}
function updateQuizCount(){
 let n=0; Q.forEach((_,i)=>{if(selected(i))n++;});
 document.getElementById('quizCount').textContent=`${n}/${Q.length}`;
}
document.getElementById('submitQuiz').addEventListener('click',()=>{
 let correct=0, answered=0;
 Q.forEach((item,i)=>{
  const s=selected(i);
  if(s){
   answered++; const ok=Number(s.value)===item.answer; if(ok)correct++;
   state.topics[item.topic]=state.topics[item.topic]||{answered:0,correct:0};
   state.topics[item.topic].answered++;
   if(ok)state.topics[item.topic].correct++;
  }
  showFeedback(i);
 });
 state.answered+=answered; state.correct+=correct;
 const score=pct(correct,Q.length);
 state.attempts.push({date:new Date().toISOString(),score,correct,total:Q.length});
 save();
 const r=document.getElementById('quizResult'); r.classList.remove('hidden');
 r.innerHTML=`<h2>${score}%</h2><p>${correct} of ${Q.length} correct</p><p>${score>=90?'Excellent performance.':score>=75?'Good foundation. Review the missed explanations.':'Review Lesson 1 and retake the quiz.'}</p>`;
 r.scrollIntoView({behavior:'smooth',block:'center'});
});
document.getElementById('retakeQuiz').addEventListener('click',()=>{
 document.getElementById('quizResult').classList.add('hidden'); renderQuiz(); window.scrollTo({top:0,behavior:'smooth'});
});

function renderCard(){
 document.getElementById('cardCounter').textContent=`${cardIndex+1}/${F.length}`;
 document.getElementById('cardFace').textContent=cardBack?F[cardIndex][1]:F[cardIndex][0];
}
document.getElementById('flashcard').addEventListener('click',()=>{
 cardBack=!cardBack; if(cardBack){state.flashReviewed++;save();} renderCard();
});
document.getElementById('nextCard').addEventListener('click',()=>{cardIndex=(cardIndex+1)%F.length;cardBack=false;renderCard();});
document.getElementById('prevCard').addEventListener('click',()=>{cardIndex=(cardIndex-1+F.length)%F.length;cardBack=false;renderCard();});
renderCard();

function best(){return state.attempts.length?Math.max(...state.attempts.map(a=>a.score)):null;}
function renderDashboard(){
 const b=best();
 document.getElementById('dashScore').textContent=b===null?'—':b+'%';
 document.getElementById('dashAnswered').textContent=state.answered;
 document.getElementById('dashAccuracy').textContent=state.answered?pct(state.correct,state.answered)+'%':'—';
 document.getElementById('dashCards').textContent=state.flashReviewed;
 document.getElementById('lessonProgress').style.width=(state.lessonComplete?100:(state.attempts.length?70:25))+'%';
 document.getElementById('markLesson').textContent=state.lessonComplete?'Lesson Completed ✓':'Mark Lesson Complete';
}
function renderProgress(){
 const b=best();
 document.getElementById('progressBest').textContent=b===null?'—':b+'%';
 document.getElementById('progressAttempts').textContent=state.attempts.length;
 document.getElementById('progressAccuracy').textContent=state.answered?pct(state.correct,state.answered)+'%':'—';
 const box=document.getElementById('topicStats'); box.innerHTML='';
 const topics=Object.keys(state.topics);
 if(!topics.length){box.innerHTML='<p class="muted">Complete the quiz to see topic-level performance.</p>';return;}
 topics.sort().forEach(t=>{
  const d=state.topics[t], p=pct(d.correct,d.answered);
  box.innerHTML+=`<div class="topic-row"><div class="topic-line"><strong>${t}</strong><span>${p}%</span></div><div class="progress-track"><div style="width:${p}%"></div></div></div>`;
 });
}
document.getElementById('resetProgress').addEventListener('click',()=>{
 if(confirm('Reset all lesson, quiz, flashcard, and theme progress?')){state=emptyState();save();applyTheme();renderQuiz();renderCard();}
});
renderDashboard();renderProgress();

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
})();
