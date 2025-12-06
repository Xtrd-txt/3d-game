// UI Manager

class UIManager {
    constructor() {
        // Get UI elements
        this.healthFill = document.getElementById('health-fill');
        this.healthText = document.getElementById('health-text');
        this.armorFill = document.getElementById('armor-fill');
        this.ammoText = document.getElementById('ammo-text');
        this.levelText = document.getElementById('current-level');
        this.enemiesText = document.getElementById('enemies-count');
        this.buffsContainer = document.getElementById('buffs-container');
        this.messageContainer = document.getElementById('message-container');
        this.upgradeMenu = document.getElementById('upgrade-menu');
        this.upgradeOptions = document.getElementById('upgrade-options');
        this.superBuffMenu = document.getElementById('super-buff-menu');
        this.superBuffOptions = document.getElementById('super-buff-options');
        this.screenOverlay = document.getElementById('screen-overlay');
        this.startButton = document.getElementById('start-button');
        this.bossHealthContainer = document.getElementById('boss-health-container');
        this.bossHealthFill = document.getElementById('boss-health-fill');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        // State
        this.currentBuffs = [];
        this.currentSuperBuffs = [];
        this.messageTimeout = null;

        // Setup minimap
        this.setupMinimap();
    }

    setupMinimap() {
        this.minimapCanvas.width = 150;
        this.minimapCanvas.height = 150;
    }

    updateHealth(current, max) {
        const percent = (current / max) * 100;
        this.healthFill.style.width = percent + '%';
        this.healthText.textContent = `${current}/${max}`;

        // Color based on health
        if (percent <= 25) {
            this.healthFill.style.background = 'linear-gradient(to bottom, #ff0000, #aa0000)';
        } else if (percent <= 50) {
            this.healthFill.style.background = 'linear-gradient(to bottom, #ff6600, #cc4400)';
        } else {
            this.healthFill.style.background = 'linear-gradient(to bottom, #ff6666, #ff4444)';
        }
    }

    updateArmor(current, max) {
        const percent = (current / max) * 100;
        this.armorFill.style.width = percent + '%';

        // Hide if no armor
        document.getElementById('armor-container').style.opacity = current > 0 ? '1' : '0.3';
    }

    updateAmmo(current) {
        this.ammoText.textContent = current;

        // Color based on ammo
        if (current <= 5) {
            this.ammoText.style.color = '#ff4444';
        } else if (current <= 15) {
            this.ammoText.style.color = '#ffcc00';
        } else {
            this.ammoText.style.color = '#ffffff';
        }
    }

    updateLevel(level) {
        this.levelText.textContent = level;
    }

    updateEnemyCount(count) {
        this.enemiesText.textContent = count;
    }

    addBuff(buffType, buffName, icon) {
        this.currentBuffs.push({ type: buffType, name: buffName, icon });
        this.renderBuffs();
    }

    addSuperBuff(buffType, buffName, icon) {
        this.currentSuperBuffs.push({ type: buffType, name: buffName, icon });
        this.renderBuffs();
    }

    renderBuffs() {
        this.buffsContainer.innerHTML = '';

        // Regular buffs
        for (const buff of this.currentBuffs) {
            const div = document.createElement('div');
            div.className = 'buff-item';
            div.textContent = `${buff.icon} ${buff.name}`;
            this.buffsContainer.appendChild(div);
        }

        // Super buffs
        for (const buff of this.currentSuperBuffs) {
            const div = document.createElement('div');
            div.className = 'buff-item super-buff';
            div.textContent = `${buff.icon} ${buff.name}`;
            this.buffsContainer.appendChild(div);
        }
    }

    clearBuffs() {
        this.currentBuffs = [];
        this.currentSuperBuffs = [];
        this.buffsContainer.innerHTML = '';
    }

