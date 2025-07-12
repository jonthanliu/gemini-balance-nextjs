import pino from "pino";

const pinoConfig = {
  level: process.env.LOG_LEVEL || "info",
};

const logger = pino(pinoConfig);

export default logger;
