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
} from "routing-controllers";
import UserService from "../../services/users";
import Container from "typedi";
import { Logger } from "winston";

@JsonController("/v1")
export class UserController {
  @Get("/users")
  async getAll() {
    const logger: Logger = Container.get("logger");
    logger.debug(`Getting user list`);

    try {
      const userService: UserService = Container.get(UserService);
      const users = await userService.ListUsers();

      return {
        status: true,
        data: users,
      };
    } catch (e) {
      logger.error("🔥 error: %o", e);
      throw e;
    }
  }

  @Get("/users/:id")
  getOne(@Param("id") id: number) {
    return "This action returns user #" + id;
  }

  @Post("/users")
  post(@Body() user: any) {
    return "Saving user...";
  }

  @Put("/users/:id")
  put(@Param("id") id: number, @Body() user: any) {
    return "Updating a user...";
  }

  @Delete("/users/:id")
  remove(@Param("id") id: number) {
    return "Removing user...";
  }
}
