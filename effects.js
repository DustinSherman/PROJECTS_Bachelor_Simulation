// MODULES
var math = require("mathjs");

const simulation = require("./simulation.js");
const geometric = require("./geometric.js");
const fluid = require("./fluid.js");
const log = require("./log.js");

let explosionSquareVals = [];
let explosionMinSize = 2;
let explosionMaxSize = 128;
let explosionMinForce = .2;
let explosionMaxForce = 64;

let lineTrails = [];
let linePolygons = [];

// SwirlForce get divided by distance to center
let swirlForceBase = .4;

exports.swirlForceBase = swirlForceBase;

function reset() {
	explosionSquareVals = [];
	lineTrails = [];
}

function explosionSetup() {
	for (let i = 0; i <= explosionMaxSize - explosionMinSize; i++) {
		explosionSquareVals[i] = [];

		for (let j = 0; j <= explosionMaxSize + i; j++) {
			explosionSquareVals[i].push(math.sqrt(j + 1) / math.sqrt(explosionMinSize + i) * (explosionMinSize + i));
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
				let tmpExplosionPos = self.pos;

				if (tmpParticle.pos[0] - self.pos[0] > simulation.fieldWidth / 2) {
					// Particle is over the left border
					tmpExplosionPos[0] += simulation.fieldWidth;
				} else if (tmpParticle.pos[0] - self.pos[0] < -simulation.fieldWidth / 2) {
					// Particle is over right border
					tmpExplosionPos[0] -= simulation.fieldWidth;
				}

				if (tmpParticle.pos[1] - self.pos[1] > simulation.fieldWidth / 2) {
					// Particle is over the top border
					tmpExplosionPos[1] += simulation.fieldWidth;
				} else if (tmpParticle.pos[1] - self.pos[1] < -simulation.fieldWidth / 2) {
					// Particle is over bottom border
					tmpExplosionPos[1] -= simulation.fieldWidth;
				}

				let tmpForceVelocity = [tmpParticle.pos[0] - tmpExplosionPos[0], tmpParticle.pos[1] - tmpExplosionPos[1]];
				tmpForceVelocity = geometric.setMag(tmpForceVelocity, self.force / Math.pow(geometric.dist(tmpExplosionPos, tmpParticle.pos), 2));

				tmpParticle.addAcceleration(tmpForceVelocity, "explosion at " + self.pos);
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

				let tmpForceVelocity = [tmpFluidParticle.pos[0] - tmpExplosionPos[0], tmpFluidParticle.pos[1] - tmpExplosionPos[1]];
				tmpForceVelocity = geometric.setMag(tmpForceVelocity, (self.force / geometric.dist(tmpExplosionPos, tmpFluidParticle.pos)) * 2);

				tmpFluidParticle.xv += tmpForceVelocity[0];
				tmpFluidParticle.yv += tmpForceVelocity[1];
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

function setShockwave(pos, strength, state) {
	simulation.shockwaveData.push([pos[0], pos[1], strength, state]);
}

// ////////////////////////////// SWIRLS

class swirl {
	// Type refers to the kind of particle affected by the swirl. 0 = fluid particles, 1 = particles
	constructor(pos, radius, direction, type) {
		this.pos = pos;
		this.radius = radius;
		this.direction = direction;
		this.type = type;
	}

	draw() {
		let tmpParticles = [];

		if (this.type == 0) {
			tmpParticles = simulation.tree.contentParticles(this.pos, this.radius, 0);
		} else {
			tmpParticles = simulation.fluidTree.contentParticles(this.pos, this.radius, 0);
		}

		let self = this;

		tmpParticles.forEach(function (particle) {
			if (!particle.merged) {
				let tmpSwirlPos = [self.pos[0], self.pos[1]];

				if (particle.pos[0] - self.pos[0] > simulation.fieldWidth / 2) {
					// Fluid Particle is over the left border
					tmpSwirlPos[0] += simulation.fieldWidth;
				} else if (particle.pos[0] - self.pos[0] < -simulation.fieldWidth / 2) {
					// Fluid Particle is over right border
					tmpSwirlPos[0] -= simulation.fieldWidth;
				}

				if (particle.pos[1] - self.pos[1] > simulation.fieldWidth / 2) {
					// Fluid Particle is over the top border
					tmpSwirlPos[1] += simulation.fieldWidth;
				} else if (particle.pos[1] - self.pos[1] < -simulation.fieldWidth / 2) {
					// Fluid Particle is over bottom border
					tmpSwirlPos[1] -= simulation.fieldWidth;
				}

				let accelercationDir = [particle.pos[0] - tmpSwirlPos[0], particle.pos[1] - tmpSwirlPos[1]];

				let distance = geometric.mag(accelercationDir);

				accelercationDir = geometric.rotate(accelercationDir, Math.PI/2 * self.direction);
				accelercationDir = geometric.setMag(accelercationDir, swirlForceBase/distance);

				if (self.type == 0) {
					particle.addAcceleration(accelercationDir, "Swirl")
				} else {
					particle.xv += accelercationDir[0];
					particle.yv += accelercationDir[1];
				}
			}
		});
	}
}

// ////////////////////////////// EXPORTS

var effects = module.exports = {
	reset,
	explosionSetup,
	explosion,
	swirl,
	setLineTrails,
	updateLineTrails,
	setShockwave,
	explosionMinSize,
	explosionMaxSize,
	explosionMinForce,
	explosionMaxForce

}