var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var objects = [];
var StellarObject = /** @class */ (function () {
    function StellarObject(_a) {
        var radius = _a.radius, _b = _a.x, x = _b === void 0 ? null : _b, _c = _a.y, y = _c === void 0 ? null : _c, _d = _a.distance, distance = _d === void 0 ? null : _d, faction = _a.faction, _e = _a.parent, parent = _e === void 0 ? null : _e;
        var possibleColors = ["white", "green", "blue", "brown"];
        this.isShip = false;
        this.cooldown = 0;
        this.rot = Math.random() * (Math.PI * 2);
        this.radius = radius;
        this.x = x;
        this.y = y;
        this.distance = distance;
        this.children = [];
        this.color = possibleColors[Math.floor(Math.random() * possibleColors.length)];
        this.faction = faction;
        this.parent = parent;
    }
    StellarObject.prototype.spawnShip = function () {
        var _this = this;
        if (entities.filter(function (v) { return v.health > 10; }).length < entityCount && !this.parent) {
            var possibleEntities = Object.values(shipClasses).filter(function (shipClass) {
                return shipClass.faction === _this.faction;
            });
            var shipClass = possibleEntities[Math.floor(Math.random() * possibleEntities.length)];
            entities.push(new Entity({
                ship: shipClass,
                faction: shipClass.faction,
                controllable: false,
                x: this.x,
                y: this.y
            }));
            updateWaypoints();
        }
    };
    StellarObject.prototype.updateFaction = function (faction) {
        this.faction = faction;
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            child.updateFaction(faction);
        }
    };
    StellarObject.prototype.update = function () {
        var _this = this;
        if (!this.parent) {
            // Check if there's any "friendly" ships nearby
            // If not, transfer ownership to conquering force
            var dist = getShipDistances(this).filter(function (v) { return v.health > 10 && v.distance <= 50e3; });
            var ships = dist.filter(function (v) { return v.faction === _this.faction; });
            if (ships.length === 0) {
                var enemyShips = dist.filter(function (v) { return v.faction !== _this.faction; });
                if (enemyShips.length > 0) {
                    console.log("Transfering ownership of ".concat(this.x, "/").concat(this.y, " from ").concat(this.faction, " to ").concat(enemyShips[0].faction));
                    this.updateFaction(enemyShips[0].faction);
                }
            }
        }
        this.color = this.faction === player.faction ? '#0f4611' : '#530000';
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            child.rot += (child.distance / 5e3) / 100;
            var newX = this.x - (child.distance * Math.cos(child.rot));
            var newY = this.y - (child.distance * Math.sin(child.rot));
            child.x = newX;
            child.y = newY;
            child.update();
        }
        // Spawn new ship if the cooldown is over
        if (this.cooldown <= 0) {
            this.cooldown = (Math.random() * 1000) + 3600;
            if (Math.floor(Math.random() * 3) === 0)
                this.spawnShip();
        }
        this.cooldown--;
    };
    StellarObject.prototype.draw = function () {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        var drawX = this.x - player.x;
        var drawY = this.y - player.y;
        ctx.translate(drawX, drawY);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        var barWidth = this.radius * 0.5;
        var barHeight = 7;
        ctx.fillStyle = "black";
        ctx.fillRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight);
        ctx.fillStyle = "ghostwhite";
        ctx.fillRect(-barWidth / 2, -barHeight / 2, (this.cooldown / 3600) * barWidth, barHeight);
        ctx.textAlign = "center";
        ctx.fillText(this.faction, 0, barHeight + 20);
        ctx.restore();
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            child.draw();
        }
    };
    StellarObject.prototype.addChild = function (distance, radius) {
        var subplanet = new StellarObject({
            radius: radius,
            distance: distance,
            faction: this.faction,
            parent: this
        });
        this.children.push(subplanet);
        return subplanet;
    };
    return StellarObject;
}());
var allFactions = __spreadArray([], new Set(Object.values(shipClasses).map(function (v) { return v.faction; })), true);
for (var i = 0; i < 100; i++) {
    var planet = new StellarObject({
        radius: Math.floor(Math.random() * 600) + 100,
        x: randomCoords(maxSpread),
        y: randomCoords(maxSpread),
        faction: allFactions[Math.floor(Math.random() * allFactions.length)]
    });
    for (var j = 0; j < Math.floor(Math.random() * 8); j++) {
        var subplanet = planet.addChild(planet.radius * 3 + Math.floor(Math.random() * 9e3), Math.floor(Math.random() * (planet.radius * 0.5)));
        subplanet.addChild(subplanet.radius * 2, 10);
    }
    objects.push(planet);
}
