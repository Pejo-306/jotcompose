const mongoose = require("mongoose");

const { Counter } = require("./counter");
const { COUNTER_NAME } = require("../constants");
const { generateNoteId } = require("../utils/id-generator");

const noteSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
        minlength: [1, "Title must not be empty"],
        maxlength: [100, "Title must be less than 100 characters"]
    },
    content: {
        type: String,
        required: true,
        maxlength: [5000, "Content must be less than 5000 characters"]
    },
    notebookId: {
        type: String,
    }
}, {
    id: false,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: { virtuals: true },
    versionKey: false
});

noteSchema.virtual("id").get(function () {
    return this._id;
});

noteSchema.pre("validate", async function (next) {
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
        this._id = generateNoteId(counter);
        return next();
    } catch (error) {
        return next(error);
    }
});

const Note = mongoose.model("Note", noteSchema);

module.exports = { Note };
