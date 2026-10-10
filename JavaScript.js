const $ = id => document.getElementById(id);
const teclas = {};

/* ---------------------------------------------------------
   NAVEGACIÓN
--------------------------------------------------------- */
function irAReglas(){
    $("pantallaInicio")?.classList.remove("activa");
    $("pantallaReglas")?.classList.add("activa");
}
function irACapitulo(){
    $("pantallaReglas")?.classList.remove("activa");
    $("pantallaCapitulo")?.classList.add("activa");
}
function mostrarPantalla(id){
    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    $(id)?.classList.add("activa");
}

/* ---------------------------------------------------------
   UTILIDADES COMUNES
--------------------------------------------------------- */
function textoVidas(n){
    return ["", "♥", "♥ ♥", "♥ ♥ ♥"][n] || "";
}

function reproducir(id, volumen){
    const a = $(id);
    if(!a) return;
    a.volume = volumen;
    a.currentTime = 0;
    a.play().catch(() => {});
}

function detenerMusica(){
    const m = $("musicaNivel1");
    if(m){ m.pause(); m.currentTime = 0; }
}

function sonarDisparo(volumen){
    const base = $("sonidoDisparo");
    if(!base) return;
    const a = base.cloneNode(true);
    a.volume = volumen;
    a.currentTime = 0;
    a.play().catch(() => {});
    a.addEventListener("ended", () => a.remove());
}

/* Cuenta regresiva 3-2-1-¡FUEGO!. Devuelve el id del temporizador. */
function cuentaRegresiva(elCuenta, elFuego, alTerminar){
    let n = 3;
    elCuenta.textContent = n;
    elCuenta.classList.add("visible");
    elFuego.classList.remove("visible");
    const timer = setInterval(() => {
        n--;
        if(n > 0){
            elCuenta.textContent = n;
        }else{
            clearInterval(timer);
            elCuenta.classList.remove("visible");
            elFuego.classList.add("visible");
            setTimeout(() => elFuego.classList.remove("visible"), 650);
            alTerminar();
        }
    }, 700);
    return timer;
}

function colision(elA, elB){
    const A = elA.getBoundingClientRect(), B = elB.getBoundingClientRect();
    return !(A.right < B.left + 5 || A.left > B.right - 5 || A.bottom < B.top + 5 || A.top > B.bottom - 5);
}

