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
    token: Joi.string().uuid().required(),
    name: Joi.string().required(),
    device_type: Joi.string()
      .valid(
        DeviceType.DIGITAL_SIGNAGE,
        DeviceType.MOBILE,
        DeviceType.MONITOR,
        DeviceType.UNASSIGNED
      )
      .required(),
    os_type: Joi.string()
      .valid(
        OSType.ANDROID,
        OSType.EMBEDDED,
        OSType.IOS,
        OSType.LINUX,
        OSType.MAC,
        OSType.UNKNOWN,
        OSType.WINDOWS
      )
      .required(),
    device_sub_type: Joi.string().optional(),
    can_give_telemetry: Joi.boolean().optional(),
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
