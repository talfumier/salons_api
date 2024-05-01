import express from "express";
import {format} from "date-fns";
import {routeHandler} from "../middleware/routeHandler.js";
import {getModels, validateReport} from "../models/sqlServerModels.js";
import {BadRequest} from "../models/validation/errors.js";
import {validateIntegerId} from "../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let Salon = null,
  Report = null;
function setModels(req, res, next) {
  const models = getModels();
  Salon = models.Salon;
  Report = models.Report;
  next();
}
/*BASIC*/
router.get(
  "/",
  setModels,
  routeHandler(async (req, res) => {
    const reports = await Report.findAll();
    res.send({status: "OK", data: reports});
  })
);
router.get(
  "/:id",
  setModels,
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const report = await Report.findByPk(id);
    if (!report)
      return res.send(new BadRequest(`Report with id:${id} not found.`));
    res.send({
      status: "OK",
      data: report,
    });
  })
);
router.post(
  "/",
  setModels,
  routeHandler(async (req, res) => {
    const {error} = validateReport(req.body, "post");
    if (error) return res.send(new BadRequest(error.details[0].message));
    req.body.period = format(req.body.period, "yyyy-MM");
    //check that report being created does not already exist for the same salon and same period
    let report = await Report.findOne({
      where: {
        salon_id: req.body.salon_id,
        period: req.body.period,
      },
    });
    if (report)
      return res.send(
        new BadRequest(
          `Report with id:'${report.id}' does already exist for the period ${req.body.period}.`
        )
      );
    const salon = await Salon.findByPk(req.body.salon_id);
    if (!salon)
      return res.send(
        new BadRequest(`Salon with id:${req.body.salon_id} not found.`)
      );
    report = await Report.create(req.body);
    res.send({
      status: "OK",
      message: `Report successfully created for the period ${req.body.period}.`,
      data: report,
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
    const report = await Report.findByPk(id);
    if (!report)
      return res.send(new BadRequest(`Report with id:${id} not found.`));
    if (req.body.salon_id) {
      const salon = await Salon.findByPk(req.body.salon_id);
      if (!salon)
        return res.send(
          new BadRequest(`Salon with id:${req.body.salon_id} not found.`)
        );
    }
    await report.update(req.body);
    res.send({
      status: "OK",
      message: `Report with id:${id} successfully updated.`,
      data: report,
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
    const report = await Report.findByPk(id);
    if (!report)
      return res.send(new BadRequest(`Report with id:${id} not found.`));
    await report.destroy();
    res.send({
      status: "OK",
      message: `Report with id:${id} successfully deleted.`,
      data: report,
    });
  })
);
export default router;
