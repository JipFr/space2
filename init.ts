

let maxDist = 50;
const canvas: HTMLCanvasElement = document.querySelector("canvas.main");
const ctx = canvas.getContext("2d");
let pressedKeys = {}
const borgMode = false;
let playerData: PlayerData;

const scale = 8;
const radarMin = 40;
const radarMax = 200;
// const sensorSensitivity = 2000;
let sensorSensitivity = 100;
const maxSpread = 1000e3;
const entityCount = 500;
const barWidth = 70;

window.addEventListener('scroll', updateSensorSensitivity);
updateSensorSensitivity()
function updateSensorSensitivity() {
	sensorSensitivity = 100 + (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 4900)
	return sensorSensitivity
}

let shipChances = {
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
}

document.addEventListener("keydown", (evt: KeyboardEvent) => {
	pressedKeys[evt.key.toLowerCase()] = true;
	if(evt.key.toLowerCase() === " ") evt.preventDefault()
});
document.addEventListener("keyup", (evt: KeyboardEvent) => {
	pressedKeys[evt.key.toLowerCase()] = false;
});

function getRandomShip(): Entity {
	let ships = entities.slice(1);
	return ships[Math.floor(Math.random() * ships.length)];
}

class Scoreboard {
	public points: number;
	public highScore: number;

	constructor() {
		this.highScore = Number(localStorage.getItem("highScore") ?? this.points);
	}

	public addPoints(pointsTo: Entity = player, killed: Entity): void {
		pointsTo.points += Math.floor(killed.ship.startHealth / 100);
		if(pointsTo === player) this.updateHigh();
	}

	protected updateHigh(): void {
		if(player.points > this.highScore) {
			this.highScore = player.points;
			localStorage.setItem("highScore", this.highScore.toString());
		}
	}

}

const scoreboard = new Scoreboard();

class Backdrop {
	items: BackdropStar[];
	constructor() {
		this.items = [];
	}
	public populateStars() {
		this.items = [];
		for(let i = 0; i < 100; i++) {
			this.items.push(new BackdropStar({
				x: Math.floor(Math.random() * canvas.width) + player.x,
				y: Math.floor(Math.random() * canvas.height) + player.y
			}));
		}
	}
}
class BackdropStar {
	public x: number;
	public y: number;
	protected centerOffsetX: number;
	protected centerOffsetY: number;
	constructor({x, y}: {x: number, y: number}) {
		this.x = x;
		this.y = y;
	}
	public update(): void {

		let [velX, velY] = player.velocity;
		velX = Math.abs(velX);
		velY = Math.abs(velY);

		let centerOffsetX = this.x - player.x;
		let centerOffsetY = this.y - player.y;
		
		while(centerOffsetX > canvas.width) {
			let change = (centerOffsetX % canvas.width) - centerOffsetX;
			centerOffsetX += change;
			this.x += change;
		} 
		while(centerOffsetX < 0) {
			let change = (centerOffsetX % canvas.width + canvas.width) - centerOffsetX;
			centerOffsetX += change;
			this.x += change;	
		}

		while(centerOffsetY > canvas.height) {
			let change = (centerOffsetY % canvas.height) - centerOffsetY;
			centerOffsetY += change;
			this.y += change;
		} 
		while(centerOffsetY < 0) {
			let change = (centerOffsetY % canvas.height + canvas.height) - centerOffsetY;
			centerOffsetY += change;
			this.y += change;
		}

	}
	public draw(): void {
		ctx.fillStyle = "white";
		if(player.speed < .5) {
			ctx.fillRect(this.x - player.x, this.y - player.y, 1, 1);
		} else {
			ctx.beginPath();

			

			let rotX = player.speed * Math.cos(player.rotation);
			let rotY = player.speed * Math.sin(player.rotation);

			ctx.moveTo(((this.x - player.x) + rotX), ((this.y - player.y) + rotY));
			ctx.lineTo(((this.x - rotX) - player.x), ((this.y - rotY) - player.y));

			ctx.strokeStyle = "white";
			ctx.stroke();
		}
	}
}

let backdrop = new Backdrop();

function getShipSize(entity: Entity = player): number {
	return ((entity.ship.image.width / scale) * (entity.ship.imageScale || 1)) - 50;
}