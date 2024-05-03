import express from "express";
import {authHandler} from "./../../middleware/authHandler.js";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels} from "../../models/sqlServerModels.js";
import {BadRequest} from "../../models/validation/errors.js";
import {validateIntegerId} from "../../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let User = null;
function setModel(req, res, next) {
  User = getModels().User;
  next();
}

router.get(
  "/",
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const users = await User.findAll({
      where: {salon_id: req.user.salon_id},
      attributes: {exclude: ["pwd"]},
    });
    res.send({
      status: "OK",
      data: users,
    });
  })
);
router.get(
  "/:id",
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const user = await User.findOne({
      where: {id, salon_id: req.user.salon_id},
      attributes: {exclude: ["pwd"]},
    });
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    res.send({
      status: "OK",
      data: user,
    });
  })
);
export default router;
