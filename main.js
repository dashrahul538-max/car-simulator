const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const toggleSoundBtn = document.getElementById('toggleSound');
const toggleMusicBtn = document.getElementById('toggleMusic');

let W = 800;
let H = 600;
let running = true;
let gameOver = false;
let score = 0;
let distance = 0;

const player = {w:52, h:84, x:0, y:0, vx:0, speed:0, targetVx:0, angle:0};
const keys = {};

let audioCtx = null;
let engineSource = null;
let engineOsc = null;
let engineGain = null;
let engineFilter = null;
let soundEnabled = true;
let enginePlaying = false;
let engineBuffer = true;
let crashBuffer = null;
let musicEl = null;
let carSprite = null;
let spriteLoaded = false;

<<<<<<< HEAD
let obstacles = [22];
let spawnTimer = 3;
=======
let obstacles = [22];
let spawnTimer = 3;
>>>>>>> 5ade8c9 (render.yaml)
let lastTime = 0;
let colorOffset = 0;

function resize(){
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  W = width;
  H = height;
}

function resetPlayer(){
  player.x = W/2 - player.w/2;
  player.y = H - player.h - 60;
  player.vx = 0;
  player.targetVx = 0;
  player.speed = 4;
  player.angle = 0;
}

function initAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function loadSprite(){
  const img = new Image();
  img.src = 'assets/car.svg';
  img.onload = () => { carSprite = img; spriteLoaded = true; };
  img.onerror = () => { spriteLoaded = false; };
}

async function loadAudioAssets(){
  try{
    if(!audioCtx) initAudio();
    const files = [
      {name:'engine_loop', target:'engineBuffer'},
      {name:'crash', target:'crashBuffer'}
    ];
    for(const item of files){
      const variants = ['mp3','wav'];
      for(const ext of variants){
        try{
          const url = `assets/${item.name}.${ext}`;
          const res = await fetch(url);
          if(!res.ok) continue;
          const buffer = await res.arrayBuffer();
          const decoded = await audioCtx.decodeAudioData(buffer.slice(0));
          if(item.target === 'engineBuffer') engineBuffer = decoded;
          if(item.target === 'crashBuffer') crashBuffer = decoded;
          break;
        }catch(e){ }
      }
    }
    const musicVariants = ['music.mp3','music.wav'];
    for(const file of musicVariants){
      try{
        const url = `assets/${file}`;
        const res = await fetch(url, {method:'HEAD'});
        if(res.ok){
          musicEl = new Audio(url);
          musicEl.loop = true;
          musicEl.preload = 'auto';
          break;
        }
      }catch(e){ }
    }
  }catch(e){
    console.warn('Audio asset load failed', e);
  }
}

function playSound(soundBuffer, options = {}){
  if(!audioCtx || !soundEnabled || !soundBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = soundBuffer;
  const gain = audioCtx.createGain();
  gain.gain.value = options.gain ?? 0.8;
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

function startEngineLoop(){
  if(!audioCtx || !soundEnabled || enginePlaying) return;
  if(engineBuffer){
    engineSource = audioCtx.createBufferSource();
    engineSource.buffer = engineBuffer;
    engineSource.loop = true;
    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 450;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0.001;
    engineSource.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineSource.start();
    enginePlaying = true;
    return;
  }
  engineOsc = audioCtx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineFilter = audioCtx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 450;
  engineGain = audioCtx.createGain();
  engineGain.gain.value = 0.001;
  engineOsc.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(audioCtx.destination);
  engineOsc.start();
  enginePlaying = true;
}

function stopEngineLoop(){
  if(!enginePlaying) return;
  try{
    if(engineSource){ engineSource.stop(); engineSource.disconnect(); engineSource = null; }
    if(engineOsc){ engineOsc.stop(); engineOsc.disconnect(); engineOsc = null; }
  }catch(e){}
  try{ if(engineFilter) engineFilter.disconnect(); }catch(e){}
  try{ if(engineGain) engineGain.disconnect(); }catch(e){}
  engineFilter = engineGain = null;
  enginePlaying = false;
}

function updateEngineSound(speed){
  if(!audioCtx || !soundEnabled || !enginePlaying) return;
  const freq = 120 + speed * 140;
  const gain = 0.02 + (speed - 3) * 0.03;
  try{
    if(engineOsc){
      engineOsc.frequency.linearRampToValueAtTime(Math.max(60, freq), audioCtx.currentTime + 0.05);
    }
    if(engineFilter){
      engineFilter.frequency.linearRampToValueAtTime(340 + speed*180, audioCtx.currentTime + 0.05);
    }
    if(engineGain){
      engineGain.gain.linearRampToValueAtTime(Math.max(0.001, gain), audioCtx.currentTime + 0.05);
    }
  }catch(e){}
}

function playEngineStart(){
  if(!audioCtx || !soundEnabled) return;
  if(crashBuffer){
    playSound(crashBuffer, {gain: 0.5});
    setTimeout(startEngineLoop, 250);
    return;
  }
  const dur = 0.4;
  const sampleCount = Math.floor(audioCtx.sampleRate * dur);
  const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0; i<sampleCount; i++){
    const t = i / sampleCount;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t*5) * (1 - t);
  }
  playSound(buffer, {gain:0.7});
  setTimeout(startEngineLoop, 250);
}

