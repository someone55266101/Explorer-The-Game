const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverText = document.getElementById('game-over-text');
const instructionText = document.getElementById('instruction');

// 画像アセットの読み込み
const images = {};
const imageSources = {
    player: 'image/player_sprite.png',
    block: 'image/ruin_block.png',
    boulder: 'image/rolling_boulder.png',
    treasure: 'image/treasure_chest.png'
};

let imagesLoaded = 0;
for (let key in imageSources) {
    images[key] = new Image();
    images[key].src = imageSources[key];
    images[key].onload = () => {
        imagesLoaded++;
        if (imagesLoaded === Object.keys(imageSources).length) {
            initPlatforms();
            requestAnimationFrame(gameLoop);
        }
    };
}

const TILE_SIZE = 40;
let platforms = [];
let boulderTrap = null; // 大岩オブジェクト

function initPlatforms() {
    boulderTrap = {
        active: false,
        x: 3100,
        y: 100,
        radius: 60,
        vx: 0,
        vy: 0,
        rotation: 0
    };

    platforms = [
        // 1. スタートと穴飛び越えエリア (x: 0 ~ 1400)
        { x: 0, y: 400, w: 800, h: 80, type: 'ground' },
        // x: 800 ~ 950 は穴
        { x: 950, y: 400, w: 200, h: 80, type: 'ground' },
        // x: 1150 ~ 1300 は穴
        { x: 1300, y: 400, w: 300, h: 80, type: 'ground' },

        // 2. 崩れる床とトゲエリア (x: 1600 ~ 2100)
        { x: 1600, y: 460, w: 500, h: 20, type: 'spike' },
        { x: 1700, y: 360, w: 80, h: 20, type: 'crumble', active: false, timer: 0 },
        { x: 1900, y: 360, w: 80, h: 20, type: 'crumble', active: false, timer: 0 },
        { x: 2100, y: 400, w: 300, h: 80, type: 'ground' },

        // 3. 高さが異なる空中の足場エリア (x: 2400 ~ 3000)
        { x: 2450, y: 300, w: 80, h: 20, type: 'ground' },
        { x: 2600, y: 170, w: 80, h: 20, type: 'ground' },
        { x: 2850, y: 250, w: 80, h: 20, type: 'ground' },
        { x: 3000, y: 400, w: 800, h: 80, type: 'ground' },

        // 4. 転がる岩に追いかけられるエリア (x: 3800 ~ 4400)
        // 岩は x=3300 で起動し、x=3100から追ってくる (上のground)
        // x: 3800 ~ 4000 は大きな穴。岩は落ちる。
        { x: 3980, y: 400, w: 280, h: 80, type: 'ground' },

        // 5. 崖と宙に浮いた「崩れる床」エリア (x: 4300 ~ 4800)
        { x: 4350, y: 250, w: 40, h: 20, type: 'ground' },
        { x: 4500, y: 200, w: 80, h: 20, type: 'crumble', active: false, timer: 0 },
        { x: 4700, y: 170, w: 80, h: 20, type: 'crumble', active: false, timer: 0 },
        { x: 4900, y: 280, w: 40, h: 20, type: 'ground' },
        { x: 5000, y: 400, w: 250, h: 80, type: 'ground' },

        // 6. ゴール（宝箱）と手前の連続崩れる床 (x: 4900 ~ 5300)
        { x: 5250, y: 460, w: 360, h: 20, type: 'spike' },
        { x: 5250, y: 400, w: 80, h: 20, type: 'crumble', active: false, timer: 0 },
        { x: 5330, y: 400, w: 80, h: 20, type: 'crumble', active: false, timer: 0 },
        { x: 5410, y: 400, w: 100, h: 20, type: 'crumble', active: false, timer: 0 },
        { x: 5510, y: 400, w: 100, h: 20, type: 'crumble', active: false, timer: 0 },

        { x: 5610, y: 400, w: 200, h: 80, type: 'ground' },
        { x: 5760, y: 360, w: 64, h: 60, type: 'goal' }
    ];
}

