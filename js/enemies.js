// Enemy System with AI

const ENEMY_TYPES = {
    BASIC: 'basic',
    FAST: 'fast',
    TANK: 'tank',
    RANGED: 'ranged',
    BOSS: 'boss'
};

class Enemy {
    constructor(scene, type, position, level = 1) {
        this.scene = scene;
        this.type = type;
        this.level = level;
        this.position = position.clone();
        this.velocity = new THREE.Vector3();
        this.target = null;

        // Set stats based on type and level
        this.setupStats();

        // Create visual
        this.createMesh();

        // AI state
        this.state = 'idle';
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.lastKnownPlayerPos = null;
        this.pathfindTimer = 0;
        this.currentPath = [];

        // Detection
        this.detectionRange = 15;
        this.attackRange = this.type === ENEMY_TYPES.RANGED ? 12 : 2;
        this.loseTargetRange = 25;

        // Animation
        this.animationTimer = 0;
        this.hurtTimer = 0;

        // Is alive
        this.isAlive = true;
        this.deathTimer = 0;
    }

    setupStats() {
        // Base health: 3 + (level - 1)
        const baseHealth = 3 + (this.level - 1);

        switch (this.type) {
            case ENEMY_TYPES.BASIC:
                this.maxHealth = baseHealth;
                this.health = baseHealth;
                this.damage = 1;
                this.speed = 4;
                this.color = 0xff4444;
                this.size = 0.8;
                this.attackSpeed = 1;
                break;

            case ENEMY_TYPES.FAST:
                this.maxHealth = Math.max(1, baseHealth - 1);
                this.health = this.maxHealth;
                this.damage = 1;
                this.speed = 7;
                this.color = 0x44ff44;
                this.size = 0.6;
                this.attackSpeed = 1.5;
                break;

            case ENEMY_TYPES.TANK:
                this.maxHealth = baseHealth + 3;
                this.health = this.maxHealth;
                this.damage = 2;
                this.speed = 2;
                this.color = 0x4444ff;
                this.size = 1.2;
                this.attackSpeed = 0.5;
                break;

            case ENEMY_TYPES.RANGED:
                this.maxHealth = Math.max(1, baseHealth - 1);
                this.health = this.maxHealth;
                this.damage = 1;
                this.speed = 3;
                this.color = 0xff44ff;
                this.size = 0.7;
                this.attackSpeed = 0.8;
                this.projectileSpeed = 10;
                break;

            case ENEMY_TYPES.BOSS:
                this.maxHealth = baseHealth * 5;
                this.health = this.maxHealth;
                this.damage = 2;
                this.speed = 3;
                this.color = 0xff0000;
                this.size = 2;
                this.attackSpeed = 0.7;
                this.bossPhase = 1;
                break;
        }
    }

