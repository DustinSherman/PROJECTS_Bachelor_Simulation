// MODULES
var math = require("mathjs");
const fs = require("fs");

const rules = require("./particlerules.js");
const geometric = require("./geometric.js");
const simulation = require("./simulation.js");
const effects = require("./effects.js");
const cellularAutomata = require("./cellularautomata.js");
const caRules = require("./cellularautomatarules.js");
const fluid = require("./fluid.js");
const log = require("./log.js");

// let velocityMaxAbs = simulation.particleVelocityMaxAbs;
let velocityMax = .1;
let velocityReduce = .0008;
let particleSize = 1;

// exports.velocityMaxAbs = velocityMaxAbs;
exports.velocityMax = velocityMax;
exports.velocityReduce = velocityReduce;
exports.particleSize = particleSize;

let caRuleParticleRadius = 112;
exports.caRuleParticleRadius = caRuleParticleRadius;
let lowestAkin;

// ParticleResult Values
// The first values is the startingvalue and the second value is the increasing value
let multiRange = [1, 7]
let fluidMovementVelocity = [6, 2];
let fluidMovementSize = [10, 3];
let fluidExplosionSize = [32, 8];
let fluidExplosionStrength = [8, 3];
let cellularAutomataSize = [20, 12];
let lineTrailDuration = [32, 12];

exports.multiRange = multiRange;
exports.fluidMovementVelocity = fluidMovementVelocity;
exports.fluidMovementSize = fluidMovementSize;
exports.fluidExplosionSize = fluidExplosionSize;
exports.fluidExplosionStrength = fluidExplosionStrength;
exports.cellularAutomataSize = cellularAutomataSize;

// Values for explosion after reaction
let nearParticleRadius = 72;
let nearParticleCountThreshold = 16;

exports.nearParticleRadius = nearParticleRadius;
exports.nearParticleCountThreshold = nearParticleCountThreshold;

// Swirl Variables
let swirlIntializeRadius = 128;
let swirlVelocityMaxAbsReduceBase = .018;
let swirlRadiusBase = 256;

exports.swirlVelocityMaxAbsReduceBase = swirlVelocityMaxAbsReduceBase;
exports.swirlRadiusBase = swirlRadiusBase;

class Particle {
	constructor(pos, velocity, state, akin, id) {
		this.pos = [round(pos[0]), round(pos[1])];
		this.velocity = [round(velocity[0]), round(velocity[1])];
		this.acceleration = [0, 0];

		this.id = id;

		// Characteristics
		/*
			Every particle has several characteristics, which determin its future development.

			The state shows how developed the particle is. All particles start with the state -1 or 1 and progress with each reaction one step further. 

			The akin gives information on how original a particle still is. Every particle in the beginning is an original so it has akin 0. 
			If it reacts and progresses to the next state the second particle with the new state, which gets created has an akin value higher.

			Polarity is a value which is for every new particle the oposite of its state and will change after a reaction. If the state of this reaction is positive 
			the first particle will have a polarity of -1, the second one 1 and so on. New particles created in that reaction will have the opposite polarity of their state.
		*/

		this.state = state;
		this.akin = akin;
		// this.polarity = 0;
		this.polarity = this.state < 0 ? 1 : -1;

		// Calculation Types
		/*
			In General every particle can just react or merge with a particle with the same state. Particles with the maximum state caan react with every particle, except its own state or
			its own opposite state.
		*/

		this.calcTypes = [];
		this.calced = false;
		this.mass;

		this.velocityMaxAbs = simulation.particleVelocityMaxAbs;
		this.velocityMax = velocityMax;
		this.velocityReduce = velocityReduce;

		this.mergeCount;
		this.merge = false;
		this.reactionCount;
		this.reaction = false;
		this.reactionSpeed;

		this.explosionForce;
		this.explosionSize;

		this.merged = false;
		this.mergedParticles = [];

		this.dead = false;

		this.updateVals();

		this.size = particleSize;

		this.tmpParticles = [];
		this.tmpCalcParticles = [];

		this.swirlVelocityMaxAbsReduceCalced = false;
		this.swirlSet = false;
		this.swirlRadius;
		this.swirlVelocityMaxAbsReduce;

		// Logging
		/*
		if (this.id % 100 == 0) {
			this.log = true;
		} else {
			this.log = false;
		}
		*/
		this.log = false;
		this.record = [];

		if (this.log) {
			let logStart = "New Particle " + this.id + " at pos (" + this.pos[0] + ", " + this.pos[1] + "), state " + this.state + ", akin " + this.akin + ", polarity " + this.polarity;
			this.record.push(logStart);
		}
	}

