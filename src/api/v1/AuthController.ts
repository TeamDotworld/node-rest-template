import Container from "typedi";
import { Logger } from "winston";
import {
  Controller,
  Param,
  Body,
  Get,
  Post,
  Put,
  Delete,
  HttpError,
  JsonController,
  UnauthorizedError,
} from "routing-controllers";
import AuthService from "../../services/auth";
import { User } from "../../interface/inputs/auth";

@JsonController("/v1")
export class AuthController {
  @Post("/authenticate")
  async signin(@Body({ required: true }) creds: User) {
    const logger: Logger = Container.get("logger");
    logger.debug(`Calling Sign-In endpoint with %o`, creds);
    try {
      const authServiceInstance: AuthService = Container.get(AuthService);
      const { user, token } = await authServiceInstance.SignIn(
        creds.email,
        creds.password
      );

      return {
        status: true,
        data: {
          user,
          token,
        },
      };
    } catch (e) {
      logger.error("🔥 error: %o", e);
      throw new UnauthorizedError("Invalid login credentials");
    }
  }

  @Put("/reset")
  put(@Param("id") id: number, @Body() user: any) {
    return "Updating a user...";
  }
}
