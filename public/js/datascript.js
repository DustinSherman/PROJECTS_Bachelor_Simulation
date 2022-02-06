// Data Objects
let particles = [
    [],
    []
];
let fluid = [
    [],
    []
];
let fluidCells = [
    [],
    []
];
let cellularAutomataData = [
    [],
    []
];
let lineTrailsData = [
    [],
    []
];
let shockwaveData = [
    [],
    []
];

let dataObjects = [
    particles,
    fluid,
    fluidCells,
    cellularAutomataData,
    lineTrailsData,
    shockwaveData,
]

let dataNames = [
    'particles',
    'fluid',
    'fluidCells',
    'cellularAutomata',
    'lineTrails',
    'shockwaves'
]

let particleMaxState;

let fluidParticleCount;

let cellularAutomataCellSize = 1;
let cellularAutomataResolution;
let cellularAutomataFrequency;

// Setup Data
let fieldWidth, timeEnd, saveFreq, saveAllFreq;
let loadProgress = 0;
let loadCircleCircu = 565.49;

let endPhaseTime;

let tmpPath = simulationID;

let startIDHex = '';
let startDate;

let currentFileIndex = -1;

function setupDataInit() {
    // Get Setup Data
    fetch('../' + tmpPath + '/data/setup.json')
        .then(response => response.json())
        .then(data => {
            startIDHex = data['startIDHex'];
            startDate = new Date(data['startDate']);
            fieldWidth = data['fieldWidth'];
            timeEnd = data['timeEnd'];
            saveFreq = data['saveFreq'];
            saveAllFreq = data['saveAllFreq'];
            fluidParticleCount = data['fluidParticleCount'];
            fluidCellResolution = data['fluidCellResolution'];
            fluidCellBaseParticleCount = data['fluidCellBaseParticleCount'];
            cellularAutomataResolution = data['caResolution'];
            cellularAutomataFrequency = data['caFreq'];
            endPhaseTime = data['endPhaseTime'];
            particleMaxState = data['particleMaxState'];

            console.log("Setup.json load finished");

            dataInit();
        });
}

function dataInit() {
    // Load particle Data
    loadFile(0, 0, particles, 'particles', checkForInit);

    // Load fluid Data
    loadFile(0, 0, fluid, 'fluid', checkForInit);
    loadFile(0, 0, fluidCells, 'fluidCells', checkForInit);

    // Load cellular Automata Data
    loadFile(0, 0, cellularAutomataData, 'cellularAutomata', checkForInit);

    // Load Line Trail Data
    loadFile(0, 0, lineTrailsData, 'lineTrails', checkForInit);

    // Load shockwave Data
    loadFile(0, 0, shockwaveData, 'shockwaves', checkForInit);

    console.log("Data Setup finished");
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

    // Load Shockwave Data
    loadFile(currentFileIndex, relativeIndex, shockwaveData, 'shockwaves', undefined);    
}

function loadFile(index, relativeIndex, dataObject, fileName, callback, parameter) {
    // Reset Array
    dataObject[relativeIndex] = [];

    fetch('../' + tmpPath + '/data/' + pad(index, 6) + '_' + fileName + '.json')
        .then(response => response.json())
        .then(function (data) {
            dataObject[relativeIndex] = [...data];

            if (callback != undefined) {
                callback(parameter);
            }
        })
}

function checkForInit() {
    let finished = true;
    // Only check if the first array is filled, because the second one will be filled right at the beginnig
    for (let i = 0; i < dataObjects.length; i++) {

        if (dataObjects[i][0].length != saveFreq) {
            finished = false;
        }
    }

    if (finished) {
        console.log("Loading files finished. Starting Init");

        init();
    }
}

function animateLoadingCircle() {
    let loadingObjectCount = 3;

    loadProgress += ((saveFreq)/timePassed)/loadingObjectCount;
    let tmpCircleDashoffset = loadCircleCircu - loadCircleCircu * loadProgress;
    if (tmpCircleDashoffset < 0) {
        tmpCircleDashoffset = 0;
    }

    document.getElementById('loading-circle').style.strokeDashoffset = tmpCircleDashoffset;
}

if (simulationFinished) {
    setupDataInit();
}

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}

function addHours(date, hours) {
    return new Date(new Date(date).setHours(date.getHours() + hours));
}

const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

function dateString(date) {
    let day = date.getDate();
    if (day == 1 || day == 21 || day == 31) {
        day = String(day) + "st";
    } else if (day == 2 || day == 22) {
        day = String(day) + "nd";
    } else if (day == 3 || day == 23) {
        day = String(day) + "rd";
    } else {
        day = String(day) + "th";
    }
    let hours = date.getHours();
    hours = ("0" + hours).slice(-2);
    let minutes = date.getMinutes();
    minutes = ("0" + minutes).slice(-2);
    let dateString = day + " " + months[date.getMonth()] + " " + String(date.getFullYear()) + "  " + hours + ":" + minutes;

    return dateString;
}