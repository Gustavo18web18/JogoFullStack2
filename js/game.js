// game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Carregamento de sprites
const playerImg = new Image();
playerImg.src = "img/jogadorTank.png";
const enemyImg = new Image();
enemyImg.src = "img/inimigoTank.png";

// Jogador
const player = { x: 380, y: 280, width: 40, height: 40, speed: 3 };

// Controle de teclado
const keys = {};
document.addEventListener('keydown', e => {
  if ([' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  if (gameOver && (e.key === 'r' || e.key === 'R')) {
    // Reiniciar o jogo
    bullets = [];
    enemies = [];
    score = 0;
    gameOver = false;
    lastShotTime = Date.now();
    lastSpawnTime = Date.now();
  }
  keys[e.key] = true;
});
document.addEventListener('keyup', e => {
  keys[e.key] = false;
});

// Estados do jogo
let bullets = [];
let enemies = [];
let score = 0;
let gameOver = false;

const shootInterval = 300;
let lastShotTime = Date.now();
const spawnInterval = 1500;
let lastSpawnTime = Date.now();

// Função de colisão AABB
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function update() {
  if (gameOver) return;

  const now = Date.now();

  // Movimentação do jogador
  if (keys['ArrowUp']  || keys['w']) player.y -= player.speed;
  if (keys['ArrowDown']|| keys['s']) player.y += player.speed;
  if (keys['ArrowLeft']|| keys['a']) player.x -= player.speed;
  if (keys['ArrowRight']|| keys['d']) player.x += player.speed;

  // Disparo
  if ((keys[' '] || keys['Spacebar'] || keys['Space']) && now - lastShotTime > shootInterval) {
    bullets.push({
      x: player.x + player.width / 2 - 2.5,
      y: player.y,
      width: 5,
      height: 10,
      speed: 7
    });
    lastShotTime = now;
  }

  // Limites do jogador na tela
  player.x = Math.max(0, Math.min(canvas.width  - player.width,  player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  // Geração de inimigos
  if (now - lastSpawnTime > spawnInterval) {
    const size = 30;
    enemies.push({
      x: Math.random() * (canvas.width - size),
      y: -size,
      width: size,
      height: size,
      speed: 2 + Math.random() * 1.5
    });
    lastSpawnTime = now;
  }

  // Atualização de posições
  bullets.forEach(b => b.y -= b.speed);
  enemies.forEach(e => e.y += e.speed);

  // Colisões entre tiros e inimigos
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (isColliding(b, e)) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score++;
      }
    });
  });

  // Colisão inimigo vs jogador
  enemies.forEach(e => {
    if (isColliding(e, player)) {
      gameOver = true;
    }
  });

  // Remover objetos fora da tela
  bullets = bullets.filter(b => b.y + b.height > 0);
  enemies = enemies.filter(e => e.y < canvas.height + e.height);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenhar jogador como sprite
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  // Desenhar projéteis
  ctx.fillStyle = 'yellow';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // Desenhar inimigos como sprites
  enemies.forEach(e => {
    ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height);
  });

  // Exibir pontuação
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 10, 25);

  // Tela de game over
  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#e74c3c';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Pressione R para reiniciar', canvas.width / 2, canvas.height / 2 + 30);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
