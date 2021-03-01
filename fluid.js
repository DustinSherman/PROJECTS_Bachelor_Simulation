// MODULES
var math = require("mathjs");

// MY MODULES
const simulation = require("./simulation.js");
const geometric = require("./geometric.js");

let fieldWidth;

let resolution;

let colCount;
    
var vectorCells = [];
exports.vectorCells = vectorCells;

var particles = [];
exports.particles = particles;

let minVelocity = .05;
let maxVelocity = 8;
exports.maxVelocity = maxVelocity;

// The speed get multiplied by this value to slow it down
let particleSpeedReduction;

// Fluid Cells
let fluidCells = [];
let fluidCellsPrevPolarity = [];
let fluidCellsPrev = [];
let fluidCellData = [];
let fluidCellResolution;
let fluidCellRadius;
let fluidCellBaseParticleCount;

exports.fluidCellData = fluidCellData;
exports.fluidCellBaseParticleCount = fluidCellBaseParticleCount;

// Flow Cells
let flowCells = [];
let flowCellSize = simulation.fluidResolution;
let flowfieldStrength = 2;
exports.flowCells = flowCells;
exports.flowCellSize = flowCellSize;
exports.flowfieldStrength = flowfieldStrength;

// ////////////////////////////// SETUP

function initParticles() {
    let index = 0;
    resolution = simulation.fluidResolution;
    particleSpeedReduction = simulation.fluidParticleSpeedReduction;
    fluidCellResolution = simulation.fluidCellResolution;
    fluidCellRadius = simulation.fluidCellRadius;

    fieldWidth = simulation.fieldWidth;

    for (i = 0; i < fieldWidth/resolution; i++) {
        for (j = 0; j < fieldWidth/resolution; j++) {
            particles.push(new particle(index, j * resolution + resolution/2, i * resolution + resolution/2));
            index++;
        }
    }

    let particleCount = particles.length;
    exports.particleCount = particleCount;

    index = 0;

    colCount = fieldWidth / resolution;

    for (col = 0; col < colCount; col++) { 
        vectorCells[col] = [];

        for (row = 0; row < colCount; row++) { 
            var cellData = new cell(index, col * resolution, row * resolution, resolution)

            vectorCells[col][row] = cellData;

            vectorCells[col][row].col = col;
            vectorCells[col][row].row = row;

            index++;
        }
    }

    for (col = 0; col < colCount; col++) { 
        for (row = 0; row < colCount; row++) { 
            var cellData = vectorCells[col][row];

            var row_up = (row - 1 >= 0) ? row - 1 : colCount - 1;
            var col_left = (col - 1 >= 0) ? col - 1 : colCount - 1;
            var col_right = (col + 1 < colCount) ? col + 1 : 0;

            var up = vectorCells[col][row_up];
            var left = vectorCells[col_left][row];
            var up_left = vectorCells[col_left][row_up];
            var up_right = vectorCells[col_right][row_up];

            cellData.up = up;
            cellData.left = left;
            cellData.up_left = up_left;
            cellData.up_right = up_right;

            up.down = vectorCells[col][row];
            left.right = vectorCells[col][row];
            up_left.down_right = vectorCells[col][row];
            up_right.down_left = vectorCells[col][row];
        }
    }
    
    exports.particles = particles;
    exports.vectorCells = vectorCells;
}

exports.initParticles = initParticles;

function initFluidCells() {
    // Init Fluid Cells
    if (simulation.simulateFluidCells) {
        let rowCount = (fieldWidth/fluidCellResolution);
        let fluidCellCount = rowCount * rowCount;

        let pos = [(simulation.fieldWidth/fluidCellResolution) * fluidCellResolution + fluidCellResolution/2, Math.floor(simulation.fieldWidth/fluidCellResolution) * fluidCellResolution + fluidCellResolution/2];
        let particleBaseCount = simulation.fluidTree.contentParticles(pos, fluidCellRadius, 0).length;

        fluidCellBaseParticleCount = particleBaseCount;
        exports.fluidCellBaseParticleCount = fluidCellBaseParticleCount;

        for (i = 0; i < fluidCellCount; i++) {
            fluidCells.push([particleBaseCount, 0]);
            fluidCellsPrev.push([particleBaseCount, 0]);
        }
    }

    exports.fluidCells = fluidCells;
}

