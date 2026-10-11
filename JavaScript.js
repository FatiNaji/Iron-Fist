const $ = id => document.getElementById(id);
const teclas = {};

/* ---------------------------------------------------------
   AJUSTES: VOLUMEN Y BRILLO
   - volumen: multiplicador global (0 a 1) sobre todos los sonidos
   - brillo:  1 = normal, 0.5 = más oscuro, 1.5 = más claro
--------------------------------------------------------- */
const ajustes = { volumen: 1, brillo: 1 };
const VOLUMEN_BASE = { musicaNivel1: 0.28, musicaNivel3: 0.30, audioMision: 1, musicaMenu: 0.35 };

function volumenFinal(base){
    return Math.max(0, Math.min(1, base * ajustes.volumen));
}

function cargarAjustes(){
    try{
        const g = JSON.parse(localStorage.getItem("ironFistAjustes") || "{}");
        if(typeof g.volumen === "number") ajustes.volumen = Math.max(0, Math.min(1, g.volumen));
        if(typeof g.brillo === "number")  ajustes.brillo  = Math.max(0.5, Math.min(1.5, g.brillo));
    }catch(e){}
}

function guardarAjustes(){
    try{ localStorage.setItem("ironFistAjustes", JSON.stringify(ajustes)); }catch(e){}
}

/* Aplica los ajustes también a lo que ya está sonando */
function aplicarAjustes(){
    Object.keys(VOLUMEN_BASE).forEach(id => {
        const a = document.getElementById(id);
        if(a) a.volume = id === "musicaMenu" ? volumenMenu() : volumenFinal(VOLUMEN_BASE[id]);
    });
    document.documentElement.style.setProperty("--brillo", ajustes.brillo);
    document.documentElement.classList.toggle("con-brillo", Math.abs(ajustes.brillo - 1) > 0.005);
}

function iniciarAjustes(){
    const cont = $("ajustesJuego"), btn = $("btnAjustes"), panel = $("panelAjustes");
    const rVol = $("rangoVolumen"), rBri = $("rangoBrillo");
    const tVol = $("valorVolumen"), tBri = $("valorBrillo");
    if(!cont || !btn || !panel || !rVol || !rBri) return;

    cargarAjustes();
    const pintar = () => {
        rVol.value = Math.round(ajustes.volumen * 100);
        rBri.value = Math.round(ajustes.brillo * 100);
        tVol.textContent = rVol.value + "%";
        tBri.textContent = rBri.value + "%";
    };
    pintar();
    aplicarAjustes();

    btn.addEventListener("click", () => {
        const abierto = panel.classList.toggle("abierto");
        btn.setAttribute("aria-expanded", abierto);
        btn.blur();   // para que ESPACIO siga disparando y no active este botón
    });

    rVol.addEventListener("input", () => {
        ajustes.volumen = rVol.value / 100;
        tVol.textContent = rVol.value + "%";
        aplicarAjustes(); guardarAjustes();
    });
    rBri.addEventListener("input", () => {
        ajustes.brillo = rBri.value / 100;
        tBri.textContent = rBri.value + "%";
        aplicarAjustes(); guardarAjustes();
    });
    // Al soltar el control con el mouse/dedo, devolver el foco al juego (las flechas mueven la nave)
    [rVol, rBri].forEach(r => r.addEventListener("pointerup", () => r.blur()));

    $("btnRestablecerAjustes")?.addEventListener("click", e => {
        ajustes.volumen = 1; ajustes.brillo = 1;
        pintar(); aplicarAjustes(); guardarAjustes();
        e.currentTarget.blur();
    });

    // Tocar fuera del panel lo cierra
    document.addEventListener("pointerdown", e => {
        if(!cont.contains(e.target)) panel.classList.remove("abierto");
    });
}

/* ---------------------------------------------------------
   SOUNDTRACK DE MENÚS
   Suena en inicio, reglas, capítulo, presentaciones de nivel,
   victorias y game over. NO suena durante los niveles de juego
   (ahí ya hay su propia música).
--------------------------------------------------------- */
const PANTALLAS_JUEGO = ["pantallaNivel1", "pantallaNivel2", "pantallaNivel3"];
const PANTALLAS_FINAL = ["pantallaVictoria", "pantallaGameOver", "pantallaVictoriaNivel2",
                         "pantallaGameOverNivel2", "pantallaVictoriaNivel3", "pantallaGameOverNivel3"];
