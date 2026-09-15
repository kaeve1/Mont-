'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const ease='cubic-bezier(.23,1,.32,1)';
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));

function moveGallery(track,direction,event){
 const step=track.children[0].getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap);
 track.scrollBy({left:direction*step,behavior:reduced.matches||event?.detail===0?'instant':'smooth'});
}
$$('[data-prev],[data-next]').forEach(b=>b.addEventListener('click',e=>moveGallery(document.getElementById(b.dataset.prev||b.dataset.next),b.dataset.prev?-1:1,e)));
$$('.carousel').forEach(track=>{
 let queued=false;
 const update=()=>{
  const max=track.scrollWidth-track.clientWidth;
  const prev=$(`[data-prev="${track.id}"]`),next=$(`[data-next="${track.id}"]`);
  if(prev)prev.disabled=track.scrollLeft<2;
  if(next)next.disabled=track.scrollLeft>=max-2;
  const readout=track.dataset.count?$('#'+track.dataset.count):null;
  if(readout){
   const step=track.children[0].getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap);
   const total=track.children.length;
   const index=track.scrollLeft>=max-2?total:Math.round(track.scrollLeft/step)+1;
   readout.textContent=`${String(index).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
  }queued=false;
 };
 track.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
 track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();moveGallery(track,e.key==='ArrowRight'?1:-1,{detail:0});}});
 new ResizeObserver(update).observe(track);update();
});

function setMotion(){
 document.documentElement.classList.toggle('motion',!reduced.matches);
}
reduced.addEventListener('change',setMotion);
setMotion();

const placeShots=[
 {src:'juncao',alt:'ambiente aberto para a paisagem'},
 {src:'hero-sob',alt:'ambiente ao entardecer'}
];
let placeAt=0;
const placeFig=$('.place-figure img');
function showPlace(next){
 if(!placeFig)return;
 placeAt=(next+placeShots.length)%placeShots.length;
 const item=placeShots[placeAt];
 placeFig.src=`assets/${item.src}.webp`;
 placeFig.alt=`Imagem conceitual: ${item.alt}`;
 $$('.place-index i').forEach((n,i)=>n.style.opacity=i===placeAt?'1':'.4');
 if(!reduced.matches)placeFig.animate([{opacity:.25,transform:'scale(1.04)'},{opacity:1,transform:'scale(1)'}],{duration:600,easing:ease});
}
if(placeFig){
 $('[data-place-prev]')?.addEventListener('click',()=>showPlace(placeAt-1));
 $('[data-place-next]')?.addEventListener('click',()=>showPlace(placeAt+1));
 showPlace(0);
}


const menuBtn=$('[data-menu-btn]');
const menuPanel=$('[data-menu-panel]');
if(menuBtn&&menuPanel){
 let menuOpen=false;
 const setMenu=open=>{
  if(open===menuOpen)return;
  menuOpen=open;
  document.documentElement.classList.toggle('is-menu-open',open);
  menuPanel.classList.toggle('is-open',open);
  menuPanel.setAttribute('aria-hidden',open?'false':'true');
  menuBtn.setAttribute('aria-expanded',open?'true':'false');
  if(open){
   if(typeof lockScroll==='function')lockScroll();
   const first=$('.menu-link',menuPanel);
   if(first)requestAnimationFrame(()=>first.focus({preventScroll:true}));
  }else{
   if(typeof unlockScroll==='function')unlockScroll();
   menuBtn.focus({preventScroll:true});
  }
 };
 menuBtn.addEventListener('click',()=>setMenu(!menuOpen));
 menuPanel.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuOpen)setMenu(false);});
 matchMedia('(min-width:992px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});
}