// BGMの初期化
const bgm = new Audio('music/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.2;

let gameState = 'title'; // 'title', 'playing'
let startTime = 0;
let isTimerRunning = false;
let timerDisplay = document.getElementById('timer-display');

function startGame() {
    if (gameState !== 'title') return;
    gameState = 'playing';
    const titleScreen = document.getElementById('title-screen');
    if (titleScreen) titleScreen.classList.add('hidden');
    bgm.play().catch(err => console.log("BGM再生エラー:", err));

    isTimerRunning = true;
    startTime = Date.now();

}

// マウスクリックでのゲーム開始
document.addEventListener('mousedown', () => {
    if (gameState === 'title') startGame();
});

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false,
    SpaceJustPressed: false
};

function setupVirtualPad() {
    const padLeft = document.getElementById('pad-left');
    const padRight = document.getElementById('pad-right');
    const padJump = document.getElementById('pad-jump');

    if (!padLeft) return;

    const bindTouch = (btn, code) => {
        const setKey = (isDown) => {
            if (gameState === 'title' && isDown) startGame();
            if (code === 'Space') {
                if (isDown && !keys.Space) keys.SpaceJustPressed = true;
            }
            keys[code] = isDown;
        };

        btn.addEventListener('touchstart', (e) => { e.preventDefault(); setKey(true); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); setKey(false); });
        // マウス検証用
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); setKey(true); });
        btn.addEventListener('mouseup', () => setKey(false));
        btn.addEventListener('mouseleave', () => setKey(false));
    };

    bindTouch(padLeft, 'ArrowLeft');
    bindTouch(padRight, 'ArrowRight');
    bindTouch(padJump, 'Space');
}
setupVirtualPad();

