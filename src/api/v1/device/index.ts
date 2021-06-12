import { Router } from "express";
import misc from "./misc";

// Admin routes
export default () => {
  const app = Router();
  misc(app);

  return app;
};
