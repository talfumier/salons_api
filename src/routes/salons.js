import express from "express";
import axios from "axios";
import {authHandler} from "../middleware/authHandler.js";
import {routeHandler} from "../middleware/routeHandler.js";
import {getModels, validateSalon} from "../models/sqlServerModels.js";
import {BadRequest, Unauthorized} from "../models/validation/errors.js";
import {validateIntegerId} from "../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let Salon = null,
  User = null,
  Report = null;
function setModels(req, res, next) {
  const models = getModels();
  Salon = models.Salon;
  User = models.User;
  Report = models.Report;
  next();
}
/*BASIC*/
router.get(
  "/",
  [authHandler, setModels],
  routeHandler(async (req, res) => {
    const salons = await Salon.findAll({where: {id: req.user.salon_id}});
    res.send({status: "OK", data: salons});
  })
);
router.get(
  "/:id",
  [authHandler, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const salon = await Salon.findByPk(id);
    if (!salon)
      return res.send(new BadRequest(`Salon with id:${id} not found.`));
    if (salon.id !== req.user.salon_id)
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to retrieve data for salon id:${id}`
        )
      );
    res.send({
      status: "OK",
      data: salon,
    });
  })
);
const checkValidDeptId = async (id) => {
  const depts = (
    await axios.get(`https://geo.api.gouv.fr/departements?code=${id}`)
  ).data;
  if (depts.length === 0)
    return [
      false,
      new BadRequest(`French department with id:${id} not found.`),
    ];
  return [true];
};
router.post(
  "/",
  [authHandler, setModels],
  routeHandler(async (req, res) => {
    console.log("xxx");
    //salon creation is only possible by a manager who has not yet declared a salon (i.e user.salon_id=-1)
    if (req.user.role !== "manager" || req.user.salon_id !== -1)
      return res.send(
        new Unauthorized(
          "Access denied.You are not authorized to create a salon."
        )
      );
    req.body = {...req.body, name_salon: req.body.name_salon.toString().trim()};
    const {error} = validateSalon(req.body, "post");
    if (error) return res.send(new BadRequest(error.details[0].message));
    const ck = await checkValidDeptId(req.body.dept_id); //check department does exist
    if (!ck[0]) return res.send(ck[1]);
    //check that salon being created does not already exist
    let salon = await Salon.findOne({
      where: {
        name_salon: req.body.name_salon,
        address: req.body.address,
        city: req.body.city,
        zip: req.body.zip,
      },
    });
    if (salon)
      return res.send(
        new BadRequest(
          `Salon with name:'${req.body.name_salon}' does already exist at the same address.`
        )
      );
    salon = await Salon.create(req.body);
    //update manager user account with the correct salon_id
    const user = await User.findByPk(req.user.id);
    await user.update({salon_id: salon.id});
    res.send({
      status: "OK",
      message: `Salon successfully created, user id:${user.id} successfully updated.`,
      data: salon,
    });
  })
);
router.patch(
  "/:id",
  [authHandler, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    let error = validateIntegerId(id).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    //only the manager can modify his own salon data
    if (req.user.role !== "manager" || req.user.salon_id !== id)
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to update salon id:${id} data.`
        )
      );
    //check department does exist
    if (req.body.dept_id) {
      const ck = await checkValidDeptId(req.body.dept_id);
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
  [authHandler, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id); //master salon id=-1 cannot be deleted
    if (error) return res.send(new BadRequest(error.details[0].message));
    //only the manager can delete his own salon
    if (req.user.role !== "manager" && req.user.salon_id !== id)
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
    let user = await User.findOne({where: {salon_id: id, role: "employee"}});
    if (report || user)
      return res.send(
        new Unauthorized(
          `salon id:${id} cannot be deleted due to related records.`
        )
      );
    //update manager user.salon_id to -1 before salon deletion
    user = await User.findByPk(req.user.id);
    await user.update({salon_id: -1});
    await salon.destroy();
    res.send({
      status: "OK",
      message: `Salon with id:${id} successfully deleted.`,
      data: salon,
    });
  })
);
export default router;
