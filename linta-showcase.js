/* Linta showcase: tabbed demo, phone, footer wordmark. Demo callers are SAMPLE DATA. */
(function(){"use strict";
var SOCIAL={linkedin:"https://www.linkedin.com/",instagram:"https://www.instagram.com/",tiktok:"https://www.tiktok.com/"}; /* replace with your real profile links */
var N=document.body.dataset.niche||"",C={
 hvac:{j:"HVAC",i:["No cooling, 2nd floor","Furnace not igniting","AC tune-up quote","Thermostat blank","Duct cleaning quote","Heat pump service"]},
 plumbing:{j:"plumbing",i:["Burst pipe, basement","Water heater leaking","Clogged kitchen drain","No hot water","Sewer smell","Garbage disposal issue"]},
 restoration:{j:"water restoration",i:["Flooded basement","Pipe burst, ceiling wet","Insurance question","Mold concern","Storm water entry","Ceiling leak after storm"]}}[N]||{j:"home service",i:["No cooling, 2nd floor","Burst pipe, basement","Flooded basement","Water heater leaking","Tune-up quote","Heat pump service"]};
var NM=["Maya R.","Daniel C.","Nina B.","Marcus R.","Sofia P.","Oliver K."],T=["Today 9:10","Today 9:40","Today 11:05","Today 1:30","Today 3:15","Today 5:05"];
function av(i){return "assets/avatars/demo-caller-"+String((i%6)+1).padStart(2,"0")+".webp"}
function rows(a){return NM.slice(0,a.length).map(function(n,i){return[n,a[i][0],a[i][1],a[i][2]]})}
var TABS=[
 {k:"New calls",tag:"NEW CALLS",t:"Every call becomes a booked job.",p:"Ava answers day or night, takes the caller’s details and books the visit, so new "+C.j+" leads never reach voicemail.",h:"Caller list",r:rows(C.i.map(function(x){return[x,"NEW","b"]})),kp:[["24/7","coverage"],["<10s","to answer"]]},
 {k:"Confirmations",tag:"FEWER NO-SHOWS",t:"Ava confirms jobs before the truck rolls.",p:"Automatic confirmation texts and calls keep your calendar full and cut wasted trips.",h:"Confirmed jobs",r:rows(T.map(function(x){return[x,"CONFIRMED","g"]})),kp:[["Auto","reminders"],["2-way","reschedule"]]},
 {k:"Missed-call text-back",tag:"MISSED CALLS",t:"A missed call turns into a text, then a booking.",p:"If you are on a roof or under a sink, Ava texts the caller within seconds and finishes the booking.",h:"Missed calls recovered",r:rows(C.i.map(function(x){return[x+" · texted back","RECOVERED","g"]})),kp:[["<1 min","first reply"],["SMS","booking"]]},
 {k:"Follow-ups",tag:"FOLLOW-UPS",t:"Quotes and past customers never go cold.",p:"Ava follows up on open quotes and reminds past customers about seasonal service.",h:"Follow-up tasks",r:rows([["Open quotes · 5 of 8","IN PROGRESS","o"],["Seasonal reminders · 12 of 12","COMPLETE","g"],["Past customers · 0 of 20","UPCOMING","b"],["Estimate follow-up · 3 of 6","IN PROGRESS","o"],["Review requests · 0 of 15","UPCOMING","b"]]),kp:[["Auto","follow-ups"],["Less","lost revenue"]]}];
function e(t,c,h){var x=document.createElement(t);if(c)x.className=c;if(h!=null)x.innerHTML=h;return x}
function show(){
 var old=document.getElementById("cl-dash");if(old)old.remove();
 var a=N?document.getElementById("included"):document.getElementById("tiers");if(!a)return;
 var s=e("section","cl-sec");s.id="cl-dash";
 s.innerHTML='<div class="wrap"><div class="cl-head"><h2>What Ava does for your '+C.j+' company</h2><p>One assistant that answers, books, confirms and follows up.</p></div><div class="cl-tabs" role="tablist" aria-label="Sample dashboard views"></div><div class="cl-stage" id="cl-dash-panel" role="tabpanel" aria-live="polite" aria-label="Selected sample dashboard view"></div><p class="cl-note">Illustrative sample data only. Caller names and avatars are fictional; this is not client proof or a results claim.</p></div>';
 var tb=s.querySelector(".cl-tabs"),st=s.querySelector(".cl-stage"),cur=0,tm;
 function go(n){cur=n;[].forEach.call(tb.children,function(b,i){b.setAttribute("aria-selected",String(i===n));b.tabIndex=i===n?0:-1});st.setAttribute("aria-labelledby","cl-tab-"+n);var d=TABS[n];
  st.innerHTML='<div class="cl-listbox"><div class="cl-lcard"><h3>'+d.h+'</h3>'+d.r.map(function(r,i){return'<div class="cl-row2" style="animation-delay:'+i*90+'ms"><img src="'+av(i)+'" alt="" width="44" height="44"><span><b>'+r[0]+'</b><small>'+r[1]+'</small></span><em class="cl-pill '+(r[3]==="g"?"g":r[3]==="o"?"o":"")+'" style="font-style:normal">'+r[2]+'</em></div>'}).join("")+'</div></div><div class="cl-txt"><span class="cl-tag">'+d.tag+'</span><h3>'+d.t+'</h3><p>'+d.p+'</p><div class="cl-kp">'+d.kp.map(function(k){return'<div><b>'+k[0]+'</b><small>'+k[1]+'</small></div>'}).join("")+'</div></div>'}
 TABS.forEach(function(d,i){var b=e("button",null,d.k);b.type="button";b.id="cl-tab-"+i;b.setAttribute("role","tab");b.setAttribute("aria-controls","cl-dash-panel");b.tabIndex=i===0?0:-1;b.onclick=function(){clearInterval(tm);go(i)};b.addEventListener("keydown",function(ev){if(ev.key==="ArrowRight"||ev.key==="ArrowLeft"){ev.preventDefault();var next=(i+(ev.key==="ArrowRight"?1:TABS.length-1))%TABS.length;tb.children[next].focus();tb.children[next].click()}});tb.appendChild(b)});
 go(0);if(!matchMedia("(prefers-reduced-motion:reduce)").matches)tm=setInterval(function(){go((cur+1)%TABS.length)},6500);
 a.parentNode.insertBefore(s,a);
}
function phone(){
 if(N||document.getElementById("cl-phone"))return;var s=e("section","cl-sec"),a=document.getElementById("cl-dash");if(!a)return;s.id="cl-phone";
 s.innerHTML='<div class="wrap cl-ph"><div class="cl-phone" aria-label="Illustrative sample text conversation"><div class="cl-notch"></div><div class="cl-scr"><div class="cl-bar"><img src="assets/brand/ava-mark.svg" alt="">Ava<i>DEMO CONVERSATION</i><small class="cl-company"><img src="assets/brand/trade-hvac.svg" alt="">Summit Heating · fictional example</small></div><div class="cl-msgs" role="log" aria-live="polite" aria-relevant="additions text"></div></div></div><div class="cl-phcopy"><h2>Missed a call? Ava is already texting back.</h2><p>Callers get a clear next step instead of a voicemail beep. This fictional text thread shows how Ava acknowledges the issue, gathers the essentials and hands it to the team.</p><ul><li>Replies in seconds, 24/7</li><li>Collects name, address and problem</li><li>Books straight into your calendar</li><li>Hands urgent jobs to your team</li></ul><p class="cl-note">Example thread · fictional caller and company details</p></div></div>';
 a.parentNode.insertBefore(s,a);
 var box=s.querySelector(".cl-msgs"),M=[
 ["in","Hi, this is Ava, the virtual receptionist at Summit Heating. I saw your missed call. What can I help with?"],
 ["out","Our furnace is running, but the vents are blowing cold air."],
 ["in","Thanks for explaining. Did that just start tonight?"],
 ["out","About twenty minutes ago."],
 ["in","Got it. What address should I put on the service request?"],
 ["out","24 Maple Street."],
 ["in","Thank you. I have sent your details to the on-call team. They will text you with the confirmed arrival window."],
 ["out","Perfect, thanks."],
 ["ok","✓ SERVICE REQUEST SENT · FOLLOW-UP TEXT QUEUED"]
 ],i=0;
 function step(){
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion:reduce)").matches){
   M.forEach(function(m){box.appendChild(e("div","cl-m "+m[0],m[1]))});
   while(box.children.length>6)box.firstChild.remove();
   return;
  }
  if(i>=M.length){setTimeout(function(){box.innerHTML="";i=0;step()},4200);return}
  var m=M[i++],dots=null;
  if(m[0]!=="out"){dots=e("div","cl-dots","<i></i><i></i><i></i>");box.appendChild(dots)}
  setTimeout(function(){
   if(dots&&dots.parentNode)dots.remove();
   box.appendChild(e("div","cl-m "+m[0],m[1]));
   while(box.children.length>6)box.firstChild.remove();
   setTimeout(step,m[0]==="out"?950:1150);
  },dots?650:250);
 }
 var seen=false;if("IntersectionObserver" in window){new IntersectionObserver(function(x,o){if(x[0].isIntersecting&&!seen){seen=true;step();o.disconnect()}},{threshold:.3}).observe(s)}else{step()}
}
function foot(){
 var f=document.querySelector("footer");if(!f||f.querySelector(".cl-mark"))return;
 var I={linkedin:'<path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.75h4V21H3zM9.5 9.75h3.8v1.6h.06c.53-1 1.84-2 3.8-2 4.06 0 4.84 2.6 4.84 6V21h-4v-4.8c0-1.2-.02-2.6-1.6-2.6-1.6 0-1.86 1.2-1.86 2.5V21h-4z"/>',instagram:'<path d="M12 7.2A4.8 4.8 0 1012 16.8 4.8 4.8 0 0012 7.2zm0 7.9a3.1 3.1 0 110-6.2 3.1 3.1 0 010 6.2zM17.3 5.6a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zM7.6 2h8.8A5.6 5.6 0 0122 7.6v8.8a5.6 5.6 0 01-5.6 5.6H7.6A5.6 5.6 0 012 16.4V7.6A5.6 5.6 0 017.6 2zm0 1.8A3.8 3.8 0 003.8 7.6v8.8a3.8 3.8 0 003.8 3.8h8.8a3.8 3.8 0 003.8-3.8V7.6a3.8 3.8 0 00-3.8-3.8z"/>',tiktok:'<path d="M16.6 2h-3.2v13.2a2.6 2.6 0 11-2.6-2.6c.3 0 .5 0 .8.1V9.4a5.8 5.8 0 105 5.8V8.6a7.2 7.2 0 004.2 1.3V6.7A4.2 4.2 0 0116.6 2z"/>'};
 var p=e("div","cl-soc");Object.keys(I).forEach(function(k){var a=e("a",null,'<svg viewBox="0 0 24 24" aria-hidden="true">'+I[k]+"</svg>");a.href=SOCIAL[k];a.target="_blank";a.rel="noopener noreferrer";a.setAttribute("aria-label",k);p.appendChild(a)});
 var pp=f.querySelectorAll("p"),host=pp.length?pp[pp.length-1].parentNode:f;host.appendChild(p);f.appendChild(e("div","cl-mark","linta")).setAttribute("aria-hidden","true");
}

