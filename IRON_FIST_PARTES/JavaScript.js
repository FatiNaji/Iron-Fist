const $ = (id) => document.getElementById(id);

const inicio = $('inicio');
const reglas = $('reglas');
const nivel1 = $('nivel1');
const btnPreparado = $('btnPreparado');
const btnListo = $('btnListo');
const btnJugar = $('btnJugar');
const btnPausa = $('btnPausa');
const btnReintentar = $('btnReintentar');
const previewPause = $('previewPause');
const audioFondo = $('audioFondo');
const audioPunto = $('audioPunto');
const audioPerdiste = $('audioPerdiste');
const audioGanar = $('audioGanar');
const audioFinal = $('audioFinal');

let tiempo = 60;
let puntaje = 0;
let jugando = false;
let pausado = false;
let temporizador = null;
let generador = null;
let meteoritosActivos = [];

function mostrar(pantalla) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  pantalla.classList.add('activa');
}

function sonido(audio, volumen = 0.7) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.volume = volumen;
  audio.play().catch(() => {});
}

btnPreparado.addEventListener('click', () => {
  mostrar(reglas);
  sonido(audioFondo, 0.18);
});

btnListo.addEventListener('click', () => {
  mostrar(nivel1);
  prepararNivel();
});

previewPause.addEventListener('click', () => {
  previewPause.textContent = previewPause.textContent === 'PAUSAR' ? 'REANUDAR' : 'PAUSAR';
});

function prepararNivel() {
  detenerJuego();
  tiempo = 60;
  puntaje = 0;
  pausado = false;
  $('tiempo').textContent = tiempo;
  $('puntaje').textContent = puntaje;
  $('nivelMensaje').style.display = 'flex';
  $('resultado').classList.remove('mostrar');
  $('meteoritos').innerHTML = '';
}

btnJugar.addEventListener('click', iniciarJuego);

function iniciarJuego() {
  if (jugando) return;
  jugando = true;
  pausado = false;
  $('nivelMensaje').style.display = 'none';
  sonido(audioFondo, 0.2);

  temporizador = setInterval(() => {
    if (pausado) return;
    tiempo--;
    $('tiempo').textContent = tiempo;
    if (tiempo <= 0) terminarJuego(false, 'Se acabó el tiempo.');
  }, 1000);

  generador = setInterval(() => {
    if (!pausado) crearMeteorito();
  }, 850);
}

function crearMeteorito() {
  const zona = $('meteoritos');
  const meteorito = document.createElement('div');
  meteorito.className = 'meteorito-juego';
  meteorito.title = 'Desviar meteorito';

  const y = Math.random() * 75 + 10;
  meteorito.style.left = '12%';
  meteorito.style.top = `${y}%`;

  const destinoX = 78 + Math.random() * 12;
  const duracion = 4200 + Math.random() * 1800;
  zona.appendChild(meteorito);
  meteoritosActivos.push(meteorito);

  let inicioTiempo = performance.now();
  let ultimo = inicioTiempo;
  let x = 12;

  const mover = (ahora) => {
    if (!meteorito.isConnected) return;
    const delta = ahora - ultimo;
    ultimo = ahora;
    if (!pausado) {
      x += (delta / duracion) * (destinoX - 12);
      meteorito.style.left = `${x}%`;
    }
    if (x >= destinoX) {
      meteorito.remove();
      meteoritosActivos = meteoritosActivos.filter(m => m !== meteorito);
      if (!pausado) terminarJuego(false, 'Un meteorito alcanzó la Tierra.');
      return;
    }
    requestAnimationFrame(mover);
  };

  requestAnimationFrame(mover);

  const desviar = () => {
    if (!jugando || pausado || meteorito.dataset.desviado) return;
    meteorito.dataset.desviado = '1';
    puntaje++;
    $('puntaje').textContent = puntaje;
    sonido(audioPunto, 0.45);
    meteorito.animate([
      { transform:'scale(1)', opacity:1 },
      { transform:'scale(1.7) rotate(180deg)', opacity:0 }
    ], {duration:220, easing:'ease-out'});
    setTimeout(() => meteorito.remove(), 200);
    meteoritosActivos = meteoritosActivos.filter(m => m !== meteorito);
    if (puntaje >= 30) terminarJuego(true, '¡Conseguiste los 30 puntos y salvaste la Tierra!');
  };

  meteorito.addEventListener('mouseenter', desviar);
  meteorito.addEventListener('click', desviar);
}

btnPausa.addEventListener('click', () => {
  if (!jugando) return;
  pausado = !pausado;
  btnPausa.textContent = pausado ? 'REANUDAR' : 'PAUSA / REANUDAR';
});

function terminarJuego(gano, mensaje) {
  if (!jugando) return;
  jugando = false;
  clearInterval(temporizador);
  clearInterval(generador);
  temporizador = null;
  generador = null;
  meteoritosActivos.forEach(m => m.remove());
  meteoritosActivos = [];

  $('resultadoTitulo').textContent = gano ? '¡VICTORIA!' : 'GAME OVER';
  $('resultadoTexto').textContent = mensaje;
  $('resultado').classList.add('mostrar');

  if (gano) {
    sonido(audioGanar, 0.8);
    setTimeout(() => sonido(audioFinal, 0.25), 300);
  } else {
    sonido(audioPerdiste, 0.8);
  }
}

function detenerJuego() {
  jugando = false;
  pausado = false;
  clearInterval(temporizador);
  clearInterval(generador);
  temporizador = null;
  generador = null;
  meteoritosActivos.forEach(m => m.remove());
  meteoritosActivos = [];
  if ($('meteoritos')) $('meteoritos').innerHTML = '';
}

btnReintentar.addEventListener('click', () => {
  prepararNivel();
  iniciarJuego();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nivel1.classList.contains('activa') && jugando) {
    pausado = !pausado;
    btnPausa.textContent = pausado ? 'REANUDAR' : 'PAUSA / REANUDAR';
  }
});
