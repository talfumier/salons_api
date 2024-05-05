import {Op} from "sequelize";
import {Unauthorized} from "../models/validation/errors.js";
import {getModels} from "../models/sqlServerModels.js";

export async function authValid(req, res, next) {
  //req.user returned from authHandler mw function since user must be authenticated
  const models = getModels();
  const Salon = models.Salon;
  const User_Salon = models.User_Salon;
  //retrieve list of salon ids where the user is authorized
  let salons = (
    await User_Salon.findAll({
      where: {userId: req.user.id, validated: {[Op.ne]: null}},
    })
  ).map((item) => {
    return item.salonId;
  });
  if (req.user.role === "admin")
    salons = (await Salon.findAll({attributes: ["id"]})).map((item) => {
      return item.id;
    }); //full admin role has access to all salons although there is no record in table users_salons
  if (salons.length === 0) {
    return res.send(
      new Unauthorized("Access denied. User is not authorized on any salon.")
    );
  }
  req.user.salons = salons; //authorized salons ids for the authenticated user
  next(); //passing req with its user properties to the next middleware function
}