function playCrashSound(){
  if(crashBuffer){
    playSound(crashBuffer, {gain:0.7});
    return;
  }
  if(!audioCtx || !soundEnabled) return;
  const dur = 0.35;
  const sampleCount = Math.floor(audioCtx.sampleRate * dur);
  const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0; i<sampleCount; i++){
    const t = i / sampleCount;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t*6);
  }
  playSound(buffer, {gain:0.7});
}

function update(t){
  if(gameOver) return;
  const left = keys['arrowleft'] || keys['a'] || keys['left'];
  const right = keys['arrowright'] || keys['d'] || keys['right'];
  const forward = keys['arrowup'] || keys['w'] || keys['accelerate'];

  player.targetVx = left ? -7 : right ? 7 : 0;
  player.speed = forward ? 6.8 : 4.2;
  player.vx += (player.targetVx - player.vx) * 0.14;
  if(Math.abs(player.vx) < 0.04) player.vx = 0;
  player.x += player.vx * (player.speed / 4);
  player.x = Math.max(60, Math.min(W - player.w - 60, player.x));
  player.angle = player.vx * 0.18;

  spawnTimer += t;
  if(spawnTimer > 55){
    spawnTimer = 0;
    const w = 60 + Math.random() * 80;
    const h = 30 + Math.random() * 40;
    const x = Math.random() * (W - w - 160) + 80;
    obstacles.push({x, y: -h, w, h, speed: 2 + Math.random() * 2});
  }

  obstacles.forEach(o => { o.y += o.speed * (player.speed / 4) + 1.4; });
  obstacles = obstacles.filter(o => o.y < H + 220);

  const playerRect = {x: player.x, y: player.y, w: player.w, h: player.h};
  if(obstacles.some(o => !(o.x + o.w < playerRect.x || o.x > playerRect.x + playerRect.w || o.y + o.h < playerRect.y || o.y > playerRect.y + playerRect.h))){
    gameOver = true;
    overlay.classList.remove('hidden');
    messageEl.textContent = 'Game Over';
    playCrashSound();
  }

  distance += player.speed * 0.12 * t;
  score = Math.floor(distance);
  scoreEl.textContent = `Score: ${score}`;
  colorOffset += player.speed * 0.8;

  if(!audioCtx) initAudio();
  if(forward){
    if(!enginePlaying) playEngineStart();
  } else if(enginePlaying){
    try{ engineGain.gain.linearRampToValueAtTime(0.0005, audioCtx.currentTime + 0.2); }catch(e){}
    setTimeout(stopEngineLoop, 300);
  }
  updateEngineSound(player.speed);
}

