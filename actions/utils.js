/**
 * 공통 유틸리티 함수
 */

function errorResponse(statusCode, message, logger) {
  if (logger && typeof logger.info === 'function') {
    logger.info(`${statusCode}: ${message}`);
  }
  return {
    error: {
      statusCode,
      body: { error: message },
    },
  };
}

function getBearerToken(params) {
  if (params.__ow_headers && params.__ow_headers.authorization) {
    const auth = params.__ow_headers.authorization;
    if (auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
  }
  return undefined;
}

function stringParameters(params) {
  const result = {};
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith('__ow_') && typeof value !== 'object') {
      result[key] = String(value);
    }
  }
  return result;
}

module.exports = {
  errorResponse,
  getBearerToken,
  stringParameters,
};
