import express from "express";
import { adminOnly } from "../middleware/auth.js";
import { getBarChart, getDashboardStats, getLineChart, getPieChart } from "../controllers/stats.js";

const app = express.Router();

// Route -> /api/v1/dashboard/stats
app.get("/stats",adminOnly, getDashboardStats);

// Route -> /api/v1/dashboard/pie
app.get("/pie", adminOnly, getPieChart);

// Route -> /api/v1/dashboard/bar
app.get("/bar", adminOnly, getBarChart);

// Route -> /api/v1/dashboard/line
app.get("/line", adminOnly, getLineChart);

export default app;