window.addEventListener('keydown', (e) => {
    if (gameState === 'title') {
        startGame();
        return;
    }

    if (e.code === 'Space') {
        if (!keys.Space) keys.SpaceJustPressed = true;
        keys.Space = true;
    } else if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    if (e.code === 'Space') keys.Space = false;
});

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        // 操作感調整
        this.maxSpeed = 3;
        this.acceleration = 0.5;
        this.friction = 0.8;
        this.jumpPower = -11; // 浮遊感のための調整
        this.gravity = 0.4;   // 落下をゆっくりに

        this.isGrounded = false;
        this.facingRight = true;
        this.dead = false;
        this.goal = false;

        // アニメーション用プロパティ
        this.spriteWidth = 40;   // スプライト1枚の幅
        this.spriteHeight = 40;  // スプライト1枚の高さ
        this.currentFrame = 0;   // 現在表示するスプライトシート上のフレーム番号 (0-4)
        this.animTick = 0;       // アニメーションカウンタ
        this.animSpeed = 12;      // 何フレームごとにアニメーションを切り替えるか
        this.walkPattern = [1, 2, 3, 2]; // 移動アニメーションの順序
        this.walkPatternIndex = 0;       // 移動パターン内の現在位置
    }

    update() {
        if (this.dead) {
            // 死んだ時は物理演算のみ（落下演出）
            this.vy += this.gravity;
            this.y += this.vy;
            return;
        }

        if (this.goal) {
            // ゴール時：小さくジャンプを繰り返して喜びを表現
            this.vx = 0;
            this.vy += this.gravity;
            this.y += this.vy;

            // 地面との当たり判定を維持
            for (let p of platforms) {
                if (p.isDestroyed) continue;
                if (p.type === 'slope' || p.type === 'spike') continue;
                if (this.isColliding(p) && this.vy > 0) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    // 着地したら再度小さくジャンプ
                    this.vy = -5;
                }
            }

            this.updateAnimation();
            return;
        }

        // 左右移動（慣性あり）
        if (keys['ArrowLeft']) {
            this.vx -= this.acceleration;
            this.facingRight = false;
        } else if (keys['ArrowRight']) {
            this.vx += this.acceleration;
            this.facingRight = true;
        } else {
            // スティックを離したら摩擦で減速
            this.vx *= this.friction;
        }

        // 最高速度の制限
        if (this.vx > this.maxSpeed) this.vx = this.maxSpeed;
        if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;
        if (Math.abs(this.vx) < 0.1) this.vx = 0; // 完全停止

        // ジャンプ (JustPressedで押しっぱなしジャンプ防止)
        if (keys.SpaceJustPressed && this.isGrounded) {
            this.vy = this.jumpPower;
            this.isGrounded = false;
        }
        keys.SpaceJustPressed = false; // フラグ消費

        // 重力
        this.vy += this.gravity;
        if (this.vy > 12) this.vy = 12;

        // X軸移動と当たり判定
        this.x += this.vx;
        this.checkCollisionX();

        // Y軸移動と当たり判定
        this.y += this.vy;
        this.isGrounded = false;
        this.checkCollisionY();

        // 落下判定
        if (this.y > canvas.height + 200) {
            this.die();
        }

        // 大岩のトリガー
        if (this.x > 3300 && !boulderTrap.active) {
            boulderTrap.active = true;
        }

        // アニメーションフレームの更新
        this.updateAnimation();
    }

    updateAnimation() {
        if (!this.isGrounded) {
            // 空中：ジャンプフレーム
            this.currentFrame = 4;
            this.walkPatternIndex = 0;
            this.animTick = 0;
        } else if (Math.abs(this.vx) > 0.5) {
            // 地上＆移動中：歩行アニメーション
            this.animTick++;
            if (this.animTick >= this.animSpeed) {
                this.animTick = 0;
                this.walkPatternIndex = (this.walkPatternIndex + 1) % this.walkPattern.length;
            }
            this.currentFrame = this.walkPattern[this.walkPatternIndex];
        } else {
            // 地上＆停止中：立ちフレーム
            this.currentFrame = 0;
            this.walkPatternIndex = 0;
            this.animTick = 0;
        }
    }

    die() {
        if (this.dead) return;
        this.dead = true;
        this.vy = -8;
        this.vx = 0;
        setTimeout(resetGame, 1500);
    }

    checkCollisionX() {
        for (let p of platforms) {
            if (p.isDestroyed || p.type === 'slope') continue;

            if (this.isColliding(p)) {
                // 坂道と平面のつなぎ目など、足元付近のわずかな引っかかり（段差）は無視して乗れるようにする
                let overlapY = (this.y + this.height) - p.y;
                if (overlapY > 0 && overlapY <= 20 && this.vy >= 0) {
                    continue;
                }

                if (p.type === 'spike') {
                    this.die(); return;
                }
                if (p.type === 'goal') {
                    this.goal = true; showGoalText(); return;
                }
                if (this.vx > 0) this.x = p.x - this.width;
                else if (this.vx < 0) this.x = p.x + p.w;
                this.vx = 0;
            }
        }
    }

    checkCollisionY() {
        for (let p of platforms) {
            if (p.isDestroyed) continue;

            // 坂道の判定
            if (p.type === 'slope') {
                // Xが坂道の範囲内にあるか
                let px = this.x + this.width / 2; // プレイヤーの中心
                if (px > p.x && px < p.x + p.w) {
                    let relativeX = (px - p.x) / p.w;
                    let slopeY;
                    if (p.direction === 'right') slopeY = p.y + p.h - relativeX * p.h; // 右上がり
                    else slopeY = p.y + relativeX * p.h; // 左上がり (下り坂)

                    // プレイヤーの足元が坂道の線上（付近）にあるか
                    let footY = this.y + this.height;
                    // 下降中であり、足の高さが斜面の少し上から下に突き抜けた場合
                    if (this.vy >= 0 && footY >= slopeY - 15 && footY <= p.y + p.h + 20) {
                        this.y = slopeY - this.height;
                        this.vy = 0;
                        this.isGrounded = true;
                    }
                }
                continue;
            }

            if (this.isColliding(p)) {
                if (p.type === 'spike') {
                    this.die(); return;
                }
                if (p.type === 'goal') {
                    this.goal = true; showGoalText(); return;
                }

                if (this.vy > 0) {
                    this.y = p.y - this.height;
                    this.isGrounded = true;
                    this.vy = 0;
                    if (p.type === 'crumble' && !p.active) {
                        p.active = true;
                        p.timer = 15; // ガタガタ時間を短く
                    }
                }
                else if (this.vy < 0) {
                    this.y = p.y + p.h;
                    this.vy = 0;
                }
            }
        }
    }

    isColliding(rect) {
        return (
            this.x < rect.x + rect.w &&
            this.x + this.width > rect.x &&
            this.y < rect.y + rect.h &&
            this.y + this.height > rect.y
        );
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;
        const drawY = this.y;

        ctx.save();
        if (this.dead) {
            ctx.translate(drawX + this.width / 2, drawY + this.height / 2);
            ctx.rotate(Math.PI);
            ctx.translate(-(drawX + this.width / 2), -(drawY + this.height / 2));
        }

        // 左向きの場合は水平反転
        if (!this.facingRight) {
            ctx.translate(drawX + this.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(drawX + this.width / 2), 0);
        }

        // スプライトシートから該当フレームを切り出して描画
        const sx = this.currentFrame * this.spriteWidth;
        ctx.drawImage(
            images.player,
            sx, 0, this.spriteWidth, this.spriteHeight,  // ソース領域
            drawX, drawY, this.width, this.height         // 描画先
        );

        ctx.restore();
    }
}

