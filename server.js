// MODULES
const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const fork = require('child_process').fork;
const fs = require("fs");

// MY MODULES
const simulation = require("./simulation.js");

// Date
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

// SERVER
let port = 64400;
let currentDate = new Date();

let childProcess;
// let simulationsWaiting = [];

let simulationsWaiting = [
	// "1010101010101010101010101010",
	// "0101010101010101010101010101",
	// "0000000000000000000000000000",
	// "1111111111111111111111111111",
	"1111000010100010101000101010",
	// "0001010001010001010100101000",
	// "0000001000000001000000100000",
	// "1111110111101111101110111111"
];
let simulationRunning = false;

// SERVER
app.set('port', (process.env.PORT || port));

// Add Folder public for CSS and JS
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (request, response) {
	response.sendFile(__dirname + '/index.html');
});

// Handle Post Requests
app.post('/', function (request, response) {
	var body = ''

	request.on('data', function (data) {
		body += data
	})
	request.on('end', function () {
		let startBitString = body;
		let startHexString = parseInt(body, 2).toString(36);

		console.log('post ', startHexString);

		// Check if simulation has been allready simulated
		let directory = './public/' + startHexString;

		if (!fs.existsSync(directory)) {
			simulationsWaiting.push(startBitString);

			if (!simulationRunning) {
				spawnChildProcess();
			}
		}

		// Send current date back to ESP
		response.writeHead(200, {
			'Content-Type': 'text/html'
		})
		response.end(dateString());
	})
})

http.listen(app.get('port'), function () {
	console.log('Started on port %s', app.get('port'), 'at', currentDate);
});

function spawnChildProcess() {
	simulationRunning = true;
	childProcess = fork('./simulation.js');
	childProcess.send({
		"startBitString": simulationsWaiting[0]
	});
	simulationsWaiting.shift();

	childProcess.on('exit', function () {
		if (simulationsWaiting.length > 0) {
			spawnChildProcess();
		} else {
			simulationRunning = false;
		}
	})
}

function dateString() {
	let currentDate = new Date();

	let currentDay = currentDate.getDay();
	if (currentDay == 1 || currentDay == 21 || currentDay == 31) {
		currentDay = String(currentDay) + "st";
	} else if (currentDay == 2 || currentDay == 22) {
		currentDay = String(currentDay) + "nd";
	} else if (currentDay == 3 || currentDay == 23) {
		currentDay = String(currentDay) + "rd";
	} else {
		currentDay = String(currentDay) + "th";
	}
	let currentHours = currentDate.getHours();
	currentHours = ("0" + currentHours).slice(-2);
	let currentMinutes = currentDate.getMinutes();
	currentMinutes = ("0" + currentMinutes).slice(-2);
	let dateString = currentDay + " " + months[currentDate.getMonth()] + " " + String(currentDate.getFullYear()) + "  " + currentHours + ":" + currentMinutes + "|" + simulation.startHexString;

	return dateString;
}















spawnChildProcess();