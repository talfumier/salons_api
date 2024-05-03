import express from "express";
import bcrypt from "bcrypt";
import {authHandler} from "../../middleware/authHandler.js";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels, validateUser} from "../../models/sqlServerModels.js";
import {BadRequest, Unauthorized} from "../../models/validation/errors.js";
import {validateIntegerId} from "../../models/validation/joiUtilityFunctions.js";
import {userBodyCleanUp} from "./register.js";
import {environment} from "../../config/environment.js";

const router = express.Router();

let Salon = null,
  User = null;
function setModels(req, res, next) {
  const models = getModels();
  Salon = models.Salon;
  User = models.User;
  next();
}
router.patch(
  "/:id",
  [authHandler, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    let error = validateIntegerId(id).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    const user = await User.findByPk(id, {
      attributes: {exclude: ["pwd"]},
    });
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    if (req.user.id !== user.id) res.send(new Unauthorized("Access denied."));
    req.body = userBodyCleanUp(req.body, "patch");
    if (req.body.salon_id) {
      const salon = await Salon.findByPk(req.body.salon_id);
      if (!salon)
        return res.send(
          new BadRequest(`Salon with id:${req.body.salon_id} not found.`)
        );
    }
    if (req.body.pwd)
      req.body.pwd = await bcrypt.hash(req.body.pwd, environment.salt_rounds);
    error = validateUser(req.body, "patch").error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    await user.update(req.body);
    res.send({
      status: "OK",
      message: `User with id:${id} successfully updated.`,
      data: user,
    });
  })
);
router.delete(
  "/:id",
  [authHandler, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const user = await User.findByPk(id);
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    if (
      (req.user.role !== "manager" && req.user.id !== user.id) ||
      (req.user.role === "manager" && req.user.salon_id !== user.salon_id)
    )
      res.send(new Unauthorized("Access denied."));
    await user.destroy();
    user.pwd = undefined; //does not return the password
    res.send({
      status: "OK",
      message: `User with id:${id} successfully deleted.`,
      data: user,
    });
  })
);
export default router;
