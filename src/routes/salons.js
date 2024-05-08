// @ts-check
import express from "express";
import {Op} from "sequelize";
import {authHandler} from "../middleware/authHandler.js";
import {authValid} from "../middleware/authValid.js";
import {authAdmin} from "../middleware/authAdmin.js";
import {routeHandler} from "../middleware/routeHandler.js";
import {getModels, validateSalon} from "../models/sqlServerModels.js";
import {BadRequest, Unauthorized} from "../models/validation/errors.js";
import {validateIntegerId} from "../models/validation/joiUtilityFunctions.js";
import {bodyCleanUp} from "./users/register.js";

const router = express.Router();
let Salon = null,
  Dept = null,
  User_Salon = null,
  Report = null;
function setModels(req, res, next) {
  const models = getModels();
  Salon = models.Salon;
  Dept = models.Dept;
  User_Salon = models.User_Salon;
  Report = models.Report;
  next();
}
/*BASIC*/
router.get(
  "/",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const salons = await Salon.findAll({
      where: {id: {[Op.in]: req.user.salons}},
    });
    res.send({status: "OK", data: salons});
  })
);
router.get(
  "/:id",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    if (!req.user.salons.includes(id))
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to retrieve data for salon id:${id}`
        )
      );
    const salon = await Salon.findByPk(id);
    if (!salon)
      return res.send(new BadRequest(`Salon with id:${id} not found.`));
    res.send({
      status: "OK",
      data: salon,
    });
  })
);
const checkValidDeptId = async (id) => {
  const dept = await Dept.findByPk(id);
  if (dept)
    return [
      false,
      new BadRequest(`French department with id:${id} not found.`),
    ];
  return [true];
};
router.post(
  "/",
  [authHandler, authAdmin, setModels], //salon creation is only possible by a looged-in user with admin or admin_salon role
  routeHandler(async (req, res) => {
    req.body = bodyCleanUp(req.body);
    const {error} = validateSalon(req.body, "post");
    if (error) return res.send(new BadRequest(error.details[0].message));
    const ck = await checkValidDeptId(req.body.code); //check department does exist
    if (!ck[0]) return res.send(ck[1]);
    //check that salon being created does not already exist
    let salon = await Salon.findOne({
      where: {
        name_salon: req.body.name_salon,
        address: req.body.address,
        city: req.body.city,
        zip: req.body.zip,
        code: req.body.code,
      },
    });
    if (salon)
      return res.send(
        new BadRequest(
          `Salon with name:'${req.body.name_salon}' does already exist at the same address.`
        )
      );
    salon = await Salon.create(req.body);
    //update users_salons table
    if (req.user.role === "admin_salon")
      await User_Salon.create({
        userId: req.user.id,
        salonId: salon.id,
        validated: new Date(),
      });
    res.send({
      status: "OK",
      message: `Salon successfully created${
        req.user.role === "admin_salon"
          ? ", table users_salons successfully updated"
          : ""
      }.`,
      data: salon,
    });
  })
);
router.patch(
  "/:id",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    let error = validateIntegerId(id).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    if (!req.user.salons.includes(id))
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to modify salon id:${id} data.`
        )
      );
    //check department does exist
    if (req.body.code) {
      const ck = await checkValidDeptId(req.body.code);
      if (!ck[0]) return res.send(ck[1]);
    }
    const salon = await Salon.findByPk(id);
    if (!salon)
      return res.send(new BadRequest(`Salon with id:${id} not found.`));
    error = validateSalon(req.body, "patch").error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    await salon.update(req.body);
    res.send({
      status: "OK",
      message: `Salon with id:${id} successfully updated.`,
      data: salon,
    });
  })
);
router.delete(
  "/:id",
  [authHandler, authAdmin, authValid, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    if (!req.user.salons.includes(id))
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to delete salon id:${id}.`
        )
      );
    const salon = await Salon.findByPk(id);
    if (!salon)
      return res.send(new BadRequest(`Salon with id:${id} not found.`));
    //check if related records prevent salon deletion
    const report = await Report.findOne({where: {salon_id: id}});
    if (report)
      return res.send(
        new Unauthorized(
          `salon id:${id} cannot be deleted due to related records.`
        )
      );
    await salon.destroy(); //related records in table users_salons removed by CASCADE DELETE
    res.send({
      status: "OK",
      message: `Salon with id:${id} successfully deleted.`,
      data: salon,
    });
  })
);
export default router;