let menuAudioListo = false;   // el navegador exige una interacción antes de reproducir audio
let menuQuiere = false;       // true = debe estar sonando
let menuTimer = null, menuFade = null;

/* Baja el soundtrack mientras suena la voz de la misión */
function volumenMenu(){
    const voz = document.getElementById("audioMision");
    const duck = (voz && !voz.paused) || narradorHablando() ? 0.2 : 1;
    return volumenFinal(VOLUMEN_BASE.musicaMenu * duck);
}

function fundirMenu(entrando, ms){
    const m = $("musicaMenu");
    if(!m) return;
    clearInterval(menuFade);
    const pasos = Math.max(1, Math.round(ms / 50));
    const desde = m.volume;
    let i = 0;
    if(entrando){ m.volume = 0; m.play().catch(() => {}); }
    menuFade = setInterval(() => {
        i++;
        const f = i / pasos;
        m.volume = Math.max(0, Math.min(1, entrando ? volumenMenu() * f : desde * (1 - f)));
        if(i >= pasos){
            clearInterval(menuFade);
            if(entrando) m.volume = volumenMenu(); else m.pause();
        }
    }, 50);
}

function actualizarMusicaMenu(){
    const m = $("musicaMenu");
    if(!m || !menuAudioListo) return;
    const id = document.querySelector(".pantalla.activa")?.id;

    if(PANTALLAS_JUEGO.includes(id)){
        clearTimeout(menuTimer);
        if(menuQuiere){ menuQuiere = false; fundirMenu(false, 400); }
        return;
    }
    if(menuQuiere && !m.paused) return;   // ya está sonando
    clearTimeout(menuTimer);
    menuQuiere = true;
    // En victoria/game over se espera a que termine el jingle de esa pantalla
    menuTimer = setTimeout(() => fundirMenu(true, 1200), PANTALLAS_FINAL.includes(id) ? 3500 : 0);
}

function iniciarMusicaMenu(){
    const desbloquear = () => { menuAudioListo = true; actualizarMusicaMenu(); };
    ["click", "keydown", "pointerup", "touchend"].forEach(ev =>
        document.addEventListener(ev, desbloquear, {passive: true}));
    const voz = $("audioMision");
    ["play", "pause", "ended"].forEach(ev => voz?.addEventListener(ev, aplicarAjustes));
    aplicarAjustes();
}

/* ---------------------------------------------------------
   NARRACIÓN DE LA HISTORIA (Capítulo I) — unos 2 a 3 minutos
   Se reproduce sola al abrir la pantalla del capítulo.
   Orden de preferencia:
     1) assets/narracion_historia.mp3 (si existe, se usa esa grabación)
     2) la voz en español del navegador (SpeechSynthesis)
     3) solo subtítulos, si no hay ninguna voz disponible
   El texto completo también está en assets/narracion_historia.txt
--------------------------------------------------------- */
const NARRACION_ARCHIVO = "assets/narracion_historia.mp3";
const HISTORIA_TEXTO = `La Tierra duerme bajo un cielo en calma. Las ciudades brillan, los océanos respiran, y nadie imagina que, muy lejos de aquí, en la oscuridad del espacio profundo, algo acaba de despertar.

Todo empezó hace tres meses. Los observatorios orbitales detectaron una anomalía más allá de la órbita de Marte: un inmenso cinturón de rocas, dormido durante miles de millones de años, comenzó a moverse. No fue un accidente. Algo lo estaba empujando, y su rumbo era uno solo: nuestro planeta.

Los científicos lo llamaron la Lluvia. Primero cayeron fragmentos pequeños, que ardieron en la atmósfera como estrellas fugaces. Pero cada noche llegaban más, más grandes y más cerca. Las ciudades costeras fueron evacuadas. Los misiles resultaron demasiado lentos. Las defensas de siempre no estaban hechas para algo así.

Entonces nació un proyecto secreto: Iron Fist, el Puño de Hierro. No es un ejército, ni un cañón gigante en órbita. Es una nave pequeña y veloz, con un solo piloto y cañones de plasma capaces de pulverizar cualquier roca. Su verdadera arma no es el metal. Son los reflejos de quien la maneja.

Se evaluó a miles de aspirantes, y casi todos fueron descartados. Cuando terminó la última prueba, un solo nombre quedó en lo más alto de la lista: el tuyo.

Lo que viene no será fácil. En la primera oleada deberás destruir treinta meteoritos antes de que se acabe el tiempo. Si demasiados cruzan la línea de defensa, el escudo caerá. Después, la tormenta se intensificará: aparecerán cometas ardientes y veloces, y cada uno que derribes valdrá el doble.

Pero los astrónomos descubrieron algo peor. Entre las rocas viaja una máquina de guerra antigua, construida por una civilización desaparecida para borrar mundos enteros. Le dieron un nombre: Titán Iron. Dicen que aún no ha mostrado todo su poder, que tiene tres fases, y que cada una es más letal que la anterior.

No habrá refuerzos. Cada meteorito que detengas será un hogar que sigue en pie, una familia que verá amanecer, un mañana que todavía es posible.

Respira hondo. Afirma las manos sobre los controles. Enciende los motores. El futuro de la Tierra descansa ahora en tus manos. Piloto, la misión comienza. ¡Que el Puño de Hierro caiga sobre el espacio!`;