	updateVals() {
		let tmpIndex = math.abs(this.state) - 1;

		this.calcTypes = [];

		if (math.abs(this.state) >= simulation.stateMax) {
			// If a particle is stateMax add stateMax-1 and stateMax-2 to merge List, so it can merge with many different types
			this.calcTypes.push(this.state);

			let multi = 1 ? -1 : this.state > 0;
			this.calcTypes.push(Math.abs(this.state - 1) * multi);
			this.calcTypes.push(Math.abs(this.state - 2) * multi);
		} else {
			this.calcTypes.push(this.state);
		}

		this.mass = simulation.particleVals[tmpIndex]['mass'] * (1 + this.mergedParticles.length);
		this.gravRadius = simulation.particleVals[tmpIndex]['gravRadius'] * (1 + this.mergedParticles.length / 4);

		this.mergeCount = simulation.particleVals[tmpIndex]['mergeCount'];
		this.reactionCount = simulation.particleVals[tmpIndex]['reactionCount'];

		this.explosionForce = simulation.particleVals[tmpIndex]['explosionForce'];
		this.explosionSize = simulation.particleVals[tmpIndex]['explosionSize'];
	}

	// ////////////////////////////// MOVE //////////////////////////////

	move() {
		/*
			Actual movement
		*/

		this.velocity = geometric.add(this.velocity, this.acceleration);

		if (geometric.mag(this.velocity) > this.velocityMaxAbs) {
			this.velocity = [this.velocity[0] * this.velocityMaxAbs / geometric.mag(this.velocity), this.velocity[1] * this.velocityMaxAbs / geometric.mag(this.velocity)];
		}

		if (geometric.mag(this.velocity) > this.velocityMax) {
			let tmpVelocityMag = geometric.mag(this.velocity) - this.velocityReduce;

			this.velocity = [this.velocity[0] * tmpVelocityMag / geometric.mag(this.velocity), this.velocity[1] * tmpVelocityMag / geometric.mag(this.velocity)];
		}

		this.acceleration = [0, 0];

		this.pos = [getTorus(this.pos[0] + this.velocity[0]), getTorus(this.pos[1] + this.velocity[1])];

		let self = this;

		if (this.mergedParticles.length != 0) {
			this.mergedParticles.forEach(function (mergedParticle) {
				mergedParticle.pos = self.pos;
				mergedParticle.velocity = self.velocity;
			})
		}
	}

	addAcceleration(acceleration, source) {
		this.acceleration = [this.acceleration[0] + acceleration[0], this.acceleration[1] + acceleration[1]];

		// UNCOMMENT to log source of acceleration add
		if (this.log) {
			let string = "\r\n" + "       " + "New acceleration from " + source + " acceleration (" + acceleration[0] + ", " + acceleration[1] + ")";
			this.record.push(string);
		}
	}

	// ////////////////////////////// CALC GRAVITATION //////////////////////////////

	// Set Graviational Force
	calcGrav() {
		this.tmpParticles = [];
		this.tmpParticles = this.tmpParticles.concat(simulation.tree.contentParticles(this.pos, this.gravRadius, 0));

		let self = this;

		this.tmpParticles.forEach(function (tmpParticle) {
			if (self != tmpParticle && !tmpParticle.merged) {
				// When Particle is in Range
				if (geometric.dist(self.pos, tmpParticle.pos) < self.gravRadius) {
					// When Particle isnt in the same spot
					if (geometric.dist(self.pos, tmpParticle.pos) > 1) {
						tmpParticle.setGravDir(self.pos, self.mass, self.id);
					}
				}
			}
		})
	}

