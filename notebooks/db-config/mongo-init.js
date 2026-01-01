const notebooksDd = process.env.NOTEBOOKS_DB;
const notebooksUser = process.env.NOTEBOOKS_USER;
const notebooksPass = process.env.NOTEBOOKS_PASS;

db = db.getSiblingDB(notebooksDd);

db.createUser({
    user: notebooksUser,
    pwd: notebooksPass,
    roles: [
        {
            role: "readWrite",
            db: notebooksDd,
        },
    ],
});
