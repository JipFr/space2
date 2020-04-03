
const canvas: HTMLCanvasElement = document.querySelector("canvas.main");
const ctx = canvas.getContext("2d");
let pressedKeys = {}
const borgMode = false;
let playerData: PlayerData;

const scale = 8;
const radarMin = 40;
const radarMax = 200;
const sensorSensitivity = 2000;
const maxSpread = 1000e3;
const entityCount = 100;
const barWidth = 70;

document.addEventListener("keydown", (evt: KeyboardEvent) => {
	pressedKeys[evt.key.toLowerCase()] = true;
});
document.addEventListener("keyup", (evt: KeyboardEvent) => {
	pressedKeys[evt.key.toLowerCase()] = false;
});

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
	constructor({x, y}) {
		this.x = x;
		this.y = y;
	}
	public update(): void {
		if(this.x - player.x < -player.speed) {
			this.x = (canvas.width + player.x) + Math.abs(this.x - player.x);
		} else if(this.x - player.x > canvas.width + player.speed) {
			this.x = player.x - player.speed + (this.x - player.x - canvas.width);
		}

		if(this.y - player.y < -player.speed) {
			this.y = (canvas.height + player.y) + Math.abs(this.y - player.y);
		} else if(this.y - player.y > canvas.height + player.speed) {
			this.y = player.y - player.speed + (this.y - player.y - canvas.height);
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