/* =========================================================
   MOTOR DE NIVELES NORMALES (NIVEL 1 Y NIVEL 2)
   Se destruyen meteoritos disparando; si uno cruza el límite
   se pierde una vida.
========================================================= */
function crearNivelNormal(cfg){
    const ids = cfg.ids;
    const s = {
        puntos: 0, vidas: 3, tiempo: cfg.tiempo,
        jugando: false, pausado: false,
        naveX: 50, naveY: 24, meteoritos: [], disparos: [], spawn: 0,
        reloj: null, animacion: null, cuentaTimer: null
    };

    function actualizarHUD(){
        $(ids.puntos).textContent = s.puntos;
        $(ids.tiempo).textContent = s.tiempo;
        $(ids.vidas).textContent = textoVidas(s.vidas);
    }

    function limpiar(){
        s.meteoritos.forEach(m => m.el.remove());
        s.disparos.forEach(b => b.el.remove());
        s.meteoritos = [];
        s.disparos = [];
        clearInterval(s.reloj);
        clearInterval(s.cuentaTimer);
        cancelAnimationFrame(s.animacion);
        s.jugando = false;
        s.pausado = false;
        s.spawn = 0;
        $(ids.overlay)?.classList.remove("visible");
        const btn = $(ids.pausa);
        if(btn) btn.textContent = "❚❚ PAUSA";
    }

    function iniciar(){
        limpiar();
        s.puntos = 0; s.vidas = 3; s.tiempo = cfg.tiempo; s.naveX = 50; s.naveY = 24;
        teclas.ArrowLeft = false; teclas.ArrowRight = false;
        actualizarHUD();
        $(ids.nave).style.left = "50%"; $(ids.nave).style.bottom = "24%";
        mostrarPantalla(cfg.pantalla);
        s.cuentaTimer = cuentaRegresiva($(ids.cuenta), $(ids.fuego), comenzar);
    }

    function comenzar(){
        s.jugando = true;
        const musica = $("musicaNivel1");
        musica.volume = cfg.volumenMusica;
        musica.currentTime = 0;
        musica.play().catch(() => {});
        s.reloj = setInterval(() => {
            if(!s.jugando || s.pausado) return;
            s.tiempo--;
            actualizarHUD();
            if(s.tiempo <= 0) finalizar(false);
        }, 1000);
        s.animacion = requestAnimationFrame(actualizar);
    }

    function moverNave(){
        if(teclas.ArrowLeft)  s.naveX -= cfg.velocidadNave;
        if(teclas.ArrowRight) s.naveX += cfg.velocidadNave;
        if(teclas.ArrowUp) s.naveY += cfg.velocidadNave * 0.65;
        if(teclas.ArrowDown) s.naveY -= cfg.velocidadNave * 0.65;
        s.naveY = Math.max(5, Math.min(42, s.naveY));
        $(ids.nave).style.bottom = s.naveY + "%";
        s.naveX = Math.max(7, Math.min(93, s.naveX));
        $(ids.nave).style.left = s.naveX + "%";
    }

    function disparar(){
        if(!s.jugando || s.pausado) return;
        const campo = $(ids.escenario), nave = $(ids.nave);
        const b = document.createElement("div");
        b.className = "bala-nivel1";
        const nr = nave.getBoundingClientRect(), cr = campo.getBoundingClientRect();
        const x = nr.left + nr.width / 2 - cr.left, y = nr.top - cr.top - 4;
        b.style.left = x + "px";
        b.style.top = y + "px";
        $(ids.disparos).appendChild(b);
        s.disparos.push({el: b, x, y});
        sonarDisparo(.65);
    }

    function crearMeteorito(){
        const esCometa = cfg.probCometa > 0 && Math.random() < cfg.probCometa;
        const el = document.createElement("img");
        el.className = "meteorito-nivel1" + (esCometa ? " cometa-nivel2" : "");
        el.src = "assets/meteorito_nivel1.png";
        const ancho = esCometa ? 36 + Math.random() * 14 : 48 + Math.random() * 22;
        el.style.width = ancho + "px";
        el.style.height = ancho + "px";
        const x = 4 + Math.random() * 92;
        el.style.left = x + "%";
        el.style.top = "-75px";
        $(ids.meteoritos).appendChild(el);
        s.meteoritos.push({
            el, xPct: x, y: -75, size: ancho,
            valor: esCometa ? 2 : 1,
            speed: cfg.velocidadMeteorito * (.75 + Math.random() * .35) * (esCometa ? cfg.multiplicadorCometa : 1)
        });
    }

    function perderVida(){
        s.vidas--;
        actualizarHUD();
        if(s.vidas <= 0) finalizar(false);
    }

    function actualizar(){
        if(!s.jugando) return;
        moverNave();
        const h = $(ids.escenario).clientHeight;

        s.spawn -= 1;
        if(s.spawn <= 0){
            crearMeteorito();
            s.spawn = cfg.spawnMin + Math.random() * cfg.spawnExtra;
        }

        // Disparos
        for(let i = s.disparos.length - 1; i >= 0; i--){
            const b = s.disparos[i];
            b.y -= 8.5;
            b.el.style.top = b.y + "px";
            if(b.y < -30){ b.el.remove(); s.disparos.splice(i, 1); continue; }
            for(let j = s.meteoritos.length - 1; j >= 0; j--){
                const m = s.meteoritos[j];
                if(colision(b.el, m.el)){
                    b.el.remove(); m.el.remove();
                    s.disparos.splice(i, 1);
                    s.meteoritos.splice(j, 1);
                    s.puntos += m.valor;
                    actualizarHUD();
                    if(s.puntos >= cfg.meta){ finalizar(true); return; }
                    break;
                }
            }
        }

        // Meteoritos
        for(let i = s.meteoritos.length - 1; i >= 0; i--){
            const m = s.meteoritos[i];
            m.y += m.speed * 10;
            m.el.style.top = m.y + "px";
            if(m.y > h - 150){
                m.el.remove();
                s.meteoritos.splice(i, 1);
                perderVida();
                if(!s.jugando) return;
            }
        }
        s.animacion = requestAnimationFrame(actualizar);
    }

    function alternarPausa(){
        if(!s.jugando) return;
        s.pausado = !s.pausado;
        const btn = $(ids.pausa), musica = $("musicaNivel1"), overlay = $(ids.overlay);
        if(s.pausado){
            cancelAnimationFrame(s.animacion);
            musica?.pause();
            if(btn) btn.textContent = "▶ CONTINUAR";
            overlay?.classList.add("visible");
        }else{
            musica?.play().catch(() => {});
            if(btn) btn.textContent = "❚❚ PAUSA";
            overlay?.classList.remove("visible");
            s.animacion = requestAnimationFrame(actualizar);
        }
    }

    function finalizar(gano){
        if(!s.jugando) return;
        s.jugando = false;
        clearInterval(s.reloj);
        cancelAnimationFrame(s.animacion);
        detenerMusica();
        if(gano){
            $(cfg.puntosVictoria).textContent = Math.min(s.puntos, cfg.meta);
            reproducir("sonidoVictoria", .8);
            mostrarPantalla(cfg.pantallaVictoria);
        }else{
            $(cfg.puntosGameOver).textContent = s.puntos;
            reproducir("sonidoGameOver", .8);
            mostrarPantalla(cfg.pantallaGameOver);
        }
    }

    return {
        estado: s, iniciar, disparar, alternarPausa,
        visible: () => $(cfg.pantalla).classList.contains("activa")
    };
}

/* ---------------------------------------------------------
   NIVEL 1 — DEFENSA DE LA TIERRA (30 puntos / 60 s)
--------------------------------------------------------- */
const nivel1 = crearNivelNormal({
    pantalla: "pantallaNivel1",
    pantallaVictoria: "pantallaVictoria",
    pantallaGameOver: "pantallaGameOver",
    puntosVictoria: "puntosVictoria",
    puntosGameOver: "puntosGameOver",
    meta: 30,
    tiempo: 60,
    velocidadNave: 0.75,
    velocidadMeteorito: 0.085,
    spawnMin: 55, spawnExtra: 45,
    probCometa: 0, multiplicadorCometa: 1,
    volumenMusica: 0.28,
    ids: {
        puntos: "nivel1Puntos", vidas: "nivel1Vidas", tiempo: "nivel1Tiempo",
        pausa: "pausaNivel1", overlay: "overlayPausaNivel1",
        escenario: "nivel1Escenario", meteoritos: "meteoritosNivel1", disparos: "disparosNivel1",
        nave: "naveNivel1", cuenta: "cuentaNivel1", fuego: "mensajeFuego"
    }
});

