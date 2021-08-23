// PERFORMANCE
const { GPU } = require('gpu.js');
const gpu = new GPU();

var math = require("mathjs");

/*
var geometric = module.exports = {
	mag : function(_Vector) {
		return math.sqrt(_Vector[0] * _Vector[0] + _Vector[1] * _Vector[1]);
	},

	/*
	setMag : function(_Vector, _Magnitude) {
		let magPrev = math.sqrt(_Vector[0] * _Vector[0] + _Vector[1] * _Vector[1]);

		return [_Vector[0] * _Magnitude/magPrev, _Vector[1] * _Magnitude/magPrev];
	},
	*/
	/*

	dist: function(_Pos0, _Pos1) {
		return math.sqrt(math.pow(_Pos1[0] - _Pos0[0], 2) + math.pow(_Pos1[1] - _Pos0[1], 2));
	},

	sub: function(_Vector0, _Vector1) {
		return [(_Vector1[0] - _Vector0[0]), (_Vector1[1] - _Vector0[1])];
	},

	div: function(_Vector, _Divisor) {
		let newMag = this.mag(_Vector)/_Divisor;

		return [(_Vector[0] * newMag/this.mag(_Vector)), (_Vector[1] * newMag/this.mag(_Vector))];
	},

	mult: function(_Vector, _Multiplier) {
		return [(_Vector[0] * _Multiplier), (_Vector[1] * _Multiplier)];
	},

	add: function(_Vector0, _Vector1) {
		return [_Vector0[0] + _Vector1[0], _Vector0[1] + _Vector1[1]];
	},

	// Angle in radians
	rotate: function(_Vector, _Angle) {
	    let cos = math.cos(_Angle);
	    let sin = math.sin(_Angle);

	    let tmpX = (cos * _Vector[0]) + (sin * _Vector[1]);
	    let tmpY = (cos * _Vector[1]) - (sin * _Vector[0]);

		return [tmpX, tmpY];
	},

	constrain: function(_Val, _Min, _Max) {
		let val = _Val;

		if (val > _Max) {
			val = _Max;
		} else if (val < _Min) {
			val = _Min;
		}

		return val;
	}
}
*/

const setMag = gpu.createKernel(function(vector, magnitude) {

	// console.log("Set Mag Function called with " + vector + magnitude);


	let magPrev = math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);

	return [vector[0] * magnitude/magPrev, vector[1] * magnitude/magPrev];
}).setOutput([2]);

exports.setMag = setMag;