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
  Patch,
  BodyParam,
} from "routing-controllers";
import AuthService from "../../services/auth";
import { LoginDTO, ResetDTO } from "../../interface/inputs/auth";

@JsonController("/v1")
export class AuthController {
  @Post("/authenticate")
  async login(@Body({ required: true }) creds: LoginDTO) {
    const logger: Logger = Container.get("logger");
    logger.debug(`Calling login endpoint with %o`, creds);
    try {
      const authServiceInstance: AuthService = Container.get(AuthService);
      const { user, token } = await authServiceInstance.Login(
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

  @Patch("/reset")
  async resetPassword(@Body({ required: true }) body: ResetDTO) {
    const logger: Logger = Container.get("logger");
    logger.debug(`Calling reset endpoint with %o`, body.email);

    try {
      const authServiceInstance: AuthService = Container.get(AuthService);
      const user = await authServiceInstance.ResetPassword(body.email);

      return {
        status: true,
        data: {
          ...user,
        },
      };
    } catch (e) {
      logger.error("🔥 error: %o", e);
      throw e;
    }
  }

  @Get("/pk")
  async getPublicKey() {
    const logger: Logger = Container.get("logger");
    try {
      const authServiceInstance = Container.get(AuthService);
      const pk = await authServiceInstance.GetPk();
      return {
        status: true,
        data: pk,
      };
    } catch (e) {
      logger.error("🔥 error: %o", e);
      throw e;
    }
  }
}
