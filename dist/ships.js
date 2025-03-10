class Phaser {
    constructor({ dps, color, maxDistance, shortcut, position, maxUsage = 30, weaponCooldownTime = 31, }) {
        this.color = color;
        this.dps = dps;
        this.maxDistance = maxDistance / 1.2;
        this.shortcut = shortcut;
        this.position = position;
        this.usage = 0;
        this.disabled = false;
        this.maxUsage = maxUsage;
        this.weaponCooldownTime = weaponCooldownTime;
    }
    fire(firing) {
        ctx.save();
        if (this.usage > this.maxUsage) {
            this.disabled = true;
            this.weaponCooldown = this.weaponCooldownTime + 0;
        }
        else if (this.disabled && this.usage <= 0 && this.weaponCooldown <= 0) {
            this.disabled = false;
        }
        let ships = getShipDistances(firing).filter((ent) => ent !== firing &&
            ent.faction !== firing.faction &&
            ent.health > 0 &&
            (firing.controllable ? !ent.controllable : true));
        let closest = ships[0];
        if (closest &&
            closest.distance < this.maxDistance &&
            firing.health > 10 &&
            !this.disabled) {
            ctx.beginPath();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            let position = this.position;
            let [setX, setY] = getCustomPosition(position, firing);
            ctx.moveTo(setX - player.x, setY - player.y);
            let fireX = closest.x - player.x;
            let fireY = closest.y - player.y;
            let size = Math.abs(getShipSize(closest));
            function getRandOffset() {
                return Math.random() * size - size / 2;
            }
            ctx.lineTo(fireX + getRandOffset(), fireY + getRandOffset());
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            let turnDir = Math.floor(Math.random() * 2) === 0 ? "Left" : "Right";
            if (!closest.ship.noShake)
                closest[`turn${turnDir}`]();
            closest.health -= this.dps / 60;
            if (closest.health <= 0 && !closest.isDead) {
                closest.timesKilled++;
                closest.isDead = true;
                if (closest.timesKilled <= 1) {
                    // This is the first time the enemy ship is killed
                    // Give points to responsible party
                    let pointsTo = (firing.following ?? {}).faction === firing.faction
                        ? firing.following
                        : firing;
                    scoreboard.addPoints(pointsTo, closest);
                }
            }
            this.usage++;
        }
        ctx.restore();
    }
}
class Entity {
    constructor({ ship, faction, weapons = [], controllable = false, x = 0, y = 0, rotation = Math.random() * (Math.PI * 2) - Math.PI, speed = 5, }) {
        this.isShip = true;
        this.ship = ship;
        this.ship.image = new Image();
        this.ship.image.src = `assets/ships/${this.ship.texture}`;
        this.weapons =
            JSON.parse(JSON.stringify(this.ship.weapons)).map((phaser) => new Phaser(phaser)) || [];
        this.faction = faction;
        this.controllable = controllable;
        this.health = ship.startHealth + 0;
        this.rotation = rotation;
        this.speed = speed;
        this.x = x;
        this.y = y;
        this.followers = 0;
        this.trails = {};
        this.velocity = [0, 0];
        this.isDead = this.health > 0;
        this.timesKilled = 0;
        this.points = 0;
    }
    updateControllable() {
        if (this === player && this.health <= 0) {
            let ships = getShipDistances();
            // let alternative: (Entity | void) = ships.find(ent => ent.controllable && ent.health > 0);
            let alternative = ships.find((ent) => ent.health > 0);
            if (alternative) {
                player.controllable = false;
                player = alternative;
                alternative.controllable = true;
            }
        }
        if (this.health > 0) {
            if (gamepadAxes.length > 0) {
                let leftStick = gamepadAxes[0];
                if (Math.abs(leftStick[0]) > 0.2)
                    player.rotation += leftStick[0] * (player.ship.rotSpeed / 1e3);
                if (leftStick[1] < -0.5) {
                    this.accelerate();
                }
                else if (leftStick[1] > 0.5) {
                    this.deccelerate();
                }
            }
            if (gamepadButtons[0] && gamepadButtons[0].pressed) {
                for (let weapon of this.weapons) {
                    weapon.fire(this);
                }
            }
            if (((pressedKeys["w"] && this.speed < 5) ||
                (pressedKeys["w"] && pressedKeys["shift"])) &&
                !this.action) {
                this.accelerate();
            }
            if (pressedKeys["s"] && !this.action) {
                this.deccelerate();
            }
            if (pressedKeys["a"] && !this.action) {
                this.turnLeft();
            }
            if (pressedKeys["d"] && !this.action) {
                this.turnRight();
            }
            if (pressedKeys["0"] && !this.action) {
                this.moveTo({ x: 0, y: 0 });
            }
            if (pressedKeys["9"] && !this.action) {
                entities.forEach((ship) => {
                    if (ship.faction === player.faction && ship !== player)
                        ship.moveTo(player);
                });
            }
            if (pressedKeys["8"] && !this.action) {
                entities.forEach((ship) => {
                    ship.action = undefined;
                    if (ship !== player)
                        ship.moveTo(player);
                });
            }
            if (pressedKeys["7"]) {
                toClosestFriendly(this);
            }
            if (pressedKeys["6"]) {
                let ships = getShipDistances(this).filter((s) => s.faction !== this.faction && s.health > 10);
                if (ships[0])
                    this.moveTo(ships[0]);
            }
            if (pressedKeys["1"]) {
                entities.forEach((e) => {
                    delete e.following;
                    delete e.action;
                    e.moveTo({ x: 0, y: 0 });
                });
            }
            if (pressedKeys["c"] && this.action) {
                delete this.action;
                delete this.following;
            }
            for (let weapon of this.weapons || []) {
                if (pressedKeys[weapon.shortcut]) {
                    weapon.fire(this);
                }
            }
        }
    }
    updateNonControllable() {
        let ships = getShipDistances(this).filter((sh) => sh.distance < 9e5 && sh.health > 0);
        if (ships.length > 0) {
            if ((!this.following ||
                (this.following.faction === this.faction &&
                    !(this.following === player && player.health > 0) &&
                    ships[0] === player)) &&
                ships[0].following !== this) {
                this.following = ships[0];
                this.following.followers++;
            }
            else if (this.following && this.following.following) {
                this.following = this.following.following;
            }
        }
        for (let weapon of this.weapons || []) {
            weapon.fire(this);
        }
    }
    update() {
        if (this.controllable) {
            this.updateControllable();
        }
        else {
            this.updateNonControllable();
        }
        if (this.speed < 0.01) {
            this.speed = 0;
        }
        if (this.isDead && this.health > 0) {
            this.isDead = false;
        }
        // If following someone...
        if (this.following) {
            if (this.following.health > 0) {
                if (!this.action || this.action.goTo !== this.following) {
                    this.moveTo(this.following);
                }
            }
            else if (this.following !== player ||
                this.following.faction !== this.faction) {
                this.following.followers--;
                delete this.following;
            }
        }
        // Heal friendly nearby ships
        let healable = getShipDistances(this).filter((sh) => sh.faction === this.faction &&
            sh.distance < 250 &&
            sh.health < sh.ship.startHealth &&
            this.health > 0);
        for (let ship of healable) {
            ship.health += 0.1;
        }
        // Weapon cooldown
        for (let weapon of this.weapons || []) {
            if (weapon.usage > 0)
                weapon.usage -= 0.5;
            if (weapon.weaponCooldown > 0)
                weapon.weaponCooldown -= 0.5;
        }
        // Speed checks
        let ms = this.ship.maxSpeed * (this.health / this.ship.startHealth);
        if (ms < 0)
            ms = 0;
        if (this.speed > ms) {
            this.speed = ms;
        }
        // Movement
        let newX = this.speed * Math.cos(this.rotation);
        let newY = this.speed * Math.sin(this.rotation);
        this.velocity = [newX, newY];
        this.x += newX;
        this.y += newY;
        // Draw trails
        for (let i = 0; i < (this.ship.trailExits || []).length; i++) {
            if (typeof this.trails[i] === "undefined")
                this.trails[i] = [];
            if (this.speed > 0) {
                let position = this.ship.trailExits[i];
                let [setX, setY] = getCustomPosition(position, this);
                this.trails[i].push([setX, setY]);
            }
            if (this.trails[i].length > 20 ||
                (this.speed < 1 && this.trails[i].length > 0)) {
                this.trails[i].shift();
            }
        }
        // If there is an action (like moving towards something), run its main thing
        if (this.action) {
            this.action.loop();
        }
        // Call for backup if there's the need
        if (this.health > 0 &&
            this.health / this.ship.startHealth < 0.4 &&
            !this.calledForBackup) {
            // 40%
            this.callForBackup();
        }
        if (this.health < 0) {
            this.health = 0;
        }
    }
    callForBackup() {
        if (!this.calledForBackup) {
            let nearbyFriendlies = getShipDistances(this)
                .filter((sh) => sh.faction === this.faction && sh !== player && sh.health > 0)
                .slice(0, 3);
            console.log(`${nearbyFriendlies.length} ${this.faction === player.faction ? "friendly" : "hostile"} ships are now approaching a ${this === player ? "the player" : this.ship.className + " type shit"}`);
            for (let friendly of nearbyFriendlies) {
                friendly.following = this;
            }
            this.calledForBackup = true;
        }
    }
    moveTo(location) {
        let ships = getShipDistances();
        let ent = ships[Math.floor(Math.random() * ships.length)];
        this.action = {
            i: 0,
            main: () => {
                let goTo = this.action.goTo;
                let goToX = goTo.x;
                let goToY = goTo.y;
                let { i } = this.action;
                let distanceX = this.x - goToX;
                let distanceY = this.y - goToY;
                let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                this.distance = distance;
                goTo.speed = goTo.speed ?? 0;
                if (!goTo.isShip)
                    goTo.isShip = false;
                if (i >= 0 && distance > maxDist) {
                    let dirTo = distance < Math.min(maxDist * 2, 400) && goTo.isShip
                        ? goTo.rotation
                        : Math.atan2(goToY - this.y, goToX - this.x);
                    function normalizeAngle(a) {
                        // No idea
                        let totalRange = Math.PI * 2;
                        if (a > Math.PI) {
                            a -= totalRange;
                        }
                        else if (a < -Math.PI) {
                            a += totalRange;
                        }
                        return a;
                    }
                    let relativeHeading = normalizeAngle(dirTo - this.rotation);
                    if (this.health > 0) {
                        this.rotation += relativeHeading / 30;
                        this.correctRotation();
                    }
                }
                if (i >= 100 && distance > maxDist)
                    this.accelerate();
                // if(i >= 100 && distance > (maxDist / 10) && this.speed < (goTo.speed ?? 0)) this.accelerate();
                // if(this.faction === goTo.faction && distance < 100 && this.speed > goTo.speed) this.speed = goTo.speed;
                if (distance < maxDist / 10 + this.speed * 20 &&
                    (goTo.speed ?? 0) < 20) {
                    this.speed -= this.speed / 10;
                }
                if (distance <
                    maxDist + Math.abs(this.speed - (goTo.speed ?? 0)) * 20) {
                    this.speed -= this.speed / 10;
                }
                if ((goTo.health <= 0 && goTo.faction !== this.faction) ||
                    (this === player && goTo.speed <= 0.01 && this.speed <= 0.01))
                    delete this.action;
            },
            loop: () => {
                this.action.i++;
                this.action.main();
            },
            goTo: location,
        };
    }
    accelerate() {
        if (this.speed < this.ship.maxSpeed) {
            this.speed += (this.ship.accelaration || 0.1);
        }
    }
    deccelerate() {
        if (this.speed > 3) {
            this.speed *= 0.95;
        }
        else if (this.speed > 0) {
            this.speed -= 0.1;
        }
        if (this.speed < 0) {
            this.speed = 0;
        }
    }
    turnLeft() {
        this.rotation -= this.ship.rotSpeed / 1e3;
        this.correctRotation();
    }
    turnRight() {
        this.rotation += this.ship.rotSpeed / 1e3;
        this.correctRotation();
    }
    correctRotation() {
        if (this.rotation < -Math.PI)
            this.rotation = Math.PI;
        if (this.rotation > Math.PI)
            this.rotation = -Math.PI;
    }
    draw() {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        let drawX = this.x - player.x;
        let drawY = this.y - player.y;
        ctx.translate(drawX, drawY);
        for (let trail of Object.values(this.trails)) {
            if (trail.length > 0) {
                let points = trail.map((s) => [
                    s[0] - this.x,
                    s[1] - this.y,
                ]);
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                for (let [x, y] of points) {
                    ctx.lineTo(x, y);
                }
                ctx.strokeStyle = "white";
                ctx.stroke();
            }
        }
        ctx.rotate(this.rotation);
        let img = this.ship.image;
        let imgWidth = (img.width / scale) * (this.ship.imageScale || 1);
        let imgHeight = (img.height / scale) * (this.ship.imageScale || 1);
        ctx.drawImage(this.ship.image, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        ctx.restore();
    }
}
const shipClasses = {
    warbird: {
        className: "Romulan Warbird",
        faction: "Romulan",
        maxSpeed: 30,
        texture: "3.png",
        startHealth: 100,
        rotSpeed: 40,
        trailExits: [[0, 100]],
        weapons: [
            new Phaser({
                dps: 40,
                color: "red",
                maxDistance: 2000,
                shortcut: " ",
                position: [Math.PI / 2, 100],
            }),
            new Phaser({
                dps: 40,
                color: "red",
                maxDistance: 2000,
                shortcut: " ",
                position: [-Math.PI / 2, 100],
            }),
        ],
    },
    dreadnought: {
        className: "Dreadnought",
        faction: "Breen",
        maxSpeed: 25,
        texture: "dreadnought.png",
        startHealth: 500,
        rotSpeed: 8,
        imageScale: 5,
        trailExits: [[0, 460]],
        weapons: [
            new Phaser({
                dps: 5,
                color: "purple",
                maxDistance: 500,
                shortcut: " ",
                position: [-(Math.PI + 0.09), 390],
            }),
            new Phaser({
                dps: 5,
                color: "purple",
                maxDistance: 500,
                shortcut: " ",
                position: [-(Math.PI - 0.09), 390],
            }),
        ],
    },
    // "cube": {
    // 	className: "Borg cube",
    // 	faction: "Borg",
    // 	maxSpeed: 900,
    // 	texture: "borg.png",
    // 	startHealth: 2e3,
    // 	rotSpeed: 20,
    // 	imageScale: 10,
    // 	accelaration: 5,
    // 	weapons: [
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "green",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			position: [Math.PI, 1e3],
    // 			maxUsage: 1e3
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "green",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			position: [0, 1e3],
    // 			maxUsage: 1e3
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "green",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			position: [Math.PI/2, 1e3],
    // 			maxUsage: 1e3
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "green",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			position: [-Math.PI/2, 1e3],
    // 			maxUsage: 1e3
    // 		})
    // 	]
    // },
    defiant: {
        className: "Defiant",
        faction: "Starfleet",
        maxSpeed: 30,
        texture: "player_alt3.png",
        startHealth: 200,
        rotSpeed: 20,
        imageScale: 0.3,
        accelaration: 0.3,
        trailExits: [[0, 20]],
        weapons: [
            new Phaser({
                dps: 90,
                color: "blue",
                maxDistance: 1000,
                shortcut: " ",
                position: [-Math.PI, 20],
            }),
        ],
    },
    // "nerada": {
    // 	className: "Nerada",
    // 	faction: "Romulan",
    // 	maxSpeed: 90,
    // 	texture: "nerada.png",
    // 	startHealth: 600,
    // 	rotSpeed: 10,
    // 	imageScale: 0.6,
    // 	accelaration: 0.6,
    // 	trailExits: [
    // 		[0, 20]
    // 	],
    // 	weapons: [
    // 		new Phaser({
    // 			dps: 900,
    // 			color: "white",
    // 			maxDistance: 500,
    // 			shortcut: "k",
    // 			maxUsage: 4,
    // 			weaponCooldownTime: 300,
    // 			position: [-Math.PI-0.2, 48]
    // 		}),
    // 		new Phaser({
    // 			dps: 40,
    // 			color: "white",
    // 			maxDistance: 1000,
    // 			shortcut: " ",
    // 			position: [-Math.PI+0.2, 48]
    // 		})
    // 	]
    // },
    // "god": {
    // 	className: "God class",
    // 	faction: "God",
    // 	maxSpeed: 1e6,
    // 	accelaration: 2,
    // 	texture: "god.png",
    // 	startHealth: 1200,
    // 	rotSpeed: 60,
    // 	imageScale: 1,
    // 	noShake: true,
    // 	trailExits: [
    // 		[Math.PI/2, 85],
    // 		[-Math.PI/2, 85],
    // 		[0, 100]
    // 	],
    // 	weapons: [
    // 		new Phaser({
    // 			dps: 900,
    // 			color: "red",
    // 			maxDistance: 500,
    // 			shortcut: "k",
    // 			maxUsage: 4,
    // 			weaponCooldownTime: 0,
    // 			position: [-Math.PI, 30]
    // 		}),
    // 		new Phaser({
    // 			dps: 40,
    // 			color: "white",
    // 			maxDistance: 1000,
    // 			shortcut: " ",
    // 			position: [-Math.PI+0.2, 48]
    // 		}),
    // 		new Phaser({
    // 			dps: 40,
    // 			color: "white",
    // 			maxDistance: 1000,
    // 			shortcut: " ",
    // 			position: [-Math.PI-0.2, 48]
    // 		})
    // 	]
    // },
    // "carrier": {
    // 	className: "Carrier class",
    // 	faction: "Starfleet",
    // 	maxSpeed: 30,
    // 	accelaration: 0.1,
    // 	texture: "carrier.png",
    // 	startHealth: 4e3,
    // 	rotSpeed: 5,
    // 	imageScale: 10,
    // 	noShake: true,
    // 	trailExits: [
    // 		[0.6, 760],
    // 		[0.7, 790],
    // 		[0.8, 820],
    // 		[-0.6, 760],
    // 		[-0.7, 790],
    // 		[-0.8, 820]
    // 	],
    // 	weapons: [
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "red",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 500,
    // 			weaponCooldownTime: 500,
    // 			position: [-Math.PI + 0.44, 940]
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "pink",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 100,
    // 			weaponCooldownTime: 500,
    // 			position: [-Math.PI + 1.05, 1060]
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "pink",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 100,
    // 			weaponCooldownTime: 500,
    // 			position: [-Math.PI + 1.25, 1200]
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "pink",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 100,
    // 			weaponCooldownTime: 500,
    // 			position: [-Math.PI + 1.5, 1340]
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "red",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 500,
    // 			weaponCooldownTime: 500,
    // 			position: [-(-Math.PI + 0.44), 940]
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "pink",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 100,
    // 			weaponCooldownTime: 500,
    // 			position: [-(-Math.PI + 1.05), 1060]
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "pink",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 100,
    // 			weaponCooldownTime: 500,
    // 			position: [-(-Math.PI + 1.25), 1200]
    // 		}),
    // 		new Phaser({
    // 			dps: 20,
    // 			color: "pink",
    // 			maxDistance: 3000,
    // 			shortcut: " ",
    // 			maxUsage: 100,
    // 			weaponCooldownTime: 500,
    // 			position: [-(-Math.PI + 1.5), 1340]
    // 		}),
    // 	]
    // },
    explorer: {
        className: "Explorer",
        faction: "Starfleet",
        maxSpeed: 300,
        accelaration: 1,
        texture: "2.png",
        startHealth: 100,
        rotSpeed: 50,
        trailExits: [
            [0.15, 100],
            [-0.15, 100],
        ],
        weapons: [
            new Phaser({
                dps: 20,
                color: "orange",
                maxDistance: 1000,
                shortcut: " ",
                position: [Math.PI, 100],
            }),
        ],
    },
    breen_explorer: {
        className: "Breen Explorer",
        faction: "Breen",
        maxSpeed: 500,
        accelaration: 1,
        texture: "alien1.png",
        startHealth: 100,
        rotSpeed: 50,
        imageScale: 3,
        weapons: [],
        trailExits: [[0, 320]],
    },
    breen_warship: {
        className: "Breen Warship",
        faction: "Breen",
        maxSpeed: 25,
        accelaration: 0.3,
        texture: "alien3.png",
        startHealth: 900,
        rotSpeed: 30,
        imageScale: 5,
        weapons: [
            new Phaser({
                dps: 20,
                color: "purple",
                maxDistance: 1200,
                shortcut: " ",
                position: [Math.PI - 0.45, 420],
            }),
            new Phaser({
                dps: 20,
                color: "purple",
                maxDistance: 1200,
                shortcut: " ",
                position: [Math.PI - 0.72, 370],
            }),
            new Phaser({
                dps: 20,
                color: "purple",
                maxDistance: 1200,
                shortcut: " ",
                position: [Math.PI + 0.45, 420],
            }),
            new Phaser({
                dps: 20,
                color: "purple",
                maxDistance: 1200,
                shortcut: " ",
                position: [Math.PI + 0.72, 370],
            }),
        ],
        trailExits: [
            [0.2, 330],
            [-0.2, 330],
        ],
    },
};
let entities = [];
function genShips() {
    // let init = true;
    // for (let i = 0; i < entityCount; i++) {
    // 	let allShips = Object.values(shipClasses);
    // 	let shipChancesArr = Object.entries(shipChances);
    // 	let smallest = 1;
    // 	for(let entry of shipChancesArr) {
    // 		if(entry[1] < smallest) smallest = entry[1];
    // 	}
    // 	let dividingFactor = 1 / smallest;
    // 	shipChancesArr.forEach(entry => entry[1] *= dividingFactor);
    // 	let shipNames = shipChancesArr.map(entry => {
    // 		let arr = [];
    // 		for(let i = 0; i < entry[1]; i++) {
    // 			arr.push(entry[0]);
    // 		}
    // 		return arr;
    // 	}).flat();
    // 	let randomShip = shipClasses[shipNames[Math.floor(Math.random() * shipNames.length)]];
    // 	// Force ship type
    // 	if(init && !borgMode) {
    // 		randomShip = shipClasses["explorer"]
    // 	} else if(borgMode && init) {
    // 		randomShip = shipClasses["cube"];
    // 	} else if(borgMode && !init) {
    // 		randomShip = shipClasses["nerada"]
    // 	}
    // 	entities.push(new Entity({
    // 		ship: randomShip,
    // 		faction: randomShip.faction,
    // 		controllable: init,
    // 		x: init ? 0 : randomCoords(maxSpread),
    // 		y: init ? 0 : randomCoords(maxSpread)
    // 	}));
    // 	if (init) init = false;
    // }
    // let carrier = shipClasses["carrier"]
    // entities.push(new Entity({
    // 	ship: carrier,
    // 	faction: carrier.faction,
    // 	controllable: false,
    // 	x: randomCoords(maxSpread),
    // 	y: randomCoords(maxSpread)
    // }));
    let explorer = shipClasses["explorer"];
    entities.push(new Entity({
        ship: explorer,
        faction: explorer.faction,
        controllable: true,
        x: 0,
        y: 0,
    }));
}
genShips();
function randomCoords(spread) {
    return Math.floor(Math.random() * spread) - spread / 2;
}
function spawnExplorers(amount = 1) {
    let fleetShip = shipClasses["explorer"];
    let borgFleetSettings = {
        ship: fleetShip,
        faction: fleetShip.faction,
        controllable: false,
        rotation: 0,
    };
    for (let i = 0; i < amount; i++) {
        entities.push(new Entity({
            ...borgFleetSettings,
            x: Math.random() * 5e3,
            y: Math.random() * 5e3,
        }));
    }
    updateWaypoints();
}
function updateWaypoints() {
    playerData.waypoints = [
        ...entities.map((ent) => new Waypoint({ target: ent })),
    ];
    const allObjects = [];
    function addPlanets(object) {
        allObjects.push(object);
        object.children.forEach(addPlanets);
    }
    for (let object of objects) {
        addPlanets(object);
    }
    playerData.waypoints.push(...allObjects.map((ent) => new Waypoint({ target: ent })));
}
let player = entities.find((ship) => ship.controllable === true);
class Waypoint {
    constructor({ target }) {
        this.target = target;
    }
    update() {
        let distX = Math.abs(player.x - this.target.x);
        let distY = Math.abs(player.y - this.target.y);
        this.distance = Math.sqrt(distX * distX + distY * distY);
    }
    draw() {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        let rot = Math.atan2(this.target.y - player.y, this.target.x - player.x);
        ctx.rotate(rot);
        let offsetX = this.distance / sensorSensitivity;
        offsetX += playerData.minRadius;
        if (offsetX > playerData.maxRadius)
            offsetX = playerData.maxRadius;
        ctx.translate(offsetX, 0);
        let cubeSize = 10;
        ctx.rotate(-rot);
        if (this.target.isShip &&
            this.target.faction !== "Borg" &&
            this.target.ship.className !== "Carrier class") {
            ctx.beginPath();
            ctx.fillStyle = "green";
            if (this.target.faction !== player.faction)
                ctx.fillStyle = "orange";
            if (this.target.controllable) {
                ctx.fillStyle = "aqua";
            }
            if (typeof this.target.health !== "undefined") {
                if (this.target.health <= 0) {
                    ctx.fillStyle = "transparent";
                }
            }
            ctx.fillRect(-cubeSize / 4, -cubeSize / 4, cubeSize / 2, cubeSize / 2);
            // console.log(this.target);
            // console.log(this.target.timesKilled)
            if (this.target.timesKilled === 0 &&
                this.target.calledForBackup &&
                (this.target.backupPulses ?? 0) < 3) {
                if (!this.target.backupCircleRadius) {
                    this.target.backupPulses = 0;
                    this.target.backupCircleRadius = cubeSize;
                }
                this.target.backupCircleRadius += 0.2;
                ctx.beginPath();
                ctx.arc(0, 0, this.target.backupCircleRadius, 0, Math.PI * 2);
                let offsetThing = (this.target.backupCircleRadius - cubeSize) / 20;
                let alpha = 1 - offsetThing;
                if (alpha < -1) {
                    this.target.backupPulses++;
                    this.target.backupCircleRadius = cubeSize;
                }
                ctx.globalAlpha = Math.max(alpha, 0);
                ctx.strokeStyle =
                    this.target.faction === player.faction ? "green" : "red";
                ctx.stroke();
            }
        }
        else if (this.target.isShip) {
            let size = cubeSize;
            if (this.target.ship.className === "Carrier class") {
                ctx.fillStyle = "white";
                ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);
                size = cubeSize * 0.6;
            }
            ctx.fillStyle = this.target.faction === player.faction ? "green" : "red";
            if (this.target.health <= 0)
                ctx.fillStyle = "gray";
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        else {
            ctx.globalAlpha = 0.3;
            let size = 3;
            ctx.fillStyle = this.target.faction === player.faction ? "white" : "aqua";
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
        ctx.closePath();
    }
}
class PlayerData {
    constructor() {
        this.waypoints = [];
        this.minRadius = Math.abs(getShipSize()) + 30;
        this.maxRadius = Math.abs(getShipSize() + 200);
    }
    drawGUI() {
        ctx.save();
        if ([...document.querySelector(".gui").classList].includes("toggled")) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.beginPath();
            ctx.strokeStyle = "white";
            ctx.globalAlpha = 0.2;
            ctx.arc(0, 0, this.minRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, this.maxRadius, 0, Math.PI * 2);
            ctx.stroke();
            // Blue line
            ctx.rotate(player.rotation);
            ctx.beginPath();
            ctx.moveTo(playerData.minRadius, 0);
            ctx.lineTo(playerData.maxRadius, 0);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "aqua";
            ctx.stroke();
            ctx.restore();
            for (let waypoint of playerData.waypoints) {
                if (waypoint.target !== player)
                    waypoint.draw();
            }
        }
        this.drawBars();
    }
    drawBars() {
        // Draw entity bars
        for (let entity of entities) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.translate(entity.x - player.x, entity.y - player.y);
            ctx.translate(0, radarMin + 10);
            // Health
            ctx.fillStyle = "gray";
            ctx.fillRect(-barWidth / 2, 0, barWidth, 10);
            ctx.fillStyle = "green";
            ctx.fillRect(-barWidth / 2, 0, (entity.health / entity.ship.startHealth) * barWidth, 10);
            // Speed
            ctx.translate(0, 15);
            ctx.fillStyle = "gray";
            ctx.fillRect(-barWidth / 2, 0, barWidth, 10);
            ctx.fillStyle = "aqua";
            ctx.fillRect(-barWidth / 2, 0, (entity.speed / entity.ship.maxSpeed) * barWidth, 10);
            // Weapons
            for (let weapon of entity.weapons) {
                ctx.translate(0, 15);
                ctx.fillStyle = "gray";
                ctx.fillRect(-barWidth / 2, 0, barWidth, 10);
                ctx.fillStyle = weapon.disabled ? "red" : "orange";
                ctx.fillRect(-barWidth / 2, 0, (weapon.disabled
                    ? weapon.weaponCooldown / weapon.weaponCooldownTime
                    : weapon.usage / weapon.maxUsage) * barWidth, 10);
            }
            ctx.restore();
        }
    }
}
function toClosestFriendly(ship) {
    let ships = (findShips(ship.faction) || []).filter((s) => s.following !== ship || s.health < 20);
    if (ships[0])
        ship.moveTo(ships[0]);
}
//# sourceMappingURL=ships.js.map