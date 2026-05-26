import Phaser from 'phaser';

import bgLandingPageImg from './assets/bgLandingPage.png';
import bgSelectPlayerImg from './assets/bgSelectPlayer.png';
import mapTmj from './tile_source/map.tmj?url';
import tileset1Img from './tile_source/1.png';
import tileset2Img from './tile_source/2.png';
import playerImg from './assets/player.png';
import enemyImg from './assets/enemy.png';

const FRAME_WIDTH = 675;
const FRAME_HEIGHT = 675;
const PLAYER_TEXTURE = 'player';
const ENEMY_TEXTURE = 'enemy';
const PLAYER_ANIMS = {
    front: 'player-walk-front',
    left: 'player-walk-left',
    right: 'player-walk-right',
    back: 'player-walk-back',
    ko: 'player-ko'
};
const ENEMY_ANIMS = {
    front: 'enemy-walk-front',
    left: 'enemy-walk-left',
    right: 'enemy-walk-right',
    back: 'enemy-walk-back',
    ko: 'enemy-ko'
};
const WALK_FRAMES = {
    front: { frames: [0, 1, 3, 4] },
    left: { frames: [5, 6, 7, 8] },
    right: { frames: [11, 12, 13, 14] },
    back: { frames: [15, 16, 17, 18, 19] }
};
const CHARACTER_FRAMES = {
    frontIdle: 0,
    battleIdle: 20,
    guard: 21,
    punch: 22,
    koStart: 23,
    koGround: 24
};
const CHARACTER_OPTIONS = [
    {
        name: 'BIRU',
        texture: PLAYER_TEXTURE,
        animations: PLAYER_ANIMS
    },
    {
        name: 'KUNING',
        texture: ENEMY_TEXTURE,
        animations: ENEMY_ANIMS
    }
];
const DEFAULT_PLAYER_CHARACTER_INDEX = 0;
const DEFAULT_ENEMY_CHARACTER_INDEX = 1;

function normalizeCharacterIndex(index) {
    const characterCount = CHARACTER_OPTIONS.length;
    const numericIndex = Number(index);
    const safeIndex = Number.isFinite(numericIndex) ? numericIndex : 0;
    return ((safeIndex % characterCount) + characterCount) % characterCount;
}

function getCharacterOption(index) {
    return CHARACTER_OPTIONS[normalizeCharacterIndex(index)];
}

function loadCharacterSprites(scene) {
    const frameConfig = { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT };

    if (!scene.textures.exists(PLAYER_TEXTURE)) {
        scene.load.spritesheet(PLAYER_TEXTURE, playerImg, frameConfig);
    }

    if (!scene.textures.exists(ENEMY_TEXTURE)) {
        scene.load.spritesheet(ENEMY_TEXTURE, enemyImg, frameConfig);
    }
}

function createAnimation(scene, animationKey, textureKey, frameConfig, repeat = -1, frameRate = 10) {
    if (scene.anims.exists(animationKey)) return;

    scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(textureKey, frameConfig),
        frameRate,
        repeat
    });
}

function createCharacterAnimations(scene, textureKey, animations) {
    Object.entries(WALK_FRAMES).forEach(([direction, frameConfig]) => {
        createAnimation(scene, animations[direction], textureKey, frameConfig);
    });
    createAnimation(scene, animations.ko, textureKey, {
        frames: [CHARACTER_FRAMES.koStart, CHARACTER_FRAMES.koGround]
    }, 0, 6);
}

function setCharacterHitbox(sprite) {
    sprite.body.setSize(sprite.width * 0.3, sprite.height * 0.9);
    sprite.body.setOffset(sprite.width * 0.35, sprite.height * 0.1);
}

function getDirectionFromVector(x, y) {
    if (Math.abs(x) >= Math.abs(y) && x !== 0) {
        return x < 0 ? 'left' : 'right';
    }

    if (y !== 0) {
        return y < 0 ? 'back' : 'front';
    }

    return 'front';
}

