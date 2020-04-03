
class Phaser {
	public dps: number;
	public color: string;
	public maxDistance: 1000;
	public shortcut: string;
	public position: [number, number];
	public usage: number;
	public maxUsage: number;
	public weaponCooldownTime: number;
	public weaponCooldown: number;
	public disabled: boolean;

	constructor({
		dps,
		color,
		maxDistance,
		shortcut,
		position,
		maxUsage = 30,
		weaponCooldownTime = 31
	}) {
		this.color = color;
		this.dps = dps;
		this.maxDistance = maxDistance;
		this.shortcut = shortcut;
		this.position = position;
		this.usage = 0;
		this.disabled = false;
		this.maxUsage = maxUsage;
		this.weaponCooldownTime = weaponCooldownTime;
	}

	public fire(firing: Entity) {
		ctx.save();

		if (this.usage > this.maxUsage) {
			this.disabled = true;
			this.weaponCooldown = this.weaponCooldownTime + 0;
		} else if (this.disabled && this.usage <= 0 && this.weaponCooldown <= 0) {
			this.disabled = false;
		}

		let ships: Entity[] = getShipDistances(firing)
			.filter(ent => ent !== firing && ent.faction !== firing.faction && ent.health > 0 && (firing.controllable ? !ent.controllable : true));

		let closest: (Entity | void) = ships[0];
		if (closest && closest.distance < this.maxDistance && firing.health > 10 && !this.disabled) {
			ctx.beginPath();

			ctx.translate(canvas.width / 2, canvas.height / 2);

			let position = this.position;
			let [setX, setY] = getCustomPosition(position, firing);

			ctx.moveTo(setX - player.x, setY - player.y);
			let fireX = closest.x - player.x;
			let fireY = closest.y - player.y;
			let size = Math.abs(getShipSize(closest));
			function getRandOffset(): number {
				return (Math.random() * size) - size / 2;
			}
			ctx.lineTo(fireX + getRandOffset(), fireY + getRandOffset());

			ctx.strokeStyle = this.color;
			ctx.lineWidth = 3;
			ctx.stroke();

			let turnDir = Math.floor(Math.random() * 2) === 0 ? "Left" : "Right";
			if(!closest.ship.noShake) closest[`turn${turnDir}`]();
			closest.health -= this.dps / 60;
			this.usage++

		}
		ctx.restore();
	}

}

interface shipClass {
	className: string;
	maxSpeed: number; // max speed
	texture: string; // path to texture
	startHealth: number; // Health to start off with
	rotSpeed: number; // Rotation speed when turning
	accelaration: number;
	image: HTMLImageElement; // Image of this ship
	imageScale?: number;
	trailExits?: [number, number][]; // Where should the trails exit from?
	weapons?: Phaser[];
	noShake?: boolean;
}

interface MovementAction {
	main();
	loop();
	i: number;
	goTo: (Entity | { x: number, y: number, speed?: number });
}

class Entity {
	ship: shipClass;
	faction: string;
	controllable: boolean;

	speed: number;
	health: number;
	rotation: number;
	x: number;
	y: number;
	trails: object;
	followers: number;
	weapons?: Phaser[];
	distance?: number;
	action?: MovementAction;
	calledForBackup?: boolean;
	following?: Entity;

	constructor({
		ship,
		faction,
		weapons = [],
		controllable = false,
		x = 0,
		y = 0,
		rotation = Math.random() * (Math.PI * 2),
		speed = 5
	}) {
		this.ship = ship;
		this.ship.image = new Image();
		this.ship.image.src = `assets/ships/${this.ship.texture}`;

		this.weapons = JSON.parse(JSON.stringify(this.ship.weapons)).map(phaser => new Phaser(phaser)) || [];

		this.faction = faction;
		this.controllable = controllable;
		this.health = ship.startHealth + 0;
		this.rotation = rotation;
		this.speed = speed;
		this.x = x;
		this.y = y;
		this.followers = 0;
		this.trails = {}
	}