function draw(){
  ctx.clearRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0,0,0,H*0.35);
  sky.addColorStop(0, '#222');
  sky.addColorStop(1, '#444');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,W,H);

  const roadW = Math.min(540, W * 0.65);
  const roadX = W/2 - roadW/2;
  const roadTopW = roadW * 0.66;
  const roadShift = 40;
  const roadLeftTop = W/2 - roadTopW/2;
  const roadRightTop = W/2 + roadTopW/2;
  const roadLeftBottom = roadX + roadShift;
  const roadRightBottom = roadX + roadW - roadShift;

  const roadGrad = ctx.createLinearGradient(0, 0, 0, H);
  roadGrad.addColorStop(0, '#2b2b2b');
  roadGrad.addColorStop(1, '#111');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(roadLeftTop, 0);
  ctx.lineTo(roadRightTop, 0);
  ctx.lineTo(roadRightBottom, H);
  ctx.lineTo(roadLeftBottom, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#555';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(roadLeftTop, 0);
  ctx.lineTo(roadLeftBottom, H);
  ctx.moveTo(roadRightTop, 0);
  ctx.lineTo(roadRightBottom, H);
  ctx.stroke();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  ctx.setLineDash([24, 32]);
  ctx.lineDashOffset = -colorOffset;
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#1a4413';
  ctx.fillRect(0,0,roadX,H);
  ctx.fillRect(roadX+roadW,0,W-roadX-roadW,H);

  ctx.fillStyle = '#b33';
  obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));

  const cx = player.x + player.w/2;
  const shadowY = player.y + player.h - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, shadowY, player.w * 0.6, 10, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, player.y + player.h/2);
  ctx.rotate(player.angle * 0.2);
  if(spriteLoaded && carSprite){
    const scale = Math.min(1, player.w / carSprite.width * 1.1);
    ctx.drawImage(carSprite, -player.w/2, -player.h/2 - 4, player.w, player.h + 8);
  } else {
    ctx.fillStyle = '#0fa';
    ctx.beginPath();
    ctx.moveTo(-player.w/2, player.h/2);
    ctx.lineTo(-player.w*0.4, -player.h/2);
    ctx.lineTo(player.w*0.4, -player.h/2);
    ctx.lineTo(player.w/2, player.h/2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -player.h/2, 0, player.h/2);
    grad.addColorStop(0, '#4ee');
    grad.addColorStop(1, '#0a8');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-player.w*0.22, -player.h/2 + 12, player.w*0.44, player.h*0.18);
  }
  const wheelX = player.w*0.32;
  const wheelY = player.h/2 - 10;
  drawWheel(-wheelX, wheelY, -player.vx * 0.08);
  drawWheel(wheelX, wheelY, -player.vx * 0.08);
  ctx.restore();

  function drawWheel(x, y, rot){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(0,0,10,14,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#777';
    ctx.beginPath(); ctx.ellipse(0,0,5,8,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  if(gameOver){
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,W,H);
  }
}

function loop(timestamp){
  if(!lastTime) lastTime = timestamp;
  const dt = Math.min(40, timestamp - lastTime);
  lastTime = timestamp;
  update(dt / 16);
  draw();
  requestAnimationFrame(loop);
}

function bindControls(){
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  ['left','right','accelerate'].forEach(id => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('touchstart', e => { e.preventDefault(); keys[id] = true; });
    btn.addEventListener('touchend', e => { e.preventDefault(); keys[id] = false; });
    btn.addEventListener('mousedown', () => keys[id] = true);
    btn.addEventListener('mouseup', () => keys[id] = false);
    btn.addEventListener('mouseleave', () => keys[id] = false);
  });

  restartBtn.addEventListener('click', () => {
    gameOver = false;
    overlay.classList.add('hidden');
    obstacles = [];
    distance = 0;
    resetPlayer();
  });

  toggleSoundBtn?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    toggleSoundBtn.textContent = `Sound: ${soundEnabled ? 'On' : 'Off'}`;
    if(!soundEnabled) stopEngineLoop();
  });

  toggleMusicBtn?.addEventListener('click', async () => {
    if(!musicEl){
      musicEl = new Audio('assets/music.wav');
      musicEl.loop = true;
      musicEl.preload = 'auto';
    }
    try{
      if(musicEl.paused){ await musicEl.play(); toggleMusicBtn.textContent = 'Music: On'; }
      else { musicEl.pause(); toggleMusicBtn.textContent = 'Music: Off'; }
    }catch(e){ }
  });

  ['keydown','mousedown','touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      if(!audioCtx) initAudio();
      if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }, {once:true});
  });
}

function init(){
  resize();
  resetPlayer();
  bindControls();
  loadSprite();
  loadAudioAssets();
  requestAnimationFrame(loop);
}

if(document.readyState === 'complete' || document.readyState === 'interactive'){
  init();
} else {
  window.addEventListener('load', init);
}
