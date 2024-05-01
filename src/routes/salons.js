import express from "express";
import {Op, col, fn, literal} from "sequelize";
import {routeHandler} from "../middleware/routeHandler.js";
import {getModels, validateSalon} from "../models/sqlServerModels.js";
import {BadRequest} from "../models/validation/errors.js";
import {validateIntegerId} from "../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let Salon = null,
  connection = null; // connection is an instance of sequelize
function setModel(req, res, next) {
  const models = getModels();
  Salon = models.Salon;
  connection = models.connection;
  next();
}
/*BASIC*/
router.get(
  "/",
  setModel,
  routeHandler(async (req, res) => {
    const salons = await Salon.findAll();
    res.send({status: "OK", data: salons});
  })
);
export default router;
