import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import passport from "passport";
import multer from "multer";

import middleware from "@middleware/index";
import permissions from "@permission";
import ContentService from "@service/content";
import helper from "@helpers/index";

import { v4 as uuidv4 } from "uuid";
import { ContentType } from ".prisma/client";

const route = Router();

export default (app: Router) => {
  app.use("/contents", route);

  route.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.content.view),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        let { id } = req.params;
        const streamServiceInst = Container.get(ContentService);
        const content = await streamServiceInst.GetContents(user_id, id);

        return res.status(200).json({
          status: true,
          data: content,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // List live
  route.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.content.list),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        const streamServiceInst = Container.get(ContentService);
        const list = await streamServiceInst.ListContents(id);

        return res.status(200).json({
          status: true,
          message: "listing all public contents",
          data: list,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Like in query. change this
  // create permission
  route.patch(
    "/:id/like",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        let { id: content_id } = req.params;
        let like = req.query.like;
        if (!like) {
          throw new Error("Invalid query parameter");
        }
        var isTrueSet = like === "true";

        const contentService = Container.get(ContentService);
        const content = await contentService.LikeContent(
          user_id,
          content_id,
          isTrueSet
        );
        return res.status(200).json({
          status: true,
          data: content,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Upload to cloudinary and crete content
  route.post(
    "/upload",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.content.create),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        const contentService = Container.get(ContentService);

        const upload = multer({
          storage: helper.storage,
          fileFilter: (req, file, cb) => {
            if (file.mimetype === "video/mp4") {
              cb(null, true);
            } else {
              cb(null, false);
              return cb(new Error("Only .mp4 format is allowed!"));
            }
          },
        }).single("content");
        upload(req, res, function (err) {
          if (err instanceof multer.MulterError) {
            return res.status(400).json({
              status: false,
              message: "Max allowed file size exceeded!",
            });
          } else if (err) {
            return res.status(400).json({
              status: false,
              message: "Unable to upload file. " + err.message,
            });
          } else if (!req.file) {
            return res.status(400).json({
              status: false,
              message: "File is required!",
            });
          }

          try {
            // SEND FILE TO CLOUDINARY
            const cloudinary = require("cloudinary").v2;
            cloudinary.config({
              cloud_name: "dtkdmn0yd",
              api_key: "282482821466611",
              api_secret: "iy-caIRK7mPhLJaZTmgSzk_9bJA",
            });

            const path = req.file.path;
            const uniqueFilename = uuidv4();

            cloudinary.uploader.upload(
              path,
              {
                public_id: `beambox/${uniqueFilename}`,
                tags: `beambox`,
                resource_type: "video",
              },
              async function (err, image) {
                if (err)
                  res.status(400).json({
                    status: false,
                    message: "Unable to upload file." + err.message,
                  });
                // remove file from server
                const fs = require("fs");
                fs.unlinkSync(path);
                // return image details

                const created = await contentService.CreateContent(id, {
                  title: req.body.title,
                  url: image.secure_url,
                  description: req.body.description,
                  thumbnail: "",
                  type: ContentType.VIDEO,
                  listing: req.body.listing,
                  original_filename: image.original_filename,
                  format: image.format,
                  mime: req.file.mimetype,
                  size: helper.formatBytes(req.file.size),
                });
                return res.json({
                  status: true,
                  data: created,
                });
              }
            );
          } catch (err) {
            return res.status(500).json({
              status: false,
              message: err.message,
            });
          }
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
