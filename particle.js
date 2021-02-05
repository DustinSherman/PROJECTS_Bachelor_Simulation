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

let velocityMaxAbs = .6;
let velocityMax = .1;
let velocityReduce = .0008;
let particleSize = 1;

exports.velocityMaxAbs = velocityMaxAbs;
exports.velocityMax = velocityMax;
exports.velocityReduce = velocityReduce;
exports.particleSize = particleSize;

let fluidParticleRadius = 28;
exports.fluidParticleRadius = fluidParticleRadius;
let lowestAkin;

class Particle {
	constructor(pos, velocity, state, akin, id) {
		this.pos = [pos[0], pos[1]];
		this.velocity = [velocity[0], velocity[1]];
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

		this.velocityMaxAbs = velocityMaxAbs;
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

		// Value is never used, it originates from perfomance boost for the fluidParticleQuadtree
		this.unchanged = false;
	}

	updateVals() {
		let tmpIndex = math.abs(this.state) - 1;

		this.calcTypes = [];

		if (math.abs(this.state) >= simulation.stateMax) {
			// Add vals -stateMax and stateMax
			this.calcTypes.push(this.state);
			this.calcTypes.push(-this.state);
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

	addAcceleration(acceleration) {
		this.acceleration = [this.acceleration[0] + acceleration[0], this.acceleration[1] + acceleration[1]];
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
				if (geometric.dist(self.pos, tmpParticle.pos) <= self.gravRadius) {
					// When Particle isnt in the same spot
					if (geometric.dist(self.pos, tmpParticle.pos) >= 1) {
						tmpParticle.setGravDir(self.pos, self.mass);
					}
				}
			}
		})
	}

	setGravDir(_OriginPos, _OriginMass) {
		let gravDir = geometric.sub(this.pos, _OriginPos);
		let distance = geometric.dist(_OriginPos, this.pos);
		distance = math.max(1, distance);

		let force = (simulation.gravConstant * this.mass * _OriginMass) / (distance * distance);

		let gravForce = geometric.setMag(gravDir, force);
		gravForce = geometric.div(gravForce, this.mass);

		this.acceleration = geometric.add(this.acceleration, gravForce);
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
					let tmpCenter = [center[0]/(i + 1),  center[1]/(i + 1)];

					// Move position to a torus Position if its on the other side
					for (let j = 0; j < 2; j++) {
						if (Math.abs(this.tmpCalcParticles[i].pos[j] - tmpCenter[j]) > simulation.fieldWidth/2) {
							let torusShift = this.tmpCalcParticles[i].pos[j] >= simulation.fieldWidth/2 ? -simulation.fieldWidth : simulation.fieldWidth;
							tmpTorusPos[j] = this.tmpCalcParticles[i].pos[j] + torusShift;
						} else {
							tmpTorusPos[j] = this.tmpCalcParticles[i].pos[j];
						}
					}

					center = [center[0] + tmpTorusPos[0], center[1] + tmpTorusPos[1]];
				}
			}
			center = [center[0]/this.tmpCalcParticles.length, center[1]/this.tmpCalcParticles.length];

			// UNCOMMENT to log Reaction
			if (simulation.logData) {
				log.logReaction(this, center);
			}

			this.reactionFunc(center);

			// Reaction Explosion
			/*
				If a reaction is triggered, no mather what kind of reaction, an explosion is startetd at the center of the reaction to add dynamic to the particle simulation 
				and to move th particles further apart from each other. The force and size of the explosion is also muliplied by the number of the 
				surrounding particles.

				If there are more than 8 particles, then the multiplier is 1 + (nearParticleCount - 8)/4;
			*/

			let tmpExplosionForce = this.explosionForce * math.max(this.tmpCalcParticles.length / 3.0, 1);
			let tmpExplosionSize = math.floor(this.explosionSize * math.max(this.tmpCalcParticles.length / 3.0, 1));

			let nearParticleRadius = 32;
			let nearParticleCountThreshold = 16;
			let nearParticleCount = simulation.tree.contentParticles(center, nearParticleRadius, 0).length;

			if (nearParticleCount > nearParticleCountThreshold) {
				tmpExplosionForce *= (1 + (nearParticleCount - nearParticleCountThreshold)/4);
				tmpExplosionSize *= (1 + (nearParticleCount - nearParticleCountThreshold)/4);
			}


			simulation.explosions.push(new effects.explosion(center, tmpExplosionSize, tmpExplosionForce, 0));

			// UNCOMMENT to log the explosion Values
			// log.logExplosion(tmpExplosionSize, tmpExplosionForce, nearParticleCount, nearParticleCountThreshold);

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
			this.tmpCalcParticles[i].velocity = tmpVelocity;

			// Add Particle Coord + velocity to array
			resultParticleCoords.push([this.tmpCalcParticles[i].pos[0] + this.tmpCalcParticles[i].velocity[0], this.tmpCalcParticles[i].pos[1] + this.tmpCalcParticles[i].velocity[1]]);

			if (i % 2 == 1) {
				this.tmpCalcParticles[i].state += tmpStateReduction;

				tmpVelocity = geometric.rotate(tmpVelocity, (math.pi * 2) / math.floor(this.tmpCalcParticles.length * 1.5));

				// Set polarity to the same of the reactions state
				this.tmpCalcParticles[i].polarity = this.state > 0 ? 1 : -1;

				simulation.particles.push(new Particle([this.tmpCalcParticles[i].pos[0], this.tmpCalcParticles[i].pos[1]], tmpVelocity, this.tmpCalcParticles[i].state, this.tmpCalcParticles[i].akin + 1, simulation.particles.length));
			
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
		}

		// Reaction Results
		let reactionResult = undefined;

		reactionResult = rules.getParticleReactionResult(this.state, lowestAkin, simulation.phase);

		// Result
		// 0 = trail, 1 = CA Complete, 2 = CA Neighbourhood/Rule, 3 = CA Animate, 4 = FluidMovement, 5 = FluidExplosion, 6 = Fluidflowfield
		if (reactionResult != undefined) {
			let multi = Math.max(Math.floor(((simulation.stateMax/3 * 2 - Math.abs(simulation.stateMax/3 * 2 - Math.abs(this.state))) * 2 - lowestAkin)/2), 1);

			if (reactionResult == 0) {
				let size = Math.floor(multi * 2/3);
				let trailLength = multi * 24;

				this.setTrails(center, size, trailLength, binaryResult);
			} else if (reactionResult == 1) {
				// Form 0 = rectangle, 1 = circle
				let form = Math.abs(this.state) % 2;
				let size = multi * 4;

				this.setCellularAutomata(center, size, form, binaryResult);
			} else if (reactionResult == 2) {
				// Form 0 = rectangle, 1 = circle
				let form = Math.abs(this.state) % 2;
				let size = multi * 4;

				this.setCANeighbourhoodRule(center, size, form, binaryResult);
			} else if (reactionResult == 3) {
				// Form 0 = rectangle, 1 = circle
				let form = Math.abs(this.state) % 2;
				let size = Math.floor(multi/4);

				this.setCAAnimate(center, size, form);
			} else if (reactionResult == 4) {
				let strength = multi/24 + 1;

				this.setFluidMovement(center, tmpVelocity, strength, Math.ceil((binaryResult + 1)/4));
			} else if (reactionResult == 5) {
				let size = multi * 6;
				let strength = multi * 4;

				this.setFluidExplosion(center, size, strength);
			} else if (reactionResult == 6) {
				let size = multi * 8;
				let duration = multi * 48;

				this.setFluidflowfield(center, size, duration, binaryResult);
			}
		}

		// Shockwave
		/*
			If the real reactionCount is higher than the reactionCount a shockwave is triggered which is only a visual effect in the frontend. The strength is determined
			by the state.

			| State | 1  | 2  | 3  | 4  | 5 | 6  | 7 | 8  | 9 | 10 | 11 | 12 |
			| Multi | 16 | 14 | 12 | 10 | 8 | 7.5| 7 | 6.5| 6 | 5.5| 5  | X  |
		*/

		if (this.tmpCalcParticles.length > this.reactionCount) {
			let shockwaveMulti = [32, 28, 24, 20, 16, 15, 14, 13, 12, 11, 10, 0];

			effects.setShockwave(this.pos, shockwaveMulti[Math.abs(this.state)]);

			log.shockWaveCount++;
		}
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

	setCellularAutomata(center, size, form, neighbourhood) {
		// Rule
		let ruleIndex = simulation.tree.contentParticles(center, fluidParticleRadius, 0).length;
		ruleIndex = Math.min(ruleIndex, (caRules.rules.length - 1));

		// UNCOMMENT to log new cellular Automata
		if (simulation.logData) {
			log.logCA(center, size, ruleIndex, neighbourhood, form);
		}

		// Set Rule
		cellularAutomata.setRule(center, size, form, ruleIndex);
		// Neighbourhood
		cellularAutomata.setNeighbourhood(center, size, form, neighbourhood);

		// Animate
		size = Math.floor(size/8);
		cellularAutomata.animate(center, size, form);
	}

	setCANeighbourhoodRule(center, size, form, neighbourhood) {
		// Rule
		let ruleIndex = simulation.tree.contentParticles(center, fluidParticleRadius, 0).length;
		ruleIndex = Math.min(ruleIndex, (caRules.rules.length - 1));

		// UNCOMMENT to log Cellular Automata Neighbourhood and Cellular Automata Rules
		if (simulation.logData) {
			log.logCANeighbourhoodRule(center, size, neighbourhood, ruleIndex, form);
		}

		cellularAutomata.setRule(center, size, form, ruleIndex);
		cellularAutomata.setNeighbourhood(center, size, form, neighbourhood);
	}

	setCAAnimate(center, size, form) {
		// UNCOMMENT to count Cellular Automata Animates
		if (simulation.logData) {
			log.logCellularAutomataAnimate(center, size, form);
		}

		cellularAutomata.animate(center, size, form);
	}

	setTrails(center, size, trailLength, durationFactor) {
		// Particle Trails
		/*
			If particle trails are created the important values are size, trailLength and duration.
		*/

		let duration = 24 + durationFactor * 8;

		// UNCOMMENT to log new particle trails
		if (simulation.logData) {
			log.logTrails(center);
		}

		effects.setTrails(center, size, trailLength, duration);
	}

	setFluidMovement(center, tmpVelocity, multi, dirCount) {
		// Calculate Force and velocity Magnitude for Fluid Velocity
		
		let fluidVelocityMag = simulation.fluidResolution/4;
		let fluidSize = simulation.fluidResolution;

		fluidVelocityMag *= multi;
		fluidSize *= multi;

		// If Rection Particle Count is higher then reactionCount
		if (this.tmpCalcParticles.length > this.reactionCount) {
			fluidVelocityMag *= (this.tmpCalcParticles.length - this.reactionCount)/2 + 1;
			fluidSize *= ((this.tmpCalcParticles.length - this.reactionCount)/2 + 1);
		}

		fluidVelocityMag = fluidVelocityMag.toFixed(2);
		fluidSize = fluidSize.toFixed(2);

		let angleStep = (Math.PI * 2)/dirCount;

		// UNCOMMENT to log FluidMovement
		if (simulation.logData) {
			log.logFluidVelocity(fluidSize, fluidVelocityMag, dirCount);
			log.fluidMoveCount++;
		}

		for (let i = 0; i < dirCount; i++) {
			let tmpDir = geometric.setMag(tmpVelocity, fluidVelocityMag);
			tmpDir = geometric.rotate(tmpDir, angleStep * i);

			fluid.addVelocity(tmpDir, fluidSize, [center[0] + tmpDir[0]/2, center[1] + tmpDir[1]/2]);
		}

		this.setFluidCellPolarity(center);
	}

	setFluidExplosion(center, size, strength) {
		// UNCOMMENT to log Fluid Explosion
		if (simulation.logData) {
			log.logFluidExplosion(size, strength);
			log.fluidExplosionCount++;
		}

		simulation.explosions.push(new effects.explosion(center, size, strength, 1));

		this.setFluidCellPolarity(center);
	}

	setFluidflowfield(center, size, duration, form) {
		if (form >= 8) {
			form = Math.round((form - 8)/8.0);
		} else {
			form = Math.round(form/8.0);
		}

		// UNCOMMENT to log Fluidflowfield
		if (simulation.logData) {
			log.logFluidFlowfield(size, duration, form);
			log.fluidFlowfieldCount++;
		}

		if (form >= 8) {
			let dir = form % 4;
			fluid.setFluidflowfieldHourglass(center, size, dir, form, duration);
		} else {
			let rotateDir = form % 2;
			let crossRotate = Math.ceil((form + 1)/2.0) % 2;
			fluid.setFluidflowfieldSwirl(center, size, rotateDir, crossRotate, form, duration);
		}

		this.setFluidCellPolarity(center);
	}

	setFluidCellPolarity(center) {
		if (simulation.simulateFluidCells) {
			let radius = 48;

			radius = Math.floor(radius/simulation.fluidCellResolution);
	
			let fluidCellCenter = [Math.floor(center[0]/simulation.fluidCellResolution), Math.floor(center[1]/simulation.fluidCellResolution)];
	
			for (let i = fluidCellCenter[0] - radius; i <= fluidCellCenter[0] + radius; i++) {
				for (let j = fluidCellCenter[1] - radius; j <= fluidCellCenter[1] + radius; j++) {
	
					let dist = geometric.dist([i, j], [fluidCellCenter[0], fluidCellCenter[1]]);
					if (dist <= radius) {
						let index = fluid.getFluidCellTorus(i) + fluid.getFluidCellTorus(j) * (simulation.fieldWidth/simulation.fluidCellResolution);
						/*
						let val = radius - Math.floor(dist);
						val = this.state > 0 ? val : -val;
						*/
	
						let val = this.state > 0 ? 1 : -1;
						val = val * Math.floor((Math.abs(this.state) - 1)/2);
	
						fluid.changeFluidCellPolarity(index, val);
					}
				}
			}
		}
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

	while (val < 0) {
		val += fieldWidth;
	}
	while (val >= fieldWidth) {
		val -= fieldWidth;
	}

	return val;
}

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}