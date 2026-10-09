// =========================================================
// IRON FIST - NAVEGACIÓN + NIVELES 1 Y 2
// =========================================================
function irAReglas(){
    document.getElementById("pantallaInicio")?.classList.remove("activa");
    document.getElementById("pantallaReglas")?.classList.add("activa");
}
function irACapitulo(){
    document.getElementById("pantallaReglas")?.classList.remove("activa");
    document.getElementById("pantallaCapitulo")?.classList.add("activa");
}

const nivel1 = {
    puntos: 0,
    vidas: 3,
    tiempo: 60,
    jugando: false,
    pausado: false,
    cuenta: false,
    naveX: 50,
    meteoritos: [],
    disparos: [],
    spawn: 0,
    reloj: null,
    animacion: null,
    teclas: {},
    velocidadNave: 0.75,
    velocidadMeteorito: 0.085
};

function mostrarPantalla(id){
    document.querySelectorAll(".pantalla").forEach(p=>p.classList.remove("activa"));
    document.getElementById(id)?.classList.add("activa");
}

function actualizarHUD(){
    const p=document.getElementById("nivel1Puntos");
    const v=document.getElementById("nivel1Vidas");
    const t=document.getElementById("nivel1Tiempo");
    if(p)p.textContent=nivel1.puntos;
    if(t)t.textContent=nivel1.tiempo;
    if(v)v.textContent=["","♥","♥ ♥","♥ ♥ ♥"][nivel1.vidas] || "";
}

function limpiarNivel(){
    nivel1.meteoritos.forEach(m=>m.el?.remove());
    nivel1.disparos.forEach(s=>s.el?.remove());
    nivel1.meteoritos=[];
    nivel1.disparos=[];
    clearInterval(nivel1.reloj);
    cancelAnimationFrame(nivel1.animacion);
    nivel1.jugando=false;
    nivel1.pausado=false;
    nivel1.spawn=0;
    document.getElementById("pausaNivel1")?.classList.remove("activo");
    const btnPausa=document.getElementById("pausaNivel1");
    if(btnPausa) btnPausa.textContent="❚❚ PAUSA";
}

function iniciarNivel1(){
    limpiarNivel();
    nivel1.puntos=0; nivel1.vidas=3; nivel1.tiempo=60; nivel1.naveX=50; nivel1.pausado=false;
    actualizarHUD();
    document.getElementById("naveNivel1").style.left="50%";
    mostrarPantalla("pantallaNivel1");
    cuentaRegresiva();
}

function cuentaRegresiva(){
    const cuenta=document.getElementById("cuentaNivel1");
    const fuego=document.getElementById("mensajeFuego");
    let n=3;
    cuenta.textContent=n; cuenta.classList.add("visible"); fuego.classList.remove("visible");
    const timer=setInterval(()=>{
        n--;
        if(n>0){cuenta.textContent=n;}
        else{
            clearInterval(timer);
            cuenta.classList.remove("visible");
            fuego.classList.add("visible");
            setTimeout(()=>fuego.classList.remove("visible"),650);
            comenzarNivel1();
        }
    },700);
}

function comenzarNivel1(){
    nivel1.jugando=true;
    const musica=document.getElementById("musicaNivel1");
    musica.volume=0.28;
    musica.currentTime=0;
    musica.play().catch(()=>{});
    nivel1.reloj=setInterval(()=>{
        if(!nivel1.jugando || nivel1.pausado)return;
        nivel1.tiempo--;
        actualizarHUD();
        if(nivel1.tiempo<=0) finalizarNivel1(false);
    },1000);
    nivel1.animacion=requestAnimationFrame(actualizarNivel1);
}

function moverNave(){
    if(nivel1.teclas.ArrowLeft) nivel1.naveX-=nivel1.velocidadNave;
    if(nivel1.teclas.ArrowRight) nivel1.naveX+=nivel1.velocidadNave;
    nivel1.naveX=Math.max(7,Math.min(93,nivel1.naveX));
    const nave=document.getElementById("naveNivel1");
    if(nave)nave.style.left=nivel1.naveX+"%";
}

