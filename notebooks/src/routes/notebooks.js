const express = require("express");
const axios = require("axios");

const { Notebook } = require("../models/notebook");

const notebooksRouter = express.Router();
const notesHost = process.env.NOTES_HOST;
const notesPort = process.env.NOTES_PORT;
const notesOrigin = `http://${notesHost}:${notesPort}`;

async function fetchNotesAvailability(origin, endpoint = "/health") {
    try {
        const healthUrl = `${origin}${endpoint}`;
        const response = await axios.get(healthUrl);
        return response.status === 200;
    } catch (error) {
        console.error(`Error: notes service is down or unreachable (${error.message})`);
        return false;
    }
}

async function cascadeDeleteNotes(notebookId, origin, endpoint = "/api/notes") {
    try {
        const deleteUrl = `${origin}${endpoint}`;
        const response = await axios.delete(deleteUrl, { data: { notebookId } });
        return response.status === 204;
    } catch (error) {
        // 404 is expected if there are no notes to delete
        if (error.response && error.response.status === 404) {
            return true;
        }
        console.error(`Unexpected error during notes cascade deletion (${error.message})`);
        return false;
    }
}

notebooksRouter.post("/", async (req, res) => {
    const { name, description } = req.body || {};

    if (!name) {
        return res.status(400).send({ error: "Name is required" });
    }

    try {
        const notebook = new Notebook({ name, description });
        await notebook.save();
        res.status(201).send(notebook.toJSON());
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notebooksRouter.get("/", async (req, res) => {
    try {
        const notebooks = await Notebook.find();
        res.status(200).send(notebooks.map(notebook => notebook.toJSON()));
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notebooksRouter.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).send({ error: "`:id` is required in request parameters" });
    }

    try {
        const notebook = await Notebook.findById(id);
        if (!notebook) {
            return res.status(404).send({ error: `Notebook with id ${id} not found` });
        }
        res.status(200).send(notebook.toJSON());
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notebooksRouter.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!id) {
        return res.status(400).send({ error: "`:id` is required in request parameters" });
    }

    try {
        const notebook = await Notebook.findByIdAndUpdate(id, { name, description }, { new: true });
        if (!notebook) {
            return res.status(404).send({ error: `Notebook with id ${id} not found` });
        }
        res.status(200).send(notebook.toJSON());
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

notebooksRouter.delete("/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).send({ error: "`:id` is required in request parameters" });
    }

    const notesAvailability = await fetchNotesAvailability(notesOrigin);
    if (!notesAvailability) {
        return res.status(503).send({ error: "Notebook deletion is temporarily unavailable. Please try again later." });
    }

    try {
        const notebook = await Notebook.findById(id);
        if (!notebook) {
            return res.status(404).send({ error: `Notebook with id ${id} not found` });
        }

        const cascadeDeleteResult = await cascadeDeleteNotes(id, notesOrigin);
        if (!cascadeDeleteResult) {
            return res.status(500).send({ error: "Internal server error." });
        }

        await notebook.deleteOne();
        res.status(204).send();
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

module.exports = { notebooksRouter , fetchNotesAvailability };
