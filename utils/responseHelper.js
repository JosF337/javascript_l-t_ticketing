const sendSuccess = (res, statusCode, message, data = {}) => {
  res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res, statusCode, message, errorCode = 'ERROR') => {
  res.status(statusCode).json({ success: false, message, errorCode });
};

module.exports = { sendSuccess, sendError };