/* ---------------------------------------------------------
   NIVEL 2 — LLUVIA DE METEORITOS (40 puntos / 60 s)
   Más rápido que el nivel 1 y con cometas veloces (valen 2).
--------------------------------------------------------- */
const nivel2 = crearNivelNormal({
    pantalla: "pantallaNivel2",
    pantallaVictoria: "pantallaVictoriaNivel2",
    pantallaGameOver: "pantallaGameOverNivel2",
    puntosVictoria: "puntosVictoriaNivel2",
    puntosGameOver: "puntosGameOverNivel2",
    meta: 40,
    tiempo: 60,
    velocidadNave: 0.85,
    velocidadMeteorito: 0.115,
    spawnMin: 36, spawnExtra: 28,
    probCometa: 0.22, multiplicadorCometa: 1.8,
    volumenMusica: 0.28,
    ids: {
        puntos: "nivel2Puntos", vidas: "nivel2Vidas", tiempo: "nivel2Tiempo",
        pausa: "pausaNivel2", overlay: "overlayPausaNivel2",
        escenario: "nivel2Escenario", meteoritos: "meteoritosNivel2", disparos: "disparosNivel2",
        nave: "naveNivel2", cuenta: "cuentaNivel2", fuego: "mensajeFuegoNivel2"
    }
});

/* =========================================================
   NIVEL 3 — JEFE FINAL: TITÁN IRON (3 fases)
   Fase 1 → plasma apuntado y abanicos
   Fase 2 (66%) → rayos con aviso + meteoritos
   Fase 3 (33%) → furia: anillos, espirales y rayos triples
   Caen potenciadores: vida, disparo rápido y escudo.
========================================================= */
const N3_VIDA_JEFE = 70, N3_TIEMPO = 100, N3_VIDAS = 4, N3_VIDAS_MAX = 5;
const nivel3 = {
  puntos:0, vidas:N3_VIDAS, tiempo:N3_TIEMPO, jefeVida:N3_VIDA_JEFE, fase:1, naveX:50, naveY:12,
  jugando:false, pausado:false, boton:{izq:false,der:false,fuego:false},
  disparos:[], balas:[], lasers:[], meteoros:[], drops:[],
  reloj:null, animacion:null, ultimo:0, fin:null,
  cd:{fuego:0,a:0,b:0,c:0,d:0,drop:0},
  invuln:0, escudoJefe:0, escudoJugador:0, rapido:0,
  bossX:50, bossTarget:50, bossT:0, espiral:0, angulo:0, golpeSfx:0
};

// ---- Sonidos sintetizados (no requieren archivos) ----
let ctxAudio3 = null;
function sfx3(tipo){
  try{
    ctxAudio3 = ctxAudio3 || new (window.AudioContext||window.webkitAudioContext)();
    const c = ctxAudio3; if(c.state==='suspended') c.resume();
    const tono = (f1,f2,dur,type,vol,delay=0)=>{
      const o=c.createOscillator(), g=c.createGain(), t=c.currentTime+delay;
      o.type=type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t+dur);
      g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur+.02);
    };
    if(tipo==='disparo') tono(900,260,.12,'square',.05);
    else if(tipo==='golpe') tono(220,90,.09,'sawtooth',.06);
    else if(tipo==='escudo') tono(1400,900,.08,'triangle',.05);
    else if(tipo==='herido'){ tono(300,60,.45,'sawtooth',.12); }
    else if(tipo==='drop'){ tono(500,1000,.12,'triangle',.09); tono(800,1500,.14,'triangle',.09,.1); }
    else if(tipo==='laser') tono(140,900,.5,'sawtooth',.05);
    else if(tipo==='fase'){ tono(120,40,.9,'sawtooth',.16); tono(400,80,.9,'square',.07,.05); }
    else if(tipo==='boom'){ for(let i=0;i<6;i++) tono(260-i*28,40,.55,'sawtooth',.13,i*.18); }
  }catch(e){}
}

function actualizarHUDNivel3(){
  const put=(id,v)=>{const e=$(id); if(e)e.textContent=v;};
  put('nivel3Tiempo',nivel3.tiempo); put('nivel3Puntos',nivel3.puntos); put('nivel3Fase',nivel3.fase);
  put('nivel3Vidas', nivel3.vidas>0 ? Array(nivel3.vidas).fill('♥').join(' ') : '');
  const pct=Math.max(0,Math.round(nivel3.jefeVida/N3_VIDA_JEFE*100));
  put('bossPorcentajeN3',pct+'%');
  const b=$('bossVidaN3'); if(b)b.style.width=pct+'%';
  const p=$('poderesN3');
  if(p){
    let h='';
    if(nivel3.rapido>0) h+='<span class="poder rapido">⚡ RÁPIDO '+Math.ceil(nivel3.rapido/60)+'s</span>';
    if(nivel3.escudoJugador>0) h+='<span class="poder escudo">◈ ESCUDO</span>';
    if(p.dataset.h!==h){p.innerHTML=h;p.dataset.h=h;}
  }
  $('naveNivel3')?.classList.toggle('con-escudo',nivel3.escudoJugador>0);
}

