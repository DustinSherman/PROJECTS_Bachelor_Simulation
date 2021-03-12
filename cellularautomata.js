// MY MODULES
const simulation = require("./simulation.js");
const manual = require("./cellularautomatarules.js");
const geometric = require("./geometric.js");
const log = require("./log.js");

let resolution;
let cells = [];
exports.cells = cells;

function init() {
    resolution = simulation.caResolution;

    for (let col = 0; col < simulation.fieldWidth / resolution; col++) {
        cells[col] = [];

        for (let row = 0; row < simulation.fieldWidth / resolution; row++) {
            cells[col][row] = new cell(col * resolution, row * resolution);

            cells[col][row].col = col;
            cells[col][row].row = row;
        }
    }
}

exports.init = init;

function update() {
    // For every Cell check if a neighbourhood is set and if a rule is set
    for (let col = 0; col < cells.length; col++) {
        for (let row = 0; row < cells[col].length; row++) {
            if (cells[col][row].neighbourhoodIndex !== -1 
                && cells[col][row].rule != undefined) {
                updateCell(cells[col][row]);
            }
        }
    }

    for (let col = 0; col < cells.length; col++) {
        for (let row = 0; row < cells[col].length; row++) {
            if (cells[col][row].neighbourhoodIndex !== -1 
                && cells[col][row].rule != undefined) {
                cells[col][row].alive = cells[col][row].tmpAlive;
            }
        }
    }

    exports.cells = cells;
}

exports.update = update;

function getChangedCells() {
    let tmpChangedCells = [];

    for (let col = 0; col < cells.length; col++) {
        for (let row = 0; row < cells[col].length; row++) {
            let index = col * simulation.fieldWidth/resolution + row;

            if (cells[col][row].preAlive != cells[col][row].alive) {
                tmpChangedCells.push(index);

                cells[col][row].preAlive = cells[col][row].alive;
            }
        }
    }

    return tmpChangedCells;
}

exports.getChangedCells = getChangedCells;

function cell(x, y) {
    this.x = x;
    this.y = y;

    this.col;
    this.row;

    this.tmpAlive = false;
    this.alive = false;
    this.preAlive = false;

    this.neighbourhoodIndex = -1;
    this.ruleIndex = 0;
    this.rule;

    this.calced = false;
}

function updateCell(cellData) {
    let aliveNeighbours = 0;

    for (let i = 0; i < manual.neighbours[cellData.neighbourhoodIndex].length; i++) {
        let tmpCol = getTorus(cellData.col + manual.neighbours[cellData.neighbourhoodIndex][i][0]);
        let tmpRow = getTorus(cellData.row + manual.neighbours[cellData.neighbourhoodIndex][i][1]);

        if (cells[tmpCol][tmpRow].alive) {
            aliveNeighbours++;
        }
    }

    if (cellData.rule[aliveNeighbours] == 1) {
        cellData.tmpAlive = false;
    }

    if (cellData.rule[aliveNeighbours] == 2) {
        cellData.tmpAlive = true;
    }
}

function animate(center, size, form) {
    tmpCells = [...getCells(center, size, form)];

    for (let i = 0; i < tmpCells.length; i++) {
        tmpCells[i].alive = true;
    }

    // UNCOMMENT to log Animate seperatly
    /*
    if (simulation.logData) {
        log.logCellularAutomataAliveCells(center, size);
    }
    */
}

exports.animate = animate;

let sizeMulti = 18;
exports.sizeMulti = sizeMulti;

// Form 0 = rectangle, 1 = circle

function setNeighbourhood(center, size, form, index) {
    tmpCells = [...getCells(center, size, form)];

    for (let i = 0; i < tmpCells.length; i++) {
        tmpCells[i].neighbourhoodIndex = index;
    }

    // UNCOMMENT to log cellularAutomataNeighbourhood seperatly
    /*
    if (simulation.logData) {
        log.logCellularAutomataNeighbourhood(index, center, size, form);
    }
    */
}

exports.setNeighbourhood = setNeighbourhood;

function setRule(center, size, form, index) {
    tmpCells = [...getCells(center, size, form)];

    for (let i = 0; i < tmpCells.length; i++) {
        tmpCells[i].ruleIndex = index;
        tmpCells[i].rule = [...manual.rules[index]];
    }

    // UNCOMMENT to log cellularAutomataRule seperatly
    /*
    if (simulation.logData) {
        log.logNewCellularAutomataRule(index, center, size, form);
    }
    */
}

exports.setRule = setRule;

function updateRule(cellData, ruleIndex) {
    cellData.ruleIndex = ruleIndex;
    cellData.rule = [...manual.rules[ruleIndex]];
}

exports.updateRule = updateRule;

/*
    If the radius of a circle is 1 then a sqaure with 1,772 width and height has the same area as the cirlce.
    If the rects width and height is 1 then a circle with the same area has a radius of 0.564.
*/

// Form 0 = rectangle, 1 = circle
function getCells(center, size, form) {
    let tmpCellIndex = [];

    let row = Math.floor(center[0] / resolution);
    let col = Math.floor(center[1] / resolution);

    // The tmpSize always represents half the size of the rectangle
    let tmpSize = size / resolution;

    if (form == 1) {
        tmpSize = Math.round(tmpSize * 1.128);
    }

    for (let i = col - tmpSize; i <= col + tmpSize; i++) {
        for (let j = row - tmpSize; j <= row + tmpSize; j++) {
            if (form == 0 || (form == 1 && geometric.dist([col, row], [i, j]) <= tmpSize)) {
                tmpCellIndex.push(cells[getTorus(i)][getTorus(j)]);
            }
        }
    }

    return tmpCellIndex;
}

function getTorus(val) {
    if (val < 0) {
        val += simulation.fieldWidth / resolution;
    } else if (val >= simulation.fieldWidth / resolution) {
        val -= simulation.fieldWidth / resolution;
    }

    return Math.floor(val);
}