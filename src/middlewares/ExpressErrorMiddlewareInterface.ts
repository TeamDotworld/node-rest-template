import {
  Middleware,
  ExpressErrorMiddlewareInterface,
  HttpError,
} from "routing-controllers";

@Middleware({ type: "after" })
export class CustomErrorHandler implements ExpressErrorMiddlewareInterface {
  error(error: any, request: any, response: any, next: (err: any) => any) {
    let errors = error.errors ? { errors: error.errors } : {};
    return response.status(error.httpCode || 500).json({
      status: false,
      message: error.message,
      ...errors,
    });
  }
}