function limpiarNivel3(){
  const n=nivel3;
  clearInterval(n.reloj); clearTimeout(n.fin); cancelAnimationFrame(n.animacion);
  [n.disparos,n.balas,n.lasers,n.meteoros,n.drops].forEach(a=>a.forEach(o=>o.el.remove()));
  n.disparos=[];n.balas=[];n.lasers=[];n.meteoros=[];n.drops=[];
  n.jugando=false;n.pausado=false;n.invuln=0;n.escudoJefe=0;n.escudoJugador=0;n.rapido=0;
  n.boton={izq:false,der:false,fuego:false};
  $('overlayPausaNivel3')?.classList.remove('visible');
  const btn=$('pausaNivel3'); if(btn)btn.textContent='❚❚ PAUSA';
  const m=$('musicaNivel3'); if(m){m.pause();m.currentTime=0;}
  const boss=$('jefeTitan'); if(boss){boss.classList.remove('explota','golpeado','con-escudo');boss.dataset.fase='1';}
  $('escenarioNivel3')?.classList.remove('furia');
  $('naveNivel3')?.classList.remove('dañado','con-escudo');
}

function iniciarNivel3(){
  limpiarNivel3();
  const n=nivel3;
  Object.assign(n,{puntos:0,vidas:N3_VIDAS,tiempo:N3_TIEMPO,jefeVida:N3_VIDA_JEFE,fase:1,naveX:50,
    bossX:50,bossTarget:50,bossT:60,espiral:0,angulo:0,golpeSfx:0,naveY:12});
  n.cd={fuego:0,a:110,b:260,c:400,d:700,drop:600};
  teclas.ArrowLeft=false; teclas.ArrowRight=false; teclas[' ']=false;
  const ship=$('naveNivel3'); if(ship){ship.style.left='50%';ship.style.bottom='12%';}
  const boss=$('jefeTitan'); if(boss)boss.style.left='50%';
  actualizarHUDNivel3(); mostrarPantalla('pantallaNivel3');
  const count=$('cuentaNivel3'), fire=$('mensajeFuegoNivel3'); let c=3;
  count.textContent=c; count.classList.add('visible'); fire.classList.remove('visible');
  const timer=setInterval(()=>{
    c--; if(c>0){count.textContent=c;return;}
    clearInterval(timer); count.classList.remove('visible'); fire.classList.add('visible');
    setTimeout(()=>fire.classList.remove('visible'),650); comenzarNivel3();
  },700);
}

function comenzarNivel3(){
  const n=nivel3; n.jugando=true;
  const m=$('musicaNivel3'); if(m){m.volume=.3;m.playbackRate=1.12;m.currentTime=0;m.play().catch(()=>{});}
  n.reloj=setInterval(()=>{
    if(!n.jugando||n.pausado)return;
    n.tiempo--; actualizarHUDNivel3();
    if(n.tiempo<=0) finalizarNivel3(false,'SE ACABÓ EL TIEMPO');
  },1000);
  n.ultimo=performance.now(); n.animacion=requestAnimationFrame(actualizarNivel3);
}

// ---- Entidades ----
function crearPlasma(x,y,vx,vy,grande){
  const el=document.createElement('div'); el.className='plasma-n3'+(grande?' grande':'');
  $('ataquesN3').appendChild(el);
  nivel3.balas.push({el,x,y,vx,vy,r:grande?13:8});
}
function plasmaApuntado(x,y,velocidad,desvio,grande){
  const w=$('escenarioNivel3').clientWidth, h=$('escenarioNivel3').clientHeight, s=$('naveNivel3');
  const px=nivel3.naveX/100*w, py=h-(nivel3.naveY/100*h)-s.offsetHeight/2;
  const a=Math.atan2(py-y,px-x)+desvio;
  crearPlasma(x,y,Math.cos(a)*velocidad,Math.sin(a)*velocidad,grande);
}
function crearLaser(x){
  const el=document.createElement('div'); el.className='laser-n3'; el.style.left=x+'px';
  $('lasersN3').appendChild(el); nivel3.lasers.push({el,x,t:0,aviso:80,activo:32,golpeo:false,sono:false});
}
function crearMeteoro3(w){
  const el=document.createElement('img'); el.src='assets/meteorito_nivel1.png'; el.className='meteoro-n3'; el.alt='';
  const size=44+Math.random()*24; el.style.width=el.style.height=size+'px';
  const x=30+Math.random()*(w-60); el.style.left=x+'px'; el.style.top='-70px';
  $('meteorosN3').appendChild(el);
  nivel3.meteoros.push({el,x,y:-70,size,vy:2.1+Math.random()*1.4+nivel3.fase*.25,rot:Math.random()*360,vr:(Math.random()-.5)*5});
}
function crearDrop(w,tipo){
  const n=nivel3;
  if(!tipo){
    const opciones=['rapido','escudo'];
    if(n.vidas<N3_VIDAS_MAX) opciones.push('vida','vida');
    tipo=opciones[Math.floor(Math.random()*opciones.length)];
  }
  const el=document.createElement('div'); el.className='drop-n3 '+tipo; el.textContent={vida:'♥',rapido:'⚡',escudo:'◈'}[tipo];
  const x=40+Math.random()*(w-80); el.style.left=x+'px'; el.style.top='-30px';
  $('dropsN3').appendChild(el); n.drops.push({el,x,y:-30,tipo});
}
function explosionN3(x,y,color){
  const e=document.createElement('div'); e.className='chispa-n3'; e.style.left=x+'px'; e.style.top=y+'px';
  if(color)e.style.setProperty('--c',color);
  $('escenarioNivel3').appendChild(e); setTimeout(()=>e.remove(),420);
}
function temblar3(){
  const f=$('escenarioNivel3'); f.classList.remove('tiembla'); void f.offsetWidth; f.classList.add('tiembla');
}
function bannerN3(texto,sub){
  const b=$('bannerN3'); b.innerHTML='<strong>'+texto+'</strong><small>'+sub+'</small>';
  b.classList.remove('visible'); void b.offsetWidth; b.classList.add('visible');
}

