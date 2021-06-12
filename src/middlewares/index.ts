import rateLimit from "express-rate-limit";
import { auth, checkRole, validateDevice } from "./auth";
import loggingMiddleware from "./logging";
import errorMiddleware from "./error";
import * as validation from "./validation";

const rateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hrs in milliseconds
  max: 100,
  message: "You have exceeded the 100 requests in 24 hrs limit!",
  headers: true,
});

export default {
  auth,
  checkRole,
  validateDevice,
  rateLimiter,
  loggingMiddleware,
  errorMiddleware,
  validation,
};
