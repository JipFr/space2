var maxDist = 50;
var canvas = document.querySelector("canvas.main");
var ctx = canvas.getContext("2d");
var pressedKeys = {};
var borgMode = false;
var playerData;
var scale = 10;
var radarMin = 40;
var radarMax = 200;
// const sensorSensitivity = 2000;
var sensorSensitivity = 100;
var maxSpread = 1000e3;
var entityCount = 100;
var barWidth = 70;
window.addEventListener('scroll', updateSensorSensitivity);
updateSensorSensitivity();
function updateSensorSensitivity() {
    sensorSensitivity = 100 + (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 4900);
    return sensorSensitivity;
}
var shipChances = {
    warbird: 0.8,
    dreadnought: 1,
    defiant: 1,
    breen_explorer: 0.3,
    breen_warship: 0.1,
    explorer: 1,
    nerada: 0.1,
    cube: 0.07,
    carrier: 0.04,
    god: 0.005,
};
document.addEventListener("keydown", function (evt) {
    pressedKeys[evt.key.toLowerCase()] = true;
    if (evt.key.toLowerCase() === " ")
        evt.preventDefault();
});
document.addEventListener("keyup", function (evt) {
    pressedKeys[evt.key.toLowerCase()] = false;
});
function getRandomShip() {
    var ships = entities.slice(1);
    return ships[Math.floor(Math.random() * ships.length)];
}
var Scoreboard = /** @class */ (function () {
    function Scoreboard() {
        var _a;
        this.highScore = Number((_a = localStorage.getItem("highScore")) !== null && _a !== void 0 ? _a : this.points);
    }
    Scoreboard.prototype.addPoints = function (pointsTo, killed) {
        if (pointsTo === void 0) { pointsTo = player; }
        pointsTo.points += Math.floor(killed.ship.startHealth / 100);
        if (pointsTo === player)
            this.updateHigh();
    };
    Scoreboard.prototype.updateHigh = function () {
        if (player.points > this.highScore) {
            this.highScore = player.points;
            localStorage.setItem("highScore", this.highScore.toString());
        }
    };
    return Scoreboard;
}());
var scoreboard = new Scoreboard();
var Backdrop = /** @class */ (function () {
    function Backdrop() {
        this.items = [];
    }
    Backdrop.prototype.populateStars = function () {
        this.items = [];
        for (var i = 0; i < 100; i++) {
            this.items.push(new BackdropStar({
                x: Math.floor(Math.random() * canvas.width) + player.x,
                y: Math.floor(Math.random() * canvas.height) + player.y
            }));
        }
    };
    return Backdrop;
}());
var BackdropStar = /** @class */ (function () {
    function BackdropStar(_a) {
        var x = _a.x, y = _a.y;
        this.x = x;
        this.y = y;
    }
    BackdropStar.prototype.update = function () {
        var _a = player.velocity, velX = _a[0], velY = _a[1];
        velX = Math.abs(velX);
        velY = Math.abs(velY);
        var centerOffsetX = this.x - player.x;
        var centerOffsetY = this.y - player.y;
        while (centerOffsetX > canvas.width) {
            var change = (centerOffsetX % canvas.width) - centerOffsetX;
            centerOffsetX += change;
            this.x += change;
        }
        while (centerOffsetX < 0) {
            var change = (centerOffsetX % canvas.width + canvas.width) - centerOffsetX;
            centerOffsetX += change;
            this.x += change;
        }
        while (centerOffsetY > canvas.height) {
            var change = (centerOffsetY % canvas.height) - centerOffsetY;
            centerOffsetY += change;
            this.y += change;
        }
        while (centerOffsetY < 0) {
            var change = (centerOffsetY % canvas.height + canvas.height) - centerOffsetY;
            centerOffsetY += change;
            this.y += change;
        }
    };
    BackdropStar.prototype.draw = function () {
        ctx.fillStyle = "white";
        if (player.speed < .5) {
            ctx.fillRect(this.x - player.x, this.y - player.y, 1, 1);
        }
        else {
            ctx.beginPath();
            var rotX = player.speed * Math.cos(player.rotation);
            var rotY = player.speed * Math.sin(player.rotation);
            ctx.moveTo(((this.x - player.x) + rotX), ((this.y - player.y) + rotY));
            ctx.lineTo(((this.x - rotX) - player.x), ((this.y - rotY) - player.y));
            ctx.strokeStyle = "white";
            ctx.stroke();
        }
    };
    return BackdropStar;
}());
var backdrop = new Backdrop();
function getShipSize(entity) {
    if (entity === void 0) { entity = player; }
    return ((entity.ship.image.width / scale) * (entity.ship.imageScale || 1)) - 50;
}
