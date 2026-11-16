/* Linta extras: sample dashboard, client proof, cookie consent. No inline code, CSP-safe. */
(function(){
"use strict";
var D={
 hvac:{job:"HVAC",kpi:[["Calls answered by Ava","312"],["Jobs booked","84"],["After-hours calls caught","94"],["Owner time saved","16.5 hrs"]],
  bars:[22,30,26,48,35,28,62,40,33,55,38,30],
  calls:[["No cooling, 6:02 PM","Booked tomorrow 8 AM"],["Tune-up quote","Booked Friday"],["Thermostat blank","Emergency sent to tech"],["Missed call, texted back","Quote booked"]]},
 plumbing:{job:"Plumbing",kpi:[["Calls answered by Ava","287"],["Jobs booked","79"],["Emergency calls routed","41"],["Owner time saved","14 hrs"]],
  bars:[18,28,24,44,30,26,58,36,31,50,34,27],
  calls:[["Burst pipe, 11:40 PM","Tech paged"],["Water heater quote","Booked Monday"],["Clogged drain","Booked today"],["Missed call, texted back","Booked Thursday"]]},
 restoration:{job:"Water restoration",kpi:[["Calls answered by Ava","264"],["Jobs booked","58"],["Insurance claims logged","37"],["Owner time saved","15 hrs"]],
  bars:[16,24,22,40,28,24,54,34,30,46,32,26],
  calls:[["Flooded basement, 2:10 AM","Crew dispatched"],["Insurance question","Claim details logged"],["Water damage quote","Site visit booked"],["Missed call, texted back","Booked tomorrow"]]}
};
var N=(document.body.dataset.niche)||"hvac", d=D[N]||D.hvac;
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}

/* ---- Dashboard: shows what the owner sees. Sample data, labelled as such. ---- */
function dash(){
 var anchor=document.getElementById("pricing")||document.getElementById("tiers");
 if(!anchor||document.getElementById("cl-dash"))return;
 var s=el("section","cl-sec");s.id="cl-dash";
 var k=d.kpi.map(function(x){return '<div class="cl-kpi"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></div>'}).join("");
 var b=d.bars.map(function(v,i){return '<i style="height:'+v+'%;animation-delay:'+(i*40)+'ms"></i>'}).join("");
 var c=d.calls.map(function(x){return '<li><span>'+esc(x[0])+'</span><em>'+esc(x[1])+'</em></li>'}).join("");
 s.innerHTML='<div class="wrap"><div class="cl-head"><h2>See every call and every booking in one place</h2><p>Your dashboard shows what Ava handled this month for your '+esc(d.job.toLowerCase())+' company: calls, booked jobs and time saved.</p></div>'+
 '<div class="cl-dash" role="img" aria-label="Sample Ava dashboard for a '+esc(d.job)+' company"><nav class="cl-side" aria-hidden="true"><b>Dashboard</b><span>Calls</span><span>Bookings</span><span>Texts</span><span>Reports</span><span>Settings</span></nav>'+
 '<div class="cl-main"><div class="cl-kpis">'+k+'</div><div class="cl-row"><div class="cl-card"><h3>Calls per day</h3><div class="cl-chart">'+b+'</div></div><div class="cl-card"><h3>Recent calls</h3><ul class="cl-list">'+c+'</ul></div></div></div></div>'+
 '<p class="cl-note">Sample data to show how the dashboard looks. Not results from a real client.</p></div>';
 anchor.parentNode.insertBefore(s,anchor);
}

/* ---- Client proof: add real clients here. Empty list = section stays hidden. ---- */
/* Each item: {quote:"", name:"", company:"", photo:"assets/clients/name.webp", audio:"assets/audio/name.mp3"} */
window.LINTA_CLIENTS=window.LINTA_CLIENTS||[];
function proof(){
 var L=window.LINTA_CLIENTS;if(!L.length)return;
 var anchor=document.getElementById("cl-dash")||document.getElementById("pricing")||document.getElementById("tiers");if(!anchor)return;
 var s=el("section","cl-sec");
 s.innerHTML='<div class="wrap"><div class="cl-head"><h2>What our clients say</h2></div><div class="cl-proof">'+L.slice(0,6).map(function(t){
  var ph=t.photo?'<img src="'+esc(t.photo)+'" alt="'+esc(t.name)+'" width="48" height="48" loading="lazy">':'<span class="cl-av" aria-hidden="true">'+esc((t.name||"?").charAt(0))+'</span>';
  return '<figure class="cl-tm"><blockquote>“'+esc(t.quote)+'”</blockquote>'+(t.audio?'<audio controls preload="none" src="'+esc(t.audio)+'"></audio>':'')+'<figcaption>'+ph+'<span><b>'+esc(t.name)+'</b><br>'+esc(t.company)+'</span></figcaption></figure>'}).join("")+'</div></div>';
 anchor.parentNode.insertBefore(s,anchor.nextSibling);
}

/* ---- Cookie consent. Stored on this device only. Nothing optional loads before a choice. ---- */
var KEY="linta_consent";
function get(){try{return localStorage.getItem(KEY)}catch(e){return null}}
function set(v){try{localStorage.setItem(KEY,v)}catch(e){}window.lintaConsent=v;document.dispatchEvent(new CustomEvent("linta:consent",{detail:v}))}
function banner(){
 var b=document.getElementById("cl-ck");if(b){b.hidden=false;return}
 b=el("div","cl-ck");b.id="cl-ck";b.setAttribute("role","dialog");b.setAttribute("aria-label","Cookie settings");
 b.innerHTML='<p>We use only the storage this site needs to work. With your OK we may also use analytics to improve it. Read our <a href="privacy.html">Privacy Policy</a>.</p><div><button type="button" data-v="essential">Essential only</button><button type="button" class="y" data-v="all">Accept all</button></div>';
 b.addEventListener("click",function(e){var v=e.target.getAttribute&&e.target.getAttribute("data-v");if(v){set(v);b.hidden=true}});
 document.body.appendChild(b);
}
function footerLink(){
 var f=document.querySelector("footer .footlinks");if(!f||f.querySelector(".cl-ckset"))return;
 var x=el("button","cl-ckset","Cookie settings");x.type="button";x.addEventListener("click",banner);f.appendChild(x);
}
window.lintaConsent=get();
setTimeout(function(){var c=document.querySelector(".curtain");if(c){c.style.transition="opacity .4s";c.style.opacity="0";c.style.pointerEvents="none";setTimeout(function(){c.style.visibility="hidden"},450)}},5000);
function init(){proof();footerLink();if(!get())banner()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
