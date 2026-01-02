const xxhash = require("xxhashjs");
const { gcd } = require("./gcd");
const { ALPHABET, BASE } = require("../constants");

/**
 * Generate a deterministic, fixed-length Base62 notebook ID.
 *
 * @param {number} counter  Non-negative integer counter.
 * @param {number} [length=6]
 * @param {string} [salt="default_salt"]
 * @param {number} [mult=1315423911]
 * @returns {string} Base62 ID prefixed with "b".
 */
function generateNotebookId(counter, length = 6, salt = "default_salt", mult = 1315423911) {
    // Guards for input values and types
    if (!Number.isInteger(counter) || counter < 0) {
        throw new RangeError(`counter must be a non-negative integer (given value: ${counter})`);
    }
    if (!Number.isInteger(length) || length <= 0) {
        throw new RangeError(`length must be a positive integer (given value: ${length})`);
    }
    if (typeof salt !== "string" || salt.length === 0) {
        throw new TypeError(`salt must be a non-empty string (given type: ${typeof salt})`);
    }
    if (!Number.isInteger(mult) || mult <= 0 || gcd(mult, BASE ** length) !== 1) {
        throw new RangeError(`mult must be coprime with ${BASE ** length} (given value: ${mult})`);
    }

    // Affine permutation: scramble sequential counters while preserving 1:1 mapping
    // Applies a multiplicative + additive permutation over a fixed modulo space.
    // The counter ensures 1:1 mapping between counter values and id values (no collisions).
    // Salting and hashing scrambles the counter value into a unique looking id.
    // A multiplicative permutation removes visible ordering while remaining
    // deterministic and collision-free until the counter wraps around the modulo space.
    const moduloSpace = BASE ** length;
    const saltHash = xxhash.h64(salt, 0).toNumber() % moduloSpace;
    const permuted = (counter * mult + saltHash) % moduloSpace;

    // Base62 encoding: fixed-length, most-significant-digit first
    // Encodes the permuted value into Base62 and left-pads with 'a' to ensure
    // constant length. Prefix with 'b' as per system design.
    let result = "";
    for (let i = 0; i < length; i++) {
        const index = Math.floor(permuted / (BASE ** i)) % BASE;
        result = ALPHABET[index] + result;
    }
    result = result.padStart(length, ALPHABET[0]);
    return `b${result}`;
}

module.exports = { generateNotebookId };