function playDirectionalWalk(sprite, animations, direction) {
    sprite.flipX = false;
    sprite.facing = direction;
    sprite.anims.play(animations[direction], true);
}

function faceSpriteToward(sprite, target) {
    sprite.facing = target.x < sprite.x ? 'left' : 'right';
    sprite.flipX = sprite.facing === 'left';
}

function setBattleIdle(sprite, target) {
    sprite.anims.stop();
    if (target) {
        faceSpriteToward(sprite, target);
    }
    sprite.setFrame(CHARACTER_FRAMES.battleIdle);
}

function setActionFrame(sprite, action, target) {
    sprite.anims.stop();
    if (target) {
        faceSpriteToward(sprite, target);
    }
    sprite.setFrame(CHARACTER_FRAMES[action]);
}

function setKOFrame(sprite, target, animations) {
    sprite.anims.stop();
    if (target) {
        faceSpriteToward(sprite, target);
    }
    if (animations?.ko) {
        sprite.anims.play(animations.ko, true);
    } else {
        sprite.setFrame(CHARACTER_FRAMES.koGround);
    }
}

function isFacingTarget(sprite, target) {
    if (sprite.facing === 'left') return target.x < sprite.x;
    if (sprite.facing === 'right') return target.x > sprite.x;
    if (sprite.facing === 'back') return target.y < sprite.y;
    return target.y > sprite.y;
}

class GamePlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GamePlayScene' });
    }

    preload() {
        this.load.tilemapTiledJSON('mapGame', mapTmj);
        this.load.image('tileset1', tileset1Img);
        this.load.image('tileset2', tileset2Img);
        loadCharacterSprites(this);
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // Background Map
        const map = this.make.tilemap({ key: 'mapGame' });
        const tileset1 = map.addTilesetImage('1', 'tileset1');
        const tileset2 = map.addTilesetImage('2', 'tileset2');
        
        const scaleX = width / map.widthInPixels;
        const scaleY = height / map.heightInPixels;
        
        const baseLayer = map.createLayer('Base', [tileset1, tileset2], 0, 0);
        if (baseLayer) {
            baseLayer.setScale(scaleX, scaleY);
            baseLayer.setDepth(0); // Base ditaruh di layer paling bawah
        }
        
        const collisionLayer = map.createLayer('Collesion', [tileset1, tileset2], 0, 0);
        if (collisionLayer) {
            collisionLayer.setScale(scaleX, scaleY);
            collisionLayer.setCollisionByExclusion([-1]); // Set collision semua tile di layer ini kecuali yang kosong
            // Sembunyikan dihapus agar border tetap terlihat
            collisionLayer.setDepth(0); // Ditaruh berbarengan di bawah dengan base
        }

        const playerCharacterIndex = this.registry.get('playerCharacterIndex') ?? DEFAULT_PLAYER_CHARACTER_INDEX;
        const enemyCharacterIndex = this.registry.get('enemyCharacterIndex') ?? DEFAULT_ENEMY_CHARACTER_INDEX;
        this.playerCharacter = getCharacterOption(playerCharacterIndex);
        this.enemyCharacter = getCharacterOption(enemyCharacterIndex);

        // Player 1 (Kiri)
        this.player1 = this.physics.add.sprite(width / 4, height - 150, this.playerCharacter.texture).setScale(0.2);
        this.player1.setCollideWorldBounds(true);
        this.player1.setDepth(1); // Player ada di atas Base, tapi di bawah Ring_Bottom
        setCharacterHitbox(this.player1);
        
        // Player 2 (Musuh)
        this.player2 = this.physics.add.sprite(3 * width / 4, height - 150, this.enemyCharacter.texture).setScale(0.2);
        this.player2.flipX = true;
        this.player2.setCollideWorldBounds(true);
        this.player2.setDepth(1); // Musuh juga ada di atas Base, tapi di bawah Ring_Bottom
        setCharacterHitbox(this.player2);
        this.enemyIsAttacking = false;

        createCharacterAnimations(this, this.playerCharacter.texture, this.playerCharacter.animations);
        createCharacterAnimations(this, this.enemyCharacter.texture, this.enemyCharacter.animations);
        setBattleIdle(this.player1, this.player2);
        setBattleIdle(this.player2, this.player1);

        const ringLayer = map.createLayer('Ring_bottom', [tileset1, tileset2], 0, 0);
        if (ringLayer) {
            ringLayer.setScale(scaleX, scaleY);
            ringLayer.setDepth(2); // Ring_Bottom ditaruh di atas player agar menutupi
        }

        // Tambahkan colider agar player & musuh tidak bisa menembus dinding collision
        if (collisionLayer) {
            this.physics.add.collider(this.player1, collisionLayer);
            this.physics.add.collider(this.player2, collisionLayer);
        }

        // Input WASD setup
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            punch: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            defend: Phaser.Input.Keyboard.KeyCodes.UP
        });

        // --- SISTEM HEALTH BAR ---
        this.playerHealth = 100;
        this.enemyHealth = 100;
        this.isGameOver = false;
        this.playerHasHit = false;

        this.healthBarBg = this.add.graphics();
        this.healthBarBg.fillStyle(0x000000, 0.8);
        this.healthBarBg.fillRect(50, 20, 300, 20); // Player 1 Background
        this.healthBarBg.fillRect(width - 350, 20, 300, 20); // Player 2 Background

        this.healthBarFill = this.add.graphics();
        this.updateHealthBars();
    }

    triggerKO(character, isPlayer) {
        this.isGameOver = true;
        this.player1.setVelocity(0);
        this.player2.setVelocity(0);
        this.player1.anims.stop();
        this.player2.anims.stop();
        setKOFrame(
            character,
            isPlayer ? this.player2 : this.player1,
            isPlayer ? this.playerCharacter.animations : this.enemyCharacter.animations
        );
        
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // Background Pop-up semi-transparan
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(10);

        this.add.text(width / 2, height / 2 - 80, isPlayer ? 'YOU LOSE!' : 'YOU WIN!', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '64px',
            fill: isPlayer ? '#ff0000' : '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setStroke('#000', 8).setDepth(11);

        // Tombol Restart
        const restartBtn = this.add.text(width / 2, height / 2 + 20, 'RESTART', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#444444',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

        restartBtn.on('pointerdown', () => {
            this.scene.restart();
        });
        restartBtn.on('pointerover', () => restartBtn.setStyle({ fill: '#ffff00' }));
        restartBtn.on('pointerout', () => restartBtn.setStyle({ fill: '#ffffff' }));

        // Tombol Kembali
        const backBtn = this.add.text(width / 2, height / 2 + 100, 'KEMBALI', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#444444',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.scene.start('LandingPage');
        });
        backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#ffff00' }));
        backBtn.on('pointerout', () => backBtn.setStyle({ fill: '#ffffff' }));

        // Animasi tambahan saat KO jika ada
    }

    updateHealthBars() {
        this.healthBarFill.clear();
        const width = this.sys.game.config.width;

        // Player 1 health (Bar Hijau)
        if (this.playerHealth > 0) {
            this.healthBarFill.fillStyle(0x00ff00, 1);
            this.healthBarFill.fillRect(50, 20, 3 * this.playerHealth, 20);
        }

        // Player 2 health (Bar Merah)
        if (this.enemyHealth > 0) {
            this.healthBarFill.fillStyle(0xff0000, 1);
            this.healthBarFill.fillRect(width - 50 - (3 * this.enemyHealth), 20, 3 * this.enemyHealth, 20);
        }
    }

    update() {
        if (this.isGameOver) return; // Hentikan update logic jika game usai

        const speed = 200;

        // --- Pergerakan Player 1 dengan WASD ---
        this.player1.setVelocity(0); // Reset kecepatan setiap frame

        let isAttacking = false;
        let canDamageEnemy = false;
        let isDefending = false;
        let isMoving = false;

        // --- Logika Menyerang (Arrow Keys) ---
        if (this.keys.punch.isDown) { // Punch
            setActionFrame(this.player1, 'punch', this.player2);
            isAttacking = true;
            canDamageEnemy = true;
        } else if (this.keys.defend.isDown) { // Defend
            setActionFrame(this.player1, 'guard', this.player2);
            isAttacking = true;
            isDefending = true;
        }

        // --- Variabel jarak karakter ---
        const distance = Phaser.Math.Distance.Between(this.player1.x, this.player1.y, this.player2.x, this.player2.y);

        // --- SISTEM PUKULAN PLAYER ---
        if (canDamageEnemy && distance < 80 && !this.playerHasHit) {
            if (isFacingTarget(this.player1, this.player2)) {
                // Musuh reflek guard saat dipukul dengan probabilitas 60% agar game tetap bisa dimenangkan
                if (Math.random() < 0.6) {
                    setActionFrame(this.player2, 'guard', this.player1);
                    this.enemyIsAttacking = true; // Lock aksi musuh agar menahan guard
                    
                    // Damage dikurangi signifikan saat guard
                    this.enemyHealth = Math.max(0, this.enemyHealth - 2); 
                    
                    this.time.delayedCall(400, () => {
                        if (!this.isGameOver) {
                            this.enemyIsAttacking = false;
                            setBattleIdle(this.player2, this.player1);
                        }
                    });
                } else {
                    // Kena pukulan telak
                    this.enemyHealth = Math.max(0, this.enemyHealth - 10);
                }

                this.playerHasHit = true;
                this.updateHealthBars();
                
                if (this.enemyHealth <= 0) {
                    this.triggerKO(this.player2, false);
                    return;
                }
            }
        }
        
        // Reset boolean hit jika tidak menekan tombol serang (mencegah damage beruntun satu pukulan)
        if (!canDamageEnemy) {
            this.playerHasHit = false;
        }

        // Hanya bisa bergerak jika tidak sedang menyerang
        if (!isAttacking) {
            let moveX = 0;
            let moveY = 0;

            if (this.keys.left.isDown) {
                moveX = -1;
                isMoving = true;
            } else if (this.keys.right.isDown) {
                moveX = 1;
                isMoving = true;
            }

            if (this.keys.up.isDown) {
                moveY = -1;
                isMoving = true;
            } else if (this.keys.down.isDown) {
                moveY = 1;
                isMoving = true;
            }

            this.player1.setVelocity(moveX * speed, moveY * speed);

            if (isMoving) {
                playDirectionalWalk(this.player1, this.playerCharacter.animations, getDirectionFromVector(moveX, moveY));
            } else {
                setBattleIdle(this.player1, this.player2);
            }
        } else {
            this.player1.setVelocity(0);
        }

        // --- Logika Musuh Mengikuti Player 1 ---
        const enemySpeed = 160; // Kecepatan musuh dipercepat (lumayan cepat)
        
        if (distance > 60) { // Jika musuh agak jauh, maka jalan mendatangi player
            this.physics.moveToObject(this.player2, this.player1, enemySpeed);
            if (!this.enemyIsAttacking) {
                const enemyDirection = getDirectionFromVector(this.player2.body.velocity.x, this.player2.body.velocity.y);
                playDirectionalWalk(this.player2, this.enemyCharacter.animations, enemyDirection);
            }
        } else { // Jika sudah dekat, musuh berhenti
            this.player2.setVelocity(0);
            
            // Logika Auto-Attack Musuh (Dipercepat)
            if (!this.enemyIsAttacking) {
                this.enemyIsAttacking = true;
                
                setActionFrame(this.player2, 'punch', this.player1);
                
                // Kurangi darah Player
                if (!(isDefending && isFacingTarget(this.player1, this.player2))) {
                    this.playerHealth = Math.max(0, this.playerHealth - 10);
                    this.updateHealthBars();
                }

                if (this.playerHealth <= 0) {
                    this.triggerKO(this.player1, true);
                    return;
                }

                // Durasi serangan musuh lebih cepat (200ms)
                this.time.delayedCall(200, () => {
                    if (this.isGameOver) return; // Mencegah transisi ke idle jika musuh mati
                    setBattleIdle(this.player2, this.player1);
                    
                    // Jeda cooldown serangan musuh lebih singkat agar lebih susah (300ms gap)
                    this.time.delayedCall(300, () => {
                        this.enemyIsAttacking = false;
                    });
                });
            }
        }
    }
}