function disparar(){
    if(!nivel1.jugando)return;
    const campo=document.getElementById("nivel1Escenario");
    const nave=document.getElementById("naveNivel1");
    const cont=document.getElementById("disparosNivel1");
    const b=document.createElement("div");
    b.className="bala-nivel1";
    const nr=nave.getBoundingClientRect(), cr=campo.getBoundingClientRect();
    b.style.left=(nr.left+nr.width/2-cr.left)+"px";
    b.style.top=(nr.top-cr.top-4)+"px";
    cont.appendChild(b);
    nivel1.disparos.push({el:b,x:nr.left+nr.width/2-cr.left,y:nr.top-cr.top-4});
    const audioBase=document.getElementById("sonidoDisparo");
    if(audioBase){
        const audio=audioBase.cloneNode(true);
        audio.volume=.65;
        audio.currentTime=0;
        audio.play().catch(err=>console.warn("No se pudo reproducir el disparo:",err));
        audio.addEventListener("ended",()=>audio.remove());
    }
}

function crearMeteorito(){
    const campo=document.getElementById("nivel1Escenario");
    const cont=document.getElementById("meteoritosNivel1");
    const el=document.createElement("img");
    el.className="meteorito-nivel1";
    el.src="assets/meteorito_nivel1.png";
    const ancho=48+Math.random()*22;
    el.style.width=ancho+"px";
    el.style.height=ancho+"px";
    const x=4+Math.random()*92;
    el.style.left=x+"%";
    el.style.top="-75px";
    cont.appendChild(el);
    nivel1.meteoritos.push({el,xPct:x,y:-75,size:ancho,speed:nivel1.velocidadMeteorito*(.75+Math.random()*.35)});
}

function rect(obj){return obj.el.getBoundingClientRect()}
function colision(a,b){
    const A=rect(a),B=rect(b);
    return !(A.right<B.left+5||A.left>B.right-5||A.bottom<B.top+5||A.top>B.bottom-5);
}

function perderVida(){
    nivel1.vidas--; actualizarHUD();
    if(nivel1.vidas<=0) finalizarNivel1(false);
}

function actualizarNivel1(){
    if(!nivel1.jugando)return;
    moverNave();
    const campo=document.getElementById("nivel1Escenario");
    const h=campo.clientHeight;
    nivel1.spawn-=1;
    if(nivel1.spawn<=0){crearMeteorito();nivel1.spawn=55+Math.random()*45;}

    for(let i=nivel1.disparos.length-1;i>=0;i--){
        const b=nivel1.disparos[i]; b.y-=8.5; b.el.style.top=b.y+"px";
        if(b.y<-30){b.el.remove();nivel1.disparos.splice(i,1);continue;}
        let destruido=false;
        for(let j=nivel1.meteoritos.length-1;j>=0;j--){
            const m=nivel1.meteoritos[j];
            if(colision(b,m)){
                b.el.remove();m.el.remove();
                nivel1.disparos.splice(i,1);nivel1.meteoritos.splice(j,1);
                nivel1.puntos++;actualizarHUD();
                if(nivel1.puntos>=30){finalizarNivel1(true);return;}
                destruido=true;break;
            }
        }
        if(destruido)continue;
    }

    for(let i=nivel1.meteoritos.length-1;i>=0;i--){
        const m=nivel1.meteoritos[i];
        m.y+=m.speed*10;
        m.el.style.top=m.y+"px";
        if(m.y>h-150){
            m.el.remove();nivel1.meteoritos.splice(i,1);perderVida();
            if(!nivel1.jugando)return;
        }
    }
    nivel1.animacion=requestAnimationFrame(actualizarNivel1);
}

function alternarPausaNivel1(){
    if(!nivel1.jugando)return;
    nivel1.pausado=!nivel1.pausado;
    const btn=document.getElementById("pausaNivel1");
    const musica=document.getElementById("musicaNivel1");
    const overlay=document.getElementById("overlayPausaNivel1");
    if(nivel1.pausado){
        cancelAnimationFrame(nivel1.animacion);
        musica?.pause();
        if(btn)btn.textContent="▶ CONTINUAR";
        overlay?.classList.add("visible");
    }else{
        musica?.play().catch(()=>{});
        if(btn)btn.textContent="❚❚ PAUSA";
        overlay?.classList.remove("visible");
        nivel1.animacion=requestAnimationFrame(actualizarNivel1);
    }
}

function finalizarNivel1(gano){
    if(!nivel1.jugando)return;
    nivel1.jugando=false;
    clearInterval(nivel1.reloj);
    cancelAnimationFrame(nivel1.animacion);
    const musica=document.getElementById("musicaNivel1");
    musica.pause();musica.currentTime=0;
    if(gano){
        document.getElementById("puntosVictoria").textContent=nivel1.puntos;
        const a=document.getElementById("sonidoVictoria");a.volume=.8;a.currentTime=0;a.play().catch(()=>{});
        mostrarPantalla("pantallaVictoria");
    }else{
        document.getElementById("puntosGameOver").textContent=nivel1.puntos;
        const a=document.getElementById("sonidoGameOver");a.volume=.8;a.currentTime=0;a.play().catch(()=>{});
        mostrarPantalla("pantallaGameOver");
    }
}



