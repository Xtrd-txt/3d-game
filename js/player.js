// Player Controller with First Person Camera

class Player {
    constructor(camera, scene, dungeon) {
        this.camera = camera;
        this.scene = scene;
        this.dungeon = dungeon;

        // Position and movement
        this.position = new THREE.Vector3(0, 1.7, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 8;
        this.jumpForce = 8;
        this.gravity = 20;
        this.isGrounded = true;
        this.canBunnyHop = false; // Super buff

        // Mouse look
        this.pitch = 0;
        this.yaw = 0;
        this.mouseSensitivity = 0.002;

        // Collision
        this.radius = 0.5;
        this.height = 1.7;

        // Stats
        this.maxHealth = 3;
        this.health = 3;
        this.armor = 0;
        this.maxArmor = 10;

        // Combat stats
        this.meleeDamage = 2;
        this.rangedDamage = 1;
        this.critChance = 0.15;
        this.critMultiplier = 2.5;
        this.fireRate = 1; // Shots per second base
        this.fireRateBonus = 0;

        // Ammo
        this.ammo = 30;
        this.maxAmmo = 100;

        // Combat cooldowns
        this.lastShotTime = 0;
        this.lastMeleeTime = 0;
        this.meleeCooldown = 0.5;

        // Super buffs
        this.superBuffs = {
            chainLightning: false,
            ricochet: false,
            bunnyHop: false,
            instantKill: false
        };

        // Buffs from orbs
        this.buffs = {
            health: 0,
            fireRate: 0,
            meleeDamage: 0,
            rangedDamage: 0
        };

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            interact: false
        };
        this.mouse = {
            leftButton: false,
            rightButton: false
        };

        // Weapon bobbing
        this.bobTimer = 0;
        this.bobAmount = 0.05;
        this.bobSpeed = 10;

        // Damage flash
        this.damageFlashTime = 0;

        this.setupInput();
    }

