// Main Game Class

class Game {
    constructor() {
        // Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;

        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.currentLevel = 1;
        this.enemiesKilled = 0;

        // Systems
        this.dungeonGenerator = null;
        this.dungeonMesh = null;
        this.player = null;
        this.weaponView = null;
        this.enemyManager = null;
        this.itemManager = null;
        this.combatSystem = null;
        this.ui = null;

        // Current dungeon data
        this.dungeonData = null;
        this.tileSize = 4;

        // Boss
        this.boss = null;
        this.bossDefeated = false;

        // Bind methods
        this.update = this.update.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }

    async init() {
        // Setup Three.js
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLighting();

        // Setup clock
        this.clock = new THREE.Clock();

        // Setup systems
        this.dungeonGenerator = new DungeonGenerator(50, 50);
        this.dungeonMesh = new DungeonMeshGenerator(this.scene, this.tileSize);
        this.enemyManager = new EnemyManager(this.scene);
        this.enemyManager.init();
        this.itemManager = new ItemManager(this.scene);
        this.ui = new UIManager();

        // Window resize handler
        window.addEventListener('resize', this.onWindowResize);

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Make game globally accessible
        window.game = this;

        // Show start screen
        await this.ui.showStartScreen();

        // Start game
        this.startNewGame();
    }