// ---- Jugador ----
function intentarDisparoNivel3(){
  const n=nivel3; if(!n.jugando||n.pausado||n.cd.fuego>0)return;
  const f=$('escenarioNivel3'), s=$('naveNivel3'), w=f.clientWidth, h=f.clientHeight;
  const x=n.naveX/100*w, y=h-(n.naveY/100*h)-s.offsetHeight-4;
  const crear=dx=>{
    const el=document.createElement('div'); el.className='bala-nivel3';
    el.style.left=(x+dx)+'px'; el.style.top=y+'px'; $('disparosN3').appendChild(el);
    n.disparos.push({el,x:x+dx,y});
  };
  if(n.rapido>0){crear(-11);crear(11);} else crear(0);
  n.cd.fuego = n.rapido>0 ? 7 : 13;
  sfx3('disparo');
}
function herirNivel3(){
  const n=nivel3; if(n.invuln>0||!n.jugando)return;
  if(n.escudoJugador>0){n.escudoJugador=0;n.invuln=50;sfx3('escudo');actualizarHUDNivel3();return;}
  n.vidas--; n.invuln=105; sfx3('herido'); temblar3();
  const s=$('naveNivel3'); s.classList.remove('dañado'); void s.offsetWidth; s.classList.add('dañado');
  setTimeout(()=>s.classList.remove('dañado'),900);
  actualizarHUDNivel3();
  if(n.vidas<=0) finalizarNivel3(false,'EL TITÁN IRON TE HA VENCIDO');
}
function recogerDrop(tipo){
  const n=nivel3; sfx3('drop');
  if(tipo==='vida') n.vidas=Math.min(N3_VIDAS_MAX,n.vidas+1);
  else if(tipo==='rapido') n.rapido=60*8;
  else n.escudoJugador=1;
  actualizarHUDNivel3();
}

