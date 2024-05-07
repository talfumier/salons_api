// @ts-check
import express from "express";
import bcrypt from "bcrypt";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels, validateUser} from "../../models/sqlServerModels.js";
import {BadRequest} from "../../models/validation/errors.js";
import {sendBasicEmail} from "../../mailjet/sendEmail.js";
import {environment} from "../../config/environment.js";

const router = express.Router();

let Salon = null,
  User = null,
  User_Salon = null,
  connection = null;
function setModels(req, res, next) {
  const models = getModels();
  Salon = models.Salon;
  User = models.User;
  User_Salon = models.User_Salon;
  connection = models.connection;
  next();
}
export function bodyCleanUp(body) {
  const keys = Object.keys(body);
  keys.map((key) => {
    switch (key) {
      case "last_name":
      case "first_name":
      case "role":
      case "name_salon":
      case "address":
      case "city":
      case "zip":
      case "dept_id":
      case "email":
        body[key] = body[key].toString().trim();
        break;
      default:
    }
  });
  return body;
}

router.post(
  "/",
  setModels,
  routeHandler(async (req, res) => {
    req.body = bodyCleanUp(req.body);
    if (req.body.role && req.body.role === "admin")
      return res.send(
        new BadRequest(
          `User ${req.body.email} with admin privilege cannot be created through the API.`
        )
      );
    req.body.role = req.body.salon_id ? "user_salon" : "admin_salon";
    const {salon_id, ...body} = req.body;
    const {error} = validateUser(body, "post");
    if (error) return res.send(new BadRequest(error.details[0].message));
    let user = null;
    //check that user being created does not already exist
    user = await User.findOne({
      where: {
        email: req.body.email,
      },
    });
    if (user)
      return res.send(
        new BadRequest(`User ${user.email} is already registered.`)
      );
    let salon = null;
    if (req.body.salon_id) {
      //user_salon case > check salon does exist
      salon = await Salon.findByPk(req.body.salon_id);
      if (!salon)
        return res.send(
          new BadRequest(`Salon with id:${req.body.salon_id} not found.`)
        );
    }
    user = await User.create({
      ...body,
      pwd: await bcrypt.hash(body.pwd, environment.salt_rounds),
    });
    user.pwd = undefined; //does not return the password
    sendBasicEmail(
      user.email,
      "salons_api: nouvel utilisateur enregistré",
      `<b>${user.email}</b> avec le rôle '${user.role}' a été enregistré avec succès.`
    );
    //user_salon case
    if (req.body.salon_id) {
      await User_Salon.create({userId: user.id, salonId: req.body.salon_id}); //update table users_salons > validated=null by default
      //alert admin_salon that there is a new user_salon that needs to be validated
      const sql = `SELECT DISTINCT salons.users.email FROM salons.users JOIN salons.users_salons 
      ON salons.users.id=salons.users_salons.userId 
      WHERE salons.users.role='admin_salon' GROUP BY salons.users.email;`;
      const email = (
        await connection.query(sql, {
          type: connection.QueryTypes.SELECT,
        })
      )[0].email;
      sendBasicEmail(
        email,
        "salons_api: validation requise",
        `<b>${user.email}</b> (id:${user.id}) avec le rôle '${user.role}' attend votre validation pour le salon '${salon.name_salon}'.`
      );
    }
    res.send({
      status: "OK",
      message: `User '${user.last_name} ${user.first_name}' with role '${user.role}' successfully registered.`,
      data: user,
    });
  })
);
export default router;
