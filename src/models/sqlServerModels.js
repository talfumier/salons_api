import {DataTypes} from "sequelize";
import Joi from "joi";
import {joiPasswordExtendCore} from "joi-password";
import {joiSubSchema} from "./validation/joiUtilityFunctions.js";

let models = {Salon: null, User: null, Report: null, connection: null};
export function getModels() {
  return models;
}
export function defineSqlServerModels(sqlServerConnection) {
  const Salon = sqlServerConnection.define("salons", {
    id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    name_salon: {type: DataTypes.STRING, allowNull: false},
    address: {type: DataTypes.STRING, allowNull: false},
    city: {type: DataTypes.STRING, allowNull: false},
    zip: {type: DataTypes.STRING, allowNull: false},
    dept_id: {type: DataTypes.STRING, allowNull: false},
    date_open: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.DATE.NOW,
    },
  });
  const User = sqlServerConnection.define("users", {
    id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    salon_id: {type: DataTypes.INTEGER, allowNull: false},
    last_name: {type: DataTypes.STRING, allowNull: false},
    first_name: {type: DataTypes.STRING, allowNull: false},
    email: {type: DataTypes.STRING, allowNull: false},
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pwd: {type: DataTypes.STRING, allowNull: false},
    last_connection: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
  const Report = sqlServerConnection.define("reports", {
    id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    period: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    salon_id: {type: DataTypes.INTEGER, allowNull: false},
    nb_etp: {type: DataTypes.DECIMAL(18, 5), allowNull: false},
    turn_around: {type: DataTypes.DECIMAL(18, 5), allowNull: false},
  });
  return (models = {Salon, User, Report, connection: sqlServerConnection});
}
export function validateSalon(salon, cs = "post") {
  let schema = Joi.object({
    name_salon: Joi.string(),
    address: Joi.string(),
    city: Joi.string(),
    zip: Joi.string(),
    dept_id: Joi.string(),
    date_open: Joi.date(),
  });
  let required = [];
  switch (cs) {
    case "post":
      required = [
        "name_salon",
        "address",
        "city",
        "zip",
        "dept_id",
        "date_open",
      ];
      schema = schema.fork(required, (field) => field.required());
      return schema.validate(salon);
    case "get":
    case "patch":
      const subSchema = joiSubSchema(schema, Object.keys(salon));
      return subSchema
        ? subSchema.validate(salon)
        : {
            error: {
              details: [{message: "Request body contains invalid fields."}],
            },
          };
  }
}
export function validateUser(user, cs = "post") {
  const joiPassword = Joi.extend(joiPasswordExtendCore);
  let schema = Joi.object({
    salon_id: Joi.number(),
    last_name: Joi.string(),
    first_name: Joi.string(),
    email: Joi.string().email(),
    role: Joi.string().valid("employee", "manager"),
    pwd: joiPassword
      .string()
      .min(8)
      .max(60)
      .minOfSpecialCharacters(1)
      .minOfUppercase(1)
      .minOfNumeric(1)
      .noWhiteSpaces(),
    last_connection: Joi.date(),
  });
  let required = [];
  switch (cs) {
    case "post":
      required = ["salon_id", "last_name", "first_name", "email", "pwd"];
      schema = schema.fork(required, (field) => field.required());
      return schema.validate(user);
    case "get":
    case "patch":
      const subSchema = joiSubSchema(schema, Object.keys(user));
      return subSchema
        ? subSchema.validate(user)
        : {
            error: {
              details: [{message: "Request body contains invalid fields."}],
            },
          };
  }
}
export function validateReport(report, cs = "post") {
  let schema = Joi.object({
    period: Joi.date(),
    salon_id: Joi.number(),
    nb_etp: Joi.number(),
    turn_around: Joi.number(),
  });
  let required = [];
  switch (cs) {
    case "post":
      required = ["period", "salon_id", "nb_etp", "turn_around"];
      schema = schema.fork(required, (field) => field.required());
      return schema.validate(report);
    case "get":
    case "patch":
      const subSchema = joiSubSchema(schema, Object.keys(report));
      return subSchema
        ? subSchema.validate(report)
        : {
            error: {
              details: [{message: "Request body contains invalid fields."}],
            },
          };
  }
}
