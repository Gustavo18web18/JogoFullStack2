// js/game.js

// ===== 0) Setup da UI (start-screen + canvas) =====
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');

// Zera os recordes
localStorage.removeItem('bestScore');
localStorage.removeItem('bestTime');


// canvas começa oculto até clicar em “Começar”
canvas.style.display = 'none';

startButton.addEventListener('click', () => {
  startScreen.classList.add('hidden');  // esconde a start-screen
  canvas.style.display = 'block';       // mostra o canvas
  resetGame();                          // inicializa o estado
  loop();                               // dispara o loop UMA única vez
});

// ===== 1) Carrega sprites =====
const bodyImg       = new Image(); bodyImg.src       = 'img/playerBody.png';
const turretImg     = new Image(); turretImg.src     = 'img/playerTurrent.png';
const enemyImg      = new Image(); enemyImg.src      = 'img/inimigoTank.png';
const crosshairImg  = new Image(); crosshairImg.src  = 'img/crosshair.png';
const crosshairSize = 32;

// ===== 2) Estado global =====
let bullets       = [];
let enemyBullets  = [];
let enemies       = [];
let score         = 0;
let gameOver      = false;

// High-Score / Best Time
let bestScore = Number(localStorage.getItem('bestScore') || 0);
let bestTime  = Number(localStorage.getItem('bestTime')  || 0);

// Temporizadores de tiro e spawn
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

// ===== 3) Captura posição do mouse (mira) =====
let mouseX = 0, mouseY = 0;
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

// ===== 4) Definição do jogador =====
const player = {
  x:      canvas.width/2  - 20,
  y:      canvas.height/2 - 20,
  width:  40,
  height: 40,
  speed:  3
};

// ===== 5) Controle de teclado =====
const keys = {};
document.addEventListener('keydown', e => {
  if ([' ','Spacebar','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  // Reinicia jogo com R (sem voltar à start-screen)
  if (gameOver && (e.key==='r' || e.key==='R')) {
    resetGame();
    return;
  }
  keys[e.key] = true;
});
document.addEventListener('keyup', e => {
  keys[e.key] = false;
});

// ===== 6) Função de colisão AABB =====
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// ===== 7) Lógica do jogo =====
function update() {
  const now = Date.now();

  // 7.1) Atualiza timer de sobrevivência
  if (!gameOver) {
    elapsedTime = Math.floor((now - startTime) / 1000);
  } else {
    return;
  }

  // 7.2) Movimentação do jogador
  if (keys['ArrowUp']   || keys['w']) player.y -= player.speed;
  if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
  if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
  if (keys['ArrowRight']|| keys['d']) player.x += player.speed;
  player.x = Math.max(0, Math.min(canvas.width  - player.width,  player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  // 7.3) Disparo do jogador na direção do mouse
  if ((keys[' ']||keys['Spacebar']||keys['Space']) && now - lastShotTime > shootInterval) {
    const cx    = player.x + player.width/2;
    const cy    = player.y + player.height/2;
    const angle = Math.atan2(mouseY - cy, mouseX - cx);
    bullets.push({ x:cx, y:cy, angle, speed:7, width:5, height:10 });
    lastShotTime = now;
  }

  // 7.4) Dificuldade dinâmica
  const dynSpawn = Math.max(
    minSpawnInterval,
    initialSpawnInterval - elapsedTime * spawnDecreaseRate
  );
  const speedFac = 1 + elapsedTime * speedIncreaseRate;

  // 7.5) Spawn de inimigos com delay inicial aleatório
  if (now - lastSpawnTime > dynSpawn) {
    const size      = 30;
    const interval  = 2000 + Math.random()*1000;
    const initDelay = Math.random() * interval;
    enemies.push({
      x:             Math.random() * (canvas.width - size),
      y:             -size,
      width:         size,
      height:        size,
      speed:         (initialEnemySpeed + Math.random()*1.5) * speedFac,
      shootInterval: interval,
      lastShotTime:  now - initDelay
    });
    lastSpawnTime = now;
  }

  // 7.6) Atualiza projéteis do jogador
  bullets.forEach(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
  });

  // 7.7) Inimigos se movem e disparam mirando no jogador
  enemies.forEach(e => {
    e.y += e.speed;
    if (now - e.lastShotTime > e.shootInterval) {
      const cx    = e.x + e.width/2;
      const cy    = e.y + e.height/2;
      const ang   = Math.atan2(
        (player.y + player.height/2) - cy,
        (player.x + player.width/2)  - cx
      );
      enemyBullets.push({ x:cx, y:cy, angle:ang, speed:5, width:4, height:8 });
      e.lastShotTime = now;
    }
  });

  // 7.8) Atualiza projéteis inimigos
  enemyBullets.forEach(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
  });

  // 7.9) Colisões: projétil jogador ↔ inimigo
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (isColliding(b, e)) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score++;
      }
    });
  });

  // 7.10) Colisão morte instantânea: inimigo ↔ jogador
  enemies.forEach(e => {
    if (isColliding(e, player)) {
      gameOver = true;
      saveRecords();
    }
  });

  // 7.11) Colisão projétil inimigo ↔ jogador
  enemyBullets.forEach(b => {
    if (isColliding(b, player)) {
      gameOver = true;
      saveRecords();
    }
  });

  // 7.12) Remove objetos fora da tela
  bullets      = bullets.filter(b => b.x + b.width  > 0 && b.x < canvas.width  && b.y + b.height > 0 && b.y < canvas.height);
  enemyBullets = enemyBullets.filter(b => b.x + b.width > 0 && b.x < canvas.width  && b.y + b.height > 0 && b.y < canvas.height);
  enemies      = enemies.filter(e => e.y < canvas.height + e.height);
}

// ===== 8) Renderização =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // mira
  ctx.drawImage(crosshairImg, mouseX - crosshairSize/2, mouseY - crosshairSize/2, crosshairSize, crosshairSize);

  // jogador (corpo + torre)
  ctx.drawImage(bodyImg, player.x, player.y, player.width, player.height);
  const px  = player.x + player.width/2;
  const py  = player.y + player.height/2;
  const pa  = Math.atan2(mouseY - py, mouseX - px) + Math.PI/2;
  ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pa);
    ctx.drawImage(turretImg, -player.width/2, -player.height/2, player.width, player.height);
  ctx.restore();

  // projéteis do jogador
  ctx.fillStyle = 'yellow';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // inimigos
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height));

  // projéteis inimigos
  ctx.fillStyle = 'orange';
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

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
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e74c3c';
    ctx.font      = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
    ctx.font      = '24px Arial';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Pressione R para reiniciar', canvas.width/2, canvas.height/2 + 30);
  }
}

// ===== 9) Loop principal =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ===== 10) Funções auxiliares =====
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
