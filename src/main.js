import Phaser from 'phaser';

import bgSelectPlayerImg from './assets/bgSelectPlayer.png';
import fighterBlueImg from './assets/Boxing guy/Fighting Static Blue Air.png';
import fighterIdleImg from './assets/Boxing guy/Fighting Static Blue Idle.png';
import fighterPunchImg from './assets/Boxing guy/Fighting Static Blue Front P.png';
import fighterCrouchPunchImg from './assets/Boxing guy/Fighting Static Blue Crouch Strong P2.png';
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
        if (baseLayer) baseLayer.setScale(scaleX, scaleY);
        
        const ringLayer = map.createLayer('Ring_bottom', [tileset1, tileset2], 0, 0);
        if (ringLayer) ringLayer.setScale(scaleX, scaleY);
        
        const collisionLayer = map.createLayer('Collesion', [tileset1, tileset2], 0, 0);
        if (collisionLayer) collisionLayer.setScale(scaleX, scaleY);

        // Player 1 (Kiri)
        this.player1 = this.physics.add.sprite(width / 4, height - 150, 'fighterIdle').setScale(4);
        this.player1.setCollideWorldBounds(true);
        
        // Player 2 (Musuh)
        this.player2 = this.physics.add.sprite(3 * width / 4, height - 150, 'fighterIdle').setScale(4);
        this.player2.flipX = true;
        this.player2.setCollideWorldBounds(true);

        // Input WASD setup
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            attackRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            attackUp: Phaser.Input.Keyboard.KeyCodes.UP
        });

        // Tambahkan teks sementara atau UI
        this.add.text(width / 2, 50, 'FIGHT!', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '48px',
            fill: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5).setStroke('#fff', 6).setShadow(4, 4, '#000000', 0, false, true);

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
    }

    update() {
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
        
        // Menghitung jarak, pastikan musuh tidak terlalu nempel secara berlebihan
        const distance = Phaser.Math.Distance.Between(this.player1.x, this.player1.y, this.player2.x, this.player2.y);
        
        if (distance > 50) { // Jika musuh agak jauh, maka jalan mendatangi player
            this.physics.moveToObject(this.player2, this.player1, enemySpeed);
        } else { // Jika sudah dekat, musuh berhenti
            this.player2.setVelocity(0);
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