// ---- Jefe ----
function cambiarFaseNivel3(nueva){
  const n=nivel3, f=$('escenarioNivel3'), w=f.clientWidth;
  n.fase=nueva; n.escudoJefe=170; n.espiral=0;
  [n.balas,n.lasers,n.meteoros].forEach(a=>{a.forEach(o=>o.el.remove());a.length=0;});
  n.cd={fuego:n.cd.fuego,a:150,b:300,c:420,d:520,drop:n.cd.drop};
  $('jefeTitan').dataset.fase=nueva;
  f.classList.toggle('furia',nueva===3);
  crearDrop(w,'vida');
  sfx3('fase'); temblar3();
  bannerN3(nueva===2?'FASE 2':'FASE 3', nueva===2?'EL TITÁN SE ACTIVA':'¡FURIA DEL TITÁN!');
  actualizarHUDNivel3();
}
function golpearJefe3(x,y){
  const n=nivel3;
  if(n.escudoJefe>0){ explosionN3(x,y,'#7fe6ff'); if(n.golpeSfx<=0){sfx3('escudo');n.golpeSfx=6;} return; }
  n.jefeVida--; n.puntos++; explosionN3(x,y);
  if(n.golpeSfx<=0){sfx3('golpe');n.golpeSfx=5;}
  const b=$('jefeTitan'); b.classList.remove('golpeado'); void b.offsetWidth; b.classList.add('golpeado');
  actualizarHUDNivel3();
  if(n.jefeVida<=0){ finalizarNivel3(true); return; }
  const r=n.jefeVida/N3_VIDA_JEFE;
  if(n.fase===1&&r<=.66) cambiarFaseNivel3(2);
  else if(n.fase===2&&r<=.33) cambiarFaseNivel3(3);
}
function ataquesJefe3(dt,bx,by,w,h){
  const n=nivel3, c=n.cd, f=n.fase;
  Object.keys(c).forEach(k=>{ if(k!=='fuego'&&k!=='drop') c[k]-=dt; });
  const px=n.naveX/100*w;
  // A: disparos apuntados
  if(c.a<=0){
    if(f===1){ plasmaApuntado(bx,by,4.3,0); c.a=75; }
    else if(f===2){ [-.16,0,.16].forEach(d=>plasmaApuntado(bx,by,5,d)); c.a=85; }
    else { [-.22,-.11,0,.11,.22].forEach(d=>plasmaApuntado(bx,by,5.8,d)); c.a=70; }
  }
  // B: abanico / anillo
  if(c.b<=0){
    if(f===1){ for(let i=-2;i<=2;i++){const a=Math.PI/2+i*.32; crearPlasma(bx,by,Math.cos(a)*3.4,Math.sin(a)*3.4);} c.b=230; }
    else if(f===2){ for(let i=-3;i<=3;i++){const a=Math.PI/2+i*.27; crearPlasma(bx,by,Math.cos(a)*3.9,Math.sin(a)*3.9);} c.b=190; }
    else { const o=Math.random()*6.28; for(let i=0;i<16;i++){const a=o+i*Math.PI*2/16; crearPlasma(bx,by,Math.cos(a)*3.6,Math.sin(a)*3.6,true);} c.b=170; }
  }
  // C: rayos con aviso (fase 2+)
  if(c.c<=0 && f>=2){
    if(f===2){ crearLaser(Math.max(30,Math.min(w-30,px))); c.c=240; }
    else { const g=Math.random()<.5?-1:1; crearLaser(Math.max(30,Math.min(w-30,px))); crearLaser(Math.max(30,Math.min(w-30,px+g*150))); crearLaser(Math.max(30,Math.min(w-30,px-g*150))); c.c=250; }
    sfx3('laser');
  }
  // D: lluvia de meteoritos (fase 2+) / espiral (fase 3)
  if(c.d<=0 && f>=2){
    const cant=f===2?2:3; for(let i=0;i<cant;i++) setTimeout(()=>{ if(nivel3.jugando&&!nivel3.pausado) crearMeteoro3($('escenarioNivel3').clientWidth); }, i*350);
    c.d=f===2?210:170;
    if(f===3 && n.espiral<=0 && Math.random()<.35) n.espiral=170;
  }
  if(n.espiral>0){
    n.espiral-=dt; n.angulo+=.05*dt;
    if(Math.floor((n.espiral+dt)/7)!==Math.floor(n.espiral/7)){
      for(let k=0;k<2;k++){ const a=n.angulo+k*Math.PI; crearPlasma(bx,by,Math.cos(a)*3.3,Math.abs(Math.sin(a))*3.3+1.2); }
    }
  }
}