	public update(): void {

		if (this.controllable) {

			if(this === player && this.health <= 0) {
				let ships = getShipDistances();
				let alternative: (Entity | void) = ships.find(ent => ent.controllable && ent.health > 0);
				if(alternative) {
					alert("Switched bodies");
					player = alternative;
				}
			}
			
			if(this.health > 0) {

				if (((pressedKeys["w"] && this.speed < 5) || (pressedKeys["w"] && pressedKeys["shift"])) && !this.action) {
					this.accelarate();
				}
				if (pressedKeys["s"] && !this.action) {
					this.deccelarate();
				}
				if (pressedKeys["a"] && !this.action) {
					this.turnLeft();
				}
				if (pressedKeys["d"] && !this.action) {
					this.turnRight();
				}

				if(pressedKeys["0"] && !this.action) {
					this.moveTo({x: 0, y: 0});
				}
				if(pressedKeys["9"] && !this.action) {
					entities.forEach(ship => {
						if(ship.faction === player.faction && ship !== player) ship.moveTo(player);
					});
				}
				if(pressedKeys["8"] && !this.action) {
					entities.forEach(ship => {
						if(ship !== player) ship.moveTo(player);
					});
				}
				if(pressedKeys["c"] && this.action) {
					delete this.action;
					delete this.following;
				}
 	
				for (let weapon of (this.weapons || [])) {
					if (pressedKeys[weapon.shortcut]) {
						weapon.fire(this);
					}
				}
			}		

		} else {

			let ships = getShipDistances(this).filter(sh => sh.distance < 3e5 && sh.health > 0);
			if(ships.length > 0) {

				if(!this.following ||
					this.following.faction === this.faction && this.following !== player && ships[0] === player) {
					this.following = ships[0];
					this.following.followers++
				}

			}

			for (let weapon of (this.weapons || [])) {
				weapon.fire(this);
			}
		}
		
		// If following someone...
		if(this.following) {
			if(this.following.health > 0) {
				
				if(!this.action || this.action.goTo !== this.following) {
					this.moveTo(this.following);
				}

			} else if(this.following !== player) {
				this.following.followers--
				delete this.following;
			}
		}

		// Heal friendly nearby ships
		let healable = getShipDistances(this).filter(sh => sh.faction === this.faction && sh.distance < 250 && sh.health < sh.ship.startHealth && this.health > 0);
		for(let ship of healable) {
			ship.health += 0.1;
		}

		// Weapon cooldown
		for (let weapon of (this.weapons || [])) {
			if (weapon.usage > 0) weapon.usage -= 0.5;
			if (weapon.weaponCooldown > 0) weapon.weaponCooldown -= 0.5;
		}
		
		// Speed checks
		let ms = this.ship.maxSpeed * (this.health / this.ship.startHealth);
		if (ms < 0) ms = 0;
		if (this.speed > ms) {
			this.speed = ms;
		}

		// Movement
		let newX = this.speed * Math.cos(this.rotation);
		let newY = this.speed * Math.sin(this.rotation);
		this.x += newX;
		this.y += newY;

		// Draw trails
		for (let i = 0; i < (this.ship.trailExits || []).length; i++) {
			if (typeof this.trails[i] === "undefined") this.trails[i] = [];

			if (this.speed > 0) {
				let position = this.ship.trailExits[i];
				let [setX, setY] = getCustomPosition(position, this);
				this.trails[i].push([setX, setY]);
			}

			if (this.trails[i].length > 20 || (this.speed < 1 && this.trails[i].length > 0)) {
				this.trails[i].shift();
			}
		}

		// If there is an action (like moving towards something), run its main thing
		if(this.action) {
			this.action.loop();
		}

		// Call for backup if there's the need
		if(this.health > 0 && this.health / this.ship.startHealth < 0.4 && !this.calledForBackup) { // 40%
			this.callForBackup();
		}

		if(this.health < 0) {
			this.health = 0;
		}

	}

	public callForBackup() {
		if(!this.calledForBackup) {

			console.log("Called for backup");

			let nearbyFriendlies = getShipDistances(this).filter(sh => sh.faction === this.faction && sh !== player).slice(0, 3);

			console.log(`${nearbyFriendlies.length} ${this.faction === player.faction ? "friendly" : "hostile"} ships are now approaching a ${this.ship.className} type ship`)

			for(let friendly of nearbyFriendlies) {
				friendly.following = this;
			}

			this.calledForBackup = true;
		}
	}

	public moveTo(location: (Entity | {x: number, y: number})) {
		let ships = getShipDistances();
		let ent = ships[Math.floor(Math.random() * ships.length)];
		this.action = {
			i: 0,
			main: () => {
				let goTo = this.action.goTo;
				let goToX = goTo.x;
				let goToY = goTo.y;

				let maxDist = 300;

				let { i } = this.action;

				let distanceX = this.x - goToX;
				let distanceY = this.y - goToY;
				let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

				if(i >= 0 && distance > maxDist) {
					let dirTo = Math.atan2(goToY - this.y, goToX - this.x);
					function normalizeAngle(a: number) {
						// No idea
						let totalRange = Math.PI * 2;
						if(a > Math.PI) {
							a -= totalRange;
						} else if(a < -Math.PI) {
							a += totalRange;
						}
						return a;
					}
					let relativeHeading = normalizeAngle(dirTo - this.rotation);
					if(this.health > 0) this.rotation += relativeHeading / 10;
				}
				if(i >= 100 && distance > maxDist * 10) this.accelarate();
				if(i >= 100 && distance > maxDist && this.speed < (goTo.speed || 9e9)) this.accelarate();
				
				if(distance < maxDist * (player.speed*3) && this.speed > (goTo.speed || 15)) this.deccelarate();
				if(distance < maxDist && this.speed > (goTo.speed || 0)) this.deccelarate();
				if(distance < maxDist && this.speed <= 0) delete this.action;
			},
			loop: () => {
				this.action.i++
				this.action.main();
			},
			goTo: location
		}
	}

