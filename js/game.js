// js/game.js

// ——— 0) Start-screen & canvas ——————————————————————————
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');

// Zera os recordes
localStorage.removeItem('bestScore');
localStorage.removeItem('bestTime');


// canvas começa escondido
canvas.style.display = 'none';

startButton.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  canvas.style.display = 'block';
  resetGame();  // zera tudo
  loop();       // dispara o único loop de animação
});

// ——— 1) Sprites ————————————————————————————————————————
const bodyImg       = new Image(); bodyImg.src       = 'img/playerBody.png';
const turretImg     = new Image(); turretImg.src     = 'img/playerTurrent.png';
const enemyImg      = new Image(); enemyImg.src      = 'img/inimigoTank.png';
const crosshairImg  = new Image(); crosshairImg.src  = 'img/crosshair.png';
const crosshairSize = 32;

// ——— 2) Estado global ————————————————————————————————
let bullets      = [];
let enemyBullets = [];
let enemies      = [];
let score        = 0;
let gameOver     = false;

// High-Score / BestTime
let bestScore = Number(localStorage.getItem('bestScore') || 0);
let bestTime  = Number(localStorage.getItem('bestTime')  || 0);

// Temporizadores
const shootInterval       = 300;
let lastShotTime          = Date.now();

const initialSpawnInterval = 1500;
const minSpawnInterval     = 500;
const spawnDecreaseRate    = 5;
let lastSpawnTime         = Date.now();

const initialEnemySpeed   = 2;
const speedIncreaseRate   = 0.02;

// Timer de sobrevivência
let startTime   = Date.now();
let elapsedTime = 0;

// ——— 3) Captura mouse ————————————————————————————————
let mouseX = 0, mouseY = 0;
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouseX = e.clientX - r.left;
  mouseY = e.clientY - r.top;
});

// ——— 4) Jogador —————————————————————————————————————
const player = {
  x:      canvas.width/2  - 20,
  y:      canvas.height/2 - 20,
  width:  40,
  height: 40,
  speed:  3
};