    setupRenderer() {
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.Fog(0x111111, 10, 40);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
    }

    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x333333, 0.5);
        this.scene.add(ambient);

        // Hemisphere light
        const hemi = new THREE.HemisphereLight(0x666666, 0x222222, 0.3);
        this.scene.add(hemi);
    }

    startNewGame() {
        this.currentLevel = 1;
        this.enemiesKilled = 0;

        // Create player
        this.player = new Player(this.camera, this.scene, this.dungeonGenerator);
        this.player.reset();

        // Create weapon view
        this.weaponView = new WeaponView(this.scene, this.camera);

        // Create combat system
        this.combatSystem = new CombatSystem(
            this.scene,
            this.player,
            this.enemyManager,
            this.camera
        );

        // Clear UI buffs
        this.ui.clearBuffs();

        // Generate first level
        this.generateLevel();

        // Start game loop
        this.isRunning = true;
        this.update();

        // Request pointer lock
        document.getElementById('game-canvas').requestPointerLock();
    }

    generateLevel() {
        // Clear previous level
        this.dungeonMesh.clear();
        this.enemyManager.clear();
        this.itemManager.clear();
        this.combatSystem.clear();

        // Generate new dungeon
        this.dungeonData = this.dungeonGenerator.generate(this.currentLevel);

        // Create 3D mesh
        this.dungeonMesh.generate(this.dungeonData);

        // Spawn player
        this.player.spawn(
            this.dungeonData.spawnPoint.x,
            this.dungeonData.spawnPoint.y,
            this.tileSize
        );

        // Spawn enemies
        this.enemyManager.spawnEnemies(
            this.dungeonData.enemySpawnPoints,
            this.currentLevel
        );

        // Spawn boss
        this.boss = this.enemyManager.spawnBoss(
            this.dungeonData.bossSpawnPoint,
            this.currentLevel
        );
        this.bossDefeated = false;

        // Spawn items
        this.itemManager.spawnItems(this.dungeonData, this.tileSize);

        // Update UI
        this.ui.updateLevel(this.currentLevel);
        this.ui.updateEnemyCount(this.enemyManager.getAliveCount());
        this.ui.showMessage(`Уровень ${this.currentLevel}`, 3000);

        // Update player stats display
        this.updatePlayerUI();
    }

    update() {
        if (!this.isRunning) return;

        requestAnimationFrame(this.update);

        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.isPaused) return;

        // Update player
        this.player.update(delta, this.dungeonGenerator, this.tileSize);

        // Update weapon view
        this.weaponView.update(delta);

        // Update enemies
        this.enemyManager.update(
            delta,
            this.player,
            this.dungeonGenerator,
            this.tileSize,
            this.camera
        );

        // Update combat
        this.combatSystem.update(delta);

        // Update items
        const collectedItems = this.itemManager.update(delta, this.player);
        this.handleCollectedItems(collectedItems);

        // Handle combat input
        this.handleCombatInput();

        // Check boss status
        this.checkBossStatus();

        // Update UI
        this.ui.updateEnemyCount(this.enemyManager.getAliveCount());
        this.ui.updateMinimap(
            this.dungeonData,
            this.player.position,
            this.tileSize,
            this.enemyManager.enemies
        );

        // Update boss health bar
        if (this.boss && this.boss.isAlive) {
            const distToBoss = this.player.position.distanceTo(this.boss.position);
            if (distToBoss < 20) {
                this.ui.showBossHealth(true);
                this.ui.updateBossHealth(this.boss.health, this.boss.maxHealth);
            } else {
                this.ui.showBossHealth(false);
            }
        } else {
            this.ui.showBossHealth(false);
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    handleCombatInput() {
        // Shooting (left mouse button)
        if (this.player.mouse.leftButton) {
            const result = this.combatSystem.performRangedAttack();
            if (result && result.killed) {
                this.enemiesKilled++;
            }
            this.ui.updateAmmo(this.player.ammo);
        }

        // Melee (right mouse button)
        if (this.player.mouse.rightButton) {
            const result = this.combatSystem.performMeleeAttack();
            if (result && result.killed) {
                this.enemiesKilled++;
            }
            // Reset right button to prevent continuous attacks
            this.player.mouse.rightButton = false;
        }
    }

    handleCollectedItems(items) {
        for (const item of items) {
            switch (item.type) {
                case ITEM_TYPES.AMMO:
                    this.player.addAmmo(item.data.amount);
                    this.ui.updateAmmo(this.player.ammo);
                    this.ui.showMessage(`+${item.data.amount} патронов`, 1500);
                    item.collect();
                    break;

                case ITEM_TYPES.ARMOR:
                    this.player.addArmor(item.data.value);
                    this.ui.updateArmor(this.player.armor, this.player.maxArmor);
                    this.ui.showMessage(`+${item.data.value} брони`, 1500);
                    item.collect();
                    break;

                case ITEM_TYPES.BUFF_ORB:
                    this.isPaused = true;
                    this.ui.showUpgradeMenu((buff) => {
                        this.player.applyBuff(buff.id);
                        this.ui.addBuff(buff.id, buff.name, buff.icon);
                        this.updatePlayerUI();
                        this.isPaused = false;
                        document.getElementById('game-canvas').requestPointerLock();
                    });
                    item.collect();
                    break;

                case ITEM_TYPES.EXIT_PORTAL:
                    if (this.bossDefeated) {
                        this.nextLevel();
                    }
                    break;
            }
        }
    }

    checkBossStatus() {
        if (this.boss && !this.boss.isAlive && !this.bossDefeated) {
            this.bossDefeated = true;
            this.enemiesKilled++;

            // Show exit portal
            this.itemManager.showExitPortal();

            // Show super buff selection
            this.isPaused = true;
            this.ui.showMessage('БОСС ПОВЕРЖЕН!', 2000);

            setTimeout(() => {
                this.ui.showSuperBuffMenu((buff) => {
                    this.player.applySuperBuff(buff.id);
                    this.ui.addSuperBuff(buff.id, buff.name, buff.icon);
                    this.ui.showMessage('Портал открыт!', 2000);
                    this.isPaused = false;
                    document.getElementById('game-canvas').requestPointerLock();
                });
            }, 1000);
        }
    }

    nextLevel() {
        this.currentLevel++;
        this.generateLevel();
    }

    playerTakeDamage(amount) {
        const isDead = this.player.takeDamage(amount);
        this.updatePlayerUI();

        if (isDead) {
            this.gameOver();
        }
    }

    updatePlayerUI() {
        this.ui.updateHealth(this.player.health, this.player.maxHealth);
        this.ui.updateArmor(this.player.armor, this.player.maxArmor);
        this.ui.updateAmmo(this.player.ammo);
    }

    async gameOver() {
        this.isRunning = false;
        document.exitPointerLock();

        await this.ui.showDeathScreen(this.currentLevel, this.enemiesKilled);

        // Cleanup
        this.cleanup();

        // Start new game
        this.startNewGame();
    }

    cleanup() {
        this.dungeonMesh.clear();
        this.enemyManager.clear();
        this.itemManager.clear();
        this.combatSystem.clear();

        // Remove weapon from camera
        if (this.weaponView && this.weaponView.group) {
            this.camera.remove(this.weaponView.group);
        }

        // Reset player
        if (this.player) {
            this.player.reset();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
