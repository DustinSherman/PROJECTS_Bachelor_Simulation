var math = require("mathjs");
const simulation = require("./simulation.js");

var geometric = module.exports = {
	mag: function (vector) {
		let result = math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);

		result = round(result);

		return result;
	},

	setMag: function (vector, mag) {
		let magPrev = math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);

		let result;
		if (magPrev != 0) {
			result = [vector[0] * mag / magPrev, vector[1] * mag / magPrev];
			result = roundArray(result);
		} else {
			result = [0, 0];
		}

		return result;
	},

	dist: function (pos0, pos1) {
		let result = math.sqrt(math.pow(pos1[0] - pos0[0], 2) + math.pow(pos1[1] - pos0[1], 2));
		result = round(result);

		return result;
	},

	inbound: function (pos0, pos1, radius) {
		return math.pow(pos1[0] - pos0[0], 2) + math.pow(pos1[1] - pos0[1], 2) <= math.pow(radius, 2);
	},

	outbound: function (pos0, pos1, radius) {
		return math.pow(pos1[0] - pos0[0], 2) + math.pow(pos1[1] - pos0[1], 2) > math.pow(radius, 2);
	},

	sub: function (vector0, vector1) {
		let result = [(vector1[0] - vector0[0]), (vector1[1] - vector0[1])]
		result = roundArray(result)

		return result;
	},

	div: function (vector, divisor) {
		let newMag = this.mag(vector) / divisor;

		let result;

		if (this.mag(vector) != 0) {
			result = [(vector[0] * newMag / this.mag(vector)), (vector[1] * newMag / this.mag(vector))];
			result = roundArray(result)
		} else {
			result = [0, 0];
		}

		return result;
	},

	mult: function (vector, multiplier) {
		let result = [(vector[0] * multiplier), (vector[1] * multiplier)];
		result = roundArray(result)

		return result;
	},

	add: function (vector0, vector1) {
		let result = [vector0[0] + vector1[0], vector0[1] + vector1[1]];
		result = roundArray(result)

		return result;
	},

	// Angle in radians
	rotate: function (vector, angle) {
		let cos = math.cos(angle);
		let sin = math.sin(angle);

		let tmpX = (cos * vector[0]) + (sin * vector[1]);
		let tmpY = (cos * vector[1]) - (sin * vector[0]);

		tmpX = round(tmpX);
		tmpY = round(tmpY);

		return [tmpX, tmpY];
	},

	// Angle in radians
	angleBetween: function (vector0, vector1) {
		let angle = Math.atan2(vector1[1] - vector0[1], vector1[0] - vector0[0]);

		return angle;
	},

	constrain: function (val, min, max) {
		let result = val;

		if (result > max) {
			result = max;
		} 
		if (result < min) {
			result = min;
		}

		result = round(result);

		return result;
	}
}

function round(val) {
	return Math.round((val + Number.EPSILON) * simulation.calcDecimalsMultiplier) / simulation.calcDecimalsMultiplier;
}

function roundArray(array) {
	let resultArray = [];

	array.forEach(function (element) {
		resultArray.push(Math.round((element + Number.EPSILON) * simulation.calcDecimalsMultiplier) / simulation.calcDecimalsMultiplier);
	})

	return resultArray;
}