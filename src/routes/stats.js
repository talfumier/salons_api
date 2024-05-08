// @ts-check
import express from "express";
import {authHandler} from "../middleware/authHandler.js";
import {authValid} from "../middleware/authValid.js";
import {routeHandler} from "../middleware/routeHandler.js";
import {getModels} from "../models/sqlServerModels.js";

const router = express.Router();
let connection = null;
function setModels(req, res, next) {
  connection = getModels().connection;
  next();
}
router.get(
  "/raw/salon",
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
  "/dept/all",
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
  "/region/all",
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
