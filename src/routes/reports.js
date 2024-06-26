// @ts-check
import express from "express";
import {Op} from "sequelize";
import {format} from "date-fns";
import {authHandler} from "../middleware/authHandler.js";
import {authValid} from "../middleware/authValid.js";
import {routeHandler} from "../middleware/routeHandler.js";
import {getModels, validateReport} from "../models/sqlServerModels.js";
import {BadRequest, Unauthorized} from "../models/validation/errors.js";
import {validateIntegerId} from "../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let Salon = null,
  Report = null,
  connection = null;
function setModels(req, res, next) {
  const models = getModels();
  Salon = models.Salon;
  Report = models.Report;
  connection = models.connection;
  next();
}
/*BASIC*/
router.get(
  "/",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const reports = await Report.findAll({
      where: {salon_id: {[Op.in]: req.user.salons}},
    });
    res.send({status: "OK", data: reports});
  })
);
router.get(
  "/:id",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const report = await Report.findByPk(id);
    if (!report)
      return res.send(new BadRequest(`Report with id:${id} not found.`));
    if (!req.user.salons.includes(report.salon.id))
      return res.send(new Unauthorized("Access denied."));
    res.send({
      status: "OK",
      data: report,
    });
  })
);
router.post(
  "/input",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const {error} = validateReport(req.body, "post");
    if (error) return res.send(new BadRequest(error.details[0].message));
    req.body.period = format(req.body.period, "yyyy-MM");
    if (!req.user.salons.includes(req.body.salon_id))
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to create a report for salon id:${req.body.salon_id}`
        )
      );
    const salon = await Salon.findByPk(req.body.salon_id);
    if (!salon)
      return res.send(
        new BadRequest(`Salon with id:${req.body.salon_id} not found.`)
      );
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
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    let error = validateIntegerId(id).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    const report = await Report.findByPk(id);
    if (!report)
      return res.send(new BadRequest(`Report with id:${id} not found.`));
    if (!req.user.salons.includes(report.salon.id))
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to update any report for salon id:${report.salon.id}`
        )
      );
    if (req.body.salon_id && req.body.salon_id !== report.salon_id)
      return res.send(new BadRequest(`salon_id cannot be updated.`));
    error = validateReport(req.body, "patch").error;
    if (error) return res.send(new BadRequest(error.details[0].message));
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
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    const report = await Report.findByPk(id);
    if (!report)
      return res.send(new BadRequest(`Report with id:${id} not found.`));
    if (!req.user.salons.includes(report.salon.id))
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to delete report id:${report.id}`
        )
      );
    await report.destroy();
    res.send({
      status: "OK",
      message: `Report with id:${id} successfully deleted.`,
      data: report,
    });
  })
);
/*STATISTICS*/
router.get(
  "/stats/raw/salon",
  [authHandler, authValid, setModels], //raw data provided i.a.w logged-in user authorized salon(s)
  routeHandler(async (req, res) => {
    const sql = `SELECT s.id,s.name_salon,s.city,s.code AS code_dept,d.nom AS dept,reg.nom AS region,DATE_FORMAT(s.date_open,'%Y-%m-%d') AS date_open,
      rpt.period,ROUND(rpt.fte,2) AS fte,ROUND(rpt.turn_around,2) AS 'turn-around',ROUND(rpt.turn_around/rpt.fte,0) AS 'turn-around/fte'
      FROM salons.salons s 
      JOIN salons.reports rpt ON s.id=rpt.salon_id
      JOIN salons.depts d ON s.code=d.code
      JOIN salons.regions reg ON reg.code=d.codeRegion
      WHERE s.id IN(${req.user.salons})`;
    const data = await connection.query(sql);
    res.send({status: "OK", data});
  })
);
router.get(
  "/stats/dept/all",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const sql = `SELECT  MAX(s.code) AS code_dept,MAX(d.nom) AS dept,MAX(reg.nom) AS region,COUNT(DISTINCT s.id) AS 'total-salons',
      ROUND(AVG(rpt.fte),2) AS 'avg-fte',SUM(ROUND(rpt.turn_around,2)) AS 'sum turn-around',COUNT(rpt.period) AS 'total-monthly-reports',
      ROUND(SUM(rpt.turn_around)/(AVG(rpt.fte)*COUNT(rpt.period)),0) AS 'avg-monthly-turn-around/fte'
      FROM salons.salons s 
      JOIN salons.reports rpt ON s.id=rpt.salon_id
      JOIN salons.depts d ON s.code=d.code
      JOIN salons.regions reg ON reg.code=d.codeRegion
      GROUP BY s.code`;
    const data = await connection.query(sql);
    res.send({status: "OK", data});
  })
);
router.get(
  "/stats/region/all",
  [authHandler, authValid, setModels],
  routeHandler(async (req, res) => {
    const sql = `SELECT  MAX(reg.nom) AS region,COUNT(DISTINCT s.id) AS 'total-salons',LEFT(rpt.period,4) AS year,
      ROUND(AVG(rpt.fte),2) AS 'avg-fte',SUM(ROUND(rpt.turn_around,2)) AS 'sum turn-around',COUNT(rpt.period) AS 'total-monthly-reports'
      FROM salons.salons s 
      JOIN salons.reports rpt ON s.id=rpt.salon_id
      JOIN salons.depts d ON s.code=d.code
      JOIN salons.regions reg ON reg.code=d.codeRegion
      GROUP BY reg.nom,LEFT(rpt.period,4)`;
    const data = await connection.query(sql);
    res.send({status: "OK", data});
  })
);
export default router;
