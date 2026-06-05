import { randomUUID } from "node:crypto";
import pino, { type LoggerOptions } from "pino";
import { pinoHttp } from "pino-http";
import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

const config: LoggerOptions = {
  level: env.LOG_LEVEL ?? "info",
};

if (!isProduction) {
  config.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname,responseTime",
      translateTime: "SYS:standard",
    },
  };
}

export const logger = pino(config);

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const requestId = String(req.id ?? randomUUID());
    res.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  autoLogging: {
    ignore(req) {
      return req.url === "/health" || req.url === "/metrics";
    },
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400 && res.statusCode < 500) return "warn";
    return "info";
  },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
  customSuccessMessage: function (req, res, responseTime) {
    return `${req.method} ${req.url} ${res.statusCode} in ${responseTime}ms`;
  },
  customErrorMessage: function (req, res, err) {
    return `${req.method} ${req.url} ${res.statusCode} failed - ${err.message}`;
  },
  serializers: {
    req: (req) => {
      if (!isProduction) return undefined;
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.headers["user-agent"],
        ip: req.headers["x-forwarded-for"] || req.remoteAddress,
      };
    },
    res: (res) => {
      if (!isProduction) return undefined; // Clear response object locally
      return { statusCode: res.statusCode };
    },
  },
});