    createMesh() {
        const geometry = this.type === ENEMY_TYPES.BOSS
            ? new THREE.BoxGeometry(this.size, this.size * 1.5, this.size)
            : new THREE.SphereGeometry(this.size / 2, 16, 16);

        const material = new THREE.MeshLambertMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;

        // Eyes for basic enemies
        if (this.type !== ENEMY_TYPES.BOSS) {
            const eyeGeom = new THREE.SphereGeometry(0.1, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

            const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
            leftEye.position.set(-0.15, 0.1, -0.3);
            this.mesh.add(leftEye);

            const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
            rightEye.position.set(0.15, 0.1, -0.3);
            this.mesh.add(rightEye);

            // Pupils
            const pupilGeom = new THREE.SphereGeometry(0.05, 8, 8);
            const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

            const leftPupil = new THREE.Mesh(pupilGeom, pupilMat);
            leftPupil.position.set(0, 0, -0.05);
            leftEye.add(leftPupil);

            const rightPupil = new THREE.Mesh(pupilGeom, pupilMat);
            rightPupil.position.set(0, 0, -0.05);
            rightEye.add(rightPupil);
        } else {
            // Boss has horns
            const hornGeom = new THREE.ConeGeometry(0.2, 0.8, 8);
            const hornMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

            const leftHorn = new THREE.Mesh(hornGeom, hornMat);
            leftHorn.position.set(-0.5, this.size * 0.8, 0);
            leftHorn.rotation.z = 0.3;
            this.mesh.add(leftHorn);

            const rightHorn = new THREE.Mesh(hornGeom, hornMat);
            rightHorn.position.set(0.5, this.size * 0.8, 0);
            rightHorn.rotation.z = -0.3;
            this.mesh.add(rightHorn);

            // Glowing eyes
            const eyeGeom = new THREE.SphereGeometry(0.15, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

            const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
            leftEye.position.set(-0.3, 0.3, -this.size / 2 - 0.1);
            this.mesh.add(leftEye);
            this.leftEye = leftEye;

            const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
            rightEye.position.set(0.3, 0.3, -this.size / 2 - 0.1);
            this.mesh.add(rightEye);
            this.rightEye = rightEye;
        }

        this.scene.add(this.mesh);

        // Health bar
        this.createHealthBar();
    }

    createHealthBar() {
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.className = 'enemy-health-bar';
        this.healthBarFill = document.createElement('div');
        this.healthBarFill.className = 'enemy-health-fill';
        this.healthBarContainer.appendChild(this.healthBarFill);

        if (this.type === ENEMY_TYPES.BOSS) {
            // Boss uses the dedicated boss health bar
            this.healthBarContainer.style.display = 'none';
        }
    }

    update(delta, player, dungeon, tileSize, projectiles) {
        if (!this.isAlive) {
            this.deathTimer += delta;
            // Death animation
            this.mesh.scale.multiplyScalar(0.95);
            this.mesh.position.y -= delta * 2;
            if (this.deathTimer > 0.5) {
                return false; // Remove enemy
            }
            return true;
        }

        // Update hurt flash
        if (this.hurtTimer > 0) {
            this.hurtTimer -= delta;
            this.mesh.material.emissiveIntensity = 0.8;
        } else {
            this.mesh.material.emissiveIntensity = 0.2;
        }

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Check distance to player
        const distToPlayer = this.position.distanceTo(player.position);

        // State machine
        this.updateAI(delta, player, distToPlayer, dungeon, tileSize, projectiles);

        // Update mesh position
        this.mesh.position.copy(this.position);
        this.mesh.position.y = this.size / 2 + Math.sin(this.animationTimer * 3) * 0.1;

        // Animation
        this.animationTimer += delta;

        // Look at player if targeting
        if (this.target) {
            const lookDir = player.position.clone().sub(this.position);
            lookDir.y = 0;
            if (lookDir.length() > 0.1) {
                const angle = Math.atan2(lookDir.x, lookDir.z);
                this.mesh.rotation.y = angle;
            }
        }

        return true;
    }

    updateAI(delta, player, distToPlayer, dungeon, tileSize, projectiles) {
        switch (this.state) {
            case 'idle':
                // Check for player detection
                if (distToPlayer < this.detectionRange) {
                    this.target = player;
                    this.state = 'chase';
                    this.lastKnownPlayerPos = player.position.clone();
                }
                break;

            case 'chase':
                // Check if lost player
                if (distToPlayer > this.loseTargetRange) {
                    this.state = 'search';
                    this.stateTimer = 3;
                    break;
                }

                // Update last known position
                this.lastKnownPlayerPos = player.position.clone();

                // Check if in attack range
                if (distToPlayer < this.attackRange) {
                    this.state = 'attack';
                    break;
                }

                // Move towards player
                this.moveTowards(player.position, delta, dungeon, tileSize);
                break;

            case 'attack':
                // Check if player moved out of range
                if (distToPlayer > this.attackRange * 1.5) {
                    this.state = 'chase';
                    break;
                }

                // Attack if cooldown is ready
                if (this.attackCooldown <= 0) {
                    this.performAttack(player, projectiles);
                    this.attackCooldown = 1 / this.attackSpeed;
                }

                // Slight movement towards player
                if (this.type !== ENEMY_TYPES.RANGED) {
                    this.moveTowards(player.position, delta * 0.3, dungeon, tileSize);
                } else {
                    // Ranged enemies try to maintain distance
                    if (distToPlayer < 5) {
                        const awayDir = this.position.clone().sub(player.position).normalize();
                        const targetPos = this.position.clone().add(awayDir.multiplyScalar(3));
                        this.moveTowards(targetPos, delta, dungeon, tileSize);
                    }
                }
                break;

            case 'search':
                this.stateTimer -= delta;

                // Move to last known position
                if (this.lastKnownPlayerPos) {
                    const distToLastKnown = this.position.distanceTo(this.lastKnownPlayerPos);
                    if (distToLastKnown > 1) {
                        this.moveTowards(this.lastKnownPlayerPos, delta * 0.5, dungeon, tileSize);
                    }
                }

                // Check for player again
                if (distToPlayer < this.detectionRange) {
                    this.target = player;
                    this.state = 'chase';
                } else if (this.stateTimer <= 0) {
                    this.state = 'idle';
                    this.target = null;
                }
                break;
        }

        // Boss special behavior
        if (this.type === ENEMY_TYPES.BOSS && this.isAlive) {
            this.updateBossAI(delta, player, projectiles);
        }
    }

    updateBossAI(delta, player, projectiles) {
        // Phase transitions based on health
        const healthPercent = this.health / this.maxHealth;

        if (healthPercent < 0.3 && this.bossPhase < 3) {
            this.bossPhase = 3;
            this.speed *= 1.5;
            this.attackSpeed *= 1.5;
        } else if (healthPercent < 0.6 && this.bossPhase < 2) {
            this.bossPhase = 2;
            this.speed *= 1.2;
        }

        // Boss eye glow based on phase
        if (this.leftEye && this.rightEye) {
            const colors = [0xffff00, 0xff8800, 0xff0000];
            const color = colors[this.bossPhase - 1];
            this.leftEye.material.color.setHex(color);
            this.rightEye.material.color.setHex(color);
        }

        // Special attacks based on phase
        if (this.bossPhase >= 2 && this.attackCooldown <= 0) {
            // Chance for special attack
            if (Math.random() < 0.3) {
                this.performSpecialAttack(player, projectiles);
            }
        }
    }

    moveTowards(targetPos, delta, dungeon, tileSize) {
        const direction = targetPos.clone().sub(this.position);
        direction.y = 0;
        direction.normalize();

        const moveAmount = this.speed * delta;
        const newPos = this.position.clone().add(direction.multiplyScalar(moveAmount));

        // Simple collision check
        const tileX = Math.floor(newPos.x / tileSize);
        const tileZ = Math.floor(newPos.z / tileSize);

        if (dungeon.isWalkable(tileX, tileZ)) {
            this.position.copy(newPos);
        } else {
            // Try sliding along walls
            const newPosX = this.position.clone();
            newPosX.x = newPos.x;
            const tileXOnly = Math.floor(newPosX.x / tileSize);
            const tileZOrig = Math.floor(this.position.z / tileSize);

            if (dungeon.isWalkable(tileXOnly, tileZOrig)) {
                this.position.x = newPosX.x;
            }

            const newPosZ = this.position.clone();
            newPosZ.z = newPos.z;
            const tileXOrig = Math.floor(this.position.x / tileSize);
            const tileZOnly = Math.floor(newPosZ.z / tileSize);

            if (dungeon.isWalkable(tileXOrig, tileZOnly)) {
                this.position.z = newPosZ.z;
            }
        }
    }

    performAttack(player, projectiles) {
        if (this.type === ENEMY_TYPES.RANGED) {
            // Shoot projectile
            const direction = player.position.clone().sub(this.position).normalize();
            projectiles.push(new EnemyProjectile(
                this.scene,
                this.position.clone().add(new THREE.Vector3(0, this.size / 2, 0)),
                direction,
                this.projectileSpeed,
                this.damage
            ));
        } else {
            // Melee attack - check distance again
            const dist = this.position.distanceTo(player.position);
            if (dist < this.attackRange + 0.5) {
                // Deal damage to player
                if (window.game) {
                    window.game.playerTakeDamage(this.damage);
                }
            }
        }
    }

    performSpecialAttack(player, projectiles) {
        // Boss special attack - shoot multiple projectiles
        const numProjectiles = this.bossPhase * 3;
        const angleStep = (Math.PI * 2) / numProjectiles;

        for (let i = 0; i < numProjectiles; i++) {
            const angle = i * angleStep;
            const direction = new THREE.Vector3(
                Math.sin(angle),
                0,
                Math.cos(angle)
            );

            projectiles.push(new EnemyProjectile(
                this.scene,
                this.position.clone().add(new THREE.Vector3(0, this.size / 2, 0)),
                direction,
                8,
                1
            ));
        }

        this.attackCooldown = 2; // Longer cooldown after special
    }

    takeDamage(amount, isInstantKill = false) {
        if (!this.isAlive) return false;

        if (isInstantKill) {
            this.health = 0;
        } else {
            this.health -= amount;
        }

        this.hurtTimer = 0.1;

        if (this.health <= 0) {
            this.die();
            return true;
        }

        return false;
    }

    die() {
        this.isAlive = false;
        this.target = null;

        // Update health bar
        if (this.healthBarContainer) {
            this.healthBarContainer.style.display = 'none';
        }
    }

    updateHealthBar(camera) {
        if (!this.isAlive || this.type === ENEMY_TYPES.BOSS) return;

        // Project position to screen
        const screenPos = this.position.clone();
        screenPos.y += this.size + 0.5;
        screenPos.project(camera);

        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        // Only show if in front of camera and close enough
        if (screenPos.z < 1 && screenPos.z > 0) {
            this.healthBarContainer.style.display = 'block';
            this.healthBarContainer.style.left = x + 'px';
            this.healthBarContainer.style.top = (y - 40) + 'px';
            this.healthBarFill.style.width = (this.health / this.maxHealth * 100) + '%';
        } else {
            this.healthBarContainer.style.display = 'none';
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
        if (this.healthBarContainer && this.healthBarContainer.parentNode) {
            this.healthBarContainer.parentNode.removeChild(this.healthBarContainer);
        }
    }
}

// Enemy Projectile
class EnemyProjectile {
    constructor(scene, position, direction, speed, damage) {
        this.scene = scene;
        this.position = position.clone();
        this.direction = direction.normalize();
        this.speed = speed;
        this.damage = damage;
        this.lifetime = 5;
        this.age = 0;
        this.isAlive = true;

        // Create mesh
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            emissive: 0xff0000
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(delta, player, dungeon, tileSize) {
        if (!this.isAlive) return false;

        this.age += delta;
        if (this.age > this.lifetime) {
            this.destroy();
            return false;
        }

        // Move
        const moveAmount = this.speed * delta;
        this.position.add(this.direction.clone().multiplyScalar(moveAmount));
        this.mesh.position.copy(this.position);

        // Check collision with player
        const distToPlayer = this.position.distanceTo(player.position);
        if (distToPlayer < 1) {
            if (window.game) {
                window.game.playerTakeDamage(this.damage);
            }
            this.destroy();
            return false;
        }

        // Check collision with walls
        const tileX = Math.floor(this.position.x / tileSize);
        const tileZ = Math.floor(this.position.z / tileSize);
        if (!dungeon.isWalkable(tileX, tileZ)) {
            this.destroy();
            return false;
        }

        return true;
    }

    destroy() {
        this.isAlive = false;
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
    }
}

// Enemy Manager
class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.projectiles = [];
        this.healthBarContainer = null;
    }

    init() {
        // Create container for enemy health bars
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.id = 'enemy-health-bars';
        document.getElementById('hud').appendChild(this.healthBarContainer);
    }

    spawnEnemies(spawnPoints, level) {
        this.clear();

        for (const spawn of spawnPoints) {
            // Determine enemy type
            const typeRoll = Math.random();
            let type;

            if (typeRoll < 0.5) {
                type = ENEMY_TYPES.BASIC;
            } else if (typeRoll < 0.7) {
                type = ENEMY_TYPES.FAST;
            } else if (typeRoll < 0.85) {
                type = ENEMY_TYPES.TANK;
            } else {
                type = ENEMY_TYPES.RANGED;
            }

            const position = new THREE.Vector3(
                spawn.x * 4 + 2, // tileSize = 4
                0,
                spawn.y * 4 + 2
            );

            const enemy = new Enemy(this.scene, type, position, level);
            this.healthBarContainer.appendChild(enemy.healthBarContainer);
            this.enemies.push(enemy);
        }
    }

    spawnBoss(spawnPoint, level) {
        const position = new THREE.Vector3(
            spawnPoint.x * 4 + 2,
            0,
            spawnPoint.y * 4 + 2
        );

        const boss = new Enemy(this.scene, ENEMY_TYPES.BOSS, position, level);
        this.enemies.push(boss);

        return boss;
    }

    update(delta, player, dungeon, tileSize, camera) {
        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            const alive = enemy.update(delta, player, dungeon, tileSize, this.projectiles);
            if (!alive) {
                enemy.destroy();
            } else {
                enemy.updateHealthBar(camera);
            }
            return alive;
        });

        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
            return proj.update(delta, player, dungeon, tileSize);
        });
    }

    getEnemiesInRange(position, range) {
        return this.enemies.filter(enemy => {
            return enemy.isAlive && enemy.position.distanceTo(position) < range;
        });
    }

    getClosestEnemy(position, maxRange = Infinity) {
        let closest = null;
        let closestDist = maxRange;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;
            const dist = enemy.position.distanceTo(position);
            if (dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        }

        return closest;
    }

    getAliveCount() {
        return this.enemies.filter(e => e.isAlive).length;
    }

    getBoss() {
        return this.enemies.find(e => e.type === ENEMY_TYPES.BOSS && e.isAlive);
    }

    clear() {
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];

        for (const proj of this.projectiles) {
            proj.destroy();
        }
        this.projectiles = [];

        if (this.healthBarContainer) {
            this.healthBarContainer.innerHTML = '';
        }
    }
}
