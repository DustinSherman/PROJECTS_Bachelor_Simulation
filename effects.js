// MODULES
var math = require("mathjs");

const simulation = require("./simulation.js");
const geometric = require("./geometric.js");
const fluid = require("./fluid.js");

let explosionSquareVals = [];
let explosionMinSize = 2;
let explosionMaxSize = 384;
let explosionMinForce = .2;
let explosionMaxForce = 64;

let trails = [];

function explosionSetup() {
	for (let i = 0; i <= explosionMaxSize - explosionMinSize; i++) {
		explosionSquareVals[i] = [];

		for (let j = 0; j <= explosionMaxSize + i; j++) {
			explosionSquareVals[i].push(math.floor(math.sqrt(j + 1)/math.sqrt(explosionMinSize + i) * (explosionMinSize + i)));
		}
	}
}

class explosion {
	// particleType determines which kind of particles are affected (0 = normal particles, 1 = fluid particles)
	constructor(pos, maxSize, force, particleType) {
		this.pos = [pos[0], pos[1]];
		this.maxSize = Math.round(geometric.constrain(maxSize, explosionMinSize, explosionMaxSize));
		this.force = geometric.constrain(force, explosionMinForce, explosionMaxForce);
		this.particleType = particleType;
		this.tmpSize = 1;
		this.index = 0;
		this.kill = false;
	}

	draw() {
		let self = this;

		if (this.particleType == 0) {
			let tmpParticles = [];

			tmpParticles = tmpParticles.concat(simulation.tree.contentParticles(this.pos, this.tmpSize, 0));
	
			tmpParticles.forEach(function(tmpParticle) {
				if (geometric.dist(tmpParticle.pos, self.pos) < self.tmpSize) {
					let tmpForceVelocity = [tmpParticle.pos[0] - self.pos[0], tmpParticle.pos[1] - self.pos[1]];
					tmpForceVelocity = geometric.setMag(tmpForceVelocity, self.force/geometric.dist(self.pos, tmpParticle.pos));
	
					tmpParticle.addAcceleration(tmpForceVelocity);
				}
			});
		} else if (this.particleType == 1) {
			let tmpFluidParticles = [];
			tmpFluidParticles = tmpFluidParticles.concat(simulation.fluidTree.contentParticles(this.pos, this.tmpSize, 0));
	
			tmpFluidParticles.forEach(function(tmpFluidParticle) {
				if (geometric.dist(tmpFluidParticle.pos, self.pos) < self.tmpSize) {
					let tmpForceVelocity = [tmpFluidParticle.pos[0] - self.pos[0], tmpFluidParticle.pos[1] - self.pos[1]];
					tmpForceVelocity = geometric.setMag(tmpForceVelocity, (self.force/geometric.dist(self.pos, tmpFluidParticle.pos)) * 2);
	
					// fluid.addAcceleration(tmpFluidParticle, tmpForceVelocity);
					tmpFluidParticle.xv += tmpForceVelocity[0];
					tmpFluidParticle.yv += tmpForceVelocity[1];
				}
			});
		}

		this.index++;

		this.tmpSize = explosionSquareVals[this.maxSize - explosionMinSize][math.min(this.index, this.maxSize - 1)];

		if (this.tmpSize >= this.maxSize) {
			this.kill = true;
		}
	}
}

// ////////////////////////////// TRAILS

function addTrail(id, duration, trailLength) {
	trails.push([id, duration, trailLength]);
}

function setTrails(pos, size, trailLength, duration) {
	let trailParticles = [];
	trailParticles = trailParticles.concat(simulation.tree.contentParticles(pos, size, 0));

	trailParticles.forEach(function(particle) {
		if (!particle.merged) {
			addTrail(particle.id, duration, trailLength);

			/*
			let tmpData = [];
	
			tmpData.push(particle.id);
			tmpData.push(trailLength);
			tmpData.push(duration);
	
			simulation.trailData.push(tmpData);
			*/
		}
	});
}

function updateTrails() {
	for (let i = trails.length - 1; i >= 0; i--) {
		if (trails[i][1] <= 0) {
			trails.splice(i, 1);
		}
	}

	for (let i = 0; i < trails.length; i++) {
		let tmpData = [];

		tmpData.push(trails[i][0]);
		tmpData.push(simulation.particles[trails[i][0]].pos[0]);
		tmpData.push(simulation.particles[trails[i][0]].pos[1]);
		tmpData.push(trails[i][2]);

		simulation.trailData.push(tmpData);

		trails[i][1]--;
	}
}

// ////////////////////////////// SHOCKWAVES

function setShockwave(pos, strength) {
	simulation.shockwaveData.push([pos[0], pos[1], strength]);
}

// ////////////////////////////// EXPORTS

var effects = module.exports = {
	explosionSetup,
	explosion,
	setTrails,
	setShockwave,
	updateTrails
}