    showMessage(text, duration = 2000) {
        this.messageContainer.textContent = text;
        this.messageContainer.classList.add('visible');

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            this.messageContainer.classList.remove('visible');
        }, duration);
    }

    showUpgradeMenu(onSelect) {
        this.upgradeOptions.innerHTML = '';

        for (const buff of BUFF_TYPES) {
            const option = document.createElement('div');
            option.className = 'upgrade-option';
            option.innerHTML = `
                <div class="icon">${buff.icon}</div>
                <div class="name">${buff.name}</div>
            `;
            option.onclick = () => {
                onSelect(buff);
                this.hideUpgradeMenu();
            };
            this.upgradeOptions.appendChild(option);
        }

        this.upgradeMenu.style.display = 'block';

        // Exit pointer lock to allow clicking
        document.exitPointerLock();
    }

    hideUpgradeMenu() {
        this.upgradeMenu.style.display = 'none';
    }

    showSuperBuffMenu(onSelect) {
        this.superBuffOptions.innerHTML = '';

        // Show random selection of super buffs (2 options)
        const availableBuffs = Utils.shuffleArray([...SUPER_BUFF_TYPES]).slice(0, 2);

        for (const buff of availableBuffs) {
            const option = document.createElement('div');
            option.className = 'upgrade-option super-buff-option';
            option.innerHTML = `
                <div class="icon">${buff.icon}</div>
                <div class="name">${buff.name}</div>
                <div class="description" style="font-size: 11px; color: #aaa; margin-top: 5px;">${buff.description}</div>
            `;
            option.onclick = () => {
                onSelect(buff);
                this.hideSuperBuffMenu();
            };
            this.superBuffOptions.appendChild(option);
        }

        this.superBuffMenu.style.display = 'block';

        // Exit pointer lock to allow clicking
        document.exitPointerLock();
    }

    hideSuperBuffMenu() {
        this.superBuffMenu.style.display = 'none';
    }

    showStartScreen() {
        this.screenOverlay.style.display = 'flex';
        this.screenOverlay.innerHTML = `
            <h1>DUNGEON CRAWLER</h1>
            <div class="subtitle">Рогалик с процедурной генерацией</div>
            <button id="start-button">НАЧАТЬ ИГРУ</button>
            <div id="controls-hint">
                <p>WASD - движение | Мышь - обзор</p>
                <p>ЛКМ - стрелять | ПКМ - удар</p>
                <p>E - взаимодействие</p>
            </div>
        `;

        return new Promise((resolve) => {
            document.getElementById('start-button').onclick = () => {
                this.hideStartScreen();
                resolve();
            };
        });
    }

    hideStartScreen() {
        this.screenOverlay.style.display = 'none';
    }

    showDeathScreen(level, enemiesKilled) {
        this.screenOverlay.style.display = 'flex';
        this.screenOverlay.innerHTML = `
            <h1>ВЫ ПОГИБЛИ</h1>
            <div class="stats">
                <div>Достигнутый уровень: ${level}</div>
                <div>Врагов убито: ${enemiesKilled}</div>
            </div>
            <button id="restart-button">НАЧАТЬ ЗАНОВО</button>
        `;

        return new Promise((resolve) => {
            document.getElementById('restart-button').onclick = () => {
                this.hideStartScreen();
                resolve();
            };
        });
    }

    showBossHealth(show, healthPercent = 100) {
        this.bossHealthContainer.style.display = show ? 'block' : 'none';
        if (show) {
            this.bossHealthFill.style.width = healthPercent + '%';
        }
    }

    updateBossHealth(current, max) {
        const percent = (current / max) * 100;
        this.bossHealthFill.style.width = percent + '%';

        // Color based on phase
        if (percent <= 30) {
            this.bossHealthFill.style.background = 'linear-gradient(to bottom, #ff0000, #880000)';
        } else if (percent <= 60) {
            this.bossHealthFill.style.background = 'linear-gradient(to bottom, #ff8800, #884400)';
        }
    }

    updateMinimap(dungeonData, playerPos, tileSize, enemies = []) {
        const ctx = this.minimapCtx;
        const mapWidth = dungeonData.width;
        const mapHeight = dungeonData.height;
        const scale = Math.min(
            this.minimapCanvas.width / mapWidth,
            this.minimapCanvas.height / mapHeight
        );

        // Clear
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

        // Draw tiles
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const tile = dungeonData.tiles[y][x];
                let color = null;

                switch (tile) {
                    case TILE_TYPES.FLOOR:
                        color = '#444';
                        break;
                    case TILE_TYPES.WALL:
                        color = '#666';
                        break;
                    case TILE_TYPES.BOSS_ROOM:
                        color = '#633';
                        break;
                }

                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }

        // Draw enemies
        ctx.fillStyle = '#f44';
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const ex = enemy.position.x / tileSize * scale;
            const ey = enemy.position.z / tileSize * scale;
            ctx.beginPath();
            ctx.arc(ex, ey, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw player
        const px = playerPos.x / tileSize * scale;
        const py = playerPos.z / tileSize * scale;

        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw player direction
        const dirX = Math.sin(window.game?.player?.yaw || 0) * 5;
        const dirY = -Math.cos(window.game?.player?.yaw || 0) * 5;
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dirX, py + dirY);
        ctx.stroke();
    }
}
