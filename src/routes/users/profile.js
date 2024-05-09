// @ts-check
import express from "express";
import bcrypt from "bcrypt";
import {authHandler} from "../../middleware/authHandler.js";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels, validateUser} from "../../models/sqlServerModels.js";
import {BadRequest, Unauthorized} from "../../models/validation/errors.js";
import {bodyCleanUp} from "./register.js";
import {environment} from "../../config/environment.js";

const router = express.Router();

let User = null;
function setModel(req, res, next) {
  User = getModels().User;
  next();
}
router.patch(
  "/",
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const id = req.user.id;
    const user = await User.findByPk(id, {
      attributes: {exclude: ["pwd"]},
    });
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    req.body = bodyCleanUp(req.body);
    const error = validateUser(req.body, "patch").error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    if (req.body.role && req.body.role === "admin")
      return res.send(
        new Unauthorized("admin account cannot be modified through the API.")
      );
    if (req.body.pwd)
      req.body.pwd = await bcrypt.hash(req.body.pwd, environment.salt_rounds);
    await user.update(req.body);
    res.send({
      status: "OK",
      message: `User with id:${id} successfully updated.`,
      data: user,
    });
  })
);
router.delete(
  "/",
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const id = req.user.id;
    const user = await User.findByPk(id);
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    if (user.role === "admin")
      return res.send(
        new Unauthorized("admin account cannot be deleted through the API.")
      );
    await user.destroy(); //any related record in table users_salons will be removed by CASCADE DELETE
    user.pwd = undefined; //does not return the password
    res.send({
      status: "OK",
      message: `User with id:${id} successfully deleted.`,
      data: user,
    });
  })
);
export default router;