// ——— 5) Teclado ————————————————————————————————————
const keys = {};
document.addEventListener('keydown', e => {
  if ([' ','Spacebar','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  // só reseta o jogo, NÃO mostra start-screen de novo
  if (gameOver && (e.key==='r'||e.key==='R')) {
    resetGame();
    return;
  }
  keys[e.key] = true;
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ——— 6) Colisão AABB ————————————————————————————————
function isColliding(a,b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// ——— 7) Lógica do jogo ——————————————————————————————
function update() {
  const now = Date.now();

  // atualiza o timer
  if (!gameOver) {
    elapsedTime = Math.floor((now - startTime)/1000);
  } else {
    // se estiver em gameOver, não fazemos spawn nem disparos
    return;
  }

  // jogador
  if (keys['ArrowUp']   || keys['w']) player.y -= player.speed;
  if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
  if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
  if (keys['ArrowRight']|| keys['d']) player.x += player.speed;
  player.x = Math.max(0, Math.min(canvas.width - player.width,  player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  // tiro jogador
  if ((keys[' ']||keys['Spacebar']||keys['Space']) && now - lastShotTime > shootInterval) {
    const cx  = player.x + player.width/2;
    const cy  = player.y + player.height/2;
    const ang = Math.atan2(mouseY - cy, mouseX - cx);
    bullets.push({ x:cx, y:cy, angle:ang, speed:7, width:5, height:10 });
    lastShotTime = now;
  }

  // dificuldade dinâmica
  const dynSpawn = Math.max(
    minSpawnInterval,
    initialSpawnInterval - elapsedTime * spawnDecreaseRate
  );
  const speedFac = 1 + elapsedTime * speedIncreaseRate;

  // spawn inimigo
  if (now - lastSpawnTime > dynSpawn) {
    const size = 30;
    enemies.push({
      x: Math.random() * (canvas.width - size),
      y: -size,
      width: size,
      height: size,
      speed: (initialEnemySpeed + Math.random()*1.5) * speedFac,
      lastShotTime: now,
      shootInterval: 2000 + Math.random()*1000
    });
    lastSpawnTime = now;
  }

  // atualiza projéteis do jogador
  bullets.forEach(b => {
    b.x += Math.cos(b.angle)*b.speed;
    b.y += Math.sin(b.angle)*b.speed;
  });

  // inimigos andam e atiram **mirando no jogador**
  enemies.forEach(e => {
    e.y += e.speed;
    if (now - e.lastShotTime > e.shootInterval) {
      const cx    = e.x + e.width/2;
      const cy    = e.y + e.height/2;
      const angle = Math.atan2(
        (player.y + player.height/2) - cy,
        (player.x + player.width/2)  - cx
      );
      enemyBullets.push({
        x:     cx,
        y:     cy,
        angle: angle,
        speed: 5,
        width:  4,
        height: 8
      });
      e.lastShotTime = now;
    }
  });

  // atualiza projéteis inimigos
  enemyBullets.forEach(b => {
    b.x += Math.cos(b.angle)*b.speed;
    b.y += Math.sin(b.angle)*b.speed;
  });

  // colisões
  bullets.forEach((b,bi) => {
    enemies.forEach((e,ei) => {
      if (isColliding(b,e)) {
        bullets.splice(bi,1);
        enemies.splice(ei,1);
        score++;
      }
    });
  });
  enemyBullets.forEach(b => {
    if (isColliding(b, player)) {
      gameOver = true;
      saveRecords();
    }
  });

  // limpar fora da tela
  bullets      = bullets.filter(b => b.x+b.width>0 && b.x<canvas.width && b.y+b.height>0 && b.y<canvas.height);
  enemyBullets = enemyBullets.filter(b => b.x+b.width>0 && b.x<canvas.width && b.y+b.height>0 && b.y<canvas.height);
  enemies      = enemies.filter(e => e.y < canvas.height + e.height);
}

// ——— 8) Render —————————————————————————————————————
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // mira
  ctx.drawImage(crosshairImg, mouseX-crosshairSize/2, mouseY-crosshairSize/2, crosshairSize, crosshairSize);

  // jogador
  ctx.drawImage(bodyImg, player.x, player.y, player.width, player.height);
  const px = player.x + player.width/2;
  const py = player.y + player.height/2;
  const pa = Math.atan2(mouseY - py, mouseX - px) + Math.PI/2;
  ctx.save();
    ctx.translate(px,py);
    ctx.rotate(pa);
    ctx.drawImage(turretImg, -player.width/2, -player.height/2, player.width, player.height);
  ctx.restore();

  // tiros
  ctx.fillStyle = 'yellow';
  bullets.forEach(b => ctx.fillRect(b.x,b.y,b.width,b.height));

  // inimigos
  enemies.forEach(e => ctx.drawImage(enemyImg,e.x,e.y,e.width,e.height));

  // tiros inimigos
  ctx.fillStyle = 'orange';
  enemyBullets.forEach(b => ctx.fillRect(b.x,b.y,b.width,b.height));

  // HUD
  ctx.fillStyle  = '#fff';
  ctx.font       = '20px Arial';
  ctx.textAlign  = 'start';
  ctx.fillText(`Score: ${score}`,         10,  25);
  ctx.fillText(`Time: ${elapsedTime}s`,   10,  50);
  ctx.fillText(`Best Score: ${bestScore}`,10,  75);
  ctx.fillText(`Best Time: ${bestTime}s`, 10, 100);

  // Game Over overlay
  if (gameOver) {
    ctx.fillStyle  = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle  = '#e74c3c';
    ctx.font       = '48px Arial';
    ctx.textAlign  = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
    ctx.font       = '24px Arial';
    ctx.fillStyle  = '#ecf0f1';
    ctx.fillText('Pressione R para reiniciar', canvas.width/2, canvas.height/2 + 30);
  }
}

// ——— 9) Loop principal ————————————————————————————
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ——— 10) Funções auxiliares —————————————————————
function saveRecords() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('bestScore', bestScore);
  }
  if (elapsedTime > bestTime) {
    bestTime = elapsedTime;
    localStorage.setItem('bestTime', bestTime);
  }
}

function resetGame() {
  bullets       = [];
  enemyBullets  = [];
  enemies       = [];
  score         = 0;
  gameOver      = false;
  startTime     = Date.now();
  elapsedTime   = 0;
  lastShotTime  = Date.now();
  lastSpawnTime = Date.now();
}