/* Parte el texto en frases cortas (mejor para subtítulos y para que el navegador no corte la voz) */
function trocearHistoria(texto){
    const trozos = [];
    texto.split(/\n\s*\n/).forEach(par => {
        (par.trim().match(/[^.!?…]+[.!?…]+["»”]?\s*|[^.!?…]+$/g) || []).forEach(frase => {
            let f = frase.trim();
            while(f.length > 150){
                let corte = f.lastIndexOf(",", 150);
                if(corte < 60) corte = f.lastIndexOf(" ", 150);
                trozos.push(f.slice(0, corte + 1).trim());
                f = f.slice(corte + 1).trim();
            }
            if(f) trozos.push(f);
        });
    });
    return trozos;
}

const N = {
    trozos: trocearHistoria(HISTORIA_TEXTO), i: 0,
    activo: false, hablando: false, pausado: false, terminado: false,
    sesion: 0, modo: null, voz: null, archivo: null, proboLocal: false,
    timer: null, inicioTimer: null
};

function narradorHablando(){ return N.activo && N.hablando && !N.pausado && !N.terminado; }

function vocesEspanol(){
    const ss = window.speechSynthesis;
    return ss ? ss.getVoices().filter(v => /^es/i.test((v.lang || "").replace("_", "-"))) : [];
}
function puntuarVoz(v){
    const n = v.name.toLowerCase(), l = (v.lang || "").toLowerCase().replace("_", "-");
    let p = 0;
    if(/natural|neural/.test(n)) p += 6;
    if(/online/.test(n)) p += 2;
    if(/google/.test(n)) p += 1;
    if(/es-(mx|us|419|pe|co|ar|cl)/.test(l)) p += 2; else if(l === "es-es") p += 1;
    return p;
}
function esperarVoces(){
    return new Promise(res => {
        const ss = window.speechSynthesis;
        if(!ss || ss.getVoices().length) return res();
        const fin = () => { ss.removeEventListener?.("voiceschanged", fin); res(); };
        ss.addEventListener?.("voiceschanged", fin);
        setTimeout(fin, 1500);
    });
}

function pintarNarracion(){
    const t = $("narracionTexto"), p = $("narracionProgreso"), b = $("btnNarracion");
    if(!t) return;
    t.textContent = N.terminado ? "Fin de la narración. Pulsa ↻ para escucharla otra vez." : (N.trozos[N.i] || "");
    if(p) p.style.width = (N.terminado ? 100 : Math.round(N.i / N.trozos.length * 100)) + "%";
    if(b){
        b.textContent = N.terminado ? "↻" : (N.pausado ? "▶" : "❚❚");
        b.setAttribute("aria-label", N.terminado ? "Escuchar de nuevo" : (N.pausado ? "Continuar narración" : "Pausar narración"));
    }
    $("narracionBarra")?.classList.remove("oculta");
}

function iniciarNarracion(){
    if(N.activo) return;            // irACapitulo puede llamarse dos veces por clic
    N.activo = true; N.terminado = false; N.pausado = false; N.hablando = false;
    N.i = 0; N.proboLocal = false; N.sesion++;
    pintarNarracion();
    const ses = N.sesion;
    clearTimeout(N.inicioTimer);
    N.inicioTimer = setTimeout(() => { if(ses === N.sesion) comenzarNarracion(ses); }, 600);
}

async function comenzarNarracion(ses){
    // 1) Grabación propia, si existe
    try{
        const a = new Audio(NARRACION_ARCHIVO);
        a.volume = volumenFinal(1);
        await a.play();
        if(ses !== N.sesion){ a.pause(); return; }
        N.modo = "archivo"; N.archivo = a; N.hablando = true;
        const total = N.trozos.reduce((s, t) => s + t.length, 0);
        a.addEventListener("timeupdate", () => {
            if(N.archivo !== a || !a.duration) return;
            const f = a.currentTime / a.duration;
            let acum = 0, idx = N.trozos.length - 1;
            for(let k = 0; k < N.trozos.length; k++){
                acum += N.trozos[k].length;
                if(f <= acum / total){ idx = k; break; }
            }
            if(idx !== N.i){ N.i = idx; pintarNarracion(); }
        });
        a.addEventListener("ended", () => { if(N.archivo === a) terminarNarracion(); });
        aplicarAjustes(); pintarNarracion();
        return;
    }catch(e){ /* no hay archivo: se usa la voz del navegador */ }

    // 2) Voz del navegador en español
    N.modo = "texto";
    if("speechSynthesis" in window && "SpeechSynthesisUtterance" in window){
        await esperarVoces();
        if(ses !== N.sesion) return;
        const es = vocesEspanol().sort((a, b) => puntuarVoz(b) - puntuarVoz(a));
        if(es.length){ N.voz = es[0]; N.modo = "voz"; }
        else if(!window.speechSynthesis.getVoices().length){ N.voz = null; N.modo = "voz"; }
        window.speechSynthesis.cancel();
    }
    // 3) Si no hay voz, N.modo queda en "texto" y solo avanzan los subtítulos
    N.hablando = N.modo === "voz";
    aplicarAjustes();
    hablarTrozo(ses);
}

function hablarTrozo(ses){
    if(ses !== N.sesion || !N.activo || N.pausado) return;
    if(N.i >= N.trozos.length){ terminarNarracion(); return; }
    pintarNarracion();
    const texto = N.trozos[N.i];
    const avanzar = () => { if(ses !== N.sesion || N.pausado) return; N.i++; hablarTrozo(ses); };

    if(N.modo === "voz"){
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = N.voz ? N.voz.lang : "es-ES";
        if(N.voz) u.voice = N.voz;
        u.rate = 0.95; u.pitch = 0.92; u.volume = volumenFinal(1);
        u.onend = avanzar;
        u.onerror = e => {
            if(ses !== N.sesion || e.error === "interrupted" || e.error === "canceled") return;
            // La voz falló (p. ej. una voz "online" sin internet): probar una local y, si no, seguir solo con texto
            const local = vocesEspanol().filter(v => v.localService && v !== N.voz).sort((a, b) => puntuarVoz(b) - puntuarVoz(a))[0];
            if(local && !N.proboLocal){ N.proboLocal = true; N.voz = local; hablarTrozo(ses); }
            else{ N.modo = "texto"; N.hablando = false; aplicarAjustes(); hablarTrozo(ses); }
        };
        window.speechSynthesis.speak(u);
    }else{
        N.timer = setTimeout(avanzar, Math.max(1800, texto.split(/\s+/).length * 380));
    }
}

function terminarNarracion(){
    N.terminado = true; N.hablando = false; N.pausado = false;
    N.i = Math.max(0, N.trozos.length - 1);
    aplicarAjustes(); pintarNarracion();
}

function pausarNarracion(){
    if(!N.activo || N.pausado || N.terminado) return;
    N.pausado = true; N.sesion++;               // invalida lo que esté en curso
    clearTimeout(N.timer);
    if(N.modo === "archivo") N.archivo?.pause(); else window.speechSynthesis?.cancel();
    aplicarAjustes(); pintarNarracion();
}

function continuarNarracion(){
    if(!N.activo || !N.pausado) return;
    N.pausado = false;
    if(N.modo === "archivo") N.archivo?.play().catch(() => {});
    else{ const ses = N.sesion; setTimeout(() => hablarTrozo(ses), 120); }
    aplicarAjustes(); pintarNarracion();
}

function alternarNarracion(){
    if(!N.activo) return;
    if(N.terminado){                              // escuchar de nuevo
        N.terminado = false; N.pausado = false; N.i = 0; N.sesion++;
        if(N.modo === "archivo"){ N.archivo.currentTime = 0; N.archivo.play().catch(() => {}); N.hablando = true; }
        else{ N.hablando = N.modo === "voz"; const ses = N.sesion; window.speechSynthesis?.cancel(); setTimeout(() => hablarTrozo(ses), 120); }
        aplicarAjustes(); pintarNarracion();
    }else if(N.pausado) continuarNarracion();
    else pausarNarracion();
}

function detenerNarracion(ocultar){
    N.sesion++;
    clearTimeout(N.timer); clearTimeout(N.inicioTimer);
    if(N.archivo){ N.archivo.pause(); N.archivo = null; }
    window.speechSynthesis?.cancel();
    N.activo = false; N.hablando = false; N.pausado = false; N.terminado = false; N.i = 0;
    aplicarAjustes();
    if(ocultar) $("narracionBarra")?.classList.add("oculta");
}

/* Voz corta de la misión (botón ▶ o tecla Enter en la pantalla del capítulo) */
async function alternarVozMision(){
    const voz = $("audioMision");
    if(!voz) return;
    if(!voz.paused){ voz.pause(); return; }
    pausarNarracion();                            // dos voces a la vez no se entienden
    if(voz.readyState === 0) voz.load();
    voz.volume = volumenFinal(VOLUMEN_BASE.audioMision);
    try{ await voz.play(); }
    catch(e){ console.error("No se pudo reproducir la voz de la misión:", e); }
}

/* ---------------------------------------------------------
   NAVEGACIÓN
--------------------------------------------------------- */
function irAReglas(){
    document.activeElement?.blur?.();
    $("pantallaInicio")?.classList.remove("activa");
    $("pantallaReglas")?.classList.add("activa");
}
function irACapitulo(){
    document.activeElement?.blur?.();   // evita que Enter/Espacio reactiven el botón anterior ya oculto
    $("pantallaReglas")?.classList.remove("activa");
    $("pantallaCapitulo")?.classList.add("activa");
    iniciarNarracion();
}
function mostrarPantalla(id){
    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    $(id)?.classList.add("activa");
    document.activeElement?.blur?.();
    if(id !== "pantallaCapitulo") detenerNarracion();
    actualizarMusicaMenu();
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
    a.volume = volumenFinal(volumen);
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
    a.volume = volumenFinal(volumen);
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

/* ---------------------------------------------------------
   EXPLOSIÓN DE METEORITOS (bola de fuego + onda + chispas)
--------------------------------------------------------- */
function crearExplosion(campoEl, cx, cy, size){
    const e = document.createElement("div");
    e.className = "explosion-meteorito";
    e.style.left = cx + "px";
    e.style.top = cy + "px";
    e.style.setProperty("--t", (size * 2.4) + "px");
    e.innerHTML = '<i class="destello"></i><i class="bola"></i><i class="onda"></i>';
    const n = 12;
    for(let k = 0; k < n; k++){
        const c = document.createElement("b");
        c.className = "chispa-expl";
        const ang = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const dist = size * (0.7 + Math.random() * 0.9);
        c.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        c.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        c.style.animationDelay = (Math.random() * 0.05) + "s";
        e.appendChild(c);
    }
    campoEl.appendChild(e);
    setTimeout(() => e.remove(), 750);
}

/* Niveles 1 y 2: toma el centro real del meteorito en pantalla */
function explotarMeteorito(campoEl, m){
    const cr = campoEl.getBoundingClientRect(), r = m.el.getBoundingClientRect();
    crearExplosion(campoEl, r.left + r.width / 2 - cr.left, r.top + r.height / 2 - cr.top, m.size);
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
        musica.volume = volumenFinal(cfg.volumenMusica);
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
        // El centro del meteorito siempre cae dentro de la franja que la nave sí puede
        // cubrir (7%–93% del ancho, igual que el límite de moverNave), así que ninguno
        // queda fuera del alcance del disparo.
        const w = $(ids.escenario).clientWidth;
        const minC = Math.max(w * 0.07, ancho / 2);
        const maxC = Math.min(w * 0.93, w - ancho / 2);
        const centro = minC + Math.random() * Math.max(0, maxC - minC);
        const x = centro - ancho / 2;
        el.style.left = x + "px";
        el.style.top = "-75px";
        $(ids.meteoritos).appendChild(el);
        s.meteoritos.push({
            el, x, y: -75, size: ancho,
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
                    explotarMeteorito($(ids.escenario), m);
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
  if(ajustes.volumen<=0) return;
  try{
    ctxAudio3 = ctxAudio3 || new (window.AudioContext||window.webkitAudioContext)();
    const c = ctxAudio3; if(c.state==='suspended') c.resume();
    const tono = (f1,f2,dur,type,vol,delay=0)=>{
      const o=c.createOscillator(), g=c.createGain(), t=c.currentTime+delay;
      o.type=type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(Math.max(30,f2),t+dur);
      const v=vol*ajustes.volumen; if(v<.0011) return;
      g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
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
  const m=$('musicaNivel3'); if(m){m.volume=volumenFinal(.3);m.playbackRate=1.12;m.currentTime=0;m.play().catch(()=>{});}
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
  const x=w*.07+Math.random()*w*.86; el.style.left=x+'px'; el.style.top='-70px';
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
  const x=w*.08+Math.random()*w*.84; el.style.left=x+'px'; el.style.top='-30px';
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
        crearExplosion($('escenarioNivel3'),m.x,m.y,m.size); m.el.remove(); n.meteoros.splice(j,1);
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
      const a=$('sonidoVictoria'); if(a){a.currentTime=0;a.volume=volumenFinal(.8);a.play().catch(()=>{});}
      mostrarPantalla('pantallaVictoriaNivel3');
    },2100);
  }else{
    $('jefeRestanteNivel3').textContent=Math.max(0,Math.round(n.jefeVida/N3_VIDA_JEFE*100))+'%';
    const t=$('textoDerrotaNivel3'); if(t)t.textContent=motivo||'EL TITÁN IRON TE HA VENCIDO';
    const a=$('sonidoGameOver'); if(a){a.currentTime=0;a.volume=volumenFinal(.8);a.play().catch(()=>{});}
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
    iniciarAjustes();
    iniciarMusicaMenu();
    // Inicio → reglas → capítulo
    alClick("btnPreparado", irAReglas);
    alClick("btnListo", irACapitulo);
    alClick("btnPreparadoCapitulo", nivel1.iniciar);

    alClick("btnNarracion", alternarNarracion);
    alClick("btnOmitirNarracion", () => detenerNarracion(true));

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
        if(e.target?.closest?.("#ajustesJuego")) return;
        if(e.key === "Enter" && !e.repeat && $("pantallaCapitulo")?.classList.contains("activa")){
            const ae = document.activeElement;
            const botonDelCapitulo = ae && $("pantallaCapitulo").contains(ae) && /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(ae.tagName);
            if(!botonDelCapitulo){ e.preventDefault(); alternarVozMision(); return; }
        }
        if(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) || e.code === "Space") e.preventDefault();
        teclas[e.key] = true;
        if(e.code === "Space" && !e.repeat){
            niveles.find(n => n.visible())?.disparar();
        }
    });
    window.addEventListener("keyup", e => { teclas[e.key] = false; });
    window.addEventListener("blur", () => { Object.keys(teclas).forEach(k => teclas[k] = false); nivel3.boton.fuego = false; });
});
