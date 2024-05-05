// @ts-check
import {Unauthorized} from "../models/validation/errors.js";

export function authAdmin(req, res, next) {
  //req.user returned from authHandler mw function since user must be authenticated
  if (!req.user.role.includes("admin")) {
    return res.send(
      new Unauthorized("Access denied. User must have admin privilege.")
    );
  }
  next(); //passing req with its user properties to the next middleware function
}
