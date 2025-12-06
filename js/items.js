// Items System - Ammo, Armor, Buff Orbs

const ITEM_TYPES = {
    AMMO: 'ammo',
    ARMOR: 'armor',
    BUFF_ORB: 'buffOrb',
    EXIT_PORTAL: 'exitPortal'
};

const BUFF_TYPES = [
    { id: 'health', name: '+1 Здоровье', icon: '❤️', color: 0xff4444 },
    { id: 'fireRate', name: '+1 Скорострельность', icon: '🔥', color: 0xff8800 },
    { id: 'meleeDamage', name: '+1 Урон (кулак)', icon: '👊', color: 0xffcc00 },
    { id: 'rangedDamage', name: '+1 Урон (оружие)', icon: '🎯', color: 0x44ff44 }
];

const SUPER_BUFF_TYPES = [
    { id: 'chainLightning', name: 'Цепная молния', description: 'Выстрелы бьют нескольких врагов', icon: '⚡', color: 0x00ffff },
    { id: 'ricochet', name: 'Рикошет', description: 'Пули отскакивают к другим врагам', icon: '🔄', color: 0xff00ff },
    { id: 'bunnyHop', name: 'Банни-хоп', description: 'Прыжки в воздухе + ускорение', icon: '🐰', color: 0x88ff88 },
    { id: 'instantKill', name: 'Казнь', description: '5% шанс убить с одного удара', icon: '💀', color: 0xff0000 }
];

class Item {
    constructor(scene, type, position, data = {}) {
        this.scene = scene;
        this.type = type;
        this.position = position.clone();
        this.data = data;
        this.isCollected = false;
        this.animationTimer = 0;
        this.bobSpeed = 2;
        this.bobAmount = 0.2;
        this.rotateSpeed = 1;

        this.createMesh();
    }

    createMesh() {
        switch (this.type) {
            case ITEM_TYPES.AMMO:
                this.createAmmoMesh();
                break;
            case ITEM_TYPES.ARMOR:
                this.createArmorMesh();
                break;
            case ITEM_TYPES.BUFF_ORB:
                this.createBuffOrbMesh();
                break;
            case ITEM_TYPES.EXIT_PORTAL:
                this.createExitPortalMesh();
                break;
        }
    }

    createAmmoMesh() {
        const group = new THREE.Group();

        // Ammo box
        const boxGeom = new THREE.BoxGeometry(0.4, 0.3, 0.25);
        const boxMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const box = new THREE.Mesh(boxGeom, boxMat);
        group.add(box);

        // Bullets visible on top
        for (let i = 0; i < 3; i++) {
            const bulletGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
            const bulletMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
            const bullet = new THREE.Mesh(bulletGeom, bulletMat);
            bullet.position.set(-0.1 + i * 0.1, 0.2, 0);
            group.add(bullet);
        }

        group.position.copy(this.position);
        group.position.y = 0.5;
        this.mesh = group;
        this.scene.add(this.mesh);

        // Point light
        this.light = new THREE.PointLight(0xffcc00, 0.5, 3);
        this.light.position.copy(this.position);
        this.light.position.y = 1;
        this.scene.add(this.light);
    }

    createArmorMesh() {
        const group = new THREE.Group();

        // Shield shape
        const shieldGeom = new THREE.BoxGeometry(0.5, 0.6, 0.1);
        const shieldMat = new THREE.MeshLambertMaterial({
            color: 0x4488ff,
            emissive: 0x224488,
            emissiveIntensity: 0.3
        });
        const shield = new THREE.Mesh(shieldGeom, shieldMat);
        group.add(shield);

        // Cross on shield
        const crossH = new THREE.BoxGeometry(0.3, 0.08, 0.12);
        const crossV = new THREE.BoxGeometry(0.08, 0.25, 0.12);
        const crossMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const crossHMesh = new THREE.Mesh(crossH, crossMat);
        const crossVMesh = new THREE.Mesh(crossV, crossMat);
        group.add(crossHMesh);
        group.add(crossVMesh);

        group.position.copy(this.position);
        group.position.y = 0.8;
        this.mesh = group;
        this.scene.add(this.mesh);

        // Point light
        this.light = new THREE.PointLight(0x4488ff, 0.5, 3);
        this.light.position.copy(this.position);
        this.light.position.y = 1;
        this.scene.add(this.light);
    }

    createBuffOrbMesh() {
        // Glowing yellow orb
        const geometry = new THREE.SphereGeometry(0.4, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.9
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 1.5;
        this.scene.add(this.mesh);

        // Outer glow
        const glowGeom = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeom, glowMat);
        this.mesh.add(this.glow);

        // Point light
        this.light = new THREE.PointLight(0xffcc00, 1, 8);
        this.light.position.copy(this.position);
        this.light.position.y = 1.5;
        this.scene.add(this.light);

        // Particles around orb
        this.particles = [];
        for (let i = 0; i < 8; i++) {
            const particleGeom = new THREE.SphereGeometry(0.08, 4, 4);
            const particleMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const particle = new THREE.Mesh(particleGeom, particleMat);
            particle.userData.angle = (i / 8) * Math.PI * 2;
            particle.userData.radius = 0.8;
            particle.userData.speed = 1 + Math.random() * 0.5;
            this.mesh.add(particle);
            this.particles.push(particle);
        }
    }

