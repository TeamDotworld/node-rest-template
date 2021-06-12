import { isCelebrateError } from "celebrate";

function errorMiddleware(
  error: any,
  _request: any,
  response: any,
  _next: (err: any) => any
) {
  let stack = process.env.NODE_ENV === "production" ? {} : error.stack;
  if (isCelebrateError(error)) {
    return response.status(400).json({
      status: false,
      message: "Invalid request",
      errors: error.details.get("params") || "input validation failed",
      stack,
    });
  }

  return response.status(error.httpCode || 500).json({
    status: false,
    message: error.message || "internal server error",
    stack,
  });
}

export default errorMiddleware;
