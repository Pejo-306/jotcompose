const express = require("express");

const { Notebook } = require("../models/notebook");

const notebooksRouter = express.Router();

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

    try {
        const notebook = await Notebook.findByIdAndDelete(id);
        if (!notebook) {
            return res.status(404).send({ error: `Notebook with id ${id} not found` });
        }

        // TODO: cascade delete all notes associated with the notebook
        res.status(204).send();
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
});

module.exports = { notebooksRouter };
