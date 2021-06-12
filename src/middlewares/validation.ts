import { celebrate, Joi } from "celebrate";

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

export { loginSchema, tokenExchangeSchema };
