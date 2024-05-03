import express from "express";
import axios from "axios";
import {authHandler} from "../middleware/authHandler.js";
import {routeHandler} from "../middleware/routeHandler.js";
import {getModels, validateSalon} from "../models/sqlServerModels.js";
import {BadRequest} from "../models/validation/errors.js";
import {validateIntegerId} from "../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let Salon = null;
function setModel(req, res, next) {
  Salon = getModels().Salon;
  next();
}
/*BASIC*/
router.get(
  "/",
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const salons = await Salon.findAll({where: {id: req.user.salon_id}});
    res.send({status: "OK", data: salons});
  })
);
router.get(
  "/:id",
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const salon = await Salon.findByPk(id);
    if (!salon)
      return res.send(new BadRequest(`Salon with id:${id} not found.`));
    if (salon.id !== req.user.salon_id)
      return res.send(new Unauthorized("Access denied."));
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
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    if (req.user.role !== "manager")
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
    res.send({
      status: "OK",
      message: "Salon successfully created",
      data: salon,
    });
  })
);
router.patch(
  "/:id",
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    let error = validateIntegerId(id).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
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
  [authHandler, setModel],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    if (req.user.role !== "manager" || req.user.salon_id !== id)
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to delete salon id:${id}.`
        )
      );
    const salon = await Salon.findByPk(id);
    if (!salon)
      return res.send(new BadRequest(`Salon with id:${id} not found.`));
    await salon.destroy();
    res.send({
      status: "OK",
      message: `Salon with id:${id} successfully deleted.`,
      data: salon,
    });
  })
);
export default router;
