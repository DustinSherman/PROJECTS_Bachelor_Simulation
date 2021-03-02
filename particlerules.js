// Reaction Results
/*
    The difference between the lowest akin and the state determines if there's going to be a special happening like particle trails,
    or a cellular Automata. The size increases the higher the state and the lower the lowestAkin. CA Animate Size is 1/8 of the original size.
    Particle Trails Size is 2/3 of the original size.
*/

let fm = 0;
let fe = 1;
let cas = 3;
let cac = 4;
let caa = 5;

let particleResults = [
    // Results FluidMovement (FM) / FluidExplosion (FE) / Fluidflowfield (FF) / CA Neighbourhood/Rule Set (CAS) / CA Complete (CAC) / CA Animate (CAA)

    // Lowest Akin / State	| 1   | -1  | 2   | -2  | 3   | -3  | 4   | -4  | 5   | -5  | 6   | -6  | 7   | -7  | 8   | -8  | 9   | -9  | 10  | -10 | 11  | -11 |
    /* 0 */                 [ fm  , fm  , fm  , fm  , fm  , fm  , fe  , cac , fe  , cac , fm  , cac ,     ,     , fe  , caa ,     ,     ,     ,     ,     ,     ],
    /* 1 */                             [ fm  , fm  , fm  , fm  ,     ,     ,     ,     ,     ,     , fe  , caa , fe  , cac , fe  , caa , fe  , caa , fe  , caa ],
    /* 2 */                                         [ fm  , fm  , fm  , cas ,     ,     ,     ,     ,     ,     , fm  , cas ,     ,     , fe  , cac , fe  , cac ],
    /* 3 */                                                     [ fm  , cas , fm  , cas ,     ,     ,     ,     , fm  , cas ,     ,     , fm  , cas ,     ,     ],
    /* 4 */                                                                 [ fm  , cas , fm  , cas , fe  , caa , fm  , cas ,     ,     , fm  , cas ,     ,     ],
    /* 5 */                                                                             [ fe  , cac ,     ,     , fe  , caa , fe  , caa , fm  , cas ,     ,     ],
    /* 6 */                                                                                         [     ,     , fe  , cac ,     ,     , fe  , caa , fe  , caa ],
    /* 7 */                                                                                                     [     ,     ,     ,     , fe  , cac , fe  , cac ],
    /* 8 */                                                                                                                 [     ,     ,     ,     ,     ,     ],
    /* 9 */                                                                                                                             [     ,     ,     ,     ],
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