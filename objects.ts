const objects: StellarObject[] = []

class StellarObject {
	radius: number;
	x?: number;
	y?: number;
	distance: number;
	children: StellarObject[]
	color: string;
	rot: number;

	constructor({ radius, x = null, y = null, distance = null }: { radius: number, x?: number, y?: number, distance?: number }) {

		const possibleColors = ["white", "green", "blue", "brown"]

		this.rot = Math.random() * (Math.PI*2)
		this.radius = radius;
		this.x = x;
		this.y = y;
		this.distance = distance;
		this.children = [];
		this.color = possibleColors[Math.floor(Math.random() * possibleColors.length)];
	}

	public update() {
		for(let child of this.children) {
			child.rot += (child.distance / 5e3) / 100;
			let newX = this.x - (child.distance * Math.cos(child.rot))
			let newY = this.y - (child.distance * Math.sin(child.rot))

			child.x = newX;
			child.y = newY;
			child.update()
		}
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

		ctx.restore()

		for(let child of this.children) {
			child.draw()
		}
	}

	public addChild(distance: number, radius: number) {
		const subplanet = new StellarObject({
			radius,
			distance
		})
		this.children.push(subplanet)
		return subplanet;
	}

}

const allFactions = [...new Set(Object.values(shipClasses).map(v => v.faction))]

for(let i = 0; i < 1; i++) {
	const planet = new StellarObject({
		radius: 300,
		x: 900,
		y: 900
	});
	for(let j = 0; j < 3; j++) {
		const subplanet = planet.addChild(planet.radius * 3 + Math.floor(Math.random() * 5e3), Math.floor(Math.random() * (planet.radius * 0.5)))
		subplanet.addChild(subplanet.radius * 2, 10)
		
	}
	objects.push(planet)
}