	setGravDir(originPos, originMass, originId) {
		let gravDir = geometric.sub(this.pos, originPos);
		let distance = geometric.dist(originPos, this.pos);
		distance = math.max(1, distance);

		let force = (simulation.gravConstant * this.mass * originMass) / (distance * distance);

		let gravForce = geometric.setMag(gravDir, force);
		gravForce = geometric.div(gravForce, this.mass);

		// this.acceleration = geometric.add(this.acceleration, gravForce);
		this.addAcceleration(gravForce, " gravitation id " + originId + " pos (" + originPos[0] + ", " + originPos[1] + ") force " + force);
	}

	// ////////////////////////////// CALC MERGE / REACTION //////////////////////////////

	calc() {
		this.tmpParticles = simulation.tree.contentParticles(this.pos, this.size * .55, 0);
		this.tmpCalcParticles = [];

		let self = this;

		// Add yourself and all your merged Particles to the calcParticles
		this.tmpCalcParticles.push(self);
		this.mergedParticles.forEach(function (mergedParticle) {
			self.tmpCalcParticles.push(mergedParticle);
		})

		this.tmpParticles.forEach(function (tmpParticle) {
			// The particle shouldnt be merged (will be added later), shouldnt be allready calculated and shouldnt be itself (allready added)
			if (!tmpParticle.merged && !tmpParticle.calced && tmpParticle != self) {
				for (let i = 0; i < self.calcTypes.length; i++) {
					if (tmpParticle.state == self.calcTypes[i]) {
						self.tmpCalcParticles.push(tmpParticle);

						for (let j = 0; j < tmpParticle.mergedParticles.length; j++) {
							self.tmpCalcParticles.push(tmpParticle.mergedParticles[j]);
						}
					}
				}
			}
		})

		if (this.tmpCalcParticles.length >= this.reactionCount && Math.abs(this.state) < simulation.stateMax) {
			this.reaction = true;
		} else if (this.tmpCalcParticles.length <= this.mergeCount && this.tmpCalcParticles.length > 1 + this.mergedParticles.length) {
			this.merge = true;
		}

		if (this.reaction || this.merge) {
			this.tmpCalcParticles.forEach(function (tmpCalcParticle) {
				tmpCalcParticle.calced = true;
			})
		}
	}

	action() {
		if (this.reaction) {
			// If its a reaction no particle is merged anymore
			this.tmpCalcParticles.forEach(function (reactionParticle) {
				reactionParticle.merged = false;
				reactionParticle.mergedParticles = [];
			});

			// Calculate center of all particles
			let center;
			for (let i = 0; i < this.tmpCalcParticles.length; i++) {
				if (i == 0) {
					center = [this.tmpCalcParticles[i].pos[0], this.tmpCalcParticles[i].pos[1]];
				} else {
					let tmpTorusPos = [0, 0];
					let tmpCenter = [center[0] / (i + 1), center[1] / (i + 1)];

					// Move position to a torus Position if its on the other side
					for (let j = 0; j < 2; j++) {
						if (Math.abs(this.tmpCalcParticles[i].pos[j] - tmpCenter[j]) > simulation.fieldWidth / 2) {
							let torusShift = this.tmpCalcParticles[i].pos[j] >= simulation.fieldWidth / 2 ? -simulation.fieldWidth : simulation.fieldWidth;
							tmpTorusPos[j] = this.tmpCalcParticles[i].pos[j] + torusShift;
						} else {
							tmpTorusPos[j] = this.tmpCalcParticles[i].pos[j];
						}
					}

					center = [center[0] + tmpTorusPos[0], center[1] + tmpTorusPos[1]];
				}
			}
			center = [center[0] / this.tmpCalcParticles.length, center[1] / this.tmpCalcParticles.length];
			center = roundArray(center);

			// UNCOMMENT to log Reaction
			if (simulation.logData) {
				log.logReaction(this, center);
			}

			this.reactionFunc(center);

			// Reaction Explosion
			/*
				If a reaction is triggered, no mather what kind of reaction, an explosion is startetd at the center of the reaction to add dynamic to the particle simulation 
				and to move the particles further apart from each other. The force and size of the explosion is also multiplied by the number of the surrounding particles.

				If there are more than 16 particles, then the multiplier is (1 + (nearParticleCount - 16)/2) * abs(state)/2;
			*/

			let tmpExplosionForce = this.explosionForce * math.max(this.tmpCalcParticles.length / 2.0, 1);
			let tmpExplosionSize = math.floor(this.explosionSize * math.max(this.tmpCalcParticles.length / 4.0, 1));

			let nearParticles = simulation.tree.contentParticles(center, nearParticleRadius, 0);
			let nearParticleCount = nearParticles.length;

			if (nearParticleCount > nearParticleCountThreshold) {
				let multiplicator = 1;

				multiplicator += nearParticleCount * simulation.particleExplosionMultiplicator;

				tmpExplosionForce *= multiplicator;
				tmpExplosionSize = Math.floor(tmpExplosionSize * multiplicator);
			}

			tmpExplosionSize = geometric.constrain(tmpExplosionSize, effects.explosionMinSize, effects.explosionMaxSize);
			tmpExplosionForce = geometric.constrain(tmpExplosionForce, effects.explosionMinForce, effects.explosionMaxForce);

			simulation.explosions.push(new effects.explosion(center, tmpExplosionSize, tmpExplosionForce, 0));

			// UNCOMMENT to log the explosion Values
			log.logExplosion(tmpExplosionSize, tmpExplosionForce, nearParticleCount, nearParticleCountThreshold);

		} else if (this.merge) {
			if (simulation.logData) {
				log.logMerge(this);
			}

			this.mergeFunc();
		}
	}