let player = new Player(50, 200);
let cameraX = 0;

function resetGame() {
    initPlatforms();
    player = new Player(50, 200);
    gameOverText.classList.add('hidden');
    gameOverText.innerText = "TREASURE FOUND!";
    instructionText.innerText = "十字キー(左右)で移動、SPACEキーでジャンプ";
    //startTime = Date.now();
    isTimerRunning = true;
}

function showGoalText() {
    isTimerRunning = false;
    const finalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    gameOverText.innerText = `TIME: ${finalElapsed}s\nTREASURE FOUND!`;
    gameOverText.classList.remove('hidden');
    instructionText.innerText = "リロードしてもう一度遊ぶ";
}

function updateGameObjects() {
    // 崩れる床
    for (let p of platforms) {
        if (p.type === 'crumble' && p.active) {
            p.timer--;
            if (p.timer <= 0) p.isDestroyed = true;
        }
    }

    // 大岩
    if (boulderTrap.active) {
        boulderTrap.vy += 0.4; // 重力
        boulderTrap.vx += 0.05; // 転がって加速
        if (boulderTrap.vx > 8) boulderTrap.vx = 8;

        boulderTrap.x += boulderTrap.vx;
        boulderTrap.y += boulderTrap.vy;
        boulderTrap.rotation += boulderTrap.vx * 0.05; // 回転

        // 大岩のY軸床判定（坂道は面倒なので地面のみとするか簡略化）
        for (let p of platforms) {
            if (p.type === 'ground' || p.type === 'slope') {
                let checkY = p.y;
                if (p.type === 'slope') {
                    if (boulderTrap.x > p.x && boulderTrap.x < p.x + p.w) {
                        let relativeX = (boulderTrap.x - p.x) / p.w;
                        if (p.direction === 'right') checkY = p.y + p.h - relativeX * p.h;
                        else checkY = p.y + relativeX * p.h;
                    } else continue;
                }
                // 岩の中心が床より上で、底面が床に触れたら（落下時のワープを防ぐ）
                if (boulderTrap.vy >= 0 && boulderTrap.y < checkY && boulderTrap.y + boulderTrap.radius > checkY && boulderTrap.x > p.x && boulderTrap.x < p.x + p.w) {
                    boulderTrap.y = checkY - boulderTrap.radius;
                    boulderTrap.vy = 0;
                }
            }
        }

        // プレイヤーと大岩の当たり判定 (円と矩形)
        let cx = player.x + player.width / 2;
        let cy = player.y + player.height / 2;
        let distSq = (cx - boulderTrap.x) ** 2 + (cy - boulderTrap.y) ** 2;
        if (distSq < (boulderTrap.radius + player.width / 2 - 10) ** 2) {
            player.die();
        }
    }
}

