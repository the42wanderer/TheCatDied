const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const panel = document.getElementById('panel');

const state = {
  keys: new Set(),
  mouse: { x: canvas.width / 2, y: canvas.height / 2, down: false },
  time: 0,
  score: 0,
  wave: 1,
  pausedForUpgrade: false,
  gameOver: false,
  player: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    r: 18,
    hp: 100,
    maxHp: 100,
    speed: 190,
    fireRate: 0.28,
    bulletSpeed: 460,
    bulletDamage: 20,
    spread: 0,
    lastShot: 0,
    dashCd: 1.3,
    dashTimer: 0,
    invuln: 0,
  },
  bullets: [],
  cats: [],
  particles: [],
};

const upgrades = [
  { name: 'Triple Thorn', desc: 'Shoot 2 extra thorns (+spread).', apply: p => p.spread += 0.17 },
  { name: 'Fast Trigger', desc: 'Shoot 20% faster.', apply: p => p.fireRate *= 0.8 },
  { name: 'Saguaro Legs', desc: '+15% movement speed.', apply: p => p.speed *= 1.15 },
  { name: 'Spicy Needles', desc: '+8 bullet damage.', apply: p => p.bulletDamage += 8 },
  { name: 'Desert Sunscreen', desc: '+25 max HP and heal 25.', apply: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function spawnCat() {
  const side = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (side === 0) { x = -30; y = rand(0, canvas.height); }
  if (side === 1) { x = canvas.width + 30; y = rand(0, canvas.height); }
  if (side === 2) { x = rand(0, canvas.width); y = -30; }
  if (side === 3) { x = rand(0, canvas.width); y = canvas.height + 30; }
  const type = Math.random();
  const cat = { x, y, hp: 40 + state.wave * 8, r: 16, speed: 72 + state.wave * 5, color: '#f2f2f2', damage: 11 };
  if (type > 0.75) { cat.hp *= 1.9; cat.r = 23; cat.speed *= 0.7; cat.color = '#ffd0a8'; cat.damage = 19; }
  if (type < 0.18) { cat.hp *= 0.8; cat.r = 12; cat.speed *= 1.6; cat.color = '#a2dbff'; cat.damage = 8; }
  state.cats.push(cat);
}

function shoot() {
  const p = state.player;
  if (state.time - p.lastShot < p.fireRate) return;
  p.lastShot = state.time;
  const angle = Math.atan2(state.mouse.y - p.y, state.mouse.x - p.x);
  const lanes = p.spread > 0 ? [0, -p.spread, p.spread] : [0];
  for (const offset of lanes) {
    const a = angle + offset;
    state.bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * p.bulletSpeed, vy: Math.sin(a) * p.bulletSpeed, r: 4, life: 1.2, dmg: p.bulletDamage });
  }
}

function chooseUpgrades() {
  state.pausedForUpgrade = true;
  panel.innerHTML = '<strong>Pick an upgrade 🤠</strong>';
  const picks = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
  picks.forEach(up => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerHTML = `<strong>${up.name}</strong><br/><small>${up.desc}</small>`;
    btn.onclick = () => {
      up.apply(state.player);
      state.pausedForUpgrade = false;
      panel.textContent = `You picked: ${up.name}. Shootin' resumes.`;
    };
    panel.appendChild(btn);
  });
}

function restart() {
  Object.assign(state, {
    time: 0,
    score: 0,
    wave: 1,
    pausedForUpgrade: false,
    gameOver: false,
    bullets: [],
    cats: [],
    particles: [],
  });
  Object.assign(state.player, {
    x: canvas.width / 2, y: canvas.height / 2, hp: 100, maxHp: 100, speed: 190,
    fireRate: 0.28, bulletSpeed: 460, bulletDamage: 20, spread: 0, lastShot: 0,
    dashCd: 1.3, dashTimer: 0, invuln: 0,
  });
  panel.textContent = 'Survive waves of chaotic cats. First upgrade at 20 points.';
}

