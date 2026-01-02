const mongoose = require("mongoose");
const { Counter } = require("./counter");
const { COUNTER_NAME } = require("../constants");
const { generateNotebookId } = require("../utils/id-generator");

const notebookSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    }
}, {
    id: false,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret._id;       // hide "_id"
            delete ret.__v;
            return ret;
        },
    },
    toObject: { virtuals: true }
});

notebookSchema.virtual("id").get(function () {
    return this._id;
});

notebookSchema.pre("validate", async function (next) {
    if (!this.isNew || this._id) return next();  // prevent re-generation of id

    try {
        const counterDocument = await Counter.findOneAndUpdate(
            { name: COUNTER_NAME },
            { $inc: { value: 1 } },
            { 
                new: true,      // Return the counter value after incrementation
                                // ensures we initialize the counter to 0 if it doesn't exist
                upsert: true,   // Initialize counter (to 0) if it doesn't exist
                select: "value" // Only return the counter value
            }
        );
        const counter = counterDocument.value - 1;
        this._id = generateNotebookId(counter);
        return next();
    } catch (error) {
        return next(error);
    }
});

const Notebook = mongoose.model("Notebook", notebookSchema);

module.exports = { Notebook };