function actualizarNivel3(ts){
  const n=nivel3; if(!n.jugando||n.pausado)return;
  const dt=Math.min(2.5,Math.max(.2,(ts-n.ultimo)/16.667||1)); n.ultimo=ts;
  const f=$('escenarioNivel3'), ship=$('naveNivel3'), bossEl=$('jefeTitan');
  const w=f.clientWidth, h=f.clientHeight;

  // Jugador
  const izq=teclas.ArrowLeft, der=teclas.ArrowRight;
  const arriba=teclas.ArrowUp, abajo=teclas.ArrowDown;
  if(izq)n.naveX-=.78*dt; if(der)n.naveX+=.78*dt;
  if(arriba)n.naveY+=.62*dt; if(abajo)n.naveY-=.62*dt;
  n.naveX=Math.max(6,Math.min(94,n.naveX));
  // Más recorrido vertical para esquivar los ataques del jefe final.
  n.naveY=Math.max(7,Math.min(48,n.naveY));
  ship.style.left=n.naveX+'%'; ship.style.bottom=n.naveY+'%';
  const sx=n.naveX/100*w, sy=h-(n.naveY/100*h)-ship.offsetHeight/2;
  n.cd.fuego-=dt; n.golpeSfx-=dt;
  if(teclas[' ']||n.boton.fuego) intentarDisparoNivel3();
  if(n.invuln>0)n.invuln-=dt;
  if(n.rapido>0){n.rapido-=dt; if(n.rapido<=0)actualizarHUDNivel3(); else if(Math.floor(n.rapido)%30===0)actualizarHUDNivel3();}
  ship.style.opacity = n.invuln>0 && Math.floor(n.invuln/6)%2 ? .35 : 1;

  // Jefe
  n.bossT-=dt;
  if(n.bossT<=0){ n.bossTarget=16+Math.random()*68; n.bossT=[0,130,90,58][n.fase]; }
  n.bossX+=(n.bossTarget-n.bossX)*[0,.016,.026,.042][n.fase]*dt;
  bossEl.style.left=n.bossX+'%';
  const bw=bossEl.offsetWidth, bh=bossEl.offsetHeight, bx=n.bossX/100*w, bt=h*.11;
  $('haloN3').style.left=n.bossX+'%';
  if(n.escudoJefe>0){ n.escudoJefe-=dt; bossEl.classList.toggle('con-escudo',n.escudoJefe>0); }
  else{
    bossEl.classList.remove('con-escudo');
    ataquesJefe3(dt,bx,bt+bh*.78,w,h);
  }
  if(n.cd.drop>0 || true){
    n.cd.drop-=dt;
    if(n.cd.drop<=0){ crearDrop(w); n.cd.drop=780+Math.random()*300; }
  }

  // Balas del jugador
  for(let i=n.disparos.length-1;i>=0;i--){
    const b=n.disparos[i]; b.y-=10*dt; b.el.style.top=b.y+'px';
    if(b.y<-25){b.el.remove();n.disparos.splice(i,1);continue;}
    // contra meteoros
    let usada=false;
    for(let j=n.meteoros.length-1;j>=0;j--){
      const m=n.meteoros[j];
      if(Math.abs(b.x-m.x)<m.size*.5 && Math.abs(b.y-m.y)<m.size*.5+8){
        explosionN3(m.x,m.y,'#ffb04d'); m.el.remove(); n.meteoros.splice(j,1);
        b.el.remove(); n.disparos.splice(i,1); usada=true; break;
      }
    }
    if(usada)continue;
    // contra el jefe
    if(Math.abs(b.x-bx)<bw*.36 && b.y>bt+bh*.1 && b.y<bt+bh*.82){
      b.el.remove(); n.disparos.splice(i,1); golpearJefe3(b.x,b.y);
      if(!n.jugando)return;
    }
  }

  // Plasma enemigo
  for(let i=n.balas.length-1;i>=0;i--){
    const a=n.balas[i]; a.x+=a.vx*dt; a.y+=a.vy*dt;
    a.el.style.transform='translate('+(a.x-a.r)+'px,'+(a.y-a.r)+'px)';
    if(a.y>h+30||a.x<-30||a.x>w+30||a.y<-40){a.el.remove();n.balas.splice(i,1);continue;}
    const dx=a.x-sx, dy=a.y-sy;
    if(Math.abs(dx)<a.r+14 && Math.abs(dy)<a.r+20){
      a.el.remove(); n.balas.splice(i,1); explosionN3(a.x,a.y,'#ff4fa8'); herirNivel3();
      if(!n.jugando)return;
    }
  }

  // Rayos
  for(let i=n.lasers.length-1;i>=0;i--){
    const l=n.lasers[i]; l.t+=dt;
    if(l.t>=l.aviso && !l.sono){ l.sono=true; l.el.classList.add('activo'); temblar3(); }
    if(l.t>=l.aviso && l.t<l.aviso+l.activo && Math.abs(sx-l.x)<27+13){ herirNivel3(); if(!n.jugando)return; }
    if(l.t>=l.aviso+l.activo){ l.el.remove(); n.lasers.splice(i,1); }
  }

  // Meteoros
  for(let i=n.meteoros.length-1;i>=0;i--){
    const m=n.meteoros[i]; m.y+=m.vy*dt; m.rot+=m.vr*dt;
    m.el.style.transform='translate(-50%,-50%) rotate('+m.rot+'deg)'; m.el.style.top=m.y+'px';
    if(m.y>h+80){m.el.remove();n.meteoros.splice(i,1);continue;}
    if(Math.abs(m.x-sx)<m.size*.4+13 && Math.abs(m.y-sy)<m.size*.4+18){
      explosionN3(m.x,m.y,'#ffb04d'); m.el.remove(); n.meteoros.splice(i,1); herirNivel3(); if(!n.jugando)return;
    }
  }

  // Potenciadores
  for(let i=n.drops.length-1;i>=0;i--){
    const d=n.drops[i]; d.y+=2.1*dt; d.el.style.top=d.y+'px';
    if(d.y>h+30){d.el.remove();n.drops.splice(i,1);continue;}
    if(Math.abs(d.x-sx)<30 && Math.abs(d.y-sy)<34){ recogerDrop(d.tipo); d.el.remove(); n.drops.splice(i,1); }
  }

  n.animacion=requestAnimationFrame(actualizarNivel3);
}

function alternarPausaNivel3(){
  const n=nivel3; if(!n.jugando)return;
  n.pausado=!n.pausado;
  const m=$('musicaNivel3'), btn=$('pausaNivel3'), ov=$('overlayPausaNivel3');
  if(n.pausado){
    cancelAnimationFrame(n.animacion); m?.pause(); btn.textContent='▶ CONTINUAR'; ov.classList.add('visible');
    n.boton={izq:false,der:false,fuego:false};
  }else{
    m?.play().catch(()=>{}); btn.textContent='❚❚ PAUSA'; ov.classList.remove('visible');
    n.ultimo=performance.now(); n.animacion=requestAnimationFrame(actualizarNivel3);
  }
}

function finalizarNivel3(gano,motivo){
  const n=nivel3; if(!n.jugando)return;
  n.jugando=false; clearInterval(n.reloj); cancelAnimationFrame(n.animacion);
  n.boton={izq:false,der:false,fuego:false};
  const m=$('musicaNivel3'); if(m){m.pause();m.currentTime=0;}
  if(gano){
    n.puntos+=Math.max(0,n.tiempo)*2+n.vidas*50; // bonus por tiempo y vidas
    [n.balas,n.lasers,n.meteoros].forEach(a=>{a.forEach(o=>o.el.remove());a.length=0;});
    const boss=$('jefeTitan'); boss.classList.add('explota'); sfx3('boom'); temblar3();
    const f=$('escenarioNivel3'), w=f.clientWidth, h=f.clientHeight;
    for(let i=0;i<10;i++) setTimeout(()=>explosionN3(n.bossX/100*w+(Math.random()-.5)*boss.offsetWidth*.8,h*.11+Math.random()*boss.offsetHeight,['#ff4fd8','#ffd24d','#7fe6ff'][i%3]),i*170);
    n.fin=setTimeout(()=>{
      $('puntosVictoriaNivel3').textContent=n.puntos;
      $('vidasVictoriaNivel3').textContent=n.vidas;
      const a=$('sonidoVictoria'); if(a){a.currentTime=0;a.volume=.8;a.play().catch(()=>{});}
      mostrarPantalla('pantallaVictoriaNivel3');
    },2100);
  }else{
    $('jefeRestanteNivel3').textContent=Math.max(0,Math.round(n.jefeVida/N3_VIDA_JEFE*100))+'%';
    const t=$('textoDerrotaNivel3'); if(t)t.textContent=motivo||'EL TITÁN IRON TE HA VENCIDO';
    const a=$('sonidoGameOver'); if(a){a.currentTime=0;a.volume=.8;a.play().catch(()=>{});}
    mostrarPantalla('pantallaGameOverNivel3');
  }
}

