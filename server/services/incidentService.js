const { v4: uuid } = require("uuid");

const IncidentModel = require("../models/incidentModel");
const BlockchainService = require("./blockchainService");


const createIncident = async (data, userId) => {

    const incidentNumber =
        "INC-" +
        new Date().getFullYear() +
        "-" +
        uuid().substring(0, 8).toUpperCase();

    const incident = await IncidentModel.createIncident({
        incident_number: incidentNumber,
        reporter_id: userId,
        category_id: data.category_id,
        current_status_id: 1,
        title: data.title,
        description: data.description,
        incident_location: data.incident_location,
        incident_date: data.incident_date,
        priority: data.priority,
        anonymous: data.anonymous
    });

    return incident;
};


const getAllIncidents = async () => {
    return await IncidentModel.getAllIncidents();
};


const getIncidentById = async (incidentId) => {
    return await IncidentModel.getIncidentById(incidentId);
};


const updateIncidentStatus = async (incidentId, statusId) => {
    return await IncidentModel.updateIncidentStatus(
        incidentId,
        statusId
    );
};


const deleteIncident = async (incidentId) => {

    // First find the PostgreSQL incident.
    const incident =
        await IncidentModel.getIncidentById(incidentId);

    if (!incident) {
        const error = new Error("Incident not found");
        error.statusCode = 404;
        throw error;
    }

    /*
     * The Fabric incident uses incident_number
     * as its incidentID.
     */
    const fabricIncidentId =
        incident.incident_number;

    /*
     * Check whether the incident exists
     * on Hyperledger Fabric.
     */
    let fabricDeleted = false;

    try {

        const exists =
            await BlockchainService.incidentExists(
                fabricIncidentId
            );

        if (exists) {

            await BlockchainService.deleteIncident(
                fabricIncidentId
            );

            fabricDeleted = true;
        }

    } catch (fabricError) {

        console.error(
            "Fabric deletion failed:",
            fabricError
        );

        const error = new Error(
            "Unable to delete incident from blockchain"
        );

        error.statusCode = 500;
        throw error;
    }

    /*
     * Delete the PostgreSQL record.
     */
    const deleted =
        await IncidentModel.deleteIncident(
            incidentId
        );

    if (!deleted) {
        const error = new Error(
            "Incident could not be deleted from database"
        );

        error.statusCode = 500;
        throw error;
    }

    return {
        incident: deleted,
        fabricDeleted
    };
};


module.exports = {
    createIncident,
    getAllIncidents,
    getIncidentById,
    updateIncidentStatus,
    deleteIncident
};