exports.initFluidCells = initFluidCells;

// ////////////////////////////// CLASSES

/*
class fluidparticle {
    constructor(index, pos) {
        this.pos = [pos[0], pos[1]];
        this.index = index;

        this.prevPos = [pos[0], pos[1]];

        this.velocity = [0, 0];
        this.acceleration = [0, 0];

        this.unchanged = true;
    }

    update() {
        let col = parseInt(this.pos[0] / resolution);
        let row = parseInt(this.pos[1] / resolution);

        let cellData = vectorCells[col][row];

        let ax = (this.pos[0] % resolution) / resolution;
        let ay = (this.pos[1] % resolution) / resolution;
        
        this.velocity[0] += (1 - ax) * cellData.xv * 0.05;
        this.velocity[1] += (1 - ay) * cellData.yv * 0.05;
        
        this.velocity[0] += ax * cellData.right.xv * 0.05;
        this.velocity[1] += ax * cellData.right.yv * 0.05;
        
        this.velocity[0] += ay * cellData.down.xv * 0.05;
        this.velocity[1] += ay * cellData.down.yv * 0.05;
        
        this.move();
    }

    move() {
        this.velocity = geometric.add(this.velocity, this.acceleration);

        // If particle gets to slow stop it or to fast slow it down
        if (geometric.mag(this.velocity) < minVelocity) {
            this.velocity = [0, 0];
        } else if (geometric.mag(this.velocity) > maxVelocity) {
            this.velocity = geometric.setMag(this.velocity, maxVelocity);
        } else {
            // Slow particle down
            this.velocity = [this.velocity[0] * particleSpeedReduction, this.velocity[1] * particleSpeedReduction];
        }

        // Sign out off of fluid Cells
        let signedOut = false;
        if (this.velocity[0] != 0 || this.velocity[1] != 0) {
            signFluidCells(this.pos, -1);

            signedOut = true;
        }

        this.acceleration = [0, 0];

        // Actualize position
        this.pos = [getTorus(this.pos[0] + this.velocity[0]), getTorus(this.pos[1] + this.velocity[1])];
        
        // Sign in to fluid Cells
        if (signedOut) {
            signFluidCells(this.pos, 1);
        }
        
        if (this.velocity[0] == 0 && this.velocity[1] == 0) {
            this.unchanged = true;
        } else {
            this.unchanged = false;
        }
    }

    addAcceleration(acceleration) {
		this.acceleration = [this.acceleration[0] + acceleration[0], this.acceleration[1] + acceleration[1]];
	}
}
*/

function particle(index, x, y) {
    this.index = index;
    this.x = x;
    this.y = y;

    this.pos = [x, y];
    this.pPos = [x, y];

    this.velocity = [0, 0];
    this.acceleration = [0, 0];

    this.unchanged = true;
}

function cell(index, x, y, res) {
    this.index = index;
    this.x = x;
    this.y = y;
    
    this.r = res;

    this.col = 0;
    this.row = 0;
    
    this.xv = 0;
    this.yv = 0;

    this.pressure = 0;
}

/*
class flowCell {
	constructor(pos, size, duration, dir) {
		this.pos = [pos[0], pos[1]];
		this.size = size;
		this.duration = duration;
		this.dir = dir;
	}

	updateFluidParticles() {
		let tmpFluidParticles = [];
		let self = this;

		tmpFluidParticles = simulation.fluidTree.contentParticles(this.pos, this.size, 1);

		tmpFluidParticles.forEach(function(fluidParticle) {
			addAcceleration(fluidParticle, self.dir);
		})

        if (this.duration != undefined) {
            this.duration--;
        }
	}

    updateParticles() {
		let tmpFluidParticles = [];
		let self = this;

		tmpFluidParticles = simulation.fluidTree.contentParticles(this.pos, this.size, 1);

		tmpFluidParticles.forEach(function(fluidParticle) {
			addAcceleration(fluidParticle, self.dir);
		})

        if (this.duration != undefined) {
            this.duration--;
        }
    }
}
*/

