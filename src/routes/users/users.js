import express from "express";
import bcrypt from "bcrypt";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels, validateUser} from "../../models/sqlServerModels.js";
import {BadRequest} from "../../models/validation/errors.js";
import {validateIntegerId} from "../../models/validation/joiUtilityFunctions.js";
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
/*BASIC*/
router.get(
  "/",
  setModels,
  routeHandler(async (req, res) => {
    const users = await User.findAll();
    res.send({
      status: "OK",
      data: users.map((user) => {
        user.pwd = undefined;
        return user;
      }),
    });
  })
);
router.get(
  "/:id",
  setModels,
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const user = await User.findByPk(id);
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    user.pwd = undefined; //does not return the password
    res.send({
      status: "OK",
      data: user,
    });
  })
);
router.post(
  "/",
  setModels,
  routeHandler(async (req, res) => {
    req.body = {
      ...req.body,
      last_name: req.body.last_name.toString().trim(),
      first_name: req.body.first_name.toString().trim(),
      email: req.body.email.toString().trim(),
      role: req.body.role ? req.body.role : "employee", //set default value
      pwd: await bcrypt.hash(req.body.pwd, environment.salt_rounds),
    };
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
router.patch(
  "/:id",
  setModels,
  routeHandler(async (req, res) => {
    const id = req.params.id;
    let error = validateIntegerId(id).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    const user = await User.findByPk(id);
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    if (req.body.salon_id) {
      const salon = await Salon.findByPk(req.body.salon_id);
      if (!salon)
        return res.send(
          new BadRequest(`Salon with id:${req.body.salon_id} not found.`)
        );
    }
    if (req.body.pwd)
      req.body.pwd = await bcrypt.hash(req.body.pwd, environment.salt_rounds);
    await user.update(req.body);
    user.pwd = undefined; //does not return the password
    res.send({
      status: "OK",
      message: `User with id:${id} successfully updated.`,
      data: user,
    });
  })
);
router.delete(
  "/:id",
  setModels,
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const user = await User.findByPk(id);
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
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
