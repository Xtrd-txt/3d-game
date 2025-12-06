// Utility functions for the game

const Utils = {
    // Random number between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Random float between min and max
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Random element from array
    randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    // Shuffle array
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },

    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Distance between two points
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Distance between two 3D points
    distance3D(v1, v2) {
        return Math.sqrt(
            (v2.x - v1.x) ** 2 +
            (v2.y - v1.y) ** 2 +
            (v2.z - v1.z) ** 2
        );
    },

    // Check if point is inside rectangle
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Angle between two points
    angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // Convert degrees to radians
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    // Convert radians to degrees
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },

    // Easing functions
    easeInQuad(t) {
        return t * t;
    },

    easeOutQuad(t) {
        return t * (2 - t);
    },

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },

    // Create a simple hash from string
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Simple 2D noise (for procedural generation)
    noise2D(x, y, seed = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    },

    // Smoothed noise
    smoothNoise2D(x, y, seed = 0) {
        const corners = (
            Utils.noise2D(x - 1, y - 1, seed) +
            Utils.noise2D(x + 1, y - 1, seed) +
            Utils.noise2D(x - 1, y + 1, seed) +
            Utils.noise2D(x + 1, y + 1, seed)
        ) / 16;

        const sides = (
            Utils.noise2D(x - 1, y, seed) +
            Utils.noise2D(x + 1, y, seed) +
            Utils.noise2D(x, y - 1, seed) +
            Utils.noise2D(x, y + 1, seed)
        ) / 8;

        const center = Utils.noise2D(x, y, seed) / 4;

        return corners + sides + center;
    },

    // Interpolated noise
    interpolatedNoise2D(x, y, seed = 0) {
        const intX = Math.floor(x);
        const fracX = x - intX;
        const intY = Math.floor(y);
        const fracY = y - intY;

        const v1 = Utils.smoothNoise2D(intX, intY, seed);
        const v2 = Utils.smoothNoise2D(intX + 1, intY, seed);
        const v3 = Utils.smoothNoise2D(intX, intY + 1, seed);
        const v4 = Utils.smoothNoise2D(intX + 1, intY + 1, seed);

        const i1 = Utils.lerp(v1, v2, fracX);
        const i2 = Utils.lerp(v3, v4, fracX);

        return Utils.lerp(i1, i2, fracY);
    },

    // Perlin-like noise
    perlinNoise2D(x, y, octaves = 4, persistence = 0.5, seed = 0) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += Utils.interpolatedNoise2D(x * frequency, y * frequency, seed + i) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
};

// Vector3 helper class
class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const len = this.length();
        if (len > 0) {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }

    distanceTo(v) {
        return Math.sqrt(
            (v.x - this.x) ** 2 +
            (v.y - this.y) ** 2 +
            (v.z - this.z) ** 2
        );
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
}

// Object pool for performance
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];

        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    get() {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = this.createFn();
        }
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const index = this.active.indexOf(obj);
        if (index !== -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        while (this.active.length > 0) {
            const obj = this.active.pop();
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
}

// Simple state machine
class StateMachine {
    constructor(initialState, states) {
        this.states = states;
        this.currentState = initialState;
        this.previousState = null;
    }

    setState(newState) {
        if (this.states[newState] && newState !== this.currentState) {
            if (this.states[this.currentState] && this.states[this.currentState].onExit) {
                this.states[this.currentState].onExit();
            }
            this.previousState = this.currentState;
            this.currentState = newState;
            if (this.states[this.currentState].onEnter) {
                this.states[this.currentState].onEnter();
            }
        }
    }

    update(delta) {
        if (this.states[this.currentState] && this.states[this.currentState].update) {
            this.states[this.currentState].update(delta);
        }
    }
}
