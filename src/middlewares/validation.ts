import { celebrate, Joi, Segments } from "celebrate";
import { CallProvider, DeviceType, OSType } from "@prisma/client";

const loginSchema = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required().trim(),
    password: Joi.string().required(),
  }),
});

const tokenExchangeSchema = celebrate({
  [Segments.BODY]: Joi.object({
    token: Joi.string().required().trim(),
  }),
});

const newDeviceSchema = celebrate({
  [Segments.BODY]: Joi.object({
    id: Joi.string().uuid().required(),
    token: Joi.string().required(),
    name: Joi.string().required(),
  }),
});

const uuidParam = celebrate({
  [Segments.PARAMS]: {
    id: Joi.string().uuid().required(),
  },
});

const deviceTokenSchema = celebrate({
  [Segments.BODY]: Joi.object({
    device_token: Joi.string().uuid().required(),
  }),
});

export default {
  loginSchema,
  tokenExchangeSchema,
  newDeviceSchema,
  uuidParam,
  deviceTokenSchema,
};
