const sendNotification = async ({ userId, title, message }) => {
  // Database notifications are the Phase 1 delivery channel.
  // Email/SMS providers can be added here without changing controllers.
  return { delivered: false, channel: "database", userId, title, message };
};

module.exports = { sendNotification };
