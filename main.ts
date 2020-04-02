
function loop(): void {
	canvas.width = canvas.scrollWidth;
	canvas.height = canvas.scrollHeight;
	draw();
	for(let entity of entities) {
		entity.update();
	}
	for(let waypoint of playerData.waypoints) {
		waypoint.update();
	}
	requestAnimationFrame(loop);
}

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
		waypoint.draw();
	}

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
	window.addEventListener("resize", () => {
		backdrop.populateStars();
	});
	loop();
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