function nav(){
 var h=document.querySelector("header.nav");if(!h||h.querySelector(".cl-links"))return;
 var G=[["Products",[["24/7 call handling","index.html#how","Answer every call, day or night"],["Missed-call text-back","index.html#how","Reply to missed callers in seconds"],["Confirmations","index.html#how","Confirm jobs before the truck rolls"],["Follow-ups","index.html#how","Keep quotes and customers warm"]]],
 ["Solutions",[["HVAC","hvac.html","For heating and cooling companies"],["Plumbing","plumbing.html","For plumbers and drain pros"],["Water restoration","restoration.html","For restoration crews"]]],
 ["Resources",[["Book a free audit","https://cal.com/linta/revenue-audit","See what you are missing"],["How it works","index.html#how","From first call to booked job"],["Guarantee","index.html#guarantee","What we promise"],["Privacy Policy","privacy.html","How we handle data"]]]];
 var w=e("nav","cl-links");w.id="cl-links";w.setAttribute("aria-label","Main");
 G.forEach(function(g){var d=e("div","cl-g");var b=e("button",null,g[0]);b.type="button";var m=e("div","cl-dd");
  g[1].forEach(function(i){var a=e("a",null,"<b>"+i[0]+"</b><small>"+i[2]+"</small>");a.href=i[1];if(/^http/.test(i[1])){a.target="_blank";a.rel="noopener"}m.appendChild(a)});d.appendChild(b);d.appendChild(m);w.appendChild(d)});
 var pr=e("div","cl-g",'<a class="cl-top" href="index.html#tiers">Pricing</a>');w.appendChild(pr);
 var gs=[].slice.call(w.querySelectorAll(".cl-g")),ct;
 function shut(){gs.forEach(function(g){g.classList.remove("on")})}
 gs.forEach(function(g){g.addEventListener("mouseenter",function(){if(innerWidth>900){clearTimeout(ct);shut();g.classList.add("on")}});g.addEventListener("mouseleave",function(){ct=setTimeout(shut,160)});var b=g.querySelector("button");if(b)b.addEventListener("click",function(){var o=g.classList.contains("on");shut();if(!o)g.classList.add("on")})});
 document.addEventListener("click",function(x){if(!w.contains(x.target))shut()});
 
 var bg=e("button","cl-burger","<i></i>");bg.type="button";bg.setAttribute("aria-label","Menu");bg.setAttribute("aria-expanded","false");bg.setAttribute("aria-controls","cl-links");
 function tog(o){w.classList.toggle("open",o);bg.setAttribute("aria-expanded",o)}
 bg.onclick=function(){tog(!w.classList.contains("open"))};
 w.addEventListener("click",function(x){if(x.target.closest&&x.target.closest("a"))tog(false)});
 document.addEventListener("keydown",function(x){if(x.key==="Escape")tog(false)});
 var logo=h.querySelector(".logo");logo.after(w);h.appendChild(bg);
}
function pcta(){var p=document.getElementById("pricing");if(!N||!p||document.getElementById("cl-pr"))return;var s=e("section","cl-sec cl-pr","<div class=\"wrap\"><div class=\"cl-head\"><h2>Simple month-to-month plans</h2><p>See every plan, the founding partner offer and the guarantee on our pricing page.</p><a class=\"btn primary\" href=\"index.html#tiers\">See pricing</a></div></div>");s.id="cl-pr";p.parentNode.insertBefore(s,p)}
function init(){pcta();nav();show();phone();foot()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(init,0)});else init();
})();
