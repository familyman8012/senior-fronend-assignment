const { createDefaultResponse, createFunctionCallingResponse } = require('./utils/responseGenerators');

function getChatResponce(requestBody) {
  const created = Math.floor(Date.now() / 1000);

  if (!requestBody.functions && !requestBody.tools) {
    return createDefaultResponse(created);
  }

  return createFunctionCallingResponse(requestBody, created);
}

module.exports = {
  getChatResponce,
};