function update(dt) {
  if (state.pausedForUpgrade || state.gameOver) return;
  state.time += dt;
  const p = state.player;

  let dx = 0, dy = 0;
  if (state.keys.has('w') || state.keys.has('arrowup')) dy -= 1;
  if (state.keys.has('s') || state.keys.has('arrowdown')) dy += 1;
  if (state.keys.has('a') || state.keys.has('arrowleft')) dx -= 1;
  if (state.keys.has('d') || state.keys.has('arrowright')) dx += 1;
  if (dx || dy) {
    const mag = Math.hypot(dx, dy);
    p.x += (dx / mag) * p.speed * dt;
    p.y += (dy / mag) * p.speed * dt;
  }

  if ((state.keys.has('shift') || state.keys.has('shiftleft')) && state.time - p.dashTimer > p.dashCd) {
    p.dashTimer = state.time;
    p.invuln = 0.2;
    const a = Math.atan2(state.mouse.y - p.y, state.mouse.x - p.x);
    p.x += Math.cos(a) * 90;
    p.y += Math.sin(a) * 90;
  }

  p.invuln = Math.max(0, p.invuln - dt);
  p.x = Math.max(p.r, Math.min(canvas.width - p.r, p.x));
  p.y = Math.max(p.r, Math.min(canvas.height - p.r, p.y));

  if (state.mouse.down || state.keys.has(' ')) shoot();

  if (state.cats.length < 4 + state.wave * 2) spawnCat();

  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter(b => b.life > 0 && b.x > -20 && b.y > -20 && b.x < canvas.width + 20 && b.y < canvas.height + 20);

  for (const cat of state.cats) {
    const a = Math.atan2(p.y - cat.y, p.x - cat.x);
    cat.x += Math.cos(a) * cat.speed * dt;
    cat.y += Math.sin(a) * cat.speed * dt;
    if (dist(cat, p) < cat.r + p.r && p.invuln <= 0) {
      p.hp -= cat.damage * dt * 2.5;
    }
  }

  for (const b of state.bullets) {
    for (const cat of state.cats) {
      if (dist(b, cat) < b.r + cat.r) {
        cat.hp -= b.dmg;
        b.life = 0;
        for (let i = 0; i < 3; i++) state.particles.push({ x: cat.x, y: cat.y, vx: rand(-60, 60), vy: rand(-60, 60), life: 0.3 });
      }
    }
  }

  const before = state.cats.length;
  state.cats = state.cats.filter(c => c.hp > 0);
  const kills = before - state.cats.length;
  if (kills > 0) {
    state.score += kills;
    if (state.score % 20 === 0) {
      state.wave += 1;
      chooseUpgrades();
    }
  }

  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter(pt => pt.life > 0);

  if (p.hp <= 0) {
    state.gameOver = true;
    panel.innerHTML = `<span class='dead'><strong>You got overrun by cats.</strong></span><br/>Score: ${state.score}<br/><button class='option' id='retry'>Try another run</button>`;
    document.getElementById('retry').onclick = restart;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // dust streaks
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = i % 2 ? '#b28745' : '#c89a50';
    ctx.fillRect((i * 67 + state.time * 25) % (canvas.width + 80) - 40, (i * 33) % canvas.height, 30, 2);
  }

  // bullets
  ctx.fillStyle = '#5e3f19';
  for (const b of state.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }

  // cats
  for (const cat of state.cats) {
    ctx.fillStyle = cat.color;
    ctx.beginPath(); ctx.arc(cat.x, cat.y, cat.r, 0, Math.PI * 2); ctx.fill();
    // ears
    ctx.beginPath();
    ctx.moveTo(cat.x - cat.r * 0.6, cat.y - cat.r * 0.2);
    ctx.lineTo(cat.x - cat.r * 0.2, cat.y - cat.r * 1.2);
    ctx.lineTo(cat.x, cat.y - cat.r * 0.3);
    ctx.moveTo(cat.x + cat.r * 0.6, cat.y - cat.r * 0.2);
    ctx.lineTo(cat.x + cat.r * 0.2, cat.y - cat.r * 1.2);
    ctx.lineTo(cat.x, cat.y - cat.r * 0.3);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(cat.x - cat.r * 0.3, cat.y - 1, 2, 0, Math.PI * 2); ctx.arc(cat.x + cat.r * 0.3, cat.y - 1, 2, 0, Math.PI * 2); ctx.fill();
  }

  // player cactus
  const p = state.player;
  ctx.fillStyle = p.invuln > 0 ? '#77ff9e' : '#43d17f';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.r * 0.9, p.r * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(p.x - 3, p.y - p.r * 1.6, 6, 16); // hat stem
  ctx.fillRect(p.x - 15, p.y - p.r * 1.45, 30, 5); // hat brim
  ctx.fillStyle = '#2d2d2d';
  const gunAngle = Math.atan2(state.mouse.y - p.y, state.mouse.x - p.x);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(gunAngle);
  ctx.fillRect(5, -3, 18, 6);
  ctx.restore();

  for (const pt of state.particles) {
    ctx.fillStyle = `rgba(255,255,255,${pt.life * 2})`;
    ctx.fillRect(pt.x, pt.y, 2, 2);
  }

  statsEl.textContent = `HP ${Math.max(0, p.hp | 0)}/${p.maxHp} • Score ${state.score} • Wave ${state.wave}`;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => state.keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => state.keys.delete(e.key.toLowerCase()));
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
  state.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
});
canvas.addEventListener('mousedown', () => state.mouse.down = true);
window.addEventListener('mouseup', () => state.mouse.down = false);

restart();
requestAnimationFrame(frame);