	reactionFunc(center) {
		let tmpVelocity = [0, 0];
		let resultParticleCoords = [];

		// Reset lowestAkin Value
		lowestAkin = simulation.stateMax;

		this.tmpCalcParticles.forEach(function (reactionParticle) {
			tmpVelocity = geometric.add(tmpVelocity, reactionParticle.velocity);

			// Get the lowest akin Value of all particles
			if (Math.abs(reactionParticle.akin) < lowestAkin) {
				lowestAkin = Math.abs(reactionParticle.akin);
			}
		})

		if (geometric.mag(tmpVelocity) == 0) {
			tmpVelocity = this.velocity;
		}

		tmpVelocity = geometric.setMag(tmpVelocity, this.velocityMaxAbs);

		let binaryString = "";
		for (let i = 0; i < Math.min(this.tmpCalcParticles.length, 4); i++) {
			binaryString += this.tmpCalcParticles[i].polarity > 0 ? 1 : 0;
		};
		let binaryResult = parseInt(binaryString, 2);

		let tmpStateReduction = this.state < 0 ? -1 : 1;

		// Reaction
		/*
			If the reaction is triggered the every second particle in the group becomes two particles with one absolute state lower (f.e. 2 becomes 3, -4 becomes -5).
			The akin value for the new particle is the akin value of the current calc particle + 1.
		*/
		for (let i = 0; i < this.tmpCalcParticles.length; i++) {
			this.tmpCalcParticles[i].velocity = [tmpVelocity[0], tmpVelocity[1]];
			this.tmpCalcParticles[i].pos = [center[0] + tmpVelocity[0], center[1] + tmpVelocity[1]];

			if (this.log) {
				this.tmpCalcParticles[i].addToRecord("\r\n" + "       " + " Set Velocity by Reaction to (" + tmpVelocity[0] + ", " + tmpVelocity[1] + ")");
			}

			// Add Particle Coord + velocity to array
			resultParticleCoords.push([this.tmpCalcParticles[i].pos[0] + this.tmpCalcParticles[i].velocity[0], this.tmpCalcParticles[i].pos[1] + this.tmpCalcParticles[i].velocity[1]]);

			if (i % 2 == 1) {
				this.tmpCalcParticles[i].state += tmpStateReduction;

				tmpVelocity = geometric.rotate(tmpVelocity, (math.pi * 2) / math.floor(this.tmpCalcParticles.length * 1.5));

				// Set polarity to the same of the reactions state
				this.tmpCalcParticles[i].polarity = this.state > 0 ? 1 : -1;

				simulation.particles.push(new Particle([center[0] + tmpVelocity[0], center[1] + tmpVelocity[1]], [tmpVelocity[0], tmpVelocity[1]], this.tmpCalcParticles[i].state, this.tmpCalcParticles[i].akin + 1, simulation.particles.length));

				// Add Particle Coord + velocity to array
				resultParticleCoords.push([simulation.particles[simulation.particles.length - 1].pos[0] + simulation.particles[simulation.particles.length - 1].velocity[0], simulation.particles[simulation.particles.length - 1].pos[1] + simulation.particles[simulation.particles.length - 1].velocity[1]]);
			} else {
				// Set polarity to opposite of the reactions state
				this.tmpCalcParticles[i].polarity = this.state > 0 ? -1 : 1;
			}

			this.tmpCalcParticles[i].updateVals();

			tmpVelocity = geometric.rotate(tmpVelocity, (math.pi * 2) / math.floor(this.tmpCalcParticles.length * 1.5));
		}

		simulation.updateQuadtree();

		// UNCOMMENT to log binaryResult and lowestAkin
		if (simulation.logData) {
			log.logBinary(binaryResult);
			log.logReactionLowestAkin(lowestAkin);
			log.saveReactionResults(this.state, lowestAkin);
		}

		// Reaction Results
		let reactionResult = undefined;

		reactionResult = rules.getParticleReactionResult(this.state, lowestAkin, simulation.phase);

		// Result
		/*
			0 = FluidMovement (FM) / 1 = FluidExplosion (FE) / 2 = CA Complete (CAC) / 3 = Line Trails (LTR)

			Multi is the multiplicator which determines strength or other values of the result. Multi is determined by the state of the reaction and then subtracted by
			lowestAkin. If more particles react then the reactionCount the differnce is added to multi, which can also result in an value thats out of range. The lowest possible+
			multi value is .1.
		*/

		if (reactionResult != undefined) {
			let multiArray = [.2, .4, 2, 3, 4, 5, 6, 7, 6, 4, 2, 0];
			let multi = multiArray[Math.abs(this.state) - 1];

			if (Math.abs(this.state) > 2) {
				multi -= lowestAkin;
				multi += (this.tmpCalcParticles.length - this.reactionCount);
			}

			multi = Math.max(multi, .1);

			if (reactionResult == 0) {
				let velocity = (fluidMovementVelocity[0] * Math.min(multi, 1)) + multi * fluidMovementVelocity[1];
				let size = (fluidMovementVelocity[0] * Math.min(multi, 1)) + multi * fluidMovementSize[1];

				this.setFluidMovement(center, velocity, size, tmpVelocity, Math.ceil((binaryResult + 1) / 4));
			} else if (reactionResult == 1) {
				let size = fluidExplosionSize[0] + multi * fluidExplosionSize[1];
				let strength = fluidExplosionStrength[0] + multi * fluidExplosionStrength[1];

				this.setFluidExplosion(center, size, strength);
			} else if (reactionResult == 2) {
				let form = 1;
				let size = Math.round(cellularAutomataSize[0] + multi * Math.max(simulation.timePassed/simulation.timeSteps, .2) * cellularAutomataSize[1]);

				this.setCellularAutomata(center, size, form, binaryResult);
			} else if (reactionResult == 3) {
				let size = Math.floor(multi * .6875);
				let duration = lineTrailDuration[0] + binaryResult * lineTrailDuration[1];

				this.setLineTrails(center, size, duration);
			}
		}

		// Shockwave
		/*
			If the real reactionCount is higher than the reactionCount a shockwave is triggered which is only a visual effect in the frontend. The strength is determined
			by the state.
		*/

		if (this.tmpCalcParticles.length > this.reactionCount) {
			let shockwaveMulti = [32, 28, 24, 20, 16, 15, 14, 13, 12, 11, 10, 0];

			let shockWaveStrength = shockwaveMulti[Math.abs(this.state)];

			log.logShockwave(this.pos, shockWaveStrength)

			effects.setShockwave(this.pos, shockWaveStrength, Math.abs(this.state));
		}

		this.setFluidCellPolarity(center);
	}

