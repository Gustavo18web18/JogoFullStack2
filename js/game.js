// game.js

// Zera os recordes
localStorage.removeItem('bestScore');
localStorage.removeItem('bestTime');

// 1) Configuração do canvas
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// 2) Carregamento de sprites
const bodyImg       = new Image(); bodyImg.src       = 'img/playerBody.png';
const turretImg     = new Image(); turretImg.src     = 'img/playerTurrent.png';
const enemyImg      = new Image(); enemyImg.src      = 'img/inimigoTank.png';
const crosshairImg  = new Image(); crosshairImg.src  = 'img/crosshair.png';
const crosshairSize = 32;

// 3) Estado do jogo
let bullets       = [];
let enemyBullets  = [];
let enemies       = [];
let score         = 0;
let gameOver      = false;

// 3.1) High-Score / Best Time (carrega de localStorage)
let bestScore = Number(localStorage.getItem('bestScore') || 0);
let bestTime  = Number(localStorage.getItem('bestTime')  || 0);

// 3.2) Temporizadores
const shootInterval    = 300;          // ms entre tiros do jogador
let lastShotTime       = Date.now();
const initialSpawnInterval = 1500;     // intervalo inicial de spawn (ms)
const minSpawnInterval     = 500;      // intervalo mínimo de spawn (ms)
const spawnDecreaseRate    = 5;        // ms que reduz do spawnInterval por segundo
let lastSpawnTime      = Date.now();

const initialEnemySpeed = 2;           // velocidade base inimigos
const speedIncreaseRate = 0.02;        // aumento de velocidade por segundo

// 3.3) Timer de sobrevivência
let startTime    = Date.now();
let elapsedTime  = 0;

// 4) Captura posição do mouse (mira)
let mouseX = 0, mouseY = 0;
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

// 5) Jogador
const player = {
  x:      canvas.width/2  - 20,
  y:      canvas.height/2 - 20,
  width:  40,
  height: 40,
  speed:  3
};

// 6) Controle de teclado
const keys = {};
document.addEventListener('keydown', e => {
  if ([' ','Spacebar','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  if (gameOver && (e.key==='r'||e.key==='R')) {
    // reinicia tudo
    bullets       = [];
    enemyBullets  = [];
    enemies       = [];
    score         = 0;
    gameOver      = false;
    lastShotTime  = Date.now();
    lastSpawnTime = Date.now();
    startTime     = Date.now();
    elapsedTime   = 0;
  }
  keys[e.key] = true;
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// 7) Função de colisão AABB
function isColliding(a,b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// 8) Loop de Lógica
function update() {
  const now = Date.now();

  // 8.0) Atualiza timer (só enquanto vivo)
  if (!gameOver) {
    elapsedTime = Math.floor((now - startTime) / 1000);
  }

  if (gameOver) return;

  // 8.1) Movimentação
  if (keys['ArrowUp']   || keys['w']) player.y -= player.speed;
  if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
  if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
  if (keys['ArrowRight']|| keys['d']) player.x += player.speed;
  // limites
  player.x = Math.max(0, Math.min(canvas.width  - player.width,  player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  // 8.2) Tiro do jogador
  if ((keys[' ']||keys['Spacebar']||keys['Space']) && now - lastShotTime > shootInterval) {
    const cx    = player.x + player.width/2;
    const cy    = player.y + player.height/2;
    const angle = Math.atan2(mouseY - cy, mouseX - cx);
    bullets.push({ x:cx, y:cy, angle, speed:7, width:5, height:10 });
    lastShotTime = now;
  }

  // --- DIFICULDADE DINÂMICA ---
  const dynamicSpawnInterval = Math.max(
    minSpawnInterval,
    initialSpawnInterval - elapsedTime * spawnDecreaseRate
  );
  const speedFactor = 1 + elapsedTime * speedIncreaseRate;

  // 8.3) Spawn de inimigos
  if (now - lastSpawnTime > dynamicSpawnInterval) {
    const size = 30;
    enemies.push({
      x:      Math.random() * (canvas.width - size),
      y:     -size,
      width:  size,
      height: size,
      speed:  (initialEnemySpeed + Math.random() * 1.5) * speedFactor,
      lastShotTime: now,
      shootInterval: 2000 + Math.random() * 1000
    });
    lastSpawnTime = now;
  }

  // 8.4) Atualiza projéteis do jogador e inimigos
  bullets.forEach(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
  });
  enemyBullets.forEach(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
  });
  enemies.forEach(e => {
    e.y += e.speed;
    if (now - e.lastShotTime > e.shootInterval) {
      const cx    = e.x + e.width/2;
      const cy    = e.y + e.height/2;
      const angle = Math.atan2(
        (player.y + player.height/2) - cy,
        (player.x + player.width/2) - cx
      );
      enemyBullets.push({ x:cx, y:cy, angle, speed:5, width:4, height:8 });
      e.lastShotTime = now;
    }
  });

  // 8.5) Colisões: jogador elimina inimigos
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (isColliding(b,e)) {
        bullets.splice(bi,1);
        enemies.splice(ei,1);
        score++;
      }
    });
  });

  // 8.6) Colisões: inimigos atingem jogador
  enemyBullets.forEach(b => {
    if (isColliding(b, player)) {
      gameOver = true;

      // atualiza e salva High-Score / Best Time
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
      }
      if (elapsedTime > bestTime) {
        bestTime = elapsedTime;
        localStorage.setItem('bestTime', bestTime);
      }
    }
  });

  // 8.7) Filtra objetos fora da tela
  bullets      = bullets.filter(b =>
    b.x + b.width  > 0 &&
    b.x            < canvas.width &&
    b.y + b.height > 0 &&
    b.y            < canvas.height
  );
  enemyBullets = enemyBullets.filter(b =>
    b.x + b.width  > 0 &&
    b.x            < canvas.width &&
    b.y + b.height > 0 &&
    b.y            < canvas.height
  );
  enemies      = enemies.filter(e => e.y < canvas.height + e.height);
}

// 9) Loop de Renderização
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // mira
  ctx.drawImage(
    crosshairImg,
    mouseX - crosshairSize/2,
    mouseY - crosshairSize/2,
    crosshairSize,
    crosshairSize
  );

  // jogador
  ctx.drawImage(bodyImg, player.x, player.y, player.width, player.height);
  const cx  = player.x + player.width/2;
  const cy  = player.y + player.height/2;
  const ang = Math.atan2(mouseY - cy, mouseX - cx) + Math.PI/2;
  ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.drawImage(
      turretImg,
      -player.width/2,
      -player.height/2,
      player.width,
      player.height
    );
  ctx.restore();

  // projéteis do jogador
  ctx.fillStyle = 'yellow';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // inimigos
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height));

  // projéteis inimigos
  ctx.fillStyle = 'orange';
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // UI: Score, Time, Best Score e Best Time
  ctx.fillStyle = '#fff';
  ctx.font      = '20px Arial';
  ctx.textAlign = 'start';
  ctx.fillText(`Score: ${score}`,            10, 25);
  ctx.fillText(`Time: ${elapsedTime}s`,      10, 50);
  ctx.fillText(`Best Score: ${bestScore}`,   10, 75);
  ctx.fillText(`Best Time: ${bestTime}s`,    10,100);

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

// 10) Loop principal
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// inicia o jogo
loop();

