import {DataTypes} from "sequelize";
import Joi from "joi";
import {joiPasswordExtendCore} from "joi-password";
import {joiSubSchema} from "./validation/joiUtilityFunctions.js";

let models = {
  Salon: null,
  Dept: null,
  Region: null,
  User: null,
  User_Salon: null,
  Report: null,
  connection: null,
};
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
    code: {type: DataTypes.STRING, allowNull: false},
    date_open: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.DATE.NOW,
    },
  });
  const Dept = sqlServerConnection.define("depts", {
    code: {type: DataTypes.STRING, primaryKey: true},
    nom: {type: DataTypes.STRING, allowNull: false},
    codeRegion: {type: DataTypes.STRING, allowNull: false},
  });
  const Region = sqlServerConnection.define("regions", {
    code: {type: DataTypes.STRING, primaryKey: true},
    nom: {type: DataTypes.STRING, allowNull: false},
  });
  const User = sqlServerConnection.define("users", {
    id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
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
  const User_Salon = sqlServerConnection.define("users_salons", {
    validated: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  });
  const Report = sqlServerConnection.define("reports", {
    id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
    period: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    salon_id: {type: DataTypes.INTEGER, allowNull: false},
    fte: {type: DataTypes.DECIMAL(18, 5), allowNull: false},
    turn_around: {type: DataTypes.DECIMAL(18, 5), allowNull: false},
  });
  return (models = {
    Salon,
    Dept,
    Region,
    User,
    User_Salon,
    Report,
    connection: sqlServerConnection,
  });
}
export function validateSalon(salon, cs = "post") {
  let schema = Joi.object({
    name_salon: Joi.string(),
    address: Joi.string(),
    city: Joi.string(),
    zip: Joi.string(),
    code: Joi.string(),
    date_open: Joi.date(),
  });
  let required = [];
  switch (cs) {
    case "post":
      required = ["name_salon", "address", "city", "zip", "code", "date_open"];
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
    last_name: Joi.string(),
    first_name: Joi.string(),
    email: Joi.string().email(),
    role: Joi.string().valid("admin", "admin_salon", "user_salon"),
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
      required = ["last_name", "first_name", "email", "role", "pwd"];
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
    fte: Joi.number(),
    turn_around: Joi.number(),
  });
  let required = [];
  switch (cs) {
    case "post":
      required = ["period", "salon_id", "fte", "turn_around"];
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
