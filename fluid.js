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

// The speed get multiplied by this value to slow it down
let particleSpeedReduction;

// Fluid Cells
let fluidCells = [];
let fluidCellsPrevPolarity = [];
let fluidCellData = [];
let fluidCellResolution;
let fluidCellRadius;

exports.fluidCellData = fluidCellData;

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
        let particleBaseCount = simulation.fluidTree.contentParticles(pos, fluidCellRadius).length;

        for (i = 0; i < fluidCellCount; i++) {
            fluidCells.push([particleBaseCount, 0]);
            fluidCellsPrevPolarity.push(0);
        }
    }

    exports.fluidCells = fluidCells;
}

exports.initFluidCells = initFluidCells;

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
            let pos = [i % (simulation.fieldWidth/fluidCellResolution) * fluidCellResolution + fluidCellResolution/2, Math.floor(i / (simulation.fieldWidth/fluidCellResolution)) * fluidCellResolution + fluidCellResolution/2];

            let fluidParticleCount = simulation.fluidTree.contentParticles(pos, fluidCellRadius).length;

            if (fluidParticleCount != fluidCells[i][0] || fluidCellsPrevPolarity[i] != fluidCells[i][1]) {
                fluidCellData.push([i, fluidParticleCount, fluidCells[i][1]]);
            }

            fluidCells[i][0] = fluidParticleCount;
        }

        exports.fluidCellData = fluidCellData;
    }
    
    exports.fluidCells = fluidCells;
}

exports.draw = draw;

function updateParticle() {
    for (i = 0; i < particles.length; i++) {
        var p = particles[i];

        // If particle gets to slow stop it
        if (geometric.mag([p.xv, p.yv] < minVelocity)) {
            p.xv = 0;
            p.yv = 0;
        } else if (geometric.mag([p.xv, p.yv]) > maxVelocity) {
            p.xv = geometric.setMag([p.xv, p.yv], maxVelocity)[0];
            p.xv = geometric.setMag([p.xv, p.yv], maxVelocity)[1];
        }

        if (p.pos[0] >= 0 && p.pos[0] < fieldWidth && p.pos[1] >= 0 && p.pos[1] < fieldWidth) {
            var col = parseInt(p.pos[0] / resolution);
            var row = parseInt(p.pos[1] / resolution);

            var cellData = vectorCells[col][row];
            
            var ax = (p.pos[0] % resolution) / resolution;
            var ay = (p.pos[1] % resolution) / resolution;
            
            p.xv += (1 - ax) * cellData.xv * 0.05;
            p.yv += (1 - ay) * cellData.yv * 0.05;
            
            p.xv += ax * cellData.right.xv * 0.05;
            p.yv += ax * cellData.right.yv * 0.05;
            
            p.xv += ay * cellData.down.xv * 0.05;
            p.yv += ay * cellData.down.yv * 0.05;

            p.pos[0] += p.xv;
            p.pos[1] += p.yv;
            
            p.px = p.x;
            p.py = p.y;
        }
        else {
            if (p.pos[0] < 0) {
                p.pos[0] += fieldWidth;
            } else if (p.pos[0] >= fieldWidth) {
                p.pos[0] -= fieldWidth;
            }

            if (p.pos[1] < 0) {
                p.pos[1] += fieldWidth;
            } else if (p.pos[1] >= fieldWidth) {
                p.pos[1] -= fieldWidth;
            }

        }
        
        // Slow particle down
        p.xv *= particleSpeedReduction;
        p.yv *= particleSpeedReduction;

        if (p.xv == 0 && p.yv == 0) {
            p.unchanged = true;
        } else {
            p.unchanged = false;
        }
    }
}

function addVelocity(_Velocity, _Size, _Pos) {
    for (i = 0; i < vectorCells.length; i++) {
        var cellDatas = vectorCells[i];

        for (j = 0; j < cellDatas.length; j++) {
            var cellData = cellDatas[j];
            
            changeCellVelocity(cellData, _Velocity[0], _Velocity[1], _Size, _Pos[0], _Pos[1]);
            
            updatePressure(cellData);
        }
    }
}

exports.addVelocity = addVelocity;

function changeCellVelocity(cellData, mvelX, mvelY, _Size, origin_x, origin_y) {
    var dx = cellData.x - origin_x;
    var dy = cellData.y - origin_y;
    var dist = Math.sqrt(dy * dy + dx * dx);
    
    if (dist < _Size) {
        if (dist < 4) {
            dist = _Size;
        }
        
        var power = _Size / dist;

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
        + cellData.up.yv
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
    if (geometric.mag([cellData.xv, cellData.yv]) < minVelocity) {
        cellData.xv = 0;
        cellData.yv = 0;
    }
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

function particle(index, x, y) {
    this.index = index;
    this.x = this.px = x;
    this.y = this.py = y;

    this.pos = [x, y];
    this.pPos = [x, y];

    this.xv = this.yv = 0;

    this.unchanged = true;
}

function addAcceleration(particle, acceleration) {
    particle.xv += acceleration[0]
    particle.yv += acceleration[1];
}

exports.addAcceleration = addAcceleration;

function changeFluidCellPolarity(index, val) {
    fluidCells[index][1] += val;
}

exports.changeFluidCellPolarity = changeFluidCellPolarity;