	mergeFunc() {
		let self = this;

		this.tmpCalcParticles.forEach(function (mergeParticle) {
			if (!self.mergedParticles.includes(mergeParticle) && mergeParticle != self) {
				self.mergedParticles.push(mergeParticle);
				mergeParticle.merged = true;
			}
		});

		this.updateVals();
	}

	// ////////////////////////////// RESULTS //////////////////////////////

	// ////////////////////////////// Fluid

	setFluidMovement(center, velocity, size, dir) {
		let fluidVelocityMag = velocity;
		let fluidSize = size;

		// UNCOMMENT to log FluidMovement
		if (simulation.logData) {
			log.logFluidVelocity(fluidSize, fluidVelocityMag, dir);
			log.fluidMoveCount++;
		}

		let tmpDir = geometric.setMag(dir, fluidVelocityMag);
		fluid.addVelocity(tmpDir, fluidSize, center);
	}

	setFluidExplosion(center, size, strength) {
		// UNCOMMENT to log Fluid Explosion
		if (simulation.logData) {
			log.logFluidExplosion(size, strength);
			log.fluidExplosionCount++;
		}

		simulation.explosions.push(new effects.explosion(center, size, strength, 1));
	}

	setFluidCellPolarity(center) {
		if (simulation.simulateFluidCells) {
			let radius = 48;

			radius = Math.floor(radius / simulation.fluidCellResolution);

			let fluidCellCenter = [Math.floor(center[0] / simulation.fluidCellResolution), Math.floor(center[1] / simulation.fluidCellResolution)];

			for (let i = fluidCellCenter[0] - radius; i <= fluidCellCenter[0] + radius; i++) {
				for (let j = fluidCellCenter[1] - radius; j <= fluidCellCenter[1] + radius; j++) {

					// let dist = geometric.dist([i, j], [fluidCellCenter[0], fluidCellCenter[1]]);
					if (geometric.dist([i, j], [fluidCellCenter[0], fluidCellCenter[1]]) < radius) {
						let index = fluid.getFluidCellTorus(i) + fluid.getFluidCellTorus(j) * (simulation.fieldWidth / simulation.fluidCellResolution);
						/*
						let val = radius - Math.floor(dist);
						val = this.state > 0 ? val : -val;
						*/

						let val = this.state > 0 ? 1 : -1;
						val = val * Math.floor((Math.abs(this.state) - 1) / 2);

						fluid.changeFluidCellPolarity(index, val);
					}
				}
			}
		}
	}