    setupInput() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });

        // Mouse
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.handleMouseMove(e);
            }
        });

        document.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });

        document.addEventListener('mouseup', (e) => {
            this.handleMouseUp(e);
        });

        // Pointer lock
        document.getElementById('game-canvas').addEventListener('click', () => {
            if (window.game && window.game.isRunning && !window.game.isPaused) {
                document.getElementById('game-canvas').requestPointerLock();
            }
        });
    }

    handleKeyDown(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                break;
            case 'KeyE':
                this.keys.interact = true;
                break;
        }
    }

    handleKeyUp(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
            case 'KeyE':
                this.keys.interact = false;
                break;
        }
    }

    handleMouseMove(e) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;

        // Clamp pitch
        this.pitch = Utils.clamp(this.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
    }

    handleMouseDown(e) {
        if (e.button === 0) {
            this.mouse.leftButton = true;
        } else if (e.button === 2) {
            this.mouse.rightButton = true;
        }
    }

    handleMouseUp(e) {
        if (e.button === 0) {
            this.mouse.leftButton = false;
        } else if (e.button === 2) {
            this.mouse.rightButton = false;
        }
    }

    update(delta, dungeonGenerator, tileSize) {
        // Update camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        // Calculate movement direction
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);

        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();

        right.applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        // Movement input
        const moveDir = new THREE.Vector3(0, 0, 0);

        if (this.keys.forward) moveDir.add(forward);
        if (this.keys.backward) moveDir.sub(forward);
        if (this.keys.left) moveDir.sub(right);
        if (this.keys.right) moveDir.add(right);

        if (moveDir.length() > 0) {
            moveDir.normalize();
        }

        // Apply movement
        const speed = this.moveSpeed;
        this.velocity.x = moveDir.x * speed;
        this.velocity.z = moveDir.z * speed;

        // Gravity
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * delta;
        }

        // Jump
        if (this.keys.jump && (this.isGrounded || this.superBuffs.bunnyHop)) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;

            // Bunny hop gives speed boost
            if (this.superBuffs.bunnyHop && !this.isGrounded) {
                this.velocity.x *= 1.2;
                this.velocity.z *= 1.2;
            }
        }

        // Apply velocity with collision
        const newPos = this.position.clone();
        newPos.x += this.velocity.x * delta;
        newPos.z += this.velocity.z * delta;
        newPos.y += this.velocity.y * delta;

        // Collision detection
        if (dungeonGenerator) {
            // X collision
            const tileX = Math.floor(newPos.x / tileSize);
            const tileZ = Math.floor(this.position.z / tileSize);

            if (!dungeonGenerator.isWalkable(tileX, tileZ)) {
                newPos.x = this.position.x;
                this.velocity.x = 0;
            }

            // Z collision
            const tileX2 = Math.floor(this.position.x / tileSize);
            const tileZ2 = Math.floor(newPos.z / tileSize);

            if (!dungeonGenerator.isWalkable(tileX2, tileZ2)) {
                newPos.z = this.position.z;
                this.velocity.z = 0;
            }

            // Corner collision
            const tileX3 = Math.floor(newPos.x / tileSize);
            const tileZ3 = Math.floor(newPos.z / tileSize);

            if (!dungeonGenerator.isWalkable(tileX3, tileZ3)) {
                newPos.x = this.position.x;
                newPos.z = this.position.z;
                this.velocity.x = 0;
                this.velocity.z = 0;
            }
        }

        // Ground collision
        if (newPos.y < this.height) {
            newPos.y = this.height;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // Ceiling collision
        if (newPos.y > 3.5) {
            newPos.y = 3.5;
            this.velocity.y = 0;
        }

        this.position.copy(newPos);

        // Weapon bobbing
        if (moveDir.length() > 0 && this.isGrounded) {
            this.bobTimer += delta * this.bobSpeed;
        } else {
            this.bobTimer = 0;
        }

        // Update camera position
        const bobOffset = Math.sin(this.bobTimer) * this.bobAmount;
        this.camera.position.copy(this.position);
        this.camera.position.y += bobOffset;

        // Update damage flash
        if (this.damageFlashTime > 0) {
            this.damageFlashTime -= delta;
        }
    }

    spawn(x, z, tileSize) {
        this.position.set(
            x * tileSize + tileSize / 2,
            this.height,
            z * tileSize + tileSize / 2
        );
        this.velocity.set(0, 0, 0);
        this.yaw = 0;
        this.pitch = 0;
    }

    takeDamage(amount) {
        // Armor absorbs damage first
        if (this.armor > 0) {
            const armorDamage = Math.min(this.armor, amount);
            this.armor -= armorDamage;
            amount -= armorDamage;
        }

        if (amount > 0) {
            this.health -= amount;
            this.damageFlashTime = 0.3;

            // Show damage indicator
            const indicator = document.getElementById('damage-indicator');
            indicator.classList.add('active');
            setTimeout(() => indicator.classList.remove('active'), 100);
        }

        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    addArmor(amount) {
        this.armor = Math.min(this.armor + amount, this.maxArmor);
    }

    addAmmo(amount) {
        this.ammo = Math.min(this.ammo + amount, this.maxAmmo);
    }

    canShoot() {
        const fireInterval = 1 / (this.fireRate + this.fireRateBonus + this.buffs.fireRate);
        return this.ammo > 0 && (performance.now() / 1000 - this.lastShotTime) >= fireInterval;
    }

    canMelee() {
        return (performance.now() / 1000 - this.lastMeleeTime) >= this.meleeCooldown;
    }

    shoot() {
        if (!this.canShoot()) return null;

        this.ammo--;
        this.lastShotTime = performance.now() / 1000;

        // Calculate damage with crit
        let damage = this.rangedDamage + this.buffs.rangedDamage;
        let isCrit = false;

        if (Math.random() < this.critChance) {
            damage = Math.round(damage * this.critMultiplier);
            isCrit = true;
        }

        // Instant kill chance
        let isInstantKill = false;
        if (this.superBuffs.instantKill && Math.random() < 0.05) {
            isInstantKill = true;
        }

        return {
            damage,
            isCrit,
            isInstantKill,
            chainLightning: this.superBuffs.chainLightning,
            ricochet: this.superBuffs.ricochet
        };
    }

    melee() {
        if (!this.canMelee()) return null;

        this.lastMeleeTime = performance.now() / 1000;

        // Calculate damage with crit
        let damage = this.meleeDamage + this.buffs.meleeDamage;
        let isCrit = false;

        if (Math.random() < this.critChance) {
            damage = 5; // Critical hit is always 5 damage
            isCrit = true;
        }

        // Instant kill chance
        let isInstantKill = false;
        if (this.superBuffs.instantKill && Math.random() < 0.05) {
            isInstantKill = true;
        }

        return {
            damage,
            isCrit,
            isInstantKill
        };
    }

    applyBuff(buffType) {
        switch (buffType) {
            case 'health':
                this.maxHealth += 1;
                this.health += 1;
                this.buffs.health++;
                break;
            case 'fireRate':
                this.buffs.fireRate++;
                break;
            case 'meleeDamage':
                this.buffs.meleeDamage++;
                break;
            case 'rangedDamage':
                this.buffs.rangedDamage++;
                break;
        }
    }

    applySuperBuff(buffType) {
        switch (buffType) {
            case 'chainLightning':
                this.superBuffs.chainLightning = true;
                break;
            case 'ricochet':
                this.superBuffs.ricochet = true;
                break;
            case 'bunnyHop':
                this.superBuffs.bunnyHop = true;
                break;
            case 'instantKill':
                this.superBuffs.instantKill = true;
                break;
        }
    }

    reset() {
        this.health = 3;
        this.maxHealth = 3;
        this.armor = 0;
        this.ammo = 30;
        this.meleeDamage = 2;
        this.rangedDamage = 1;
        this.fireRateBonus = 0;

        this.superBuffs = {
            chainLightning: false,
            ricochet: false,
            bunnyHop: false,
            instantKill: false
        };

        this.buffs = {
            health: 0,
            fireRate: 0,
            meleeDamage: 0,
            rangedDamage: 0
        };

        this.velocity.set(0, 0, 0);
        this.damageFlashTime = 0;
    }

    getForwardDirection() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        return forward;
    }

    getWorldPosition() {
        return this.position.clone();
    }
}

