import express from "express";
import { deleteUser, getAllUsers, getUser, newUser } from "../controllers/user.js";
import { adminOnly } from "../middleware/auth.js";

const app = express.Router();


// ROUTE -> /api/v1/user/new
app.post("/new", newUser);

// ROUTE => /api/v1/user/all
app.get("/all", adminOnly, getAllUsers)

// ROUTE => /api/v1/user/dynamicID
app.route("/:id").get(getUser).delete(adminOnly, deleteUser)

export default app;