// Reaction Results
/*
    The difference between the lowest akin and the state determines if there's going to be a special happening like particle trails,
    or a cellular Automata. The size increases the higher the state and the lower the lowestAkin. CA Animate Size is 1/8 of the original size.
    Particle Trails Size is 2/3 of the original size.

    CA Complete (CAC)	CA Animate (CAA)	CA Neighbourhood/Rule (CAS)		Trails (T)	Fluid Movement (FM)		Fluid Explosion (FE)	Fluidflowfield (FF)

    # Normal Phase

    Lowest Akin / State	| 4   | -4  | 5   | -5  | 6   | -6  | 7   | -7  | 8   | -8  | 9   | -9  | 10  | -10 | 11  | -11 |
    0                   | T   | T   | T   | T   | FM  | CAC | FE  | CAS | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA |
    1                   |     |     | T   | T   | FM  | CAC | FM  | CAC | FE  | CAS | FF  | CAA | FF  | CAA | FF  | CAA |
    2                   |     |     |     |     |     |     | FM  | CAC | FM  | CAC | FE  | CAS | FF  | CAA | FF  | CAA |
    3                   |     |     |     |     |     |     | T   | T   | FM  | CAC | FM  | CAC | FE  | CAS | FF  | CAA |
    4					|     |     |     |     |     |     |     |     |     |     | FM  | CAC | FM  | CAC | FE  | CAS |
    5					|     |     |     |     |     |     |     |     |     |     | T   | T   | FM  | CAC | FM  | CAC |
    6					|     |     |     |     |     |     |     |     |     |     |     |     |     |     | FM  | CAC |
    7					|     |     |     |     |     |     |     |     |     |     |     |     |     |     | T   | T   |

    # Expand Phase

    Lowest Akin / State	| 1   | -1  | 2   | -2  | 3   | -3  | 4   | -4  | 5   | -5  | 6   | -6  | 7   | -7  | 8   | -8  | 9   | -9  | 10  | -10 | 11  | -11 |
    0                   | FE  | CAS | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA |
    1                   |     |     | FE  | CAS | FM  | CAC | FM  | CAC | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA |
    2                   |     |     |     |     | FE  | CAS | FE  | CAS | FM  | CAC | FM  | CAC | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA | FF  | CAA |
    3                   |     |     |     |     |     |     | FE  | CAS | FE  | CAS | FM  | CAC | FM  | CAC | FM  | CAC | FM  | CAC | FF  | CAA | FF  | CAA |
    4					|     |     |     |     |     |     |     |     | FE  | CAS | FE  | CAS | FE  | CAS | FM  | CAC | FM  | CAC | FM  | CAC | FF  | CAA |
    5					|     |     |     |     |     |     |     |     |     |     | FE  | CAS | FE  | CAS | FE  | CAS | FM  | CAC | FM  | CAC | FM  | CAC |
    6					|     |     |     |     |     |     |     |     |     |     |     |     | FE  | CAS | FE  | CAS | FE  | CAS | FM  | CAC | FM  | CAC |
    7					|     |     |     |     |     |     |     |     |     |     |     |     |     |     | FE  | CAS | FE  | CAS | FE  | CAS | FM  | CAC |
    8					|     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     | FE  | CAS | FE  | CAS | FE  | CAS |
    9					|     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     | FE  | CAS | FE  | CAS |
    10					|     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     | FE  | CAS |
*/


// First value is the absolute state and the second value is the lowestAkin
let trailConstelations = [[
    [4, 0], [-4, 0], [5, 0], [-5, 0], [5, 1], [-5, 1], [7, 3], [-7, 3], [9, 5], [-9, 5], [11, 7], [-11, 7]
], [
    
]];