class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        this.load.image('bgLandingPage', bgLandingPageImg);
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        this.add.image(width / 2, height / 2, 'bgLandingPage').setDisplaySize(width, height);

        const btnWidth = 250;
        const btnHeight = 80;

        const btnBg = this.add.rectangle(width / 2, height / 2, btnWidth, btnHeight, 0x4CAF50)
            .setInteractive({ useHandCursor: true });
        
        btnBg.setStrokeStyle(6, 0x000000);

        const btnText = this.add.text(width / 2, height / 2, 'MULAI GAME', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '32px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(3, 3, '#000000', 0, false, true);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0x66bb6a);
            this.sys.canvas.style.cursor = 'pointer';
        });

        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x4CAF50);
            this.sys.canvas.style.cursor = 'default';
        });

        btnBg.on('pointerdown', () => {
            btnBg.setFillStyle(0x388E3C);
            btnBg.y += 4;
            btnText.y += 4;
            
            this.time.delayedCall(100, () => {
                btnBg.y -= 4;
                btnText.y -= 4;
                this.scene.start('LandingPage');
            });
        });
    }
}

class LandingPage extends Phaser.Scene {
    constructor() {
        super({ key: 'LandingPage' });
    }

    preload() {
        this.load.image('bgSelect', bgSelectPlayerImg);
        loadCharacterSprites(this);
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;
        this.playerCharacterIndex = normalizeCharacterIndex(
            this.registry.get('playerCharacterIndex') ?? DEFAULT_PLAYER_CHARACTER_INDEX
        );
        this.enemyCharacterIndex = normalizeCharacterIndex(
            this.registry.get('enemyCharacterIndex') ?? DEFAULT_ENEMY_CHARACTER_INDEX
        );

        // --- TOMBOL KEMBALI ---
        const backBtnText = this.add.text(20, 20, '< KEMBALI', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true }).setDepth(10);

