const { Core } = require("@adobe/aio-sdk");

async function main(params) {
  const logger = Core.Logger("main", { level: params.LOG_LEVEL || "info" });
  logger.info("Calling the main action");
  return { statusCode: 200, body: { message: "Hello from " + process.env.__OW_ACTION_NAME } };
}

exports.main = main;