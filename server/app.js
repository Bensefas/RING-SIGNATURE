const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const evidenceRoutes = require("./routes/evidenceRoutes");
const advisoryRoutes = require("./routes/advisoryRoutes");
const blockchainRoutes = require("./routes/blockchainRoutes");
const hodRoutes = require("./routes/hodRoutes");
const statusHistoryRoutes = require("./routes/statusHistoryRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

/*
=========================================================
GLOBAL MIDDLEWARE
=========================================================
*/

app.use(
    helmet({
        crossOriginResourcePolicy: false
    })
);

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

/*
=========================================================
ROOT ROUTE
=========================================================
*/

app.get("/", (req, res) => {
    res.json({
        success: true,
        message:
            "University Incident Transparency Reporting System API"
    });
});

/*
=========================================================
HEALTH CHECK
=========================================================
*/

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "Server Running",
        timestamp: new Date()
    });
});

/*
=========================================================
API ROUTES
=========================================================
*/

/*
Authentication
*/
app.use("/api/auth", authRoutes);

/*
Incidents

Available routes include:

POST /api/incidents
GET  /api/incidents
GET  /api/incidents/my
GET  /api/incidents/categories
GET  /api/incidents/:id
*/
app.use("/api/incidents", incidentRoutes);

/*
Assignments
*/
app.use("/api/assignments", assignmentRoutes);

/*
Evidence
*/
app.use("/api/evidence", evidenceRoutes);

/*
Advisory
*/
app.use("/api/advisory", advisoryRoutes);

/*
Blockchain
*/
app.use("/api/blockchain", blockchainRoutes);

/*
HOD
*/
app.use("/api/hod", hodRoutes);

/*
Status History
*/
app.use("/api/history", statusHistoryRoutes);

app.use("/api/notifications", notificationRoutes);

/*
=========================================================
404 HANDLER
=========================================================
*/

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

/*
=========================================================
GLOBAL ERROR HANDLER
=========================================================
*/

app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);

    if (err.message === "Unsupported file type." || err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            success: false,
            message: err.code === "LIMIT_FILE_SIZE"
                ? "Evidence file must be 10 MB or smaller."
                : err.message
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message:
            err.message ||
            "An unexpected server error occurred."
    });
});

module.exports = app;