import { Router } from "express";
import auth from "./auth";
import users from "./users";
import call from "./call";
import content from "./content";
import subscription from "./subscription";

export default () => {
  const app = Router();
  auth(app);
  users(app);
  call(app);
  content(app);
  subscription(app);

  return app;
};