	public accelarate() {
		if (this.speed < this.ship.maxSpeed) {
			this.speed += <number>(this.ship.accelaration || 0.1);
		}
	}

	public deccelarate() {
		if (this.speed > 3) {
			this.speed *= 0.95;
		} else if (this.speed > 0) {
			this.speed -= 0.1;
		}
		if (this.speed < 0) {
			this.speed = 0;
		}
	}

	public turnLeft() {
		this.rotation -= this.ship.rotSpeed / 1e3;
	}
	public turnRight() {
		this.rotation += this.ship.rotSpeed / 1e3;
	}

	public draw(): void {
		ctx.save();

		ctx.translate(canvas.width / 2, canvas.height / 2);

		let drawX = this.x - player.x;
		let drawY = this.y - player.y;
		ctx.translate(drawX, drawY);

		for (let trail of Object.values(this.trails)) {
			if (trail.length > 0) {
				let points = trail.map((s: [number, number]) => [s[0] - this.x, s[1] - this.y]);
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
	"cube": {
		className: "Borg cube",
		faction: "Borg",
		maxSpeed: 25,
		texture: "borg.png",
		startHealth: 2e3,
		rotSpeed: 20,
		imageScale: 10,
		accelaration: 5,
		weapons: [
			new Phaser({
				dps: 20,
				color: "green",
				maxDistance: 3000,
				shortcut: " ",
				position: [Math.PI, 1e3],
				maxUsage: 1e3
			}),
			new Phaser({
				dps: 20,
				color: "green",
				maxDistance: 3000,
				shortcut: " ",
				position: [0, 1e3],
				maxUsage: 1e3
			}),
			new Phaser({
				dps: 20,
				color: "green",
				maxDistance: 3000,
				shortcut: " ",
				position: [Math.PI/2, 1e3],
				maxUsage: 1e3
			}),
			new Phaser({
				dps: 20,
				color: "green",
				maxDistance: 3000,
				shortcut: " ",
				position: [-Math.PI/2, 1e3],
				maxUsage: 1e3
			})
		]
	},
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
				dps: 20,
				color: "blue",
				maxDistance: 1000,
				shortcut: " ",
				position: [-Math.PI, 20]
			})
		]
	},
	"nerada": {
		className: "Nerada",
		faction: "Romulan",
		maxSpeed: 90,
		texture: "nerada.png",
		startHealth: 600,
		rotSpeed: 10,
		imageScale: 0.6,
		accelaration: 0.6,
		trailExits: [
			[0, 20]
		],
		weapons: [
			new Phaser({
				dps: 900,
				color: "white",
				maxDistance: 500,
				shortcut: "k",
				maxUsage: 4,
				weaponCooldownTime: 300,
				position: [-Math.PI-0.2, 48]
			}),
			new Phaser({
				dps: 40,
				color: "white",
				maxDistance: 1000,
				shortcut: " ",
				position: [-Math.PI+0.2, 48]
			})
		]
	},
	"god": {
		className: "God class",
		faction: "God",
		maxSpeed: 1e6,
		accelaration: 1,
		texture: "god.png",
		startHealth: 1200,
		rotSpeed: 60,
		imageScale: 1,
		noShake: true,
		trailExits: [
			[Math.PI/2, 85],
			[-Math.PI/2, 85],
			[0, 100]
		],
		weapons: [
			new Phaser({
				dps: 900,
				color: "red",
				maxDistance: 500,
				shortcut: "k",
				maxUsage: 4,
				weaponCooldownTime: 0,
				position: [-Math.PI, 30]
			}),
			new Phaser({
				dps: 40,
				color: "white",
				maxDistance: 1000,
				shortcut: " ",
				position: [-Math.PI+0.2, 48]
			}),
			new Phaser({
				dps: 40,
				color: "white",
				maxDistance: 1000,
				shortcut: " ",
				position: [-Math.PI-0.2, 48]
			})
		]
	},
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
	}
}



let entities: Entity[] = [];


