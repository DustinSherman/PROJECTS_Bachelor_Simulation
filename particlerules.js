// Reaction Results
/*
    The difference between the lowest akin and the state determines if there's going to be a special happening like particle trails,
    or a cellular Automata. The size increases the higher the state and the lower the lowestAkin. CA Animate Size is 1/8 of the original size.
    Particle Trails Size is 2/3 of the original size.
*/

let fm = 0;
let fe = 1;
let ff = 2;
let cas = 3;
let cac = 4;
let caa = 5;

let particleResults = [
    // Results FluidMovement (FM) / FluidExplosion (FE) / Fluidflowfield (FF) / CA Neighbourhood/Rule Set (CAS) / CA Complete (CAC) / CA Animate (CAA)

    // Lowest Akin / State	| 1   | -1  | 2   | -2  | 3   | -3  | 4   | -4  | 5   | -5  | 6   | -6  | 7   | -7  | 8   | -8  | 9   | -9  | 10  | -10 | 11  | -11 |
    /* 0 */                 [ fm  , fm  , fm  , fm  , fm  , fm  , fe  , fe  , cac , cac , fm  , fm  , fe  , fe  , fe  , fe  , caa , caa ,     ,     , fe  , fe  ],
    /* 1 */                             [ fm  , fm  , fm  , fm  , fm  , fm  , fm  , fm  , fm  , fm  , cas , cas , cac , cac , cac , cac , fe  , fe  , caa , caa ],
    /* 2 */                                         [ fm  , fm  , fm  , fm  , cas , cas ,     ,     ,     ,     ,     ,     , fm  , fm  , caa , caa , cac , cac ],
    /* 3 */                                                     [ fm  , fm  , fm  , fm  , fm  , fm  ,     ,     ,     ,     ,     ,     , cac , cac , cas , cas ],
    /* 4 */                                                                 [ fm  , fm  , fm  , fm  ,     ,     ,     ,     ,     ,     , cas , cas ,     ,     ],
    /* 5 */                                                                             [ fe  , fe  , cac , cac , cas , cas , fm  , fm  ,     ,     ,     ,     ],
    /* 6 */                                                                                         [ fe  , fe  , cac , cac , cas , cas , cas , cas ,     ,     ],
    /* 7 */                                                                                                     [     ,     , cac , cac , cac , cac , cas , cas ],
    /* 8 */                                                                                                                 [ caa , caa , fe  , fe  , caa , caa ],
    /* 9 */                                                                                                                             [     ,     , fe  , fe  ],
    /* 10 */                                                                                                                                        [     ,     ]
]

exports.particleResults = particleResults;

function getParticleReactionResult(state, lowestAkin, phase) {
    let result = undefined;

    let tmpState = (Math.abs(state) - 1) * 2;
    tmpState += state > 0 ? 0 : 1;
    tmpState -= lowestAkin * 2;

    result = particleResults[lowestAkin][tmpState];

    return result;
}

exports.getParticleReactionResult = getParticleReactionResult;