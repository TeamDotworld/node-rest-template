import { Router } from "express";
import devices from "../admin/devices";
import users from "../admin/users";
import roles from "../admin/roles";
import permissions from "../admin/permissions";

// Admin routes
export default () => {
  const app = Router();
  devices(app);
  users(app);
  roles(app);
  permissions(app);

  return app;
};
