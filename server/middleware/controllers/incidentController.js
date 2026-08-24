const IncidentModel = require("../models/incidentModel");

const getUserId = (req) =>
    req.user?.userId || req.user?.user_id || req.user?.id;

const createIncident = async (req, res) => {
    try {
        const reporterId = getUserId(req);

        if (!reporterId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const {
            category_id, title, description, incident_location,
            incident_date, priority, anonymous
        } = req.body;

        if (!category_id || !title || !description) {
            return res.status(400).json({
                success: false,
                message: "Category, title and description are required"
            });
        }

        const incident = await IncidentModel.createIncident({
            reporter_id: reporterId,
            category_id,
            title,
            description,
            incident_location,
            incident_date,
            priority,
            anonymous
        });

        res.status(201).json({
            success: true,
            message: "Incident reported successfully",
            incident
        });
    } catch (error) {
        console.error("Create incident error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getMyIncidents = async (req, res) => {
    try {
        const reporterId = getUserId(req);

        if (!reporterId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const incidents =
            await IncidentModel.getIncidentsByReporter(reporterId);

        res.json({ success: true, incidents });
    } catch (error) {
        console.error("Get incidents error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getMyIncident = async (req, res) => {
    try {
        const reporterId = getUserId(req);

        if (!reporterId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const incident = await IncidentModel.getIncidentById(
            req.params.id,
            reporterId
        );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        res.json({ success: true, incident });
    } catch (error) {
        console.error("Get incident error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = await IncidentModel.getCategories();
        res.json({ success: true, categories });
    } catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createIncident,
    getMyIncidents,
    getMyIncident,
    getCategories
};