function drawBackground(cameraX) {
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlatforms(cameraX) {
    // ブロック画像のサイズとトリミング設定
    const imgW = images.block.naturalWidth;
    const imgH = images.block.naturalHeight;
    // 画像端の空白を除く内側領域（マージン分を切り取る）
    const margin = 4; // 空白の幅（px）。画像に合わせて調整
    const srcX = margin;
    const srcY = margin;
    const srcW = imgW - margin * 2;
    const srcH = imgH - margin * 2;

    for (let p of platforms) {
        if (p.isDestroyed) continue;
        const drawX = p.x - cameraX;

        // 画面外カリング (スロープは幅が広いことがあるので+100)
        if (drawX + p.w < -100 || drawX > canvas.width + 100) continue;

        ctx.save();
        if (p.type === 'crumble' && p.active) {
            ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);
        }

        if (p.type === 'ground' || p.type === 'block') {
            // ブロック画像を1枚ずつタイル状に描画（端でクリッピング）
            const cols = Math.ceil(p.w / TILE_SIZE);
            const rows = Math.ceil(p.h / TILE_SIZE);
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const tx = drawX + col * TILE_SIZE;
                    const ty = p.y + row * TILE_SIZE;
                    // プラットフォーム端でタイルをクリップ
                    const drawW = Math.min(TILE_SIZE, p.w - col * TILE_SIZE);
                    const drawH = Math.min(TILE_SIZE, p.h - row * TILE_SIZE);
                    const clippedSrcW = srcW * (drawW / TILE_SIZE);
                    const clippedSrcH = srcH * (drawH / TILE_SIZE);
                    ctx.drawImage(images.block, srcX, srcY, clippedSrcW, clippedSrcH, tx, ty, drawW, drawH);
                }
            }
            ctx.strokeStyle = "#000";
            ctx.strokeRect(drawX, p.y, p.w, p.h);
        } else if (p.type === 'crumble') {
            // 崩れる床：画像を使わずCanvas描画
            const crumbleAlpha = p.active ? 0.6 : 1.0;
            ctx.globalAlpha = crumbleAlpha;

            // 背景（レンガ風の薄い茶色）
            ctx.fillStyle = p.active ? '#8B4513' : '#A0522D';
            ctx.fillRect(drawX, p.y, p.w, p.h);

            // レンガ模様
            ctx.strokeStyle = '#3E1A00';
            ctx.lineWidth = 1;
            const brickW = 30;
            const brickH = p.h / 2;
            for (let row = 0; row < 2; row++) {
                const offsetX = row % 2 === 0 ? 0 : brickW / 2;
                for (let bx = -offsetX; bx < p.w; bx += brickW) {
                    const x1 = Math.max(0, bx);
                    const x2 = Math.min(p.w, bx + brickW);
                    if (x2 > x1) {
                        ctx.strokeRect(drawX + x1, p.y + row * brickH, x2 - x1, brickH);
                    }
                }
            }

            // ひび割れ線
            ctx.strokeStyle = '#1A0A00';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // ひび割れパターン1
            ctx.moveTo(drawX + p.w * 0.2, p.y);
            ctx.lineTo(drawX + p.w * 0.35, p.y + p.h * 0.6);
            ctx.lineTo(drawX + p.w * 0.25, p.y + p.h);
            // ひび割れパターン2
            ctx.moveTo(drawX + p.w * 0.6, p.y);
            ctx.lineTo(drawX + p.w * 0.7, p.y + p.h * 0.4);
            ctx.lineTo(drawX + p.w * 0.55, p.y + p.h);
            // ひび割れパターン3（横方向）
            ctx.moveTo(drawX + p.w * 0.1, p.y + p.h * 0.5);
            ctx.lineTo(drawX + p.w * 0.9, p.y + p.h * 0.45);
            ctx.stroke();

            // 崩壊予兆の警告表示
            if (p.active) {
                ctx.strokeStyle = '#FF4444';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(drawX, p.y, p.w, p.h);
                ctx.setLineDash([]);
            } else {
                // 通常時の枠線
                ctx.strokeStyle = '#2A0E00';
                ctx.lineWidth = 1;
                ctx.strokeRect(drawX, p.y, p.w, p.h);
            }

            ctx.globalAlpha = 1.0;
        } else if (p.type === 'slope') {
            // スロープの描画：クリップパスでポリゴン形状に切り取ってタイル描画
            ctx.beginPath();
            if (p.direction === 'right') {
                ctx.moveTo(drawX, p.y + p.h);
                ctx.lineTo(drawX + p.w, p.y);
                ctx.lineTo(drawX + p.w, p.y + p.h);
            } else {
                ctx.moveTo(drawX, p.y);
                ctx.lineTo(drawX + p.w, p.y + p.h);
                ctx.lineTo(drawX, p.y + p.h);
            }
            ctx.closePath();
            ctx.clip();

            // クリップ領域内にタイルを敷き詰める
            const cols = Math.ceil(p.w / TILE_SIZE);
            const rows = Math.ceil(p.h / TILE_SIZE);
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const tx = drawX + col * TILE_SIZE;
                    const ty = p.y + row * TILE_SIZE;
                    ctx.drawImage(images.block, srcX, srcY, srcW, srcH, tx, ty, TILE_SIZE, TILE_SIZE);
                }
            }
            ctx.strokeStyle = "#000";
            ctx.stroke();

        } else if (p.type === 'spike') {
            ctx.fillStyle = "#888";
            for (let i = 0; i < p.w / 20; i++) {
                ctx.beginPath();
                ctx.moveTo(drawX + i * 20, p.y + p.h);
                ctx.lineTo(drawX + i * 20 + 10, p.y);
                ctx.lineTo(drawX + i * 20 + 20, p.y + p.h);
                ctx.fill();
            }
        } else if (p.type === 'goal') {
            ctx.drawImage(images.treasure, drawX - 10, p.y - 20, p.w + 20, p.h + 20);
        }
        ctx.restore();
    }

    // 大岩の描画
    if (boulderTrap.active) {
        ctx.save();
        let bx = boulderTrap.x - cameraX;
        ctx.translate(bx, boulderTrap.y);
        ctx.rotate(boulderTrap.rotation);
        // 円の画像として描画 (正方形の画像をradius*2で)
        ctx.drawImage(images.boulder, -boulderTrap.radius, -boulderTrap.radius, boulderTrap.radius * 2, boulderTrap.radius * 2);
        ctx.restore();
    }
}

