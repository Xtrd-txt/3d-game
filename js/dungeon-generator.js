// Procedural Dungeon Generator using BSP (Binary Space Partitioning) and Cellular Automata

const TILE_TYPES = {
    EMPTY: 0,
    FLOOR: 1,
    WALL: 2,
    DOOR: 3,
    SPAWN: 4,
    EXIT: 5,
    BOSS_ROOM: 6
};

class Room {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.centerX = Math.floor(x + width / 2);
        this.centerY = Math.floor(y + height / 2);
        this.connected = false;
        this.isBossRoom = false;
    }

    intersects(other, padding = 1) {
        return !(
            this.x + this.width + padding <= other.x ||
            other.x + other.width + padding <= this.x ||
            this.y + this.height + padding <= other.y ||
            other.y + other.height + padding <= this.y
        );
    }

    distanceTo(other) {
        return Utils.distance(this.centerX, this.centerY, other.centerX, other.centerY);
    }
}

class DungeonGenerator {
    constructor(width = 50, height = 50) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.rooms = [];
        this.corridors = [];
        this.spawnPoint = null;
        this.exitPoint = null;
        this.enemySpawnPoints = [];
        this.itemSpawnPoints = [];
        this.buffOrbSpawnPoints = [];
        this.ammoSpawnPoints = [];
        this.armorSpawnPoints = [];
        this.bossSpawnPoint = null;
    }

    generate(level = 1) {
        // Initialize with empty tiles
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = TILE_TYPES.EMPTY;
            }
        }

        this.rooms = [];
        this.corridors = [];
        this.enemySpawnPoints = [];
        this.itemSpawnPoints = [];
        this.buffOrbSpawnPoints = [];
        this.ammoSpawnPoints = [];
        this.armorSpawnPoints = [];

        // Generate rooms
        this.generateRooms(level);

        // Connect rooms with corridors
        this.connectRooms();

        // Add walls around floor tiles
        this.generateWalls();

        // Set spawn and exit points
        this.setSpawnAndExit();

        // Generate enemy spawn points
        this.generateEnemySpawns(level);

        // Generate item spawns
        this.generateItemSpawns(level);

        // Generate buff orb spawns (1-2 per level)
        this.generateBuffOrbSpawns();

        return {
            tiles: this.tiles,
            rooms: this.rooms,
            spawnPoint: this.spawnPoint,
            exitPoint: this.exitPoint,
            bossSpawnPoint: this.bossSpawnPoint,
            enemySpawnPoints: this.enemySpawnPoints,
            itemSpawnPoints: this.itemSpawnPoints,
            buffOrbSpawnPoints: this.buffOrbSpawnPoints,
            ammoSpawnPoints: this.ammoSpawnPoints,
            armorSpawnPoints: this.armorSpawnPoints,
            width: this.width,
            height: this.height
        };
    }

    generateRooms(level) {
        const minRooms = 5 + Math.floor(level / 2);
        const maxRooms = 8 + level;
        const targetRooms = Utils.randomInt(minRooms, maxRooms);

        const minRoomSize = 5;
        const maxRoomSize = 10;

        let attempts = 0;
        const maxAttempts = 500;

        while (this.rooms.length < targetRooms && attempts < maxAttempts) {
            attempts++;

            const roomWidth = Utils.randomInt(minRoomSize, maxRoomSize);
            const roomHeight = Utils.randomInt(minRoomSize, maxRoomSize);
            const roomX = Utils.randomInt(2, this.width - roomWidth - 2);
            const roomY = Utils.randomInt(2, this.height - roomHeight - 2);

            const newRoom = new Room(roomX, roomY, roomWidth, roomHeight);

            // Check for intersections with existing rooms
            let intersects = false;
            for (const room of this.rooms) {
                if (newRoom.intersects(room, 2)) {
                    intersects = true;
                    break;
                }
            }

            if (!intersects) {
                this.carveRoom(newRoom);
                this.rooms.push(newRoom);
            }
        }

        // Create boss room (last and largest room)
        if (this.rooms.length > 0) {
            const bossRoomWidth = Utils.randomInt(10, 14);
            const bossRoomHeight = Utils.randomInt(10, 14);
            let bossRoom = null;

            attempts = 0;
            while (!bossRoom && attempts < maxAttempts) {
                attempts++;
                const roomX = Utils.randomInt(2, this.width - bossRoomWidth - 2);
                const roomY = Utils.randomInt(2, this.height - bossRoomHeight - 2);
                const newRoom = new Room(roomX, roomY, bossRoomWidth, bossRoomHeight);
                newRoom.isBossRoom = true;

                let intersects = false;
                for (const room of this.rooms) {
                    if (newRoom.intersects(room, 3)) {
                        intersects = true;
                        break;
                    }
                }

                if (!intersects) {
                    bossRoom = newRoom;
                }
            }

            if (bossRoom) {
                this.carveRoom(bossRoom, TILE_TYPES.BOSS_ROOM);
                this.rooms.push(bossRoom);
            }
        }
    }

    carveRoom(room, tileType = TILE_TYPES.FLOOR) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    this.tiles[y][x] = tileType;
                }
            }
        }
    }

    connectRooms() {
        if (this.rooms.length < 2) return;

        // Sort rooms by distance from first room
        const sortedRooms = [...this.rooms];

        // Connect each room to its nearest unconnected neighbor
        const connected = [sortedRooms[0]];
        sortedRooms[0].connected = true;

        while (connected.length < sortedRooms.length) {
            let bestDistance = Infinity;
            let bestRoom = null;
            let connectFrom = null;

            for (const connectedRoom of connected) {
                for (const room of sortedRooms) {
                    if (!room.connected) {
                        const dist = connectedRoom.distanceTo(room);
                        if (dist < bestDistance) {
                            bestDistance = dist;
                            bestRoom = room;
                            connectFrom = connectedRoom;
                        }
                    }
                }
            }

            if (bestRoom && connectFrom) {
                this.carveCorridor(connectFrom, bestRoom);
                bestRoom.connected = true;
                connected.push(bestRoom);
            } else {
                break;
            }
        }
    }

    carveCorridor(room1, room2) {
        let x = room1.centerX;
        let y = room1.centerY;
        const targetX = room2.centerX;
        const targetY = room2.centerY;

        // Use L-shaped corridor (horizontal then vertical, or vice versa)
        const horizontalFirst = Math.random() > 0.5;

        if (horizontalFirst) {
            // Horizontal first
            while (x !== targetX) {
                if (this.tiles[y] && this.tiles[y][x] === TILE_TYPES.EMPTY) {
                    this.tiles[y][x] = TILE_TYPES.FLOOR;
                }
                x += x < targetX ? 1 : -1;
            }
            // Then vertical
            while (y !== targetY) {
                if (this.tiles[y] && this.tiles[y][x] === TILE_TYPES.EMPTY) {
                    this.tiles[y][x] = TILE_TYPES.FLOOR;
                }
                y += y < targetY ? 1 : -1;
            }
        } else {
            // Vertical first
            while (y !== targetY) {
                if (this.tiles[y] && this.tiles[y][x] === TILE_TYPES.EMPTY) {
                    this.tiles[y][x] = TILE_TYPES.FLOOR;
                }
                y += y < targetY ? 1 : -1;
            }
            // Then horizontal
            while (x !== targetX) {
                if (this.tiles[y] && this.tiles[y][x] === TILE_TYPES.EMPTY) {
                    this.tiles[y][x] = TILE_TYPES.FLOOR;
                }
                x += x < targetX ? 1 : -1;
            }
        }

        // Widen corridor
        this.widenCorridors();
    }

    widenCorridors() {
        const tilesToAdd = [];

        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.tiles[y][x] === TILE_TYPES.FLOOR) {
                    // Check if this is a corridor tile (has floor neighbors in only 2 directions)
                    const neighbors = [
                        { dx: 0, dy: -1 },
                        { dx: 0, dy: 1 },
                        { dx: -1, dy: 0 },
                        { dx: 1, dy: 0 }
                    ];

                    for (const n of neighbors) {
                        const nx = x + n.dx;
                        const ny = y + n.dy;
                        if (this.tiles[ny][nx] === TILE_TYPES.EMPTY) {
                            // Add floor tile with some probability
                            if (Math.random() > 0.7) {
                                tilesToAdd.push({ x: nx, y: ny });
                            }
                        }
                    }
                }
            }
        }

        for (const tile of tilesToAdd) {
            this.tiles[tile.y][tile.x] = TILE_TYPES.FLOOR;
        }
    }

    generateWalls() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x] === TILE_TYPES.EMPTY) {
                    // Check if adjacent to floor
                    let adjacentToFloor = false;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = y + dy;
                            const nx = x + dx;
                            if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
                                if (this.tiles[ny][nx] === TILE_TYPES.FLOOR ||
                                    this.tiles[ny][nx] === TILE_TYPES.BOSS_ROOM) {
                                    adjacentToFloor = true;
                                    break;
                                }
                            }
                        }
                        if (adjacentToFloor) break;
                    }
                    if (adjacentToFloor) {
                        this.tiles[y][x] = TILE_TYPES.WALL;
                    }
                }
            }
        }
    }

    setSpawnAndExit() {
        if (this.rooms.length < 2) return;

        // Find room furthest from boss room for spawn
        const bossRoom = this.rooms.find(r => r.isBossRoom) || this.rooms[this.rooms.length - 1];
        let maxDist = 0;
        let spawnRoom = this.rooms[0];

        for (const room of this.rooms) {
            if (!room.isBossRoom) {
                const dist = room.distanceTo(bossRoom);
                if (dist > maxDist) {
                    maxDist = dist;
                    spawnRoom = room;
                }
            }
        }

        this.spawnPoint = {
            x: spawnRoom.centerX,
            y: spawnRoom.centerY
        };

        // Set boss spawn point
        this.bossSpawnPoint = {
            x: bossRoom.centerX,
            y: bossRoom.centerY
        };

        // Exit is in boss room
        this.exitPoint = {
            x: bossRoom.centerX + 2,
            y: bossRoom.centerY + 2
        };
    }

    generateEnemySpawns(level) {
        const enemiesPerRoom = Math.min(2 + Math.floor(level / 2), 5);

        for (const room of this.rooms) {
            if (room.isBossRoom) continue; // Boss room has only boss

            // Skip spawn room for first few enemies
            const isSpawnRoom = room.centerX === this.spawnPoint.x &&
                               room.centerY === this.spawnPoint.y;

            const numEnemies = isSpawnRoom ?
                Math.max(0, enemiesPerRoom - 2) :
                Utils.randomInt(1, enemiesPerRoom);

            for (let i = 0; i < numEnemies; i++) {
                const x = Utils.randomInt(room.x + 1, room.x + room.width - 2);
                const y = Utils.randomInt(room.y + 1, room.y + room.height - 2);

                // Don't spawn on player spawn point
                if (Math.abs(x - this.spawnPoint.x) < 3 &&
                    Math.abs(y - this.spawnPoint.y) < 3) {
                    continue;
                }

                this.enemySpawnPoints.push({ x, y, room });
            }
        }
    }

    generateItemSpawns(level) {
        // Ammo packs (3-5 per level)
        const numAmmoPacks = Utils.randomInt(3, 5);
        const availableRooms = this.rooms.filter(r => !r.isBossRoom);

        for (let i = 0; i < numAmmoPacks; i++) {
            const room = Utils.randomElement(availableRooms);
            const x = Utils.randomInt(room.x + 1, room.x + room.width - 2);
            const y = Utils.randomInt(room.y + 1, room.y + room.height - 2);
            this.ammoSpawnPoints.push({ x, y, amount: Utils.randomInt(5, 10) });
        }

        // Armor (1-2 per level, chance based)
        if (Math.random() > 0.3) {
            const numArmor = Utils.randomInt(1, 2);
            for (let i = 0; i < numArmor; i++) {
                const room = Utils.randomElement(availableRooms);
                const x = Utils.randomInt(room.x + 1, room.x + room.width - 2);
                const y = Utils.randomInt(room.y + 1, room.y + room.height - 2);
                this.armorSpawnPoints.push({ x, y, value: Utils.randomInt(1, 3) });
            }
        }
    }

    generateBuffOrbSpawns() {
        // 1-2 buff orbs per level
        const numOrbs = Utils.randomInt(1, 2);
        const availableRooms = this.rooms.filter(r => !r.isBossRoom);
        const usedRooms = [];

        for (let i = 0; i < numOrbs && availableRooms.length > usedRooms.length; i++) {
            let room;
            do {
                room = Utils.randomElement(availableRooms);
            } while (usedRooms.includes(room) && usedRooms.length < availableRooms.length);

            if (!usedRooms.includes(room)) {
                usedRooms.push(room);
                const x = room.centerX;
                const y = room.centerY;
                this.buffOrbSpawnPoints.push({ x, y });
            }
        }
    }

    getTileAt(x, y) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
            return this.tiles[y][x];
        }
        return TILE_TYPES.EMPTY;
    }

    isWalkable(x, y) {
        const tile = this.getTileAt(Math.floor(x), Math.floor(y));
        return tile === TILE_TYPES.FLOOR ||
               tile === TILE_TYPES.DOOR ||
               tile === TILE_TYPES.SPAWN ||
               tile === TILE_TYPES.EXIT ||
               tile === TILE_TYPES.BOSS_ROOM;
    }
}

