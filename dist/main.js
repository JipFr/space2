var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
function loop() {
    canvas.width = canvas.scrollWidth;
    canvas.height = canvas.scrollHeight;
    if (!__spreadArray([], document.querySelector('.paused').classList, true).includes('toggled')) {
        for (var _i = 0, entities_1 = entities; _i < entities_1.length; _i++) {
            var entity = entities_1[_i];
            if (gamepad)
                scanGamepads();
            var distX = Math.abs(entity.x - player.x);
            var distY = Math.abs(entity.y - player.y);
            var distance = Math.sqrt(distX * distX + distY + distY);
            if (distance < 10e3 || entity.following || entity.followers > 0 || entity.action) {
                entity.update();
            }
        }
        for (var _a = 0, _b = playerData.waypoints; _a < _b.length; _a++) {
            var waypoint = _b[_a];
            waypoint.update();
        }
        for (var _c = 0, objects_1 = objects; _c < objects_1.length; _c++) {
            var stellarObject = objects_1[_c];
            stellarObject.update();
        }
    }
    draw();
    requestAnimationFrame(loop);
}
var fps = 0;
function draw() {
    ctx.globalAlpha = 0.5;
    for (var _i = 0, _a = backdrop.items; _i < _a.length; _i++) {
        var star = _a[_i];
        star.update();
        star.draw();
    }
    ctx.globalAlpha = 1;
    for (var _b = 0, objects_2 = objects; _b < objects_2.length; _b++) {
        var stellarObject = objects_2[_b];
        stellarObject.draw();
    }
    for (var _c = 0, entities_2 = entities; _c < entities_2.length; _c++) {
        var entity = entities_2[_c];
        if (true) { // insert should-draw check here.
            entity.draw();
        }
    }
    playerData.drawGUI();
}
function findShips(selector) {
    var ships = getShipDistances(player);
    return ships.filter(function (ent) {
        return ent.faction.toLowerCase() === selector.toLowerCase() ||
            ent.ship.className === selector.toLowerCase();
    });
}
function init() {
    canvas.width = canvas.scrollWidth;
    canvas.height = canvas.scrollHeight;
    playerData = new PlayerData();
    // let cube = entities.find(f => f.faction ==="Borg");
    // player = cube;
    // Temporary
    for (var _i = 0, entities_3 = entities; _i < entities_3.length; _i++) {
        var entity = entities_3[_i];
        playerData.waypoints.push(new Waypoint({
            target: entity
        }));
    }
    backdrop.populateStars();
    // window.addEventListener("resize", () => {
    // 	backdrop.populateStars();
    // });
    setResizeHandler(function () {
        backdrop.populateStars();
    }, 100);
    document.body.addEventListener("click", function (evt) {
        var path = evt.composedPath();
        if (!path.find(function (v) { return v.nodeName === "BUTTON"; })) {
            document.body.classList.toggle('hide-buttons');
        }
    });
    loop();
}
function setResizeHandler(callback, timeout) {
    var timerId = null;
    window.addEventListener("resize", function () {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
        timerId = setTimeout(function () {
            timerId = null;
            callback();
        }, timeout);
    });
}
window.addEventListener("load", init);
function getShipDistances(from) {
    if (from === void 0) { from = player; }
    return entities.map(function (ent) {
        if (ent === from)
            return null;
        var difX = Math.abs(ent.x - from.x);
        var difY = Math.abs(ent.y - from.y);
        ent.distance = Math.sqrt(difX * difX + difY * difY);
        return ent;
    }).filter(function (i) { return i; }).sort(function (a, b) { return a.distance - b.distance; });
}
function getCustomPosition(position, entity) {
    var offset = (position[1] / 200) * (entity.ship.image.width / scale);
    var setX = entity.x - (offset * Math.cos(entity.rotation - position[0]));
    var setY = entity.y - (offset * Math.sin(entity.rotation - position[0]));
    return [setX, setY];
}
function whackoMode() {
    // Turn every entity into its own faction
    if (confirm('Do you want to turn every ship into its own faction, causing a free-for-all?')) {
        for (var _i = 0, _a = Object.entries(entities); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], entity = _b[1];
            // entity.ship = Object.assign({}, entity.ship)
            entity.faction = i;
        }
    }
}
function whackModeShips() {
    if (confirm('Spam borg ships?')) {
        var spamShip = shipClasses["cube"];
        for (var i = 0; i < 20; i++) {
            entities.push(new Entity({
                ship: spamShip,
                faction: spamShip.faction,
                controllable: false,
                x: 0,
                y: 0,
                speed: Math.floor(Math.random() * spamShip.maxSpeed),
                rotation: Math.random() * 30
            }));
        }
        updateWaypoints();
    }
}
function warZone() {
    if (confirm('Activate warzone?')) {
        // Get all factions
        var factions_1 = __spreadArray([], new Set(entities.map(function (v) { return v.faction; })), true);
        var _loop_1 = function (i) {
            var members = entities.filter(function (v) { return v.faction === factions_1[i]; });
            for (var _i = 0, members_1 = members; _i < members_1.length; _i++) {
                var member = members_1[_i];
                member.x = (i * 15e3) + Math.random() * 2e3;
                member.y = (i * 15e3) + Math.random() * 2e3;
            }
        };
        // Put factions in groups
        for (var i = 0; i < factions_1.length; i++) {
            _loop_1(i);
        }
    }
}
function spawnEnemy() {
    var spamShip = Object.assign({}, shipClasses["warbird"]);
    spamShip.startHealth = Infinity;
    entities.push(new Entity({
        ship: spamShip,
        faction: spamShip.faction,
        controllable: false,
        x: player.x + 200,
        y: player.y,
        speed: 0,
        rotation: 0
    }));
    updateWaypoints();
}
