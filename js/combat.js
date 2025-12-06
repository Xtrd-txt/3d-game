// Combat System

class CombatSystem {
    constructor(scene, player, enemyManager, camera) {
        this.scene = scene;
        this.player = player;
        this.enemyManager = enemyManager;
        this.camera = camera;

        // Raycaster for shooting
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 100;

        // Projectiles (player)
        this.playerProjectiles = [];

        // Visual effects
        this.effects = [];

        // Melee range
        this.meleeRange = 3;

        // Chain lightning state
        this.chainLightningTargets = [];
    }

    update(delta) {
        // Update player projectiles
        this.playerProjectiles = this.playerProjectiles.filter(proj => {
            return proj.update(delta, this.enemyManager, this.scene);
        });

        // Update effects
        this.effects = this.effects.filter(effect => {
            return effect.update(delta);
        });
    }

    performRangedAttack() {
        const shootResult = this.player.shoot();
        if (!shootResult) return null;

        // Play shoot animation
        if (window.game && window.game.weaponView) {
            window.game.weaponView.playShootAnimation();
        }

        // Raycast from camera center
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Get enemy meshes
        const enemyMeshes = this.enemyManager.enemies
            .filter(e => e.isAlive)
            .map(e => e.mesh);

        const intersects = this.raycaster.intersectObjects(enemyMeshes, true);

        let hitEnemy = null;
        let hitPoint = null;

        if (intersects.length > 0) {
            // Find the enemy that was hit
            for (const enemy of this.enemyManager.enemies) {
                if (!enemy.isAlive) continue;

                // Check if any intersection belongs to this enemy
                for (const intersect of intersects) {
                    if (intersect.object === enemy.mesh ||
                        intersect.object.parent === enemy.mesh) {
                        hitEnemy = enemy;
                        hitPoint = intersect.point;
                        break;
                    }
                }
                if (hitEnemy) break;
            }
        }

        if (hitEnemy) {
            // Apply damage
            const killed = hitEnemy.takeDamage(shootResult.damage, shootResult.isInstantKill);

            // Show hit marker
            this.showHitMarker(shootResult.isCrit, shootResult.isInstantKill);

            // Create hit effect
            this.createHitEffect(hitPoint, shootResult.isCrit);

            // Chain lightning
            if (shootResult.chainLightning && !killed) {
                this.performChainLightning(hitEnemy, 0.5, 3);
            }

            // Ricochet
            if (shootResult.ricochet) {
                this.performRicochet(hitPoint, shootResult.damage, 2);
            }

            return { hit: true, killed, enemy: hitEnemy, crit: shootResult.isCrit };
        }

        // Create tracer effect even on miss
        const endPoint = this.player.position.clone()
            .add(this.player.getForwardDirection().multiplyScalar(50));
        this.createTracerEffect(this.player.position.clone(), endPoint);

        return { hit: false };
    }

    performMeleeAttack() {
        const meleeResult = this.player.melee();
        if (!meleeResult) return null;

        // Play melee animation
        if (window.game && window.game.weaponView) {
            window.game.weaponView.playMeleeAnimation();
        }

        // Find enemies in melee range
        const playerPos = this.player.position.clone();
        const forward = this.player.getForwardDirection();

        let hitEnemy = null;
        let closestDist = this.meleeRange;

        for (const enemy of this.enemyManager.enemies) {
            if (!enemy.isAlive) continue;

            const toEnemy = enemy.position.clone().sub(playerPos);
            const dist = toEnemy.length();

            if (dist > this.meleeRange) continue;

            // Check if enemy is in front of player
            toEnemy.normalize();
            const dot = forward.dot(toEnemy);

            if (dot > 0.5 && dist < closestDist) {
                closestDist = dist;
                hitEnemy = enemy;
            }
        }

        if (hitEnemy) {
            // Apply damage
            const killed = hitEnemy.takeDamage(meleeResult.damage, meleeResult.isInstantKill);

            // Show hit marker
            this.showHitMarker(meleeResult.isCrit, meleeResult.isInstantKill);

            // Create hit effect
            this.createMeleeHitEffect(hitEnemy.position.clone());

            return { hit: true, killed, enemy: hitEnemy, crit: meleeResult.isCrit };
        }

        // Swing effect even on miss
        this.createSwingEffect();

        return { hit: false };
    }

