
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

	for(let entity of entities) {
		if(true) { // insert should-draw check here.
			entity.draw();
		}
	}
	playerData.drawGUI()
	for(let waypoint of playerData.waypoints) {
		if(waypoint.target !== player) waypoint.draw();
	}

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

	let cube = entities.find(f => f.faction ==="Borg");
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

function getShipDistances(from: Entity = player) {
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