// =========================================================
// NIVEL 2 — COMBATE CONTRA EL TIBURÓN JEFE
// =========================================================
const nivel2 = {puntos:0, vidas:3, tiempo:60, jefeVida:34, naveX:50, jugando:false, pausado:false, teclas:{}, disparos:[], ataques:[], tick:0, reloj:null, animacion:null, invulnerable:0};
function actualizarHUDNivel2(){
  const put=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  put('nivel2Tiempo',nivel2.tiempo); put('nivel2Puntos',nivel2.puntos);
  put('nivel2Vidas',['','♥','♥ ♥','♥ ♥ ♥'][nivel2.vidas]||'');
  put('bossPorcentaje',Math.round(nivel2.jefeVida/34*100)+'%');
  const barra=document.getElementById('bossVida'); if(barra)barra.style.width=(nivel2.jefeVida/34*100)+'%';
}
function limpiarNivel2(){
  clearInterval(nivel2.reloj); cancelAnimationFrame(nivel2.animacion);
  nivel2.disparos.forEach(o=>o.el.remove()); nivel2.ataques.forEach(o=>o.el.remove());
  nivel2.disparos=[]; nivel2.ataques=[]; nivel2.jugando=false; nivel2.pausado=false; nivel2.tick=0; nivel2.invulnerable=0;
  document.getElementById('overlayPausaNivel2')?.classList.remove('visible');
  const btn=document.getElementById('pausaNivel2'); if(btn)btn.textContent='❚❚ PAUSA';
}
function iniciarNivel2(){
  limpiarNivel2(); nivel2.puntos=0; nivel2.vidas=3; nivel2.tiempo=60; nivel2.jefeVida=34; nivel2.naveX=50; nivel2.teclas={};
  const ship=document.getElementById('naveNivel2'); if(ship)ship.style.left='50%';
  const boss=document.getElementById('tiburonJefe'); if(boss)boss.style.left='50%';
  actualizarHUDNivel2(); mostrarPantalla('pantallaNivel2');
  const count=document.getElementById('cuentaNivel2'), fire=document.getElementById('mensajeFuegoNivel2'); let n=3;
  count.textContent=n; count.classList.add('visible'); fire.classList.remove('visible');
  const timer=setInterval(()=>{n--; if(n>0)count.textContent=n; else {clearInterval(timer);count.classList.remove('visible');fire.classList.add('visible');setTimeout(()=>fire.classList.remove('visible'),650);comenzarNivel2();}},700);
}
function comenzarNivel2(){
  nivel2.jugando=true;
  const music=document.getElementById('musicaNivel1'); if(music){music.volume=.24;music.currentTime=0;music.play().catch(()=>{});}
  nivel2.reloj=setInterval(()=>{if(!nivel2.jugando||nivel2.pausado)return;nivel2.tiempo--;actualizarHUDNivel2();if(nivel2.tiempo<=0)finalizarNivel2(false);},1000);
  nivel2.animacion=requestAnimationFrame(actualizarNivel2);
}
function dispararNivel2(){
  if(!nivel2.jugando||nivel2.pausado)return;
  const field=document.getElementById('escenarioNivel2'), ship=document.getElementById('naveNivel2'), holder=document.getElementById('disparosNivel2');
  const sr=ship.getBoundingClientRect(), fr=field.getBoundingClientRect(), el=document.createElement('div'); el.className='bala-nivel2';
  const x=sr.left+sr.width/2-fr.left, y=sr.top-fr.top-5; el.style.left=x+'px';el.style.top=y+'px';holder.appendChild(el);nivel2.disparos.push({el,x,y});
  const base=document.getElementById('sonidoDisparo'); if(base){const a=base.cloneNode(true);a.volume=.7;a.currentTime=0;a.play().catch(()=>{});a.addEventListener('ended',()=>a.remove());}
}
function crearAtaqueJefe(){
  const field=document.getElementById('escenarioNivel2'), boss=document.getElementById('tiburonJefe'), holder=document.getElementById('ataquesJefe');
  const br=boss.getBoundingClientRect(), fr=field.getBoundingClientRect(), el=document.createElement('div');el.className='ataque-jefe';
  const x=Math.max(24,Math.min(fr.width-24,br.left+br.width*(.2+Math.random()*.6)-fr.left));el.style.left=x+'px';el.style.top=(br.bottom-fr.top-10)+'px';holder.appendChild(el);nivel2.ataques.push({el,x,y:br.bottom-fr.top-10,speed:3.1+Math.random()*1.2});
}
function actualizarNivel2(){
  if(!nivel2.jugando||nivel2.pausado)return;
  const field=document.getElementById('escenarioNivel2'), ship=document.getElementById('naveNivel2'), boss=document.getElementById('tiburonJefe'); const h=field.clientHeight,w=field.clientWidth;
  if(nivel2.teclas.ArrowLeft)nivel2.naveX-=.72;if(nivel2.teclas.ArrowRight)nivel2.naveX+=.72;nivel2.naveX=Math.max(6,Math.min(94,nivel2.naveX));ship.style.left=nivel2.naveX+'%';
  nivel2.tick++; boss.style.left=(50+Math.sin(nivel2.tick*.018)*25)+'%';
  if(nivel2.tick%52===0)crearAtaqueJefe();
  const br=boss.getBoundingClientRect(), sr=ship.getBoundingClientRect();
  for(let i=nivel2.disparos.length-1;i>=0;i--){const b=nivel2.disparos[i];b.y-=9;b.el.style.top=b.y+'px';if(b.y<-20){b.el.remove();nivel2.disparos.splice(i,1);continue;}
    const r=b.el.getBoundingClientRect();if(r.right>br.left+br.width*.12&&r.left<br.right-br.width*.12&&r.bottom>br.top+br.height*.18&&r.top<br.bottom-br.height*.15){b.el.remove();nivel2.disparos.splice(i,1);nivel2.jefeVida--;nivel2.puntos++;actualizarHUDNivel2();const bossEl=document.getElementById('tiburonJefe');bossEl.classList.remove('golpeado');void bossEl.offsetWidth;bossEl.classList.add('golpeado');if(nivel2.jefeVida<=0){finalizarNivel2(true);return;}}
  }
  for(let i=nivel2.ataques.length-1;i>=0;i--){const a=nivel2.ataques[i];a.y+=a.speed;a.el.style.top=a.y+'px';const ar=a.el.getBoundingClientRect();if(nivel2.invulnerable<=0&&ar.right>sr.left+8&&ar.left<sr.right-8&&ar.bottom>sr.top+8&&ar.top<sr.bottom-8){a.el.remove();nivel2.ataques.splice(i,1);nivel2.vidas--;nivel2.invulnerable=65;ship.classList.add('dañado');setTimeout(()=>ship.classList.remove('dañado'),550);actualizarHUDNivel2();if(nivel2.vidas<=0){finalizarNivel2(false);return;}continue;}if(a.y>h+30){a.el.remove();nivel2.ataques.splice(i,1);}}
  if(nivel2.invulnerable>0)nivel2.invulnerable--;
  nivel2.animacion=requestAnimationFrame(actualizarNivel2);
}
function alternarPausaNivel2(){if(!nivel2.jugando)return;nivel2.pausado=!nivel2.pausado;const music=document.getElementById('musicaNivel1'),btn=document.getElementById('pausaNivel2'),overlay=document.getElementById('overlayPausaNivel2');if(nivel2.pausado){cancelAnimationFrame(nivel2.animacion);music?.pause();btn.textContent='▶ CONTINUAR';overlay.classList.add('visible');}else{music?.play().catch(()=>{});btn.textContent='❚❚ PAUSA';overlay.classList.remove('visible');nivel2.animacion=requestAnimationFrame(actualizarNivel2);}}
function finalizarNivel2(gano){if(!nivel2.jugando)return;nivel2.jugando=false;clearInterval(nivel2.reloj);cancelAnimationFrame(nivel2.animacion);const music=document.getElementById('musicaNivel1');if(music){music.pause();music.currentTime=0;}if(gano){document.getElementById('puntosVictoriaNivel2').textContent=nivel2.puntos;const a=document.getElementById('sonidoVictoria');if(a){a.currentTime=0;a.play().catch(()=>{});}mostrarPantalla('pantallaVictoriaNivel2');}else{document.getElementById('puntosGameOverNivel2').textContent=nivel2.puntos;const a=document.getElementById('sonidoGameOver');if(a){a.currentTime=0;a.play().catch(()=>{});}mostrarPantalla('pantallaGameOverNivel2');}}

