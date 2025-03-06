var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var Phaser = /** @class */ (function () {
    function Phaser(_a) {
        var dps = _a.dps, color = _a.color, maxDistance = _a.maxDistance, shortcut = _a.shortcut, position = _a.position, _b = _a.maxUsage, maxUsage = _b === void 0 ? 30 : _b, _c = _a.weaponCooldownTime, weaponCooldownTime = _c === void 0 ? 31 : _c;
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
    Phaser.prototype.fire = function (firing) {
        var _a;
        ctx.save();
        if (this.usage > this.maxUsage) {
            this.disabled = true;
            this.weaponCooldown = this.weaponCooldownTime + 0;
        }
        else if (this.disabled && this.usage <= 0 && this.weaponCooldown <= 0) {
            this.disabled = false;
        }
        var ships = getShipDistances(firing)
            .filter(function (ent) { return ent !== firing && ent.faction !== firing.faction && ent.health > 0 && (firing.controllable ? !ent.controllable : true); });
        var closest = ships[0];
        if (closest && closest.distance < this.maxDistance && firing.health > 10 && !this.disabled) {
            ctx.beginPath();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            var position = this.position;
            var _b = getCustomPosition(position, firing), setX = _b[0], setY = _b[1];
            ctx.moveTo(setX - player.x, setY - player.y);
            var fireX = closest.x - player.x;
            var fireY = closest.y - player.y;
            var size_1 = Math.abs(getShipSize(closest));
            function getRandOffset() {
                return (Math.random() * size_1) - size_1 / 2;
            }
            ctx.lineTo(fireX + getRandOffset(), fireY + getRandOffset());
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            var turnDir = Math.floor(Math.random() * 2) === 0 ? "Left" : "Right";
            if (!closest.ship.noShake)
                closest["turn".concat(turnDir)]();
            closest.health -= this.dps / 60;
            if (closest.health <= 0 && !closest.isDead) {
                closest.timesKilled++;
                closest.isDead = true;
                if (closest.timesKilled <= 1) {
                    // This is the first time the enemy ship is killed
                    // Give points to responsible party
                    var pointsTo = ((_a = firing.following) !== null && _a !== void 0 ? _a : {}).faction === firing.faction ? firing.following : firing;
                    scoreboard.addPoints(pointsTo, closest);
                }
            }
            this.usage++;
        }
        ctx.restore();
    };
    return Phaser;
}());
var Entity = /** @class */ (function () {
    function Entity(_a) {
        var ship = _a.ship, faction = _a.faction, _b = _a.weapons, weapons = _b === void 0 ? [] : _b, _c = _a.controllable, controllable = _c === void 0 ? false : _c, _d = _a.x, x = _d === void 0 ? 0 : _d, _e = _a.y, y = _e === void 0 ? 0 : _e, _f = _a.rotation, rotation = _f === void 0 ? (Math.random() * (Math.PI * 2)) - Math.PI : _f, _g = _a.speed, speed = _g === void 0 ? 5 : _g;
        this.isShip = true;
        this.ship = ship;
        this.ship.image = new Image();
        this.ship.image.src = "assets/ships/".concat(this.ship.texture);
        this.weapons = JSON.parse(JSON.stringify(this.ship.weapons)).map(function (phaser) { return new Phaser(phaser); }) || [];
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
    Entity.prototype.updateControllable = function () {
        var _this = this;
        if (this === player && this.health <= 0) {
            var ships = getShipDistances();
            // let alternative: (Entity | void) = ships.find(ent => ent.controllable && ent.health > 0);
            var alternative = ships.find(function (ent) { return ent.health > 0; });
            if (alternative) {
                player.controllable = false;
                player = alternative;
                alternative.controllable = true;
            }
        }
        if (this.health > 0) {
            if (gamepadAxes.length > 0) {
                var leftStick = gamepadAxes[0];
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
                for (var _i = 0, _a = this.weapons; _i < _a.length; _i++) {
                    var weapon = _a[_i];
                    weapon.fire(this);
                }
            }
            if (((pressedKeys["w"] && this.speed < 5) || (pressedKeys["w"] && pressedKeys["shift"])) && !this.action) {
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
                entities.forEach(function (ship) {
                    if (ship.faction === player.faction && ship !== player)
                        ship.moveTo(player);
                });
            }
            if (pressedKeys["8"] && !this.action) {
                entities.forEach(function (ship) {
                    ship.action = undefined;
                    if (ship !== player)
                        ship.moveTo(player);
                });
            }
            if (pressedKeys["7"]) {
                toClosestFriendly(this);
            }
            if (pressedKeys["6"]) {
                var ships = getShipDistances(this).filter(function (s) { return s.faction !== _this.faction && s.health > 10; });
                if (ships[0])
                    this.moveTo(ships[0]);
            }
            if (pressedKeys["1"]) {
                entities.forEach(function (e) {
                    delete e.following;
                    delete e.action;
                    e.moveTo({ x: 0, y: 0 });
                });
            }
            if (pressedKeys["c"] && this.action) {
                delete this.action;
                delete this.following;
            }
            for (var _b = 0, _c = (this.weapons || []); _b < _c.length; _b++) {
                var weapon = _c[_b];
                if (pressedKeys[weapon.shortcut]) {
                    weapon.fire(this);
                }
            }
        }
    };
    Entity.prototype.updateNonControllable = function () {
        var ships = getShipDistances(this).filter(function (sh) { return sh.distance < 9e5 && sh.health > 0; });
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
        for (var _i = 0, _a = (this.weapons || []); _i < _a.length; _i++) {
            var weapon = _a[_i];
            weapon.fire(this);
        }
    };
    Entity.prototype.update = function () {
        var _this = this;
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
            else if (this.following !== player || this.following.faction !== this.faction) {
                this.following.followers--;
                delete this.following;
            }
        }
        // Heal friendly nearby ships
        var healable = getShipDistances(this).filter(function (sh) { return sh.faction === _this.faction && sh.distance < 250 && sh.health < sh.ship.startHealth && _this.health > 0; });
        for (var _i = 0, healable_1 = healable; _i < healable_1.length; _i++) {
            var ship = healable_1[_i];
            ship.health += 0.1;
        }
        // Weapon cooldown
        for (var _a = 0, _b = (this.weapons || []); _a < _b.length; _a++) {
            var weapon = _b[_a];
            if (weapon.usage > 0)
                weapon.usage -= 0.5;
            if (weapon.weaponCooldown > 0)
                weapon.weaponCooldown -= 0.5;
        }
        // Speed checks
        var ms = this.ship.maxSpeed * (this.health / this.ship.startHealth);
        if (ms < 0)
            ms = 0;
        if (this.speed > ms) {
            this.speed = ms;
        }
        // Movement
        var newX = this.speed * Math.cos(this.rotation);
        var newY = this.speed * Math.sin(this.rotation);
        this.velocity = [newX, newY];
        this.x += newX;
        this.y += newY;
        // Draw trails
        for (var i = 0; i < (this.ship.trailExits || []).length; i++) {
            if (typeof this.trails[i] === "undefined")
                this.trails[i] = [];
            if (this.speed > 0) {
                var position = this.ship.trailExits[i];
                var _c = getCustomPosition(position, this), setX = _c[0], setY = _c[1];
                this.trails[i].push([setX, setY]);
            }
            if (this.trails[i].length > 20 || (this.speed < 1 && this.trails[i].length > 0)) {
                this.trails[i].shift();
            }
        }
        // If there is an action (like moving towards something), run its main thing
        if (this.action) {
            this.action.loop();
        }
        // Call for backup if there's the need
        if (this.health > 0 && this.health / this.ship.startHealth < 0.4 && !this.calledForBackup) { // 40%
            this.callForBackup();
        }
        if (this.health < 0) {
            this.health = 0;
        }
    };
    Entity.prototype.callForBackup = function () {
        var _this = this;
        if (!this.calledForBackup) {
            var nearbyFriendlies = getShipDistances(this).filter(function (sh) { return sh.faction === _this.faction && sh !== player && sh.health > 0; }).slice(0, 3);
            console.log("".concat(nearbyFriendlies.length, " ").concat(this.faction === player.faction ? "friendly" : "hostile", " ships are now approaching a ").concat(this === player ? "the player" : this.ship.className + " type shit"));
            for (var _i = 0, nearbyFriendlies_1 = nearbyFriendlies; _i < nearbyFriendlies_1.length; _i++) {
                var friendly = nearbyFriendlies_1[_i];
                friendly.following = this;
            }
            this.calledForBackup = true;
        }
    };
    Entity.prototype.moveTo = function (location) {
        var _this = this;
        var ships = getShipDistances();
        var ent = ships[Math.floor(Math.random() * ships.length)];
        this.action = {
            i: 0,
            main: function () {
                var _a, _b, _c;
                var goTo = _this.action.goTo;
                var goToX = goTo.x;
                var goToY = goTo.y;
                var i = _this.action.i;
                var distanceX = _this.x - goToX;
                var distanceY = _this.y - goToY;
                var distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                _this.distance = distance;
                goTo.speed = (_a = goTo.speed) !== null && _a !== void 0 ? _a : 0;
                if (!goTo.isShip)
                    goTo.isShip = false;
                if (i >= 0 && distance > maxDist) {
                    var dirTo = distance < Math.min(maxDist * 2, 400) && goTo.isShip ? goTo.rotation : Math.atan2(goToY - _this.y, goToX - _this.x);
                    function normalizeAngle(a) {
                        // No idea
                        var totalRange = Math.PI * 2;
                        if (a > Math.PI) {
                            a -= totalRange;
                        }
                        else if (a < -Math.PI) {
                            a += totalRange;
                        }
                        return a;
                    }
                    var relativeHeading = normalizeAngle(dirTo - _this.rotation);
                    if (_this.health > 0) {
                        _this.rotation += relativeHeading / 30;
                        _this.correctRotation();
                    }
                }
                if (i >= 100 && distance > maxDist)
                    _this.accelerate();
                // if(i >= 100 && distance > (maxDist / 10) && this.speed < (goTo.speed ?? 0)) this.accelerate();
                // if(this.faction === goTo.faction && distance < 100 && this.speed > goTo.speed) this.speed = goTo.speed; 
                if (distance < (maxDist / 10) + (_this.speed * 20) && ((_b = goTo.speed) !== null && _b !== void 0 ? _b : 0) < 20) {
                    _this.speed -= _this.speed / 10;
                }
                if (distance < maxDist + (Math.abs((_c = _this.speed - goTo.speed) !== null && _c !== void 0 ? _c : 0) * 20)) {
                    _this.speed -= _this.speed / 10;
                }
                if ((goTo.health <= 0 && goTo.faction !== _this.faction) || (_this === player && goTo.speed <= 0.01 && _this.speed <= 0.01))
                    delete _this.action;
            },
            loop: function () {
                _this.action.i++;
                _this.action.main();
            },
            goTo: location
        };
    };
    Entity.prototype.accelerate = function () {
        if (this.speed < this.ship.maxSpeed) {
            this.speed += (this.ship.accelaration || 0.1);
        }
    };
    Entity.prototype.deccelerate = function () {
        if (this.speed > 3) {
            this.speed *= 0.95;
        }
        else if (this.speed > 0) {
            this.speed -= 0.1;
        }
        if (this.speed < 0) {
            this.speed = 0;
        }
    };
    Entity.prototype.turnLeft = function () {
        this.rotation -= this.ship.rotSpeed / 1e3;
        this.correctRotation();
    };
    Entity.prototype.turnRight = function () {
        this.rotation += this.ship.rotSpeed / 1e3;
        this.correctRotation();
    };
    Entity.prototype.correctRotation = function () {
        if (this.rotation < -Math.PI)
            this.rotation = Math.PI;
        if (this.rotation > Math.PI)
            this.rotation = -Math.PI;
    };
    Entity.prototype.draw = function () {
        var _this = this;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        var drawX = this.x - player.x;
        var drawY = this.y - player.y;
        ctx.translate(drawX, drawY);
        for (var _i = 0, _a = Object.values(this.trails); _i < _a.length; _i++) {
            var trail = _a[_i];
            if (trail.length > 0) {
                var points = trail.map(function (s) { return [s[0] - _this.x, s[1] - _this.y]; });
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                for (var _b = 0, points_1 = points; _b < points_1.length; _b++) {
                    var _c = points_1[_b], x = _c[0], y = _c[1];
                    ctx.lineTo(x, y);
                }
                ctx.strokeStyle = "white";
                ctx.stroke();
            }
        }
        ctx.rotate(this.rotation);
        var img = this.ship.image;
        var imgWidth = (img.width / scale) * (this.ship.imageScale || 1);
        var imgHeight = (img.height / scale) * (this.ship.imageScale || 1);
        ctx.drawImage(this.ship.image, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        ctx.restore();
    };
    return Entity;
}());
var shipClasses = {
    "warbird": {
        className: "Romulan Warbird",
        faction: "Romulan",
        maxSpeed: 30,
        texture: "3.png",
        startHealth: 100,
        rotSpeed: 40,
        trailExits: [
            [0, 100]
        ],
        weapons: [
            new Phaser({
                dps: 40,
                color: "red",
                maxDistance: 2000,
                shortcut: " ",
                position: [Math.PI / 2, 100]
            }),
            new Phaser({
                dps: 40,
                color: "red",
                maxDistance: 2000,
                shortcut: " ",
                position: [-Math.PI / 2, 100]
            })
        ]
    },
    "dreadnought": {
        className: "Dreadnought",
        faction: "Breen",
        maxSpeed: 25,
        texture: "dreadnought.png",
        startHealth: 500,
        rotSpeed: 8,
        imageScale: 5,
        trailExits: [
            [0, 460]
        ],
        weapons: [
            new Phaser({
                dps: 5,
                color: "purple",
                maxDistance: 500,
                shortcut: " ",
                position: [-(Math.PI + 0.09), 390]
            }),
            new Phaser({
                dps: 5,
                color: "purple",
                maxDistance: 500,
                shortcut: " ",
                position: [-(Math.PI - 0.09), 390]
            })
        ]
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
    "defiant": {
        className: "Defiant",
        faction: "Starfleet",
        maxSpeed: 30,
        texture: "player_alt3.png",
        startHealth: 200,
        rotSpeed: 20,
        imageScale: 0.3,
        accelaration: 0.3,
        trailExits: [
            [0, 20]
        ],
        weapons: [
            new Phaser({
                dps: 90,
                color: "blue",
                maxDistance: 1000,
                shortcut: " ",
                position: [-Math.PI, 20]
            })
        ]
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
    "explorer": {
        className: "Explorer",
        faction: "Starfleet",
        maxSpeed: 300,
        accelaration: 1,
        texture: "2.png",
        startHealth: 100,
        rotSpeed: 50,
        trailExits: [
            [0.15, 100],
            [-0.15, 100]
        ],
        weapons: [
            new Phaser({
                dps: 20,
                color: "orange",
                maxDistance: 1000,
                shortcut: " ",
                position: [Math.PI, 100]
            })
        ]
    },
    "breen_explorer": {
        className: "Breen Explorer",
        faction: "Breen",
        maxSpeed: 500,
        accelaration: 1,
        texture: "alien1.png",
        startHealth: 100,
        rotSpeed: 50,
        imageScale: 3,
        weapons: [],
        trailExits: [
            [0, 320]
        ]
    },
    "breen_warship": {
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
                position: [Math.PI - 0.45, 420]
            }),
            new Phaser({
                dps: 20,
                color: "purple",
                maxDistance: 1200,
                shortcut: " ",
                position: [Math.PI - 0.72, 370]
            }),
            new Phaser({
                dps: 20,
                color: "purple",
                maxDistance: 1200,
                shortcut: " ",
                position: [Math.PI + 0.45, 420]
            }),
            new Phaser({
                dps: 20,
                color: "purple",
                maxDistance: 1200,
                shortcut: " ",
                position: [Math.PI + 0.72, 370]
            })
        ],
        trailExits: [
            [0.2, 330],
            [-0.2, 330]
        ]
    }
};
var entities = [];
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
    var explorer = shipClasses["explorer"];
    entities.push(new Entity({
        ship: explorer,
        faction: explorer.faction,
        controllable: true,
        x: 0,
        y: 0
    }));
}
genShips();
function randomCoords(spread) {
    return Math.floor(Math.random() * spread) - spread / 2;
}
function spawnExplorers(amount) {
    if (amount === void 0) { amount = 1; }
    var fleetShip = shipClasses["explorer"];
    var borgFleetSettings = {
        ship: fleetShip,
        faction: fleetShip.faction,
        controllable: false,
        rotation: 0
    };
    for (var i = 0; i < amount; i++) {
        entities.push(new Entity(__assign(__assign({}, borgFleetSettings), { x: Math.random() * 5e3, y: Math.random() * 5e3 })));
    }
    updateWaypoints();
}
function updateWaypoints() {
    var _a;
    playerData.waypoints = __spreadArray([], entities.map(function (ent) { return new Waypoint({ target: ent }); }), true);
    var allObjects = [];
    function addPlanets(object) {
        allObjects.push(object);
        object.children.forEach(addPlanets);
    }
    for (var _i = 0, objects_1 = objects; _i < objects_1.length; _i++) {
        var object = objects_1[_i];
        addPlanets(object);
    }
    (_a = playerData.waypoints).push.apply(_a, allObjects.map(function (ent) { return new Waypoint({ target: ent }); }));
}
var player = entities.find(function (ship) { return ship.controllable === true; });
var Waypoint = /** @class */ (function () {
    function Waypoint(_a) {
        var target = _a.target;
        this.target = target;
    }
    Waypoint.prototype.update = function () {
        var distX = Math.abs(player.x - this.target.x);
        var distY = Math.abs(player.y - this.target.y);
        this.distance = Math.sqrt(distX * distX + distY * distY);
    };
    Waypoint.prototype.draw = function () {
        var _a;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        var rot = Math.atan2(this.target.y - player.y, this.target.x - player.x);
        ctx.rotate(rot);
        var offsetX = this.distance / sensorSensitivity;
        offsetX += playerData.minRadius;
        if (offsetX > playerData.maxRadius)
            offsetX = playerData.maxRadius;
        ctx.translate(offsetX, 0);
        var cubeSize = 10;
        ctx.rotate(-rot);
        if (this.target.isShip && this.target.faction !== "Borg" && this.target.ship.className !== "Carrier class") {
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
            if (this.target.timesKilled === 0 && this.target.calledForBackup && ((_a = this.target.backupPulses) !== null && _a !== void 0 ? _a : 0) < 3) {
                if (!this.target.backupCircleRadius) {
                    this.target.backupPulses = 0;
                    this.target.backupCircleRadius = cubeSize;
                }
                this.target.backupCircleRadius += 0.2;
                ctx.beginPath();
                ctx.arc(0, 0, this.target.backupCircleRadius, 0, Math.PI * 2);
                var offsetThing = (this.target.backupCircleRadius - cubeSize) / 20;
                var alpha = 1 - offsetThing;
                if (alpha < -1) {
                    this.target.backupPulses++;
                    this.target.backupCircleRadius = cubeSize;
                }
                ctx.globalAlpha = Math.max(alpha, 0);
                ctx.strokeStyle = this.target.faction === player.faction ? "green" : "red";
                ctx.stroke();
            }
        }
        else if (this.target.isShip) {
            var size = cubeSize;
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
            var size = 3;
            ctx.fillStyle = this.target.faction === player.faction ? "white" : "aqua";
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
        ctx.closePath();
    };
    return Waypoint;
}());
var PlayerData = /** @class */ (function () {
    function PlayerData() {
        this.waypoints = [];
        this.minRadius = Math.abs(getShipSize()) + 30;
        this.maxRadius = Math.abs(getShipSize() + 200);
    }
    PlayerData.prototype.drawGUI = function () {
        ctx.save();
        if (__spreadArray([], document.querySelector('.gui').classList, true).includes('toggled')) {
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
            for (var _i = 0, _a = playerData.waypoints; _i < _a.length; _i++) {
                var waypoint = _a[_i];
                if (waypoint.target !== player)
                    waypoint.draw();
            }
        }
        this.drawBars();
    };
    PlayerData.prototype.drawBars = function () {
        for (var _i = 0, entities_1 = entities; _i < entities_1.length; _i++) {
            var entity = entities_1[_i];
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
            for (var _a = 0, _b = entity.weapons; _a < _b.length; _a++) {
                var weapon = _b[_a];
                ctx.translate(0, 15);
                ctx.fillStyle = "gray";
                ctx.fillRect(-barWidth / 2, 0, barWidth, 10);
                ctx.fillStyle = weapon.disabled ? "red" : "orange";
                ctx.fillRect(-barWidth / 2, 0, (weapon.disabled ? weapon.weaponCooldown / weapon.weaponCooldownTime : weapon.usage / weapon.maxUsage) * barWidth, 10);
            }
            ctx.restore();
        }
    };
    return PlayerData;
}());
function toClosestFriendly(ship) {
    var ships = (findShips(ship.faction) || []).filter(function (s) { return s.following !== ship || s.health < 20; });
    if (ships[0])
        ship.moveTo(ships[0]);
}
