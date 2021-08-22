// Data Objects
let particles = [[], []];
let fluid = [[], []];
let fluidCells = [[], []];
let cellularAutomataData = [[], []];
let lineTrailsData = [[], []];
// let shockwaves = [];

let dataObjects = [
    particles,
    fluid,
    fluidCells,
    cellularAutomataData,
    lineTrailsData,
    // shockwaves
]

let dataNames = [
    'particles',
    'fluid',
    'fluidCells',
    'cellularAutomata',
    'lineTrails',
    // 'shockwaves'
]

let particleMaxState;

let fluidParticleCount;

let cellularAutomataCellSize = 1;
let cellularAutomataResolution;
let cellularAutomataFrequency;

// Setup Data
let fieldWidth, timeEnd, saveFreq;
let loadProgress = 0;

let endPhaseTime;

let tmpPath = simulationID;

let startIDHex = '';
let startDate;

let currentFileIndex = -1;

function dataInit() {
    // Get Setup Data
    fetch('../' + tmpPath + '/data/setup.json')
        .then(response => response.json())
        .then(data => {
            startIDHex = data['startIDHex'];
            startDate = data['startDate'];
            fieldWidth = data['fieldWidth'];
            timeEnd = data['timeEnd'];
            saveFreq = data['saveFreq'];
            fluidParticleCount = data['fluidParticleCount'];
            fluidCellResolution = data['fluidCellResolution'];
            fluidCellBaseParticleCount = data['fluidCellBaseParticleCount'];
            cellularAutomataResolution = data['caResolution'];
            cellularAutomataFrequency = data['caFreq'];
            endPhaseTime = data['endPhaseTime'];
            particleMaxState = data['particleMaxState'];

            // Load particle Data
            loadFile(0, 0, particles, 'particles', checkForInit);            
         
            // Load fluid Data
            loadFile(0, 0, fluid, 'fluid', checkForInit);
            loadFile(0, 0, fluidCells, 'fluidCells', checkForInit);   

            // Load cellular Automata Data
            loadFile(0, 0, cellularAutomataData, 'cellularAutomata', checkForInit);  
            
            // Load Line Trail Data
            loadFile(0, 0, lineTrailsData, 'lineTrails', checkForInit); 

            console.log("Data Setup finished");
        })
}

function loadData(currentFileIndex, relativeIndex) {
    console.log("New data at", timePassed, "index", currentFileIndex);

    // Load particle Data
    loadFile(currentFileIndex, relativeIndex, particles, 'particles', undefined);

    // Load fluid Data
    loadFile(currentFileIndex, relativeIndex, fluid, 'fluid', undefined);   
    loadFile(currentFileIndex, relativeIndex, fluidCells, 'fluidCells', undefined);  

    // Load cellular Automata Data
    loadFile(currentFileIndex, relativeIndex, cellularAutomataData, 'cellularAutomata', undefined);

    // Load Line Trail Data
    loadFile(currentFileIndex, relativeIndex, lineTrailsData, 'lineTrails', undefined); 
}

function loadFile(index, relativeIndex, dataObject, fileName, callback, parameter) {
    // Reset Array
    dataObject[relativeIndex] = [];

    // console.log("Load data", (pad(index, 6) + '_' + fileName), "in", (fileName + "[" + relativeIndex + "]"));

    fetch('../' + tmpPath + '/data/' + pad(index, 6) + '_' + fileName + '.json')
    .then(response => response.json())
    .then(function(data) {
        dataObject[relativeIndex] = [...data];

        if (callback != undefined) {
            callback(parameter);
        }
    })
}

function checkForInit() {
    let finished = true;
    // Only check if the first array is filled, because the second one will be filled rigt at the beginnig
    for (let i = 0; i < dataObjects.length; i++) {
        if (dataObjects[i][0].length != saveFreq) {
            finished = false;
            break;
        }
    }

    if (finished) {
        console.log("Loading files finished. Starting Init");

        init();
    }
}

dataInit();

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}