    performChainLightning(sourceEnemy, damage, maxTargets) {
        const chainedEnemies = [sourceEnemy];
        let currentPos = sourceEnemy.position.clone();
        const chainRange = 8;

        for (let i = 0; i < maxTargets; i++) {
            // Find closest enemy not already chained
            let closestEnemy = null;
            let closestDist = chainRange;

            for (const enemy of this.enemyManager.enemies) {
                if (!enemy.isAlive || chainedEnemies.includes(enemy)) continue;

                const dist = enemy.position.distanceTo(currentPos);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }

            if (closestEnemy) {
                // Create lightning effect
                this.createLightningEffect(currentPos, closestEnemy.position.clone());

                // Apply damage
                closestEnemy.takeDamage(damage);

                chainedEnemies.push(closestEnemy);
                currentPos = closestEnemy.position.clone();
            } else {
                break;
            }
        }
    }

    performRicochet(hitPoint, damage, maxBounces) {
        let currentPos = hitPoint.clone();
        let currentDir = this.player.getForwardDirection();
        const ricochetRange = 15;

        for (let i = 0; i < maxBounces; i++) {
            // Find enemy in new direction (with some randomness)
            const spreadAngle = Math.PI / 4;
            const randomAngle = Utils.randomFloat(-spreadAngle, spreadAngle);

            const newDir = currentDir.clone();
            newDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);

            // Raycast in new direction
            this.raycaster.set(currentPos, newDir);
            this.raycaster.far = ricochetRange;

            const enemyMeshes = this.enemyManager.enemies
                .filter(e => e.isAlive)
                .map(e => e.mesh);

            const intersects = this.raycaster.intersectObjects(enemyMeshes, true);

            if (intersects.length > 0) {
                for (const enemy of this.enemyManager.enemies) {
                    if (!enemy.isAlive) continue;

                    for (const intersect of intersects) {
                        if (intersect.object === enemy.mesh ||
                            intersect.object.parent === enemy.mesh) {
                            // Create tracer
                            this.createTracerEffect(currentPos, intersect.point);

                            // Apply damage
                            enemy.takeDamage(damage);

                            // Continue from this point
                            currentPos = intersect.point;
                            currentDir = intersect.point.clone().sub(currentPos).normalize();
                            break;
                        }
                    }
                }
            } else {
                // No more enemies hit
                break;
            }
        }
    }

    showHitMarker(isCrit, isInstantKill) {
        const hitMarker = document.getElementById('hit-marker');

        if (isInstantKill) {
            hitMarker.textContent = 'INSTANT KILL!';
            hitMarker.className = 'critical';
        } else if (isCrit) {
            hitMarker.textContent = 'CRIT!';
            hitMarker.className = 'critical';
        } else {
            hitMarker.textContent = '✕';
            hitMarker.className = '';
        }

        hitMarker.style.opacity = '1';
        setTimeout(() => {
            hitMarker.style.opacity = '0';
        }, 200);
    }

    createHitEffect(position, isCrit) {
        // Particle burst
        const color = isCrit ? 0xffcc00 : 0xff4444;
        const particleCount = isCrit ? 15 : 8;

        for (let i = 0; i < particleCount; i++) {
            const particle = new HitParticle(
                this.scene,
                position.clone(),
                color
            );
            this.effects.push(particle);
        }
    }

    createMeleeHitEffect(position) {
        // Impact wave
        const geometry = new THREE.RingGeometry(0.1, 0.5, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.lookAt(this.camera.position);
        this.scene.add(ring);

        this.effects.push({
            mesh: ring,
            lifetime: 0.3,
            age: 0,
            update(delta) {
                this.age += delta;
                const scale = 1 + this.age * 5;
                this.mesh.scale.set(scale, scale, scale);
                this.mesh.material.opacity = 1 - (this.age / this.lifetime);

                if (this.age >= this.lifetime) {
                    this.mesh.parent.remove(this.mesh);
                    this.mesh.geometry.dispose();
                    this.mesh.material.dispose();
                    return false;
                }
                return true;
            }
        });
    }

    createSwingEffect() {
        // Arc effect for melee swing
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1, 0, -1),
            new THREE.Vector3(0, 0.5, -1.5),
            new THREE.Vector3(1, 0, -1)
        );

        const points = curve.getPoints(20);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(geometry, material);

        // Position relative to player
        line.position.copy(this.player.position);
        line.quaternion.copy(this.camera.quaternion);
        this.scene.add(line);

        this.effects.push({
            mesh: line,
            lifetime: 0.15,
            age: 0,
            update(delta) {
                this.age += delta;
                this.mesh.material.opacity = 0.8 * (1 - this.age / this.lifetime);

                if (this.age >= this.lifetime) {
                    this.mesh.parent.remove(this.mesh);
                    this.mesh.geometry.dispose();
                    this.mesh.material.dispose();
                    return false;
                }
                return true;
            }
        });
    }

    createTracerEffect(start, end) {
        const direction = end.clone().sub(start);
        const length = direction.length();

        const geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 4);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const tracer = new THREE.Mesh(geometry, material);

        // Position and orient
        tracer.position.copy(start).add(direction.multiplyScalar(0.5));
        tracer.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        this.scene.add(tracer);

        this.effects.push({
            mesh: tracer,
            lifetime: 0.1,
            age: 0,
            update(delta) {
                this.age += delta;
                this.mesh.material.opacity = 0.8 * (1 - this.age / this.lifetime);

                if (this.age >= this.lifetime) {
                    this.mesh.parent.remove(this.mesh);
                    this.mesh.geometry.dispose();
                    this.mesh.material.dispose();
                    return false;
                }
                return true;
            }
        });
    }

    createLightningEffect(start, end) {
        // Create jagged lightning line
        const points = [];
        const segments = 10;
        const direction = end.clone().sub(start);
        const length = direction.length();

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = start.clone().lerp(end, t);

            if (i > 0 && i < segments) {
                // Add randomness
                point.x += Utils.randomFloat(-0.3, 0.3);
                point.y += Utils.randomFloat(-0.3, 0.3);
                point.z += Utils.randomFloat(-0.3, 0.3);
            }

            points.push(point);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1
        });
        const lightning = new THREE.Line(geometry, material);
        this.scene.add(lightning);

        // Add glow
        const glowMaterial = new THREE.LineBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.5,
            linewidth: 3
        });
        const glow = new THREE.Line(geometry.clone(), glowMaterial);
        glow.scale.set(1.5, 1.5, 1.5);
        this.scene.add(glow);

        this.effects.push({
            mesh: lightning,
            glow: glow,
            lifetime: 0.2,
            age: 0,
            scene: this.scene,
            update(delta) {
                this.age += delta;
                const opacity = 1 - (this.age / this.lifetime);
                this.mesh.material.opacity = opacity;
                this.glow.material.opacity = opacity * 0.5;

                if (this.age >= this.lifetime) {
                    this.scene.remove(this.mesh);
                    this.scene.remove(this.glow);
                    this.mesh.geometry.dispose();
                    this.mesh.material.dispose();
                    this.glow.geometry.dispose();
                    this.glow.material.dispose();
                    return false;
                }
                return true;
            }
        });
    }

    clear() {
        for (const proj of this.playerProjectiles) {
            if (proj.mesh) {
                this.scene.remove(proj.mesh);
            }
        }
        this.playerProjectiles = [];

        for (const effect of this.effects) {
            if (effect.mesh) {
                this.scene.remove(effect.mesh);
            }
            if (effect.glow) {
                this.scene.remove(effect.glow);
            }
        }
        this.effects = [];
    }
}

// Hit particle effect
class HitParticle {
    constructor(scene, position, color) {
        this.scene = scene;

        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);

        // Random velocity
        this.velocity = new THREE.Vector3(
            Utils.randomFloat(-3, 3),
            Utils.randomFloat(1, 5),
            Utils.randomFloat(-3, 3)
        );

        this.lifetime = 0.5;
        this.age = 0;
        this.gravity = 15;
    }

    update(delta) {
        this.age += delta;

        // Apply gravity
        this.velocity.y -= this.gravity * delta;

        // Move
        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));

        // Fade
        this.mesh.material.opacity = 1 - (this.age / this.lifetime);

        // Shrink
        const scale = 1 - (this.age / this.lifetime) * 0.5;
        this.mesh.scale.set(scale, scale, scale);

        if (this.age >= this.lifetime) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            return false;
        }

        return true;
    }
}
