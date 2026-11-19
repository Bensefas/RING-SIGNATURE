const getIncidentErrorResponse = (error) => {
  if (error?.code === "42P01" || error?.code === "42703") {
    return {
      statusCode: 503,
      message: "Incident reporting is temporarily unavailable. Please try again shortly.",
    };
  }

  return {
    statusCode: error?.statusCode || 500,
    message: error?.message || "Unable to process the incident request.",
  };
};

module.exports = getIncidentErrorResponse;
