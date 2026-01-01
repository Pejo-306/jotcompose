const notesDd = process.env.NOTES_DB;
const notesUser = process.env.NOTES_USER;
const notesPass = process.env.NOTES_PASS;

db = db.getSiblingDB(notesDd);

db.createUser({
    user: notesUser,
    pwd: notesPass,
    roles: [
        {
            role: "readWrite",
            db: notesDd,
        },
    ],
});
