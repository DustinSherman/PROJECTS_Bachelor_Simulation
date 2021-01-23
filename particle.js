// MODULES
var math = require("mathjs");
const fs = require("fs");

const geometric = require("./geometric.js");
const simulation = require("./simulation.js");
const effects = require("./effects.js");
const cellularAutomata = require("./cellularautomata.js");
const caRules = require("./cellularautomatarules.js");
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

	addAcceleration(_Acceleration) {
		this.acceleration = [this.acceleration[0] + _Acceleration[0], this.acceleration[1] + _Acceleration[1]];
	}

	// ////////////////////////////// CALC GRAVITATION //////////////////////////////

	// Set Graviational Force
	calcGrav() {
		this.tmpParticles = [];
		this.tmpParticles = this.tmpParticles.concat(simulation.tree.contentParticles(this.pos, this.gravRadius));

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
		this.tmpParticles = simulation.tree.contentParticles(this.pos, this.size * .55);
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

			if (simulation.logData) {
				// UNCOMMENT to log polarity Result
				if (Math.abs(this.state) != 1) {
					log.logPolarity(this);
				}

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
			let nearParticleCount = simulation.tree.contentParticles(center, nearParticleRadius).length;

			if (nearParticleCount > nearParticleCountThreshold) {
				tmpExplosionForce *= (1 + (nearParticleCount - nearParticleCountThreshold)/4);
				tmpExplosionSize *= (1 + (nearParticleCount - nearParticleCountThreshold)/4);
			}

			let wFluidParticles = Math.abs(this.state) > 1;

			simulation.explosions.push(new effects.explosion(center, tmpExplosionSize, tmpExplosionForce, wFluidParticles));

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

		// Reaction Results
		/*
			The difference between the lowest akin and the state determines if there's going to be a special happening like particle trails,
			or a cellular Automata. The size increases the higher the state and the lower the lowestAkin. CA Animate Size is 1/8 of the original size.
			Particle Trails Size is 2/3 of the original size.

			CA Complete (CAC)	CA Animate (CAA)	CA Neighbourhood (CAN)	CA Rule (CAR)	Trails (T)

			Lowest Akin / State	| 1/-1	| 2/-2	| 3/-3	| 4/-4	| 5/-5	| 6/-6	| 7/-7	| 8/-8	| 9/-9	| 10/-10	| 11/-11	| 12/-12
			0					|		|		|		| T		| CAC	| CAC	| CAC	| CAN	| CAA	| CAA		| CAA		|
			1					| X		|		|		|		| T		| CAC	| CAC	| CAR	| CAR	| CAA		| CAA		|
			2					| X 	| X		|		|		|		| T		| CAC	| T 	| CAN  	| CAN		| CAA		|	
			3					| X		| X		| X		|		|		|		| T		|   	| T 	| CAR  		| CAR		|
			4					| X		| X		| X		| X		|		|		|		| 		|   	| T  		| CAN  		|		
			5					| X		| X		| X		| X		| X		|		|		|		| 		|   		| T  		|									
			6					| X		| X		| X		| X		| X		| X		|		|		|		| 			|   		|		
			7					| X		| X		| X		| X		| X		| X		| X		|		|		|			| 			|		
			8					| X		| X		| X		| X		| X		| X		| X		| X		|		|			|			|		
			9					| X		| X		| X		| X		| X		| X		| X		| X		| X		|			|			|		
			10					| X		| X		| X		| X		| X		| X		| X		| X		| X		| X			|			|		
			11					| X		| X		| X		| X		| X		| X		| X		| X		| X		| X			| X			|		
		*/

		// First value is the absolute state and the second value is the lowestAkin
		let trailConstelations = [
			[4, 0], [5, 1], [6, 2], [7, 3], [8, 2], [9, 3], [10, 4], [10, 5]
		];

		let caCompleteConstelations = [
			[5, 0], [6, 0], [6, 1], [7, 0], [7, 1], [7, 2]
		];

		let caNeighbourhoodConstelations = [
			[8, 0], [9, 2], [10, 2], [11, 4]
		];

		let caRuleConstelations = [
			[8, 1], [9, 1], [10, 3], [11, 3]
		];

		let caAnimateConstelations = [
			[9, 0], [10, 0], [10, 1], [11, 0], [11, 1], [11, 2]
		];

		let constelations = [trailConstelations, caCompleteConstelations, caNeighbourhoodConstelations, caRuleConstelations, caAnimateConstelations];
		let reactionResult = undefined;

		for (let i = 0; i < constelations.length; i++) {
			for (let j = 0; j < constelations[i].length; j++) {
				if (Math.abs(this.state) == constelations[i][j][0] && lowestAkin == constelations[i][j][1]) {
					reactionResult = i;
				}
			}
		}

		if (reactionResult != undefined) {
			let size = Math.floor((Math.abs(this.state)/4 + 1) * ((simulation.stateMax - lowestAkin)/4 + 1) * 4);
			// Form 0 = rectangle, 1 = circle
			let form = this.state > 0 ? this.state % 2 : this.state - 1 % 2;

			if (reactionResult == 0) {
				size = Math.floor(size * 2/3);
				let trailLength = Math.floor(1 + Math.abs(this.state)/4 + (simulation.stateMax - lowestAkin)/4) * 8;

				this.setTrails(center, size, trailLength, binaryResult);
			} else if (reactionResult == 1) {
				this.setCellularAutomata(center, size, form, binaryResult);
			} else if (reactionResult == 2) {
				this.setCANeighbourhood(center, size, form, binaryResult);
			} else if (reactionResult == 3) {
				this.setCARule(center, size, form);
			} else if (reactionResult == 4) {
				size = Math.floor(size/8);

				this.setCAAnimate(center, size, form);
			}
		}

		// Fluid Stuff
		/*
			A reaction triggers fluidVelocity and also sets fluidCells in a radius around the reaction to different state. Positiv reactions increases the fluidCellPolarity,
			negative reactions decrease the fluidCellPolarity. The distance to the reactionCenter determines how much the values is in- or decreased.
		*/
		if (Math.abs(this.state) > 1) {
			this.setFluidVelocity(center, tmpVelocity);
		}

		if (simulation.simulateFluidCells) {
			let radius = 48;

			radius = Math.floor(radius/simulation.fluidCellResolution);
	
			let fluidCellCenter = [Math.floor(center[0]/simulation.fluidCellResolution), Math.floor(center[1]/simulation.fluidCellResolution)];
	
			for (let i = fluidCellCenter[0] - radius; i <= fluidCellCenter[0] + radius; i++) {
				for (let j = fluidCellCenter[1] - radius; j <= fluidCellCenter[1] + radius; j++) {
	
					let dist = geometric.dist([i, j], [fluidCellCenter[0], fluidCellCenter[1]]);
					if (dist <= radius) {
						let index = i + j * (simulation.fieldWidth/simulation.fluidCellResolution);
						/*
						let val = radius - Math.floor(dist);
						val = this.state > 0 ? val : -val;
						*/
	
						let val = this.state > 0 ? 1 : -1;
						val = val * Math.floor((Math.abs(this.state) - 1)/2);
	
						simulation.fluid.changeFluidCellPolarity(index, val);
					}
				}
			}
		}
	}

	setFluidVelocity(center, tmpVelocity) {
		// Calculate Force and velocity Magnitude for Fluid Velocity
		/*
			Every time a reaction takes place it adds velocity to the fluid. It gets way bigger if more particles react then the normal
			Reactioncount. In general the force varies according to the state. It is highest with the half of maxstate and lowest at max state and lower
			at the starting state.

			| State | 1  | 2 | 3  | 4 | 5  | 6 | 7  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
			| Multi |2.25|2.5|2.75| 3 |3.25|3.5|3.75| 4 | 4 |3.50| 3  | 2.5| 2  | 1.5| 1  | 0.5|
		*/
		
		let fluidVelocityMag = simulation.fluidResolution / 4;
		let fluidSize = simulation.fluidResolution;
		let fluidMultiplier = .8;

		fluidMultiplier = (-Math.abs(Math.abs(this.state) - simulation.stateMax/2 - .5) + simulation.stateMax/2)/2 + .25;
		if (Math.abs(this.state) <= simulation.stateMax/2) {
			fluidMultiplier += (simulation.stateMax/4 - fluidMultiplier)/2;
		}

		fluidVelocityMag *= fluidMultiplier;
		fluidSize *= fluidMultiplier;

		// If Rection Particle Count is higher then reactionCount
		if (this.tmpCalcParticles.length > this.reactionCount) {
			fluidVelocityMag *= (this.tmpCalcParticles.length - this.reactionCount)/2 + 1;
			fluidSize *= ((this.tmpCalcParticles.length - this.reactionCount)/2 + 1);
		}

		let newParticleCount = Math.floor(this.tmpCalcParticles.length/2);
		let angleStep = (Math.PI * 2)/newParticleCount;

		for (let i = 0; i < newParticleCount; i++) {
			let tmpDir = geometric.setMag(tmpVelocity, fluidVelocityMag);
			tmpDir = geometric.rotate(tmpDir, angleStep * i);

			simulation.fluid.addVelocity(tmpDir, fluidSize, [center[0] + tmpDir[0]/2, center[1] + tmpDir[1]/2]);
		}

		if (simulation.logData) {
			log.logReactionResult(this);
			log.logFluidVelocity(center, fluidSize, fluidVelocityMag);
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

	setCellularAutomata(center, size, form, neighbourhood) {
		// Neighbourhood
		cellularAutomata.setNeighbourhood(center, size, form, neighbourhood);

		// Rule
		let ruleIndex = simulation.fluidTree.contentParticles(center, fluidParticleRadius).length;
		ruleIndex = Math.min(ruleIndex, (caRules.rules.length - 1));

		cellularAutomata.setRule(center, size, form, ruleIndex);
		
		// Animate
		size = Math.floor(size/8);
		cellularAutomata.animate(center, size, form);

		// UNCOMMENT to log new cellular Automata
		log.logCellularAutomata(center, size, ruleIndex, neighbourhood, form);
	}

	setCARule(center, size, form) {
		// Rule
		let ruleIndex = simulation.fluidTree.contentParticles(center, fluidParticleRadius).length;
		ruleIndex = Math.min(ruleIndex, (caRules.rules.length - 1));

		cellularAutomata.setRule(center, size, form, ruleIndex);

		// UNCOMMENT to count Cellular Automata Rules
		log.logCellularAutomataRule(center, size, ruleIndex, form);
	}

	setCANeighbourhood(center, size, form, neighbourhood) {
		// Neighbourhood
		cellularAutomata.setNeighbourhood(center, size, form, neighbourhood);

		// UNCOMMENT to count Cellular Automata Rules
		log.logCellularAutomataNeighbourhood(center, size, neighbourhood, form);
	}

	setCAAnimate(center, size, form) {
		cellularAutomata.animate(center, size, form);

		// UNCOMMENT to count Cellular Automata Animates
		log.logCellularAutomataAnimate(center, size, form);
	}

	setTrails(center, size, trailLength, durationFactor) {
		// Particle Trails
		/*
			If particle traisl are created the important values are size, trailLength and duration.
		*/

		let duration = 24 + durationFactor * 8;

		effects.setTrails(center, size, trailLength, duration);

		// UNCOMMENT to log new particle trails
		log.logTrails();
	}

	reset() {
		this.reaction = false;
		this.merge = false;
		this.calced = false;
	}
}

module.exports = Particle

function getTorus(_Val) {
	let fieldWidth = simulation.fieldWidth;

	while (_Val < 0) {
		_Val += fieldWidth;
	}
	while (_Val >= fieldWidth) {
		_Val -= fieldWidth;
	}

	return _Val;
}

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}