function updateTimer() {
    if (isTimerRunning) {
        const elapsed = (Date.now() - startTime) / 1000;
        timerDisplay.innerText = `TIME: ${elapsed.toFixed(2)}s`;
    }
}

let lastFrameTime = 0;
const FRAME_DURATION = 1000 / 60; // 60fps基準: 約16.67ms
const MAX_STEPS_PER_FRAME = 4;    // 最大ステップ数（暴走防止）
let timeAccumulator = 0;

function gameLoop(timestamp) {
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    let deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // 異常値（タブバックグラウンド復帰時等）をクランプ
    if (deltaTime > FRAME_DURATION * MAX_STEPS_PER_FRAME) {
        deltaTime = FRAME_DURATION * MAX_STEPS_PER_FRAME;
    }

    if (gameState === 'title') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground(cameraX);
        drawPlatforms(cameraX);
        player.draw(ctx, cameraX);
        requestAnimationFrame(gameLoop);
        return;
    }

    // 累積時間に加算し、FRAME_DURATION ごとにロジックを実行
    timeAccumulator += deltaTime;
    let steps = 0;
    while (timeAccumulator >= FRAME_DURATION && steps < MAX_STEPS_PER_FRAME) {
        updateTimer();
        updateGameObjects();
        if (!player.dead) {
            player.update();
        }
        timeAccumulator -= FRAME_DURATION;
        steps++;
    }

    // カメラの追従
    let targetCameraX = player.x - canvas.width / 2;
    if (targetCameraX < 0) targetCameraX = 0;
    cameraX += (targetCameraX - cameraX) * 0.1;

    // 描画
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(cameraX);
    drawPlatforms(cameraX);
    player.draw(ctx, cameraX);

    requestAnimationFrame(gameLoop);
}
// 初回起動は onload イベント内で行う