        backBtnText.on('pointerdown', () => {
            this.scene.start('StartScene');
        });

        // --- BACKGROUND ---
        this.add.image(width / 2, height / 2, 'bgSelect').setDisplaySize(width, height);

        // --- GELAPKAN BACKGROUND SEDIKIT ---
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

        // --- KARTU KARAKTER (KIRI & KANAN) ---
        const cardWidth = 220;
        const cardHeight = 440;
        const cardRadius = 110;

        const graphics = this.add.graphics();
        graphics.fillStyle(0x444444, 0.95);
        
        // Kiri
        const leftBoxX = width / 2 - 250 - (cardWidth / 2);
        const leftBoxY = height / 2 - (cardHeight / 2);
        graphics.fillRoundedRect(leftBoxX, leftBoxY, cardWidth, cardHeight, cardRadius);

        // Kanan
        const rightBoxX = width / 2 + 250 - (cardWidth / 2);
        const rightBoxY = height / 2 - (cardHeight / 2);
        graphics.fillRoundedRect(rightBoxX, rightBoxY, cardWidth, cardHeight, cardRadius);

        const createArrow = (x, y, text, onClick, fontSize = '36px') => {
            const arrow = this.add.text(x, y, text, {
                fontSize,
                fill: '#fff',
                fontStyle: 'bold'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            arrow.on('pointerdown', onClick);
            arrow.on('pointerover', () => arrow.setStyle({ fill: '#ffff00' }));
            arrow.on('pointerout', () => arrow.setStyle({ fill: '#fff' }));

            return arrow;
        };

        const createCharacterSelector = (centerX, boxY, sideLabel, indexKey) => {
            const characterImage = this.add.image(
                centerX,
                height / 2 - 20,
                getCharacterOption(this[indexKey]).texture,
                CHARACTER_FRAMES.frontIdle
            ).setScale(0.2).setOrigin(0.5);

            const updateCharacter = (direction) => {
                this[indexKey] = normalizeCharacterIndex(this[indexKey] + direction);
                this.registry.set(indexKey, this[indexKey]);
                characterImage.setTexture(getCharacterOption(this[indexKey]).texture, CHARACTER_FRAMES.frontIdle);
            };

            createArrow(centerX, boxY + 50, '^', () => updateCharacter(-1), '40px');
            this.add.text(centerX, boxY + cardHeight - 110, sideLabel, {
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '30px',
                fill: '#fff',
                fontStyle: 'bold'
            }).setOrigin(0.5).setShadow(2, 2, '#000', 0, false, true);
            createArrow(centerX, boxY + cardHeight - 50, 'v', () => updateCharacter(1), '30px');
        };

        // --- ISI KARTU KIRI ---
        const leftCenterX = leftBoxX + cardWidth / 2;
        createCharacterSelector(leftCenterX, leftBoxY, 'PLAYER', 'playerCharacterIndex');

        // --- ISI KARTU KANAN ---
        const rightCenterX = rightBoxX + cardWidth / 2;
        createCharacterSelector(rightCenterX, rightBoxY, 'ENEMY', 'enemyCharacterIndex');

        // --- TEKS VS TENGAH ---
        this.add.text(width / 2, height / 2 - 20, 'VS', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '64px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setStroke('#000', 8).setShadow(4, 4, '#000000', 0, false, true); // Efek bayangan pixel

        // --- TOMBOL MULAI (PIXEL ART STYLE) ---
        const btnWidth = 200;
        const btnHeight = 60;
        
        // Kotak background tombol
        const btnBg = this.add.rectangle(width / 2, height / 2 + 100, btnWidth, btnHeight, 0x4CAF50)
            .setInteractive({ useHandCursor: true });
        
        // Memberikan border tebal untuk gaya pixel art
        btnBg.setStrokeStyle(6, 0x000000);

        // Teks tombol
        const btnText = this.add.text(width / 2, height / 2 + 100, 'LANJUT', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(3, 3, '#000000', 0, false, true);

        // Efek Hover (kursor masuk ke tombol)
        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0x66bb6a);
            this.sys.canvas.style.cursor = 'pointer';
        });

        // Efek keluar hover (kursor keluar dari tombol)
        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x4CAF50);
            this.sys.canvas.style.cursor = 'default';
        });

        // Efek saat tombol diklik
        btnBg.on('pointerdown', () => {
            btnBg.setFillStyle(0x388E3C);
            btnBg.y += 4; // Tombol seakan ditekan
            btnText.y += 4;
            
            // Mengembalikan posisi setelah diklik (simulasi delay)
            this.time.delayedCall(100, () => {
                btnBg.y -= 4;
                btnText.y -= 4;
                this.registry.set('playerCharacterIndex', this.playerCharacterIndex);
                this.registry.set('enemyCharacterIndex', this.enemyCharacterIndex);
                // Pindah ke scene utama permainan
                this.scene.start('GamePlayScene');
            });
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'app',
    pixelArt: true, // WAJIB untuk game sprite 2D Pixel Art agar tetap tajam
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [StartScene, LandingPage, GamePlayScene]
};

const game = new Phaser.Game(config);
