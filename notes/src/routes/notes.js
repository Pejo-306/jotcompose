const express = require("express");

const { Note } = require("../models/note");

const notesRouter = express.Router();

notesRouter.post("/", async (req, res) => {
    const { title, content, notebookId } = req.body || {};

    if (!title || !content) {
        return res.status(400).send({ error: "Title and content are required" });
    }

    try {
        const note = new Note({ title, content, notebookId });
        // TODO: validate notebookId against notebook cache and service
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
