const mongoose = require("mongoose");
const Joi = require("joi");

const userSchema = mongoose.Schema({
  full_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    uniqe: true,
  },
  username: {
    type: String,
    required: true,
    uniqe: true,
  },
  password: {
    type: String,
    requireed: true,
  },
  policy: {
    type: Boolean,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: String,
  },
});

const User = mongoose.model("User", userSchema);

const SignUpValidator = (user) => {
  const schema = Joi.object({
    full_name: Joi.string().required(),
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    policy: Joi.boolean(),
  });
  return schema.validate(user);
};

const LoginValidator = (user) => {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  return schema.validate(user);
};

const ResetPasswordValidator = (user) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  });
  return schema.validate(user);
};

module.exports = {
  User,
  SignUpValidator,
  LoginValidator,
  ResetPasswordValidator,
};
