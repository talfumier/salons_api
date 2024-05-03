import express from "express";
import bcrypt from "bcrypt";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels, validateUser} from "../../models/sqlServerModels.js";
import {BadRequest} from "../../models/validation/errors.js";
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
export function userBodyCleanUp(body, cs = "post") {
  const keys = Object.keys(body);
  let role = false;
  keys.map(async (key) => {
    switch (key) {
      case "last_name":
      case "first_name":
      case "email":
        body[key] = body[key].toString().trim();
        break;
      case "role":
        role = true;
        break;
      case "pwd":
        body[key] = await bcrypt.hash(body.pwd, environment.salt_rounds);
        break;
      default:
    }
  });
  if (cs === "post" && !role) body.role = "employee"; //set default value
  return body;
}

router.post(
  "/",
  setModels,
  routeHandler(async (req, res) => {
    req.body = userBodyCleanUp(req.body);
    const salon = await Salon.findByPk(req.body.salon_id);
    if (!salon)
      return res.send(
        new BadRequest(`Salon with id:${req.body.salon_id} not found.`)
      );
    const {error} = validateUser(req.body, "post");
    if (error) return res.send(new BadRequest(error.details[0].message));
    //check that user being created does not already exist for the same salon
    let user = await User.findOne({
      where: {
        salon_id: req.body.salon_id,
        last_name: req.body.last_name,
        first_name: req.body.first_name,
      },
      attributes: {exclude: ["pwd"]},
    });
    if (user)
      return res.send(
        new BadRequest(
          `User '${user.last_name} ${user.first_name}' does already exist for this salon.`
        )
      );
    user = await User.create(req.body);
    user.pwd = undefined; //does not return the password
    res.send({
      status: "OK",
      message: `User '${user.last_name} ${user.first_name}' successfully created.`,
      data: user,
    });
  })
);
export default router;
