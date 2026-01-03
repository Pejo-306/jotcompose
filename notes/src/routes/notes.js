const express = require("express");

const { Note } = require("../models/note");
const { ValidationError } = require("../errors");
const { validateNotebook } = require("../utils/validation");
const { retry } = require("../utils/retry");

const notesRouter = express.Router();
const notebooksHost = process.env.NOTEBOOKS_HOST;
const notebooksPort = process.env.NOTEBOOKS_PORT;
const notebooksOrigin = `http://${notebooksHost}:${notebooksPort}`;

notesRouter.post("/", async (req, res) => {
    const { title, content, notebookId } = req.body || {};

    if (!title || !content) {
        return res.status(400).send({ error: "Title and content are required" });
    }
    if (notebookId === "") {
        return res.status(400).send({ error: "Notebook id cannot be empty" });
    }

    try {
        let fields = { title, content };

        if (notebookId) {
            // Retry notebook validation twice to avoid cache staleness race
            // conditions and connection hiccups
            // (see system-design.md#dd-2-notes-behavior-on-notebooks-outage for more details)
            let isValidNotebook = false;
            try {
                await retry(
                    async () => {
                        const validationResult = await validateNotebook(notebookId, notebooksOrigin);
                        if (validationResult === false) {
                            throw new ValidationError("Trying to validate notebook again after 5s");
                        }
                        isValidNotebook = true;
                    }, 
                    1,
                    1000  // 1 second
                );
            } catch (error) {
                if (!(error instanceof ValidationError)) {
                    throw error;
                }
            }

            if (!isValidNotebook) {
                return res.status(404).send({ error: `Notebook with id ${notebookId} is not valid` });
            }
            fields.notebookId = notebookId;
        }

        const note = new Note(fields);
        await note.save();
        res.status(201).send(note.toJSON());
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notesRouter.get("/", async (req, res) => {
    try {
        const notes = await Note.find();
        res.status(200).send(notes.map(note => note.toJSON()));
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notesRouter.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).send({ error: "`:id` is required in request parameters" });
    }

    try {
        const note = await Note.findById(id);
        if (!note) {
            return res.status(404).send({ error: `Note with id ${id} not found` });
        }
        res.status(200).send(note.toJSON());
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notesRouter.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { title, content, notebookId } = req.body || {};

    if (!id) {
        return res.status(400).send({ error: "`:id` is required in request parameters" });
    }

    try {
        const note = await Note.findByIdAndUpdate(id, { title, content, notebookId }, { new: true });
        if (!note) {
            return res.status(404).send({ error: `Note with id ${id} not found` });
        }
        res.status(200).send(note.toJSON());
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notesRouter.delete("/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).send({ error: "`:id` is required in request parameters" });
    }

    try {
        const note = await Note.findByIdAndDelete(id);
        if (!note) {
            return res.status(404).send({ error: `Note with id ${id} not found` });
        }
        res.status(204).send();
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notesRouter.delete("/", async (req, res) => {
    const { notebookId } = req.body || {};

    if (!notebookId) {
        return res.status(400).send({ error: "`notebookId` is required in request body" });
    }

    try {
        const { deletedCount } = await Note.deleteMany({ notebookId });
        if (deletedCount === 0) {
            return res.status(404).send({ error: `No notes found with notebook ${notebookId}` });
        }
        res.status(204).send();
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

module.exports = { notesRouter };
