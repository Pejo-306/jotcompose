const mongoose = require("mongoose");

const { COUNTER_NAME } = require("../constants");

const counterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        default: COUNTER_NAME
    },
    value: {
        type: Number,
        required: true,
        default: 0
    }
});

const Counter = mongoose.model("Counter", counterSchema);

module.exports = { Counter };