document.addEventListener("DOMContentLoaded",()=>{
    const btnPreparado=document.getElementById("btnPreparado");
    const btnListo=document.getElementById("btnListo");
    const btnCapitulo=document.getElementById("btnPreparadoCapitulo");
    const btnPlay=document.getElementById("btnPlayCapitulo");
    const audioMision=document.getElementById("audioMision");

    btnPreparado?.addEventListener("click",irAReglas);
    btnListo?.addEventListener("click",irACapitulo);
    btnCapitulo?.addEventListener("click",iniciarNivel1);

    btnPlay?.addEventListener("click",async()=>{
        if(!audioMision)return;
        try{
            if(audioMision.paused){await audioMision.play();btnPlay.textContent="❚❚";}
            else{audioMision.pause();btnPlay.textContent="▶";}
        }catch(e){console.error(e)}
    });
    audioMision?.addEventListener("ended",()=>{btnPlay.textContent="▶";audioMision.currentTime=0;});

    document.getElementById("moverIzq")?.addEventListener("pointerdown",()=>nivel1.teclas.ArrowLeft=true);
    document.getElementById("moverIzq")?.addEventListener("pointerup",()=>nivel1.teclas.ArrowLeft=false);
    document.getElementById("moverIzq")?.addEventListener("pointerleave",()=>nivel1.teclas.ArrowLeft=false);
    document.getElementById("moverDer")?.addEventListener("pointerdown",()=>nivel1.teclas.ArrowRight=true);
    document.getElementById("moverDer")?.addEventListener("pointerup",()=>nivel1.teclas.ArrowRight=false);
    document.getElementById("moverDer")?.addEventListener("pointerleave",()=>nivel1.teclas.ArrowRight=false);
    document.getElementById("dispararNivel1")?.addEventListener("click",disparar);
    document.getElementById("pausaNivel1")?.addEventListener("click",alternarPausaNivel1);
    document.getElementById("continuarNivel1")?.addEventListener("click",alternarPausaNivel1);
    document.getElementById("volverNivelVictoria")?.addEventListener("click",iniciarNivel1);
    document.getElementById("siguienteNivel")?.addEventListener("click",()=>mostrarPantalla("pantallaNivel2Intro"));
    document.getElementById("volverVictoriaDesdeNivel2")?.addEventListener("click",()=>mostrarPantalla("pantallaVictoria"));
    document.getElementById("jugarNivel2")?.addEventListener("click",iniciarNivel2);
    document.getElementById("pausaNivel2")?.addEventListener("click",alternarPausaNivel2);
    document.getElementById("continuarNivel2")?.addEventListener("click",alternarPausaNivel2);
    document.getElementById("moverIzqNivel2")?.addEventListener("pointerdown",()=>nivel2.teclas.ArrowLeft=true);
    document.getElementById("moverIzqNivel2")?.addEventListener("pointerup",()=>nivel2.teclas.ArrowLeft=false);
    document.getElementById("moverIzqNivel2")?.addEventListener("pointerleave",()=>nivel2.teclas.ArrowLeft=false);
    document.getElementById("moverDerNivel2")?.addEventListener("pointerdown",()=>nivel2.teclas.ArrowRight=true);
    document.getElementById("moverDerNivel2")?.addEventListener("pointerup",()=>nivel2.teclas.ArrowRight=false);
    document.getElementById("moverDerNivel2")?.addEventListener("pointerleave",()=>nivel2.teclas.ArrowRight=false);
    document.getElementById("dispararNivel2")?.addEventListener("click",dispararNivel2);
    document.getElementById("reintentarNivel2")?.addEventListener("click",iniciarNivel2);
    document.getElementById("reintentarDerrotaNivel2")?.addEventListener("click",iniciarNivel2);
    document.getElementById("volverPortadaNivel2")?.addEventListener("click",()=>mostrarPantalla("pantallaNivel2Intro"));
    document.getElementById("volverNivelGameOver")?.addEventListener("click",iniciarNivel1);

    window.addEventListener("keydown",e=>{
        if(["ArrowLeft","ArrowRight","Space"].includes(e.code)||["ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault();
        nivel1.teclas[e.key]=true; nivel2.teclas[e.key]=true;
        if(e.code==="Space"&&!e.repeat){if(document.getElementById("pantallaNivel2")?.classList.contains("activa"))dispararNivel2();else disparar();}
    });
    window.addEventListener("keyup",e=>{nivel1.teclas[e.key]=false;nivel2.teclas[e.key]=false;});
});
