// @ts-check
import express from "express";
import {authHandler} from "./../../middleware/authHandler.js";
import {authAdmin} from "../../middleware/authAdmin.js";
import {authValid} from "../../middleware/authValid.js";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels} from "../../models/sqlServerModels.js";
import {BadRequest, Unauthorized} from "../../models/validation/errors.js";
import {validateIntegerId} from "../../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let User = null,
  User_Salon = null,
  connection = null;
function setModels(req, res, next) {
  const models = getModels();
  User = models.User;
  User_Salon = models.User_Salon;
  connection = models.connection;
  next();
}

router.get(
  "/",
  [authHandler, authAdmin, authValid, setModels],
  routeHandler(async (req, res) => {
    const salons = `(${req.user.salons.join(",")})`;
    const fields = "u.last_name,u.first_name,u.email,u.role,u.last_connection";
    const sql = `SELECT ${fields} FROM salons.users u JOIN salons.users_salons su ON u.id=su.userId WHERE su.salonId IN ${salons}`;
    const users = await connection.query(sql, {
      type: connection.QueryTypes.SELECT,
    });
    res.send({
      status: "OK",
      data: users,
    });
  })
);
router.get(
  "/:id",
  [authHandler, authAdmin, authValid, setModels],
  routeHandler(async (req, res) => {
    const id = req.params.id;
    const {error} = validateIntegerId(id);
    if (error) return res.send(new BadRequest(error.details[0].message));
    let bl = false; //check admin_salon is authorized to retrieve user data
    (await User_Salon.findAll({where: {userId: id}})).map((item) => {
      if (!bl && req.user.salons.includes(item.salonId)) bl = true;
    });
    if (!bl)
      return res.send(
        new Unauthorized(
          `Access denied. You are not authorized to retrieve user id:${id} data.`
        )
      );
    const user = await User.findOne({
      where: {id},
      attributes: {exclude: ["pwd"]},
    });
    if (!user) return res.send(new BadRequest(`User with id:${id} not found.`));
    res.send({
      status: "OK",
      data: user,
    });
  })
);
export default router;
