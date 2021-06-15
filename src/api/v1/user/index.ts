import { Router } from "express";
import auth from "./auth";
import users from "./users";
import calls from "./calls";

export default () => {
  const app = Router();
  auth(app);
  users(app);
  calls(app);
  return app;
};