// ////////////////////////////// LOOP

function draw() {
    for (i = 0; i < vectorCells.length; i++) {
        var cellDatas = vectorCells[i];

        for (j = 0; j < cellDatas.length; j++) {
            var cellData = cellDatas[j];
            
            updatePressure(cellData);
        }
    }

    updateParticle();

    for (i = 0; i < vectorCells.length; i++) {
        var cellDatas = vectorCells[i];

        for (j = 0; j < cellDatas.length; j++) {
            var cellData = cellDatas[j];

            updateVelocity(cellData);
        }
    }

    exports.vectorCells = vectorCells;
    exports.particles = particles;

    // Fluid Cells
    if (simulation.simulateFluidCells) {
        fluidCellData = [];

        for (let i = 0; i < fluidCells.length; i++) {
            if (fluidCellsPrev[i][0] != fluidCells[i][0] || fluidCellsPrev[i][1] != fluidCells[i][1]) {
                // let index = i.toString(16);
                let index = i;

                fluidCellData.push(index, fluidCells[i][0], fluidCells[i][1]);

                // Set previous FluidCellData
                fluidCellsPrev[i] = [fluidCells[i][0], fluidCells[i][1]];
            }
        }

        exports.fluidCellData = fluidCellData;
    }
    
    exports.fluidCells = fluidCells;
}

exports.draw = draw;

function updateParticle() {
    for (i = 0; i < particles.length; i++) {
        let signedOut = false;

        var p = particles[i];

        var col = parseInt(p.pos[0] / resolution);
        var row = parseInt(p.pos[1] / resolution);

        var cellData = vectorCells[col][row];

        var ax = (p.pos[0] % resolution) / resolution;
        var ay = (p.pos[1] % resolution) / resolution;
        
        p.velocity[0] += (1 - ax) * cellData.xv * 0.05;
        p.velocity[1] += (1 - ay) * cellData.yv * 0.05;
        
        p.velocity[0] += ax * cellData.right.xv * 0.05;
        p.velocity[1] += ax * cellData.right.yv * 0.05;
        
        p.velocity[0] += ay * cellData.down.xv * 0.05;
        p.velocity[1] += ay * cellData.down.yv * 0.05;

        // Add acceleration to velocity
        /*
        p.velocity[0] += p.acceleration[0];
        p.velocity[1] += p.acceleration[1];

        */
        // If particle gets to slow stop it or to fast slow it down
        if (geometric.mag(p.velocity) < minVelocity) {
            p.velocity[0] = 0;
            p.velocity[1] = 0;
        } else if (geometric.mag(p.velocity) > maxVelocity) {
            p.velocity[0] = geometric.setMag([p.velocity[0], p.velocity[1]], maxVelocity)[0];
            p.velocity[1] = geometric.setMag([p.velocity[0], p.velocity[1]], maxVelocity)[1];
            
        }

        if (simulation.phase < simulation.timeSteps.length - 1) {
            // Sign out off of fluid Cells
            if (p.velocity[0] != 0 || p.velocity[1] != 0) {
                signFluidCells(p.pos, -1);

                signedOut = true;
            }
        }

        // Actualize position
        p.pos = [getTorus(p.pos[0] + p.velocity[0]), getTorus(p.pos[1] + p.velocity[1])];
        
        if (simulation.phase < simulation.timeSteps.length - 1) {
            // Sign in to fluid Cells
            if (signedOut) {
                signFluidCells(p.pos, 1);
            }
        }
        
        /*
        p.acceleration = [0, 0];
        */

        // Slow particle down
        p.velocity[0] *= particleSpeedReduction;
        p.velocity[1] *= particleSpeedReduction;
        

        if (p.velocity[0] == 0 && p.velocity[1] == 0) {
            p.unchanged = true;
        } else {
            p.unchanged = false;
        }
    }
}

