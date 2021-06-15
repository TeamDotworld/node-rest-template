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
    name: Joi.string().required(),
    can_call: Joi.boolean().required(),
    can_screen_share: Joi.boolean().default(false).optional(),
    supported_modes: Joi.array().items(Joi.string().uuid()).required(),
    call_provider: Joi.string()
      .valid(CallProvider.AGORA, CallProvider.TWILIO, CallProvider.SIP)
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
    device_type: Joi.string().valid(
      DeviceType.INTERCOM,
      DeviceType.KIOSK,
      DeviceType.SECURITY_PHONE,
      DeviceType.UNASSIGNED,
      DeviceType.VIRTUAL_CHARACTER,
      DeviceType.VIZITIN,
      DeviceType.CAMERA
    ),
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

const createRoomSchema = celebrate({
  [Segments.BODY]: Joi.object({
    initiator: Joi.string().required(),
    from: Joi.string().uuid().required(),
    to: Joi.string().uuid().required(),
  }),
})

const twilioRoomIdSchema = celebrate({
  [Segments.BODY]: Joi.object({
    room_id: Joi.string().alphanum().length(34).required(),
  }),
})

const initiateCallSchema = celebrate({
  [Segments.BODY]: Joi.object({
    room_id: Joi.string().alphanum().length(34).required(),
    device: Joi.string().uuid().required(),
  }),
})

export default {
  loginSchema,
  tokenExchangeSchema,
  newDeviceSchema,
  uuidParam,
  deviceTokenSchema,
  createRoomSchema,
  twilioRoomIdSchema,
  initiateCallSchema
};