// 3D Dungeon mesh generator
class DungeonMeshGenerator {
    constructor(scene, tileSize = 4) {
        this.scene = scene;
        this.tileSize = tileSize;
        this.meshes = [];
        this.wallHeight = 4;

        // Materials
        this.floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x444444,
            side: THREE.DoubleSide
        });

        this.wallMaterial = new THREE.MeshLambertMaterial({
            color: 0x666666
        });

        this.bossFloorMaterial = new THREE.MeshLambertMaterial({
            color: 0x553333,
            side: THREE.DoubleSide
        });

        this.ceilingMaterial = new THREE.MeshLambertMaterial({
            color: 0x333333,
            side: THREE.DoubleSide
        });
    }

    generate(dungeonData) {
        this.clear();

        const { tiles, width, height } = dungeonData;

        // Create floor and ceiling meshes using merged geometry for performance
        const floorGeometries = [];
        const bossFloorGeometries = [];
        const wallGeometries = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = tiles[y][x];
                const worldX = x * this.tileSize;
                const worldZ = y * this.tileSize;

                if (tile === TILE_TYPES.FLOOR || tile === TILE_TYPES.DOOR ||
                    tile === TILE_TYPES.SPAWN || tile === TILE_TYPES.EXIT) {
                    // Floor tile
                    const floorGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                    floorGeom.rotateX(-Math.PI / 2);
                    floorGeom.translate(worldX, 0, worldZ);
                    floorGeometries.push(floorGeom);

                    // Ceiling
                    const ceilGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                    ceilGeom.rotateX(Math.PI / 2);
                    ceilGeom.translate(worldX, this.wallHeight, worldZ);
                    floorGeometries.push(ceilGeom);
                } else if (tile === TILE_TYPES.BOSS_ROOM) {
                    // Boss room floor
                    const floorGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                    floorGeom.rotateX(-Math.PI / 2);
                    floorGeom.translate(worldX, 0, worldZ);
                    bossFloorGeometries.push(floorGeom);

                    // Boss room ceiling (higher)
                    const ceilGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
                    ceilGeom.rotateX(Math.PI / 2);
                    ceilGeom.translate(worldX, this.wallHeight * 1.5, worldZ);
                    bossFloorGeometries.push(ceilGeom);
                } else if (tile === TILE_TYPES.WALL) {
                    // Wall
                    const wallGeom = new THREE.BoxGeometry(
                        this.tileSize,
                        this.wallHeight,
                        this.tileSize
                    );
                    wallGeom.translate(worldX, this.wallHeight / 2, worldZ);
                    wallGeometries.push(wallGeom);
                }
            }
        }

        // Merge and create meshes
        if (floorGeometries.length > 0) {
            const mergedFloor = this.mergeGeometries(floorGeometries);
            const floorMesh = new THREE.Mesh(mergedFloor, this.floorMaterial);
            floorMesh.receiveShadow = true;
            this.scene.add(floorMesh);
            this.meshes.push(floorMesh);
        }

        if (bossFloorGeometries.length > 0) {
            const mergedBossFloor = this.mergeGeometries(bossFloorGeometries);
            const bossFloorMesh = new THREE.Mesh(mergedBossFloor, this.bossFloorMaterial);
            bossFloorMesh.receiveShadow = true;
            this.scene.add(bossFloorMesh);
            this.meshes.push(bossFloorMesh);
        }

        if (wallGeometries.length > 0) {
            const mergedWalls = this.mergeGeometries(wallGeometries);
            const wallMesh = new THREE.Mesh(mergedWalls, this.wallMaterial);
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            this.scene.add(wallMesh);
            this.meshes.push(wallMesh);

            // Store wall mesh for collision
            this.wallMesh = wallMesh;
        }

        // Add some ambient decoration
        this.addTorches(dungeonData);
    }

    mergeGeometries(geometries) {
        // Simple merge - concatenate all vertex data
        let totalVertices = 0;
        let totalIndices = 0;

        for (const geom of geometries) {
            totalVertices += geom.attributes.position.count;
            if (geom.index) {
                totalIndices += geom.index.count;
            } else {
                totalIndices += geom.attributes.position.count;
            }
        }

        const positions = new Float32Array(totalVertices * 3);
        const normals = new Float32Array(totalVertices * 3);
        const indices = [];

        let vertexOffset = 0;
        let indexOffset = 0;

        for (const geom of geometries) {
            const pos = geom.attributes.position.array;
            const norm = geom.attributes.normal.array;

            positions.set(pos, vertexOffset * 3);
            normals.set(norm, vertexOffset * 3);

            if (geom.index) {
                for (let i = 0; i < geom.index.count; i++) {
                    indices.push(geom.index.array[i] + vertexOffset);
                }
            } else {
                for (let i = 0; i < geom.attributes.position.count; i++) {
                    indices.push(i + vertexOffset);
                }
            }

            vertexOffset += geom.attributes.position.count;
            geom.dispose();
        }

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        merged.setIndex(indices);

        return merged;
    }

    addTorches(dungeonData) {
        const { rooms } = dungeonData;

        for (const room of rooms) {
            // Add point lights in corners of rooms
            const corners = [
                { x: room.x + 1, y: room.y + 1 },
                { x: room.x + room.width - 2, y: room.y + 1 },
                { x: room.x + 1, y: room.y + room.height - 2 },
                { x: room.x + room.width - 2, y: room.y + room.height - 2 }
            ];

            // Only add 1-2 torches per room
            const numTorches = Utils.randomInt(1, 2);
            const shuffledCorners = Utils.shuffleArray(corners);

            for (let i = 0; i < numTorches; i++) {
                const corner = shuffledCorners[i];
                const light = new THREE.PointLight(
                    room.isBossRoom ? 0xff4444 : 0xffaa44,
                    0.8,
                    this.tileSize * 6
                );
                light.position.set(
                    corner.x * this.tileSize,
                    this.wallHeight * 0.7,
                    corner.y * this.tileSize
                );
                this.scene.add(light);
                this.meshes.push(light);

                // Torch model (simple)
                const torchGeom = new THREE.CylinderGeometry(0.1, 0.15, 1, 8);
                const torchMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const torch = new THREE.Mesh(torchGeom, torchMat);
                torch.position.copy(light.position);
                torch.position.y -= 0.5;
                this.scene.add(torch);
                this.meshes.push(torch);

                // Flame (emissive sphere)
                const flameGeom = new THREE.SphereGeometry(0.2, 8, 8);
                const flameMat = new THREE.MeshBasicMaterial({
                    color: room.isBossRoom ? 0xff4444 : 0xffaa00
                });
                const flame = new THREE.Mesh(flameGeom, flameMat);
                flame.position.copy(light.position);
                flame.position.y += 0.1;
                this.scene.add(flame);
                this.meshes.push(flame);
            }
        }
    }

    clear() {
        for (const mesh of this.meshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        }
        this.meshes = [];
        this.wallMesh = null;
    }

    worldToTile(worldX, worldZ) {
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldZ / this.tileSize)
        };
    }

    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize,
            z: tileY * this.tileSize
        };
    }
}