	// ////////////////////////////// Cellular Automata

	setCellularAutomata(center, size, form, neighbourhood) {
		// Rule
		let ruleIndex = caRules.rules.length - 1 - simulation.tree.contentParticles(center, caRuleParticleRadius, 0).length - this.tmpCalcParticles.length;
		ruleIndex = Math.max(ruleIndex, 0);

		// UNCOMMENT to log new cellular Automata
		if (simulation.logData) {
			log.logCA(center, size, ruleIndex, neighbourhood, form);
		}

		// Set Rule
		cellularAutomata.setRule(center, size, form, ruleIndex);
		// Neighbourhood
		cellularAutomata.setNeighbourhood(center, size, form, neighbourhood);

		// Animate
		size = Math.floor(size / 8);
		cellularAutomata.animate(center, size, form);
	}

	// ////////////////////////////// Lines (Polygons and Trails)

	setLineTrails(center, size, duration) {
		// Particle Trails
		/*
			If particle trails are created the values are size and duration.
		*/

		effects.setLineTrails(center, size, duration);
	}

	// ////////////////////////////// Swirls

	/*
		If in the balancephase the particle is still a state 1/-1 particle it will slow down and cause a swirl when it has completly stopped.
		Particles with polarity 1 will affect normal particles, polarity -1 will affects fluid particles.
	*/

	checkSwirl() {
		/*
			If in Phase 1 (Balancephase) the particle state is 1/-1, then moveMaxAbs decreases till the particle stops. It then creates a swirl around him
		*/

		// Calculate in the beginnning the velocityReduce for the particle
		if (!this.swirlVelocityMaxAbsReduceCalced) {
			let closeParticleCount = simulation.tree.contentParticles(this.pos, swirlIntializeRadius, 0).length;
			this.swirlVelocityMaxAbsReduce = swirlVelocityMaxAbsReduceBase/closeParticleCount;

			this.swirlVelocityMaxAbsReduceCalced = true;
		}

		if (this.velocityMaxAbs > 0) {
			// Slow particle down
			this.velocityMaxAbs -= this.swirlVelocityMaxAbsReduce;
		} else {
			this.velocityMaxAbs = 0;
			// If particle stopped calculate the radius of the swirl once
			if (!this.swirlSet) {
				let closeParticleCount = simulation.tree.contentParticles(this.pos, swirlIntializeRadius, 0).length;
				this.swirlRadius = (swirlRadiusBase/6) + Math.round((swirlRadiusBase/2)/(Math.floor(closeParticleCount/4)));

				let type = this.state > 0 ? 'particles' : 'fluid particles';

				// If swirlRadius affects fluidParticles divide radius
				if (type == 'fluid particles') {
					this.swirlRadius /= 2;
				}

				// UNCOMMENT to log all swirls
				log.logSwirl(this.pos, this.swirlRadius, this.state, type);

				type = this.state > 0 ? 1 : 0;
				simulation.swirls.push(new effects.swirl(this.pos, this.swirlRadius, this.state, type))

				this.swirlSet = true;
			}
		}
	}

