const objects: StellarObject[] = []

class StellarObject {
	radius: number;
	x?: number;
	y?: number;
	distance: number;
	children: StellarObject[]
	color: string;
	rot: number;
	faction: string;
	cooldown: number;
	parent: StellarObject
	isShip: false

	constructor({ radius, x = null, y = null, distance = null, faction, parent = null }: { radius: number, x?: number, y?: number, distance?: number, faction: string, parent?: StellarObject }) {

		const possibleColors = ["white", "green", "blue", "brown"]

		this.isShip = false
		this.cooldown = 0;
		this.rot = Math.random() * (Math.PI*2)
		this.radius = radius;
		this.x = x;
		this.y = y;
		this.distance = distance;
		this.children = [];
		this.color = possibleColors[Math.floor(Math.random() * possibleColors.length)];
		this.faction = faction
		this.parent = parent
	}

	public spawnShip() {
		if(entities.filter(v => v.health > 10).length < entityCount && !this.parent) {
			
			const possibleEntities = Object.values(shipClasses).filter(shipClass => {
				return shipClass.faction === this.faction
			})
			
			const shipClass = possibleEntities[Math.floor(Math.random() * possibleEntities.length)]
			entities.push(new Entity({
				ship: shipClass,
				faction: shipClass.faction,
				controllable: false,
				x: this.x,
				y: this.y
			}));

			updateWaypoints()
		}
	}

	public updateFaction(faction: string) {
		this.faction = faction
		for(let child of this.children) {
			child.updateFaction(faction)
		}
	}

	public update() {

		if(!this.parent) {
			// Check if there's any "friendly" ships nearby
			// If not, transfer ownership to conquering force
			const dist = getShipDistances(this).filter(v => v.health > 10 && v.distance <= 50e3)
			const ships = dist.filter(v => v.faction === this.faction)
			if(ships.length === 0) {
				const enemyShips = dist.filter(v => v.faction !== this.faction)
				if(enemyShips.length > 0) {
					console.log(`Transfering ownership of ${this.x}/${this.y} from ${this.faction} to ${enemyShips[0].faction}`)
					this.updateFaction(enemyShips[0].faction)
				}
			}
		}

		this.color = this.faction === player.faction ? 'green' : '#530000'

		for(let child of this.children) {
			child.rot += (child.distance / 5e3) / 100;
			let newX = this.x - (child.distance * Math.cos(child.rot))
			let newY = this.y - (child.distance * Math.sin(child.rot))
			
			child.x = newX;
			child.y = newY;
			child.update()
		}

		// Spawn new ship if the cooldown is over
		if(this.cooldown <= 0) {
			this.cooldown = (Math.random() * 1000) + 3600
			if(Math.floor(Math.random() * 3) === 0) this.spawnShip()
		}
	
		this.cooldown--
	}

	public draw() {
		ctx.save();

		ctx.translate(canvas.width / 2, canvas.height / 2);

		let drawX = this.x - player.x;
		let drawY = this.y - player.y;
		ctx.translate(drawX, drawY);

		ctx.beginPath()
		ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
		ctx.fillStyle = this.color
		ctx.fill()

		const barWidth = this.radius*2;
		const barHeight = 30;
		ctx.fillStyle = "black"
		ctx.fillRect(-barWidth/2, -barHeight/2, barWidth, barHeight)
		ctx.fillStyle = "ghostwhite"
		ctx.fillRect(-barWidth/2, -barHeight/2, (this.cooldown / 3600) * barWidth, barHeight)

		ctx.textAlign = "center"
		ctx.fillText(this.faction, 0, barHeight + 20)

		ctx.restore()

		for(let child of this.children) {
			child.draw()
		}
	}

	public addChild(distance: number, radius: number) {
		const subplanet = new StellarObject({
			radius,
			distance,
			faction: this.faction,
			parent: this
		})
		this.children.push(subplanet)
		return subplanet;
	}

}

const allFactions = [...new Set(Object.values(shipClasses).map(v => v.faction))]

for(let i = 0; i < 100; i++) {
	const planet = new StellarObject({
		radius: Math.floor(Math.random() * 600) + 100,
		x: randomCoords(maxSpread),
		y: randomCoords(maxSpread),
		faction: allFactions[Math.floor(Math.random() * allFactions.length)]
	});
	for(let j = 0; j < 3; j++) {
		const subplanet = planet.addChild(planet.radius * 3 + Math.floor(Math.random() * 5e3), Math.floor(Math.random() * (planet.radius * 0.5)))
		subplanet.addChild(subplanet.radius * 2, 10)
		
	}
	objects.push(planet)
}