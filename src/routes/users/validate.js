// @ts-check
import express from "express";
import {authHandler} from "../../middleware/authHandler.js";
import {authAdmin} from "../../middleware/authAdmin.js";
import {routeHandler} from "../../middleware/routeHandler.js";
import {getModels} from "../../models/sqlServerModels.js";
import {BadRequest, Unauthorized} from "../../models/validation/errors.js";
import {validateIntegerId} from "../../models/validation/joiUtilityFunctions.js";

const router = express.Router();

let User_Salon = null;
function setModel(req, res, next) {
  User_Salon = getModels().User_Salon;
  next();
}
router.get(
  "/:userId/:salonId", // user.id to be validated for a given salon.id
  [authHandler, authAdmin, setModel], //only an admin can validate a user
  routeHandler(async (req, res) => {
    const userId = req.params.userId;
    let error = validateIntegerId(userId).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    const salonId = req.params.salonId;
    error = validateIntegerId(salonId).error;
    if (error) return res.send(new BadRequest(error.details[0].message));
    //check if admin is authorized for the given salonId
    const admin_salon_id = await User_Salon.findOne({
      where: {userId: req.user.id, salonId},
      attributes: ["salonId"],
    });
    if (!admin_salon_id || admin_salon_id.salonId != salonId)
      return res.send(
        new Unauthorized(
          `You are not authorized to validate a user on salon id:${salonId}`
        )
      );
    await User_Salon.update(
      {validated: new Date()},
      {
        where: {userId, salonId},
      }
    );
    res.send({
      status: "OK",
      message: `User with id:${userId} successfully validated on salon id:${salonId}.`,
      data: "",
    });
  })
);
export default router;
