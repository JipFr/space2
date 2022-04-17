
function loop(): void {
	canvas.width = canvas.scrollWidth;
	canvas.height = canvas.scrollHeight;
	draw();
	for(let entity of entities) {

		if(gamepad) scanGamepads();

		let distX = Math.abs(entity.x - player.x);
		let distY = Math.abs(entity.y - player.y);
		let distance = Math.sqrt(distX * distX + distY + distY);
		if(distance < 10e3 || entity.following || entity.followers > 0 || entity.action) {
			entity.update();
		}

	}
	for(let waypoint of playerData.waypoints) {
		waypoint.update();
	}
	for(let stellarObject of objects) {
		stellarObject.update()
	}
	requestAnimationFrame(loop);
}

let fps = 0;
function draw(): void {
	
	ctx.globalAlpha = 0.5;
	for(let star of backdrop.items) {
		star.update();
		star.draw();
	}
	ctx.globalAlpha = 1;

	for(let stellarObject of objects) {
		stellarObject.draw()
	}

	for(let entity of entities) {
		if(true) { // insert should-draw check here.
			entity.draw();
		}
	}
	playerData.drawGUI();
}

function findShips(selector: string): (Entity[] | void) {
	let ships = getShipDistances(player);
	return ships.filter(ent => 
		ent.faction.toLowerCase() === selector.toLowerCase() ||
		ent.ship.className === selector.toLowerCase()	
	)
}

function init(): void {
	canvas.width = canvas.scrollWidth;
	canvas.height = canvas.scrollHeight;

	playerData = new PlayerData();

	// let cube = entities.find(f => f.faction ==="Borg");
	// player = cube;

	// Temporary
	for (let entity of entities) {
		playerData.waypoints.push(new Waypoint({
			target: entity
		}));
	}

	backdrop.populateStars();
	// window.addEventListener("resize", () => {
	// 	backdrop.populateStars();
	// });
	setResizeHandler(() => {
		backdrop.populateStars();
	}, 100);
	
	document.body.addEventListener("click", (evt) => {
		const path = evt.composedPath()
		if(!path.find((v: HTMLElement) => v.nodeName === "BUTTON")) {
			document.body.classList.toggle('hide-buttons')
		}
	})

	loop();
}

function setResizeHandler(callback: CallableFunction, timeout: number) {
	let timerId = null;
	window.addEventListener("resize", () => {
		if(timerId) {
			clearTimeout(timerId);
			timerId = null;
		}
		timerId = setTimeout(() => {
			timerId= null;
			callback();
		}, timeout);
	});
}

window.addEventListener("load", init);

function getShipDistances(from: Entity | StellarObject = player) {
	return entities.map(ent => { 
		if(ent === from) return null;
		
		let difX = Math.abs(ent.x - from.x);
		let difY = Math.abs(ent.y - from.y);

		ent.distance = Math.sqrt(difX * difX + difY * difY);

		return ent;
	}).filter(i => i).sort((a, b) => a.distance - b.distance);
}

function getCustomPosition(position: [number, number], entity: Entity): [number, number] {
	let offset = (position[1] / 200) * (entity.ship.image.width / scale)
	let setX = entity.x - (offset * Math.cos(entity.rotation - position[0]));
	let setY = entity.y - (offset * Math.sin(entity.rotation - position[0]));
	return [setX, setY];
}

function whackoMode() {
	// Turn every entity into its own faction
	if(confirm('Do you want to turn every ship into its own faction, causing a free-for-all?')) {
		for(let [i, entity] of Object.entries(entities)) {
			// entity.ship = Object.assign({}, entity.ship)
			entity.faction = i
		}
	}
}

function whackModeShips() {
	if(confirm('Spam borg ships?')) {
		const spamShip = shipClasses["cube"];

		for(let i = 0; i < 20; i++) {
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

		updateWaypoints()
	}
}

function warZone() {
	if(confirm('Activate warzone?')) {
		// Get all factions
		const factions = [...new Set(entities.map(v => v.faction))]
	
		// Put factions in groups
		for(let i = 0; i < factions.length; i++) {
			const members = entities.filter(v => v.faction === factions[i])
			for(let member of members) {
				member.x = (i * 15e3) + Math.random() * 2e3;
				member.y = (i * 15e3) + Math.random() * 2e3;
			}
		}
	}
}

function spawnEnemy() {
	const spamShip = Object.assign({}, shipClasses["warbird"]);

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
	
	updateWaypoints()
}