const controlNivel3 = {
    iniciar: iniciarNivel3,
    disparar: intentarDisparoNivel3,
    visible: () => $("pantallaNivel3").classList.contains("activa")
};

/* =========================================================
   EVENTOS
========================================================= */
function ligarMovimiento(idBoton, tecla){
    const b = $(idBoton);
    if(!b) return;
    b.addEventListener("pointerdown",  () => teclas[tecla] = true);
    b.addEventListener("pointerup",    () => teclas[tecla] = false);
    b.addEventListener("pointerleave", () => teclas[tecla] = false);
}
function alClick(id, fn){ $(id)?.addEventListener("click", fn); }

document.addEventListener("DOMContentLoaded", () => {
    const btnPlay = $("btnPlayCapitulo");
    const audioMision = $("audioMision");

    // Inicio → reglas → capítulo
    alClick("btnPreparado", irAReglas);
    alClick("btnListo", irACapitulo);
    alClick("btnPreparadoCapitulo", nivel1.iniciar);

    btnPlay?.addEventListener("click", async () => {
        if(!audioMision) return;
        try{
            if(audioMision.paused){ await audioMision.play(); btnPlay.textContent = "❚❚"; }
            else{ audioMision.pause(); btnPlay.textContent = "▶"; }
        }catch(e){ console.error(e); }
    });
    audioMision?.addEventListener("ended", () => { btnPlay.textContent = "▶"; audioMision.currentTime = 0; });

    // Nivel 1
    ligarMovimiento("moverIzq", "ArrowLeft");
    ligarMovimiento("moverDer", "ArrowRight");
    alClick("dispararNivel1", nivel1.disparar);
    alClick("pausaNivel1", nivel1.alternarPausa);
    alClick("continuarNivel1", nivel1.alternarPausa);
    alClick("volverNivelVictoria", nivel1.iniciar);
    alClick("volverNivelGameOver", nivel1.iniciar);
    alClick("siguienteNivel", () => mostrarPantalla("pantallaNivel2Intro"));

    // Nivel 2 (normal)
    alClick("volverVictoriaDesdeNivel2", () => mostrarPantalla("pantallaVictoria"));
    alClick("jugarNivel2", nivel2.iniciar);
    ligarMovimiento("moverIzqNivel2", "ArrowLeft");
    ligarMovimiento("moverDerNivel2", "ArrowRight");
    alClick("dispararNivel2", nivel2.disparar);
    alClick("pausaNivel2", nivel2.alternarPausa);
    alClick("continuarNivel2", nivel2.alternarPausa);
    alClick("reintentarNivel2", nivel2.iniciar);
    alClick("reintentarDerrotaNivel2", nivel2.iniciar);
    alClick("siguienteNivel2", () => mostrarPantalla("pantallaNivel3Intro"));

    // Nivel 3 (jefe final)
    alClick("volverVictoriaDesdeNivel3", () => mostrarPantalla("pantallaVictoriaNivel2"));
    alClick("jugarNivel3", iniciarNivel3);
    ligarMovimiento("moverIzqNivel3", "ArrowLeft");
    ligarMovimiento("moverDerNivel3", "ArrowRight");
    const btnFuego = $("dispararNivel3");
    if(btnFuego){
        btnFuego.addEventListener("pointerdown", e => { e.preventDefault(); nivel3.boton.fuego = true; intentarDisparoNivel3(); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btnFuego.addEventListener(ev, () => nivel3.boton.fuego = false));
    }
    alClick("pausaNivel3", alternarPausaNivel3);
    alClick("continuarNivel3", alternarPausaNivel3);
    alClick("reintentarNivel3", iniciarNivel3);
    alClick("reintentarDerrotaNivel3", iniciarNivel3);
    alClick("volverInicioFinal", () => mostrarPantalla("pantallaInicio"));

    // Teclado
    const niveles = [nivel1, nivel2, controlNivel3];
    window.addEventListener("keydown", e => {
        if(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) || e.code === "Space") e.preventDefault();
        teclas[e.key] = true;
        if(e.code === "Space" && !e.repeat){
            niveles.find(n => n.visible())?.disparar();
        }
    });
    window.addEventListener("keyup", e => { teclas[e.key] = false; });
    window.addEventListener("blur", () => { Object.keys(teclas).forEach(k => teclas[k] = false); nivel3.boton.fuego = false; });
});