function addVelocity(velocity, size, pos) {
    for (i = 0; i < vectorCells.length; i++) {
        var cellDatas = vectorCells[i];

        for (j = 0; j < cellDatas.length; j++) {
            var cellData = cellDatas[j];
            
            changeCellVelocity(cellData, velocity[0], velocity[1], size, pos[0], pos[1]);
            
            updatePressure(cellData);
        }
    }
}

exports.addVelocity = addVelocity;

function changeCellVelocity(cellData, mvelX, mvelY, size, origin_x, origin_y) {
    var dx = cellData.x - origin_x;
    var dy = cellData.y - origin_y;
    var dist = Math.sqrt(dy * dy + dx * dx);
    
    if (dist < size) {
        if (dist < 4) {
            dist = size;
        }
        
        var power = size / dist;

        cellData.xv += mvelX * power;
        cellData.yv += mvelY * power;
    }
}

function updatePressure(cellData) {
    var pressure_x = (
        cellData.up_left.xv * 0.5
        + cellData.left.xv
        + cellData.down_left.xv * 0.5
        - cellData.up_right.xv * 0.5
        - cellData.right.xv
        - cellData.down_right.xv * 0.5
    );
    
    var pressure_y = (
        cellData.up_left.yv * 0.5
        + cellData.up.xv
        + cellData.up_right.yv * 0.5
        - cellData.down_left.yv * 0.5
        - cellData.down.yv
        - cellData.down_right.yv * 0.5
    );
    
    cellData.pressure = (pressure_x + pressure_y) * 0.25;
}

function updateVelocity(cellData) {
    cellData.xv += (
        cellData.up_left.pressure * 0.5
        + cellData.left.pressure
        + cellData.down_left.pressure * 0.5
        - cellData.up_right.pressure * 0.5
        - cellData.right.pressure
        - cellData.down_right.pressure * 0.5
    ) * 0.25;
    
    cellData.yv += (
        cellData.up_left.pressure * 0.5
        + cellData.up.pressure
        + cellData.up_right.pressure * 0.5
        - cellData.down_left.pressure * 0.5
        - cellData.down.pressure
        - cellData.down_right.pressure * 0.5
    ) * 0.25;
    
    cellData.xv *= 0.99;
    cellData.yv *= 0.99;

    // Stop velocity when it gets too slow
    /*
    if (geometric.mag([cellData.xv, cellData.yv]) < minVelocity) {
        cellData.xv = 0;
        cellData.yv = 0;
    }
    */
}

function addAcceleration(particle, acceleration) {
    particle.acceleration[0] += acceleration[0];
    particle.acceleration[1] += acceleration[1];
}

exports.addAcceleration = addAcceleration;

function changeFluidCellPolarity(index, val) {
    fluidCells[index][1] += val;
}

exports.changeFluidCellPolarity = changeFluidCellPolarity;

function signFluidCells(pos, val) {
    let radius = Math.ceil(fluidCellRadius/fluidCellResolution);
    let translatedPos = [Math.floor(pos[0]/fluidCellResolution), Math.floor(pos[1]/fluidCellResolution)];

    for (let i = translatedPos[0] - radius; i <= translatedPos[0] + radius; i++) {
        for (let j = translatedPos[1] - radius; j <= translatedPos[1] + radius; j++) {
            let cellPos = [i * fluidCellResolution + fluidCellResolution/2, j * fluidCellResolution + fluidCellResolution/2];

            if (geometric.dist(pos, cellPos) <= fluidCellRadius) {
                let rowCount = (fieldWidth/fluidCellResolution);
                let cellIndex = getFluidCellTorus(j) * rowCount + getFluidCellTorus(i);
                
                fluidCells[cellIndex][0] += val;
            }
        }
    }
}

function getTorus(pos) {
    while (pos < 0) {
        pos += simulation.fieldWidth;
    }

    while (pos >= simulation.fieldWidth) {
        pos -= simulation.fieldWidth;
    }

    return pos;   
}