let caCompleteConstelations = [[
    [-6, 0], [-6, 1], [-7, 1], [-7, 2], [-8, 2], [-8, 2], [-9, 3], [-9, 4], [-10, 4], [-10, 5], [-10, 5], [-10, 6]
], [
    [-3, 1], [-4, 1], [-5, 2], [-6, 2], [-6, 3], [-7, 3], [-8, 3], [-8, 4], [-9, 3], [-9, 4], [-9, 5], [-10, 4], [-10, 5], [-10, 6], [-11, 5], [-11, 6], [-11, 7]
]];

let caNeighbourhoodRuleConstelations = [[
    [-7, 0], [-8, 1], [-9, 2], [-10, 3], [-11, 4]
], [
    [-1, 0], [-2, 1], [-3, 2], [-4, 2], [-4, 3], [-5, 3], [-5, 4], [-6, 4], [-6, 5], [-7, 4], [-7, 5], [-7, 6], [-8, 5], [-8, 6], [-8, 7], [-9, 6], [-9, 7], [-9, 8], [-10, 7], [-10, 8], [-10, 9], [-11, 8], [-11, 9], [-11, 10]
]];

let caAnimateConstelations = [[
    [-8, 0], [-9, 0], [-9, 1], [-10, 0], [-10, 1], [-10, 2], [-11, 0], [-11, 1], [-11, 2], [-11, 3]
], [
    [-2, 0], [-3, 0], [-4, 0], [-5, 0], [-5, 1], [-6, 0], [-6, 1], [-7, 0], [-7, 1], [-7, 2], [-8, 0], [-8, 1], [-8, 2], [-9, 0], [-9, 1], [-9, 2], [-10, 0], [-10, 1], [-10, 2], [-10, 3], [-11, 0], [-11, 1], [-11, 2], [-11, 3], [-11, 4]
]];

let fluidMovementConstelations = [[
    [6, 0], [6, 1], [7, 1], [7, 2], [8, 2], [8, 2], [9, 3], [9, 4], [10, 4], [10, 5], [10, 5], [10, 6]
], [
    [3, 1], [4, 1], [5, 2], [6, 2], [6, 3], [7, 3], [8, 3], [8, 4], [9, 3], [9, 4], [9, 5], [10, 4], [10, 5], [10, 6], [11, 5], [11, 6], [11, 7]
]];

let fluidExplosionConstelations = [[
    [7, 0], [8, 1], [9, 2], [10, 3], [11, 4]
], [
    [1, 0], [2, 1], [3, 2], [4, 2], [4, 3], [5, 3], [5, 4], [6, 4], [6, 5], [7, 4], [7, 5], [7, 6], [8, 5], [8, 6], [8, 7], [9, 6], [9, 7], [9, 8], [10, 7], [10, 8], [10, 9], [11, 8], [11, 9], [11, 10]
]];

let fluidflowfieldConstelations = [[
    [8, 0], [9, 0], [9, 1], [10, 0], [10, 1], [10, 2], [11, 0], [11, 1], [11, 2], [11, 3]
], [
    [2, 0], [3, 0], [4, 0], [5, 0], [5, 1], [6, 0], [6, 1], [7, 0], [7, 1], [7, 2], [8, 0], [8, 1], [8, 2], [9, 0], [9, 1], [9, 2], [10, 0], [10, 1], [10, 2], [10, 3], [11, 0], [11, 1], [11, 2], [11, 3], [11, 4]
]];

let constelations = [trailConstelations, caCompleteConstelations, caNeighbourhoodRuleConstelations, caAnimateConstelations, fluidMovementConstelations, fluidExplosionConstelations, fluidflowfieldConstelations];

function getParticleReactionResult(state, lowestAkin, phase) {
    let result = undefined;

    for (let i = 0; i < constelations.length; i++) {
        for (let j = 0; j < constelations[i][phase].length; j++) {
            if (state == constelations[i][phase][j][0] && lowestAkin == constelations[i][phase][j][1]) {
                result = i;

                break;
            }
        }
    }

    return result;
}

exports.getParticleReactionResult = getParticleReactionResult;