    createExitPortalMesh() {
        const group = new THREE.Group();

        // Portal ring
        const ringGeom = new THREE.TorusGeometry(1, 0.1, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // Inner portal effect
        const portalGeom = new THREE.CircleGeometry(0.9, 32);
        const portalMat = new THREE.MeshBasicMaterial({
            color: 0x88ff88,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const portal = new THREE.Mesh(portalGeom, portalMat);
        portal.rotation.x = -Math.PI / 2;
        portal.position.y = 0.1;
        group.add(portal);
        this.portalInner = portal;

        group.position.copy(this.position);
        group.position.y = 0.5;
        this.mesh = group;
        this.scene.add(this.mesh);

        // Point light
        this.light = new THREE.PointLight(0x00ff00, 1, 6);
        this.light.position.copy(this.position);
        this.light.position.y = 1;
        this.scene.add(this.light);

        // Initially hidden
        this.setVisible(false);
    }

    update(delta) {
        if (this.isCollected) return;

        this.animationTimer += delta;

        // Bobbing animation
        const bobOffset = Math.sin(this.animationTimer * this.bobSpeed) * this.bobAmount;

        if (this.type === ITEM_TYPES.BUFF_ORB) {
            this.mesh.position.y = 1.5 + bobOffset;

            // Rotate particles
            for (const particle of this.particles) {
                particle.userData.angle += delta * particle.userData.speed;
                particle.position.x = Math.cos(particle.userData.angle) * particle.userData.radius;
                particle.position.z = Math.sin(particle.userData.angle) * particle.userData.radius;
                particle.position.y = Math.sin(particle.userData.angle * 2) * 0.2;
            }

            // Pulse glow
            if (this.glow) {
                const pulse = 0.3 + Math.sin(this.animationTimer * 3) * 0.1;
                this.glow.material.opacity = pulse;
            }
        } else if (this.type === ITEM_TYPES.EXIT_PORTAL) {
            // Rotate portal
            this.mesh.rotation.y += delta * 0.5;

            // Pulse inner portal
            if (this.portalInner) {
                const scale = 1 + Math.sin(this.animationTimer * 2) * 0.1;
                this.portalInner.scale.set(scale, scale, 1);
            }
        } else {
            this.mesh.position.y = 0.5 + bobOffset;
            this.mesh.rotation.y += delta * this.rotateSpeed;
        }

        // Pulse light
        if (this.light) {
            this.light.intensity = 0.5 + Math.sin(this.animationTimer * 3) * 0.2;
        }
    }

    checkCollection(playerPosition, collectionRange = 1.5) {
        if (this.isCollected) return false;

        const dist = this.position.distanceTo(
            new THREE.Vector3(playerPosition.x, this.position.y, playerPosition.z)
        );

        return dist < collectionRange;
    }

    collect() {
        this.isCollected = true;
        this.scene.remove(this.mesh);
        if (this.light) {
            this.scene.remove(this.light);
        }
    }

    setVisible(visible) {
        if (this.mesh) {
            this.mesh.visible = visible;
        }
        if (this.light) {
            this.light.visible = visible;
        }
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            // Dispose geometries and materials
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        if (this.light) {
            this.scene.remove(this.light);
        }
        if (this.glow) {
            this.glow.geometry.dispose();
            this.glow.material.dispose();
        }
    }
}

class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.exitPortal = null;
    }

    spawnItems(dungeonData, tileSize) {
        this.clear();

        // Spawn ammo packs
        for (const spawn of dungeonData.ammoSpawnPoints) {
            const position = new THREE.Vector3(
                spawn.x * tileSize + tileSize / 2,
                0,
                spawn.y * tileSize + tileSize / 2
            );
            const item = new Item(this.scene, ITEM_TYPES.AMMO, position, { amount: spawn.amount });
            this.items.push(item);
        }

        // Spawn armor
        for (const spawn of dungeonData.armorSpawnPoints) {
            const position = new THREE.Vector3(
                spawn.x * tileSize + tileSize / 2,
                0,
                spawn.y * tileSize + tileSize / 2
            );
            const item = new Item(this.scene, ITEM_TYPES.ARMOR, position, { value: spawn.value });
            this.items.push(item);
        }

        // Spawn buff orbs
        for (const spawn of dungeonData.buffOrbSpawnPoints) {
            const position = new THREE.Vector3(
                spawn.x * tileSize + tileSize / 2,
                0,
                spawn.y * tileSize + tileSize / 2
            );
            const item = new Item(this.scene, ITEM_TYPES.BUFF_ORB, position);
            this.items.push(item);
        }

        // Create exit portal (hidden initially)
        if (dungeonData.exitPoint) {
            const position = new THREE.Vector3(
                dungeonData.exitPoint.x * tileSize + tileSize / 2,
                0,
                dungeonData.exitPoint.y * tileSize + tileSize / 2
            );
            this.exitPortal = new Item(this.scene, ITEM_TYPES.EXIT_PORTAL, position);
            this.items.push(this.exitPortal);
        }
    }

    update(delta, player) {
        const collectedItems = [];

        for (const item of this.items) {
            item.update(delta);

            // Check collection
            if (item.checkCollection(player.position)) {
                if (item.type === ITEM_TYPES.EXIT_PORTAL) {
                    // Only collect if visible (boss defeated)
                    if (item.mesh.visible) {
                        collectedItems.push(item);
                    }
                } else {
                    collectedItems.push(item);
                }
            }
        }

        return collectedItems;
    }

    showExitPortal() {
        if (this.exitPortal) {
            this.exitPortal.setVisible(true);
        }
    }

    clear() {
        for (const item of this.items) {
            item.destroy();
        }
        this.items = [];
        this.exitPortal = null;
    }
}
