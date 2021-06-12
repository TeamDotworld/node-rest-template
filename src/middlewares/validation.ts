import { celebrate, Joi } from "celebrate";
import { CallProvider, DeviceType } from "@prisma/client";

const loginSchema = celebrate({
  body: Joi.object({
    email: Joi.string().email().required().trim(),
    password: Joi.string().required(),
  }),
});

const tokenExchangeSchema = celebrate({
  body: Joi.object({
    token: Joi.string().required().trim(),
  }),
});

const newDeviceSchema = celebrate({
  body: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    can_call: Joi.boolean().required(),
    can_screen_share: Joi.boolean().default(false).optional(),
    supported_modes: Joi.array().items(Joi.string().uuid()).required(),
    call_provider: Joi.string()
      .valid(CallProvider.AGORA, CallProvider.TWILIO)
      .required(),
    device_type: Joi.string()
      .valid(
        DeviceType.ANDROID,
        DeviceType.EMBEDDED,
        DeviceType.IOS,
        DeviceType.LINUX,
        DeviceType.MAC,
        DeviceType.UNKNOWN,
        DeviceType.WINDOWS
      )
      .required(),
    sub_type: Joi.string().optional(),
    can_give_telemetry: Joi.boolean().optional(),
  }),
});

export { loginSchema, tokenExchangeSchema, newDeviceSchema };
