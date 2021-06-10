import "reflect-metadata";

import express from "express";
import config from "./config";
import Logger from "./loaders/logger";

(async () => {
  let app = express();

  await require("./loaders").default(app);

  app
    .listen(config.port, () => {
      Logger.info(`🛡️ Server listening on port: ${config.port} 🛡️`);
    })
    .on("error", (err) => {
      Logger.error(err);
      process.exit(1);
    });
})();
