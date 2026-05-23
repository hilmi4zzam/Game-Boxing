import Phaser from 'phaser';

import bgSelectPlayerImg from './assets/bgSelectPlayer.png';
import fighterBlueImg from './assets/Boxing guy/Fighting Static Blue Air.png';
import fighterIdleImg from './assets/Boxing guy/Fighting Static Blue Idle.png';
import fighterPunchImg from './assets/Boxing guy/Fighting Static Blue Front P.png';
import fighterCrouchPunchImg from './assets/Boxing guy/Fighting Static Blue Crouch Strong P2.png';
import fighterKO1Img from './assets/Boxing guy/Fighting Static Blue KO1.png';
import fighterKO2Img from './assets/Boxing guy/Fighting Static Blue KO2.png';
import mapTmj from './tile_source/map.tmj?url';
import tileset1Img from './tile_source/1.png';
import tileset2Img from './tile_source/2.png';

class GamePlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GamePlayScene' });
    }

    preload() {
        this.load.tilemapTiledJSON('mapGame', mapTmj);
        this.load.image('tileset1', tileset1Img);
        this.load.image('tileset2', tileset2Img);
        this.load.image('fighterIdle', fighterIdleImg);
        this.load.image('fighterPunch', fighterPunchImg);
        this.load.image('fighterCrouchPunch', fighterCrouchPunchImg);
        this.load.image('fighterKO1', fighterKO1Img);
        this.load.image('fighterKO2', fighterKO2Img);
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

        // Player 1 (Kiri)
        this.player1 = this.physics.add.sprite(width / 4, height - 150, 'fighterIdle').setScale(4);
        this.player1.setCollideWorldBounds(true);
        this.player1.setDepth(1); // Player ada di atas Base, tapi di bawah Ring_Bottom
        
        // Memperkecil Hitbox (Physics Body) agar sesuai badan aslinya (menghilangkan gap transparan)
        this.player1.body.setSize(this.player1.width * 0.3, this.player1.height * 0.9);
        this.player1.body.setOffset(this.player1.width * 0.35, this.player1.height * 0.1);
        
        // Player 2 (Musuh)
        this.player2 = this.physics.add.sprite(3 * width / 4, height - 150, 'fighterIdle').setScale(4);
        this.player2.flipX = true;
        this.player2.setCollideWorldBounds(true);
        this.player2.setDepth(1); // Musuh juga ada di atas Base, tapi di bawah Ring_Bottom
        this.player2.body.setSize(this.player2.width * 0.3, this.player2.height * 0.9);
        this.player2.body.setOffset(this.player2.width * 0.35, this.player2.height * 0.1);
        this.enemyIsAttacking = false;

        const ringLayer = map.createLayer('Ring_bottom', [tileset1, tileset2], 0, 0);
        if (ringLayer) {
            ringLayer.setScale(scaleX, scaleY);
            ringLayer.setDepth(2); // Ring_Bottom ditaruh di atas player agar menutupi
        }

        // Tambahkan colider agar player & musuh tidak bisa menembus dinding collision
        this.physics.add.collider(this.player1, collisionLayer);
        this.physics.add.collider(this.player2, collisionLayer);

        // Input WASD setup
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            attackRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            attackUp: Phaser.Input.Keyboard.KeyCodes.UP
        });

        // Tombol kembali ke menu
        const backBtnText = this.add.text(20, 20, '< KEMBALI', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true });

        backBtnText.on('pointerdown', () => {
            this.scene.start('LandingPage');
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
        character.setTexture('fighterKO1');
        
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        this.add.text(width / 2, height / 2, isPlayer ? 'YOU LOSE!' : 'YOU WIN!', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '64px',
            fill: isPlayer ? '#ff0000' : '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setStroke('#000', 8);

        this.time.delayedCall(500, () => {
            character.setTexture('fighterKO2');
        });
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

        // --- Logika Menyerang (Arrow Keys) ---
        if (this.keys.attackRight.isDown) {
            this.player1.setTexture('fighterPunch');
            isAttacking = true;
        } else if (this.keys.attackUp.isDown) {
            this.player1.setTexture('fighterCrouchPunch');
            isAttacking = true;
        } else {
            this.player1.setTexture('fighterIdle');
        }

        // --- Variabel jarak karakter ---
        const distance = Phaser.Math.Distance.Between(this.player1.x, this.player1.y, this.player2.x, this.player2.y);

        // --- SISTEM PUKULAN PLAYER ---
        if (isAttacking && distance < 80 && !this.playerHasHit) {
            const facingRight = !this.player1.flipX;
            const enemyIsRight = this.player2.x > this.player1.x;
            
            // Cek jika player menyerang menghadap musuh
            if ((facingRight && enemyIsRight) || (!facingRight && !enemyIsRight)) {
                this.enemyHealth -= 10;
                this.playerHasHit = true;
                this.updateHealthBars();
                
                if (this.enemyHealth <= 0) {
                    this.triggerKO(this.player2, false);
                    return;
                }
            }
        }
        
        // Reset boolean hit jika tidak menekan tombol serang (mencegah damage beruntun satu pukulan)
        if (!isAttacking) {
            this.playerHasHit = false;
        }

        // Hanya bisa bergerak jika tidak sedang menyerang
        if (!isAttacking) {
            if (this.keys.left.isDown) {
                this.player1.setVelocityX(-speed);
                this.player1.flipX = true; // Menghadap kiri
            } else if (this.keys.right.isDown) {
                this.player1.setVelocityX(speed);
                this.player1.flipX = false; // Menghadap kanan
            }

            if (this.keys.up.isDown) {
                this.player1.setVelocityY(-speed);
            } else if (this.keys.down.isDown) {
                this.player1.setVelocityY(speed);
            }
        }

        // --- Logika Musuh Mengikuti Player 1 ---
        const enemySpeed = 100; // Kecepatan musuh lebih lambat
        
        if (distance > 60) { // Jika musuh agak jauh, maka jalan mendatangi player
            this.physics.moveToObject(this.player2, this.player1, enemySpeed);
            if (!this.enemyIsAttacking) {
                this.player2.setTexture('fighterIdle');
            }
        } else { // Jika sudah dekat, musuh berhenti
            this.player2.setVelocity(0);
            
            // Logika Auto-Attack Musuh (Dipercepat)
            if (!this.enemyIsAttacking) {
                this.enemyIsAttacking = true;
                
                // Memilih acak antara pukulan biasa (0) & pukulan jongkok (1)
                const isCrouchPunch = Math.random() > 0.5;
                this.player2.setTexture(isCrouchPunch ? 'fighterCrouchPunch' : 'fighterPunch');
                
                // Kurangi darah Player
                this.playerHealth -= 10;
                this.updateHealthBars();
                if (this.playerHealth <= 0) {
                    this.triggerKO(this.player1, true);
                    return;
                }

                // Durasi serangan musuh lebih cepat (200ms)
                this.time.delayedCall(200, () => {
                    if (this.isGameOver) return; // Mencegah transisi ke idle jika musuh mati
                    this.player2.setTexture('fighterIdle');
                    
                    // Jeda cooldown serangan musuh lebih singkat agar lebih susah (300ms gap)
                    this.time.delayedCall(300, () => {
                        this.enemyIsAttacking = false;
                    });
                });
            }
        }

        // Musuh selalu menghadap player 1
        if (this.player2.body.velocity.x > 0) {
            this.player2.flipX = false; // Hadap kanan
        } else if (this.player2.body.velocity.x < 0) {
            this.player2.flipX = true; // Hadap kiri
        }
    }
}

class LandingPage extends Phaser.Scene {
    constructor() {
        super({ key: 'LandingPage' });
    }

    preload() {
        this.load.image('bgSelect', bgSelectPlayerImg);
        this.load.image('fighterBlue', fighterBlueImg);
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // --- BACKGROUND ---
        this.add.image(width / 2, height / 2, 'bgSelect').setDisplaySize(width, height);

        // --- GELAPKAN BACKGROUND SEDIKIT ---
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

        // --- KARTU KARAKTER (KIRI & KANAN) ---
        const cardWidth = 220;
        const cardHeight = 440;
        const cardY = height / 2 - 20;
        const cardRadius = 110;

        const graphics = this.add.graphics();
        graphics.fillStyle(0x3e3c3f, 0.95);
        
        // Kiri
        const leftBoxX = width / 2 - 250 - (cardWidth / 2);
        const leftBoxY = height / 2 - (cardHeight / 2);
        graphics.fillRoundedRect(leftBoxX, leftBoxY, cardWidth, cardHeight, cardRadius);

        // Kanan
        const rightBoxX = width / 2 + 250 - (cardWidth / 2);
        const rightBoxY = height / 2 - (cardHeight / 2);
        graphics.fillRoundedRect(rightBoxX, rightBoxY, cardWidth, cardHeight, cardRadius);

        // --- ISI KARTU KIRI ---
        const leftCenterX = leftBoxX + cardWidth / 2;
        this.add.text(leftCenterX, leftBoxY + 50, '^', { fontSize: '40px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.image(leftCenterX, height / 2 - 20, 'fighterBlue').setScale(4).setOrigin(0.5);
        this.add.text(leftCenterX, leftBoxY + cardHeight - 110, 'SIGIT', { fontFamily: '"Courier New", Courier, monospace', fontSize: '32px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setShadow(2, 2, '#000', 0, false, true);
        this.add.text(leftCenterX, leftBoxY + cardHeight - 50, 'v', { fontSize: '30px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // --- ISI KARTU KANAN ---
        const rightCenterX = rightBoxX + cardWidth / 2;
        this.add.text(rightCenterX, rightBoxY + 50, '^', { fontSize: '40px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.image(rightCenterX, height / 2 - 20, 'fighterBlue').setScale(4).setOrigin(0.5);
        this.add.text(rightCenterX, rightBoxY + cardHeight - 110, 'SIGIT', { fontFamily: '"Courier New", Courier, monospace', fontSize: '32px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setShadow(2, 2, '#000', 0, false, true);
        this.add.text(rightCenterX, rightBoxY + cardHeight - 50, 'v', { fontSize: '30px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

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
        const btnText = this.add.text(width / 2, height / 2 + 100, 'MULAI', {
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
                console.log("Game Dimulai!");
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
    scene: [LandingPage, GamePlayScene]
};

const game = new Phaser.Game(config);