function getFluidCellTorus(cellPos) {
    let fluidCellCount = simulation.fieldWidth/fluidCellResolution;

    while (cellPos < 0) {
        cellPos += fluidCellCount;
    } 
    while (cellPos >= fluidCellCount) {
        cellPos -= fluidCellCount;
    }

    return cellPos;
}

exports.getFluidCellTorus = getFluidCellTorus;

let rotateStrength = .4;

// rotateDir is either 1 or -1 / rotateStrength ranges from 0 to 1 / form is 0 for rectangle, 1 for circle
function setFluidflowfieldSwirl(pos, cellCount, rotateDir, crossRotate, form, duration) {
	rotateDir = rotateDir > 0 ? 1 : -1;

	for (let i = -cellCount/2; i < cellCount/2; i++) {
		for (let j = -cellCount/2; j < cellCount/2; j++) {
			let cellPos = [pos[0] + i * flowCellSize + flowCellSize/2, pos[1] + j * flowCellSize + flowCellSize/2];

			if ((form == 0) || (form == 1 && geometric.dist(cellPos, pos) <= cellCount/2 * flowCellSize)) {
				let dir = [pos[0] - cellPos[0], pos[1] - cellPos[1]];

                let distToCenter = geometric.dist(pos, cellPos);
                let dirStrength = flowfieldStrength/(distToCenter/2);

				dir = geometric.setMag(dir, dirStrength);
				dir = geometric.rotate(dir, (Math.PI/4) * rotateDir * rotateStrength);

				if (crossRotate == 0) {
					if ((i < 0 && j < 0) || (i >= 0 && j >= 0)) {
						dir = geometric.rotate(dir, Math.PI);
					}
				} else if (crossRotate == 1) {
					if ((i < 0 && j >= 0) || (i >= 0 && j < 0)) {
						dir = geometric.rotate(dir, Math.PI);
					}
                }
                
                flowCells.push(new flowCell(cellPos, flowCellSize, duration, dir));
			}
		}
	}
    exports.flowCells = flowCells;
}

exports.setFluidflowfieldSwirl = setFluidflowfieldSwirl;

// rotate is either 0, 1, 2 or 3 whoch represents the direction of the hourglass / form is 0 for rectangle, 1 for circle
function setFluidflowfieldHourglass(pos, cellCount, rotate, form, duration) {
    rotate = Math.max(Math.min(rotate, 3), 0);
    
	for (let i = -cellCount/2; i < cellCount/2; i++) {
		for (let j = -cellCount/2; j < cellCount/2; j++) {
            let cellPos = [pos[0] + i * flowCellSize + flowCellSize/2, pos[1] + j * flowCellSize + flowCellSize/2];

            if ((form == 0) || (form == 1 && geometric.dist(cellPos, pos) <= cellCount/2 * flowCellSize)) {
                let dir = [pos[0] - cellPos[0], pos[1] - cellPos[1]];

                let distToCenter = geometric.dist(pos, cellPos);
                let dirStrength = flowfieldStrength/(distToCenter);

                dir = geometric.setMag(dir, dirStrength);

                if (rotate == 0 && i < 0) {
                      dir = geometric.rotate(dir, Math.PI);
                } else if (rotate == 1 && i >= 0) {
                    dir = geometric.rotate(dir, Math.PI);
                } else if (rotate == 2 && j < 0) {
                    dir = geometric.rotate(dir, Math.PI);
                } else if (rotate == 3 && j >= 0) {
                    dir = geometric.rotate(dir, Math.PI);
                }

                flowCells.push(new flowCell(cellPos, flowCellSize, duration, dir));
            }
        }
    }
    exports.flowCells = flowCells;
}

exports.setFluidflowfieldHourglass = setFluidflowfieldHourglass;

function reduceFluidParticleMaxVelocity(reduceVal) {
    maxVelocity -= reduceVal;
}

exports.reduceFluidParticleMaxVelocity = reduceFluidParticleMaxVelocity;