function genShips(): void {
	let init = true;
	for (let i = 0; i < entityCount; i++) {
		let allShips = Object.values(shipClasses);
		
		let shipChances = {
			warbird: 0.8,
			dreadnought: 1,
			defiant: 1,
			explorer: 1,
			nerada: 0.1,
			cube: 0.02,
			god: 0.005
		}

		let shipChancesArr = Object.entries(shipChances);
		let smallest = 1;
		for(let entry of shipChancesArr) {
			if(entry[1] < smallest) smallest = entry[1];
		}
		let dividingFactor = 1 / smallest;
		shipChancesArr.forEach(entry => entry[1] *= dividingFactor);
		let shipNames = shipChancesArr.map(entry => {
			let arr = [];
			for(let i = 0; i < entry[1]; i++) {
				arr.push(entry[0]);
			}
			return arr;
		}).flat();

		let randomShip = shipClasses[shipNames[Math.floor(Math.random() * shipNames.length)]];
		
		// Force ship type
		if(borgMode && init) {
			randomShip = shipClasses["cube"];
		} else if(borgMode && !init) {
			randomShip = shipClasses["nerada"]
		}

		entities.push(new Entity({
			ship: randomShip,
			faction: randomShip.faction,
			controllable: init,
			x: init ? 0 : randomCoords(maxSpread),
			y: init ? 0 : randomCoords(maxSpread),
			rotation: init ? 0 : undefined
		}));
		if (init) init = false;
	}

	function randomCoords(spread) {
		return Math.floor(Math.random() * spread) - spread / 2;
	}

}
genShips();

function spawnExplorers() {
	let fleetShip = shipClasses["explorer"];
	let borgFleetSettings = {
		ship: fleetShip,
		faction: fleetShip.faction,
		controllable: false,
		rotation: 0
	}
	for(let i = 0; i < 100; i++) {
		entities.push(new Entity({
			...borgFleetSettings,
			x: Math.random() * 5e3,
			y: Math.random() * 5e3,
		}));
	}
}

let player = entities.find(ship => ship.controllable === true);

class Waypoint {
	public target: Entity;

	public distance?: number;

	constructor({ target }) {
		this.target = target;
	}

	public update() {
		let distX = Math.abs(player.x - this.target.x);
		let distY = Math.abs(player.y - this.target.y);
		this.distance = Math.sqrt(distX * distX + distY * distY);
	}

	public draw() {
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);

		let rot = Math.atan2(this.target.y - player.y, this.target.x - player.x);
		ctx.rotate(rot);


		let offsetX = this.distance / sensorSensitivity;
		offsetX += playerData.minRadius;
		if (offsetX > playerData.maxRadius) offsetX = playerData.maxRadius;

		ctx.translate(offsetX, 0);
		let cubeSize = 10;
		ctx.rotate(-rot);
		if(this.target.faction !== "Borg") {
			ctx.beginPath();
			// ctx.arc(0, 0, cubeSize/4, 0, Math.PI*2);
			
			ctx.fillStyle = "green";
			if(this.target.faction !== player.faction) ctx.fillStyle = "orange";
			
			if (this.target.controllable) {
				ctx.fillStyle = "aqua";
			}
			if (typeof this.target.health !== "undefined") {
				if (this.target.health <= 0) {
					ctx.fillStyle = "gray";
				}
			}

			ctx.fillRect(-cubeSize/4, -cubeSize/4, cubeSize/2, cubeSize/2);
		} else {
			ctx.fillStyle = "red";
			ctx.fillRect(-cubeSize/2, -cubeSize/2, cubeSize, cubeSize);
		}

		ctx.restore();
		ctx.closePath();
	}

}

class PlayerData {

	public waypoints: Waypoint[];

	public minRadius: number;
	public maxRadius: number;

	constructor() {
		this.waypoints = [];
		this.minRadius = Math.abs(getShipSize()) + 30;
		this.maxRadius = Math.abs(getShipSize() + 200);
	}

	public drawGUI() {
		ctx.save();

		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.beginPath();

		ctx.strokeStyle = "white";

		ctx.globalAlpha = 0.2;

		ctx.arc(0, 0, this.minRadius, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0, 0, this.maxRadius, 0, Math.PI * 2);
		ctx.stroke();

		if (playerData.waypoints.length <= 2) {
			ctx.rotate(player.rotation);
			ctx.beginPath();

			ctx.moveTo(playerData.minRadius, 0);
			ctx.lineTo(playerData.maxRadius, 0);

			ctx.globalAlpha = 1;
			ctx.strokeStyle = "aqua";
			ctx.stroke();
		}

		ctx.restore();

		this.drawBars();

	}

	private drawBars() { // Draw entity bars
		for (let entity of entities) {
			ctx.save();
			ctx.translate(canvas.width / 2, canvas.height / 2)
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
			for(let weapon of entity.weapons) {
				ctx.translate(0, 15);
				ctx.fillStyle = "gray";
				ctx.fillRect(-barWidth / 2, 0, barWidth, 10);
				ctx.fillStyle = weapon.disabled ? "red" : "orange";
				ctx.fillRect(-barWidth / 2, 0, (weapon.disabled ? weapon.weaponCooldown / weapon.weaponCooldownTime : weapon.usage / weapon.maxUsage) * barWidth, 10);
			}

			ctx.restore();
		}

	}



}