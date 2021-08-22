// MODULES
const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');

// MY MODULES
const simulation = require("./simulation.js");

// SERVER
app.set('port', (process.env.PORT || 64400));

// Add Folder public for CSS and JS
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

http.listen(app.get('port'), function () {
	console.log('Started on port %s', app.get('port'));
});

simulation.setup();
simulation.draw();