	/*
	setSwirl(center, radius, direction) {
		let tmpParticles = [];

		if (this.state > 0) {
			tmpParticles = simulation.tree.contentParticles(center, radius, 0);
		} else {
			tmpParticles = simulation.fluidTree.contentParticles(center, radius, 0);
		}

		let self = this;

		tmpParticles.forEach(function (tmpParticle) {
			if (!tmpParticle.merged && tmpParticle != self) {
				let tmpSwirlPos = [center[0], center[1]];

				if (tmpParticle.pos[0] - center[0] > simulation.fieldWidth / 2) {
					// Fluid Particle is over the left border
					tmpSwirlPos[0] += simulation.fieldWidth;
				} else if (tmpParticle.pos[0] - center[0] < -simulation.fieldWidth / 2) {
					// Fluid Particle is over right border
					tmpSwirlPos[0] -= simulation.fieldWidth;
				}

				if (tmpParticle.pos[1] - center[1] > simulation.fieldWidth / 2) {
					// Fluid Particle is over the top border
					tmpSwirlPos[1] += simulation.fieldWidth;
				} else if (tmpParticle.pos[1] - center[1] < -simulation.fieldWidth / 2) {
					// Fluid Particle is over bottom border
					tmpSwirlPos[1] -= simulation.fieldWidth;
				}

				let accelercationDir = [tmpParticle.pos[0] - tmpSwirlPos[0], tmpParticle.pos[1] - tmpSwirlPos[1]];

				let distance = geometric.mag(accelercationDir);

				accelercationDir = geometric.rotate(accelercationDir, Math.PI/2 * direction);
				accelercationDir = geometric.setMag(accelercationDir, swirlForceBase/distance);

				if (self.log) {
					tmpParticle.addAcceleration(accelercationDir, "Swirl from particle " + self.id + " at pos (" + self.pos[0] + ", " + self.pos[1] + ")");
				}
			}
		});
	}
	*/

	addToRecord(string) {
		this.record.push(string);
	}

	saveLog() {
		let string = "\r\n" + pad(simulation.timePassed, 6) + " Current pos (" + this.pos[0] + ", " + this.pos[1] + "), MoveDir (" + this.velocity[0] + ", " + this.velocity[1] + ")";
		this.record.push(string);

		string = " Current state " + this.state + ", akin " + this.akin + ", polarity " + this.polarity;
		if (this.merged) {
			string += ", Merged";
		}
		this.record.push(string);

		if (this.mergedParticles.length > 0) {
			string = "\r\n" + "       " + " Merged Particles ";

			this.mergedParticles.forEach(function (mergeParticle) {
				string += "#" + mergeParticle.id + ", ";
			})
			this.record.push(string);
		}

		log.saveFile("particle_" + pad(this.id, 5) + ".txt", this.record);
	}

	reset() {
		this.reaction = false;
		this.merge = false;
		this.calced = false;
	}
}

module.exports = Particle

function getTorus(val) {
	let fieldWidth = simulation.fieldWidth;

	if (val < 0) {
		val += fieldWidth;
	}
	if (val >= fieldWidth) {
		val -= fieldWidth;
	}

	return val;
}

// Add leading zeros
function pad(num, size) {
	var s = "000000000" + num;
	return s.substr(s.length - size);
}

function round(val) {
	return Math.round(val * simulation.calcDecimalsMultiplier) / simulation.calcDecimalsMultiplier;
}

function roundArray(array) {
	let resultArray = [];

	array.forEach(function (element) {
		resultArray.push(Math.round(element * simulation.calcDecimalsMultiplier) / simulation.calcDecimalsMultiplier);
	})

	return resultArray;
}