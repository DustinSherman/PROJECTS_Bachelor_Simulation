// Math Library
var math = require("mathjs");

const simulation = require("./simulation.js");

class Quadtree {
	constructor(position, size, capacity, tmpParticle) {
		this.pos = position;
		this.size = size;
		this.tmpParticles = [];

		// Class Variables
		this.directions = [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		];
		this.children = [];

		this.minSize = 1;

		this.capacity = capacity;
		this.divided = false;

		this.unchanged = true;

		let self = this;
		tmpParticle.forEach(function(tmpParticle) {
			if (self.contains(tmpParticle.pos, self.pos, self.size)) {
				if (tmpParticle.unchanged == false) {
					self.unchanged = false;
				}

				self.tmpParticles.push(tmpParticle);
			}
		})

		if (this.size > this.minSize) {
			if (this.tmpParticles.length > this.capacity) {
				for (let i = 0; i < 4; i++) {
					this.children.push(new Quadtree([this.pos[0] + this.size/4 * this.directions[i][0], this.pos[1] + this.size/4 * this.directions[i][1]], this.size/2, this.capacity, this.tmpParticles));
				}

				this.divided = true;
			}
		}
	}

	contains(pos, rectPos, rectSize) {
		return (pos[0] >= rectPos[0] - rectSize/2.0 &&
			pos[0] < rectPos[0] + rectSize/2.0 &&
			pos[1] >= rectPos[1] - rectSize/2.0 &&
			pos[1] < rectPos[1] + rectSize/2.0);
	}

	circleIntersects(cPos, cRadius) {
		let tmpX = cPos[0];
		let tmpY = cPos[1];

		if (cPos[0] < this.pos[0] - this.size/2) {
			tmpX = this.pos[0] - this.size/2;
		} else if (cPos[0] > this.pos[0] + this.size/2) {
			tmpX = this.pos[0] + this.size/2;
		}
		if (cPos[1] < this.pos[1] - this.size/2) {
			tmpY = this.pos[1] - this.size/2;
		} else if (cPos[1] > this.pos[1] + this.size/2) {
			tmpY = this.pos[1] + this.size/2;
		}

		let distX = cPos[0] - tmpX;
		let distY = cPos[1] - tmpY;
		let distance = math.sqrt((distX * distX) + (distY * distY));

		if (distance <= cRadius) {
			return true;
		} else {
			return false;
		}
	}

	returnParticles(pos, radius) {
		let returnParticles = [];

		if (this.circleIntersects(pos, radius)) {
			if (!this.divided) {
				this.tmpParticles.forEach(function(tmpParticle) {
					if (math.distance(tmpParticle.pos, pos) < radius) {
						returnParticles.push(tmpParticle);
					}
				})
			} else {
				this.children.forEach(function(child) {
					returnParticles = returnParticles.concat(child.returnParticles(pos, radius));
				})
			}
		}

		return returnParticles;
	}

	contentParticles(pos, radius) {
		let contentParticles = [];

		contentParticles = contentParticles.concat(this.returnParticles(pos, radius));


		let torus = [0, 0];

		// Check if torus
		for (let i = 0; i < 2; i++) {
			let tmpPos = [pos[0], pos[1]];

			if (pos[i] - radius < 0) {
				torus[i] = 1;
			} else if (pos[i] + radius >= simulation.fieldWidth) {
				torus[i] = -1;
			}

			if (torus[i] != 0) {
				tmpPos[i] = tmpPos[i] + torus[i] * simulation.fieldWidth;
				
				contentParticles = contentParticles.concat(this.returnParticles(tmpPos, radius));
			}
		}

		if (torus[0] != 0 && torus[1] != 0) {
			let tmpPos = [pos[0] + torus[0] * simulation.fieldWidth, pos[1] + torus[1] * simulation.fieldWidth];

			contentParticles = contentParticles.concat(this.returnParticles(tmpPos, radius));
		}

		return contentParticles;
	}

	log(level) {
		console.log("tree level ", level, this.pos, this.size);
		for (let i = 0; i < this.tmpParticles.length; i++) {
			console.log(this.tmpParticles[i].pos);
		}

		for (let i = 0; i < this.children.length; i++) {
			this.children[i].log(level + 1);
		}
	}
}

module.exports = Quadtree