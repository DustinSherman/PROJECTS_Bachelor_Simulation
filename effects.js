// MODULES
var math = require("mathjs");

const simulation = require("./simulation.js");
const geometric = require("./geometric.js");
const fluid = require("./fluid.js");
const log = require("./log.js");

let explosionSquareVals = [];
let explosionMinSize = 2;
let explosionMaxSize = 384;
let explosionMinForce = .2;
let explosionMaxForce = 64;

let lineTrails = [];
let linePolygons = [];

function explosionSetup() {
	for (let i = 0; i <= explosionMaxSize - explosionMinSize; i++) {
		explosionSquareVals[i] = [];

		for (let j = 0; j <= explosionMaxSize + i; j++) {
			explosionSquareVals[i].push(math.floor(math.sqrt(j + 1) / math.sqrt(explosionMinSize + i) * (explosionMinSize + i)));
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

			tmpParticles.forEach(function (tmpParticle) {
				if (geometric.dist(tmpParticle.pos, self.pos) < self.tmpSize) {
					let tmpForceVelocity = [tmpParticle.pos[0] - self.pos[0], tmpParticle.pos[1] - self.pos[1]];
					tmpForceVelocity = geometric.setMag(tmpForceVelocity, self.force / geometric.dist(self.pos, tmpParticle.pos));

					tmpParticle.addAcceleration(tmpForceVelocity);
				}
			});
		} else if (this.particleType == 1) {
			let tmpFluidParticles = [];
			tmpFluidParticles = tmpFluidParticles.concat(simulation.fluidTree.contentParticles(this.pos, this.tmpSize, 0));

			tmpFluidParticles.forEach(function (tmpFluidParticle) {
				let tmpExplosionPos = self.pos;

				if (tmpFluidParticle.pos[0] - self.pos[0] > simulation.fieldWidth / 2) {
					// Fluid Particle is over the left border
					tmpExplosionPos[0] += simulation.fieldWidth;
				} else if (tmpFluidParticle.pos[0] - self.pos[0] < -simulation.fieldWidth / 2) {
					// Fluid Particle is over right border
					tmpExplosionPos[0] -= simulation.fieldWidth;
				}

				if (tmpFluidParticle.pos[1] - self.pos[1] > simulation.fieldWidth / 2) {
					// Fluid Particle is over the top border
					tmpExplosionPos[1] += simulation.fieldWidth;
				} else if (tmpFluidParticle.pos[1] - self.pos[1] < -simulation.fieldWidth / 2) {
					// Fluid Particle is over bottom border
					tmpExplosionPos[1] -= simulation.fieldWidth;
				}

				if (geometric.dist(tmpFluidParticle.pos, tmpExplosionPos) < self.tmpSize) {
					let tmpForceVelocity = [tmpFluidParticle.pos[0] - tmpExplosionPos[0], tmpFluidParticle.pos[1] - tmpExplosionPos[1]];
					tmpForceVelocity = geometric.setMag(tmpForceVelocity, (self.force / geometric.dist(tmpExplosionPos, tmpFluidParticle.pos)) * 2);

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

// ////////////////////////////// LINE TRAILS

function setLineTrails(center, size, duration) {
	// UNCOMMENT to log new particle trails
	if (simulation.logData) {
		log.logLineTrails(center, size, duration);
	}

	let coordParticles = [];
	coordParticles = coordParticles.concat(simulation.tree.contentParticles(center, size, 0));

	coordParticles.forEach(function (particle) {
		if (!particle.merged) {
			lineTrails.push([particle.id, duration]);
		}
	});
}

function updateLineTrails() {
	for (let i = 0; i < lineTrails.length; i++) {
		if (lineTrails[i][1] > 0) {
			let tmpData = [];

			tmpData.push(parseFloat(simulation.particles[lineTrails[i][0]].pos[0].toFixed(simulation.decimals)));
			tmpData.push(parseFloat(simulation.particles[lineTrails[i][0]].pos[1].toFixed(simulation.decimals)));

			simulation.lineTrailData[i] = tmpData;

			lineTrails[i][1]--;
		}
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
	setLineTrails,
	updateLineTrails,
	setShockwave
}