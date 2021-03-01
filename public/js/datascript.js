// Data Objects
let particles = [[], []];
let fluid = [[], []];
let fluidCells = [[], []];
let cellularAutomataData = [[], []];
// let particleTrails = [];
// let shockwaves = [];

let dataObjects = [
    particles,
    fluid,
    // fluidCells,
    // cellularAutomataData,
    // particleTrails,
    // shockwaves
]

let dataNames = [
    'particles',
    'fluid',
    // 'fluidCells',
    // 'cellularAutomata',
    // 'trails',
    // 'shockwaves'
]

let fluidParticleCount;

let cellularAutomataResolution;

// Setup Data
let fieldWidth, timeEnd, saveFreq;
let loadProgress = 0;

let tmpPath = 'undefined';

let startIDHex = '';
let startDate;

let currentFileIndex = -1;

function dataInit() {
    // Get Setup Data
    fetch('../data/' + tmpPath + '/setup.json')
        .then(response => response.json())
        .then(data => {
            startIDHex = data['startIDHex'];
            startDate = data['startDate'];
            fieldWidth = data['fieldWidth'];
            timeEnd = data['timeEnd'];
            saveFreq = data['saveFreq'];
            fluidParticleCount = data['fluidParticleCount'];
            fluidCellResolution = data['fluidCellResolution'];
            cellularAutomataResolution = data['caResolution'];

            // Iterate through all files
            for (let i = 0; i < dataObjects.length; i++) {
                loadFile(0, dataObjects[i], dataNames[i], undefined);
                loadFile(1, dataObjects[i], dataNames[i], checkForInit);
            }
            
            console.log("Data Setup finished");
        })
}

function loadData(timePassed) {
    // Check if fileIndex has updated
    currentFileIndex = Math.floor(timePassed/saveFreq) + 1;


    console.log("Load new data at ", timePassed);


    for (let i = 0; i < dataObjects.length; i++) {
        loadFile(currentFileIndex, dataObjects[i], dataNames[i], undefined);
    }
}

function loadFile(index, dataObject, fileName, callback) {
    let relativeIndex = index % 2;
    // Reset Array
    dataObject[relativeIndex] = [];

        fetch('../data/' + tmpPath + '/' + pad(index, 6) + '_' + fileName + '.json')
        .then(response => response.json())
        .then(function(data) {
            for (let i = 0; i < saveFreq; i++) {
                dataObject[relativeIndex].push(data[i]);
            }

            if (callback != undefined) {
                callback();
            }
        })
}

function checkForInit() {
    let finished = true;
    for (let i = 0; i < dataObjects.length; i++) {
        for (let j = 0; j < dataObjects[i].length; j++) {
            if (dataObjects[i][j].length != saveFreq) {
                finished = false;
                break;
            }
        }
    }

    if (finished) {
        init();
    }
}

dataInit();

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}