// Weapon visual (simple gun model)
class WeaponView {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.group = new THREE.Group();

        this.createWeaponModel();

        // Animation state
        this.recoilAmount = 0;
        this.swayAmount = new THREE.Vector2();
    }

    createWeaponModel() {
        // Simple pistol model
        const gunGroup = new THREE.Group();

        // Barrel
        const barrelGeom = new THREE.BoxGeometry(0.08, 0.08, 0.4);
        const gunMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeom, gunMat);
        barrel.position.set(0, 0, -0.2);
        gunGroup.add(barrel);

        // Handle
        const handleGeom = new THREE.BoxGeometry(0.06, 0.15, 0.1);
        const handle = new THREE.Mesh(handleGeom, gunMat);
        handle.position.set(0, -0.1, 0);
        gunGroup.add(handle);

        // Muzzle
        const muzzleGeom = new THREE.CylinderGeometry(0.02, 0.03, 0.05, 8);
        const muzzle = new THREE.Mesh(muzzleGeom, gunMat);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0, -0.42);
        gunGroup.add(muzzle);

        // Position relative to camera
        gunGroup.position.set(0.25, -0.2, -0.4);
        this.group.add(gunGroup);
        this.gunGroup = gunGroup;

        // Muzzle flash
        const flashGeom = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        this.muzzleFlash = new THREE.Mesh(flashGeom, flashMat);
        this.muzzleFlash.position.set(0.25, -0.2, -0.8);
        this.group.add(this.muzzleFlash);

        // Add to camera
        this.camera.add(this.group);
        this.scene.add(this.camera);
    }

    update(delta) {
        // Recoil animation
        if (this.recoilAmount > 0) {
            this.recoilAmount -= delta * 10;
            if (this.recoilAmount < 0) this.recoilAmount = 0;
        }

        this.gunGroup.position.z = -0.4 + this.recoilAmount * 0.1;
        this.gunGroup.rotation.x = this.recoilAmount * 0.3;

        // Muzzle flash fade
        if (this.muzzleFlash.material.opacity > 0) {
            this.muzzleFlash.material.opacity -= delta * 20;
        }
    }

    playShootAnimation() {
        this.recoilAmount = 1;
        this.muzzleFlash.material.opacity = 1;
    }

    playMeleeAnimation() {
        // Quick punch animation
        this.gunGroup.position.z = -0.2;
        setTimeout(() => {
            this.gunGroup.position.z = -0.4;
        }, 100);
    }
}
