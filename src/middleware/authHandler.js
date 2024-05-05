// @ts-check
import jwt from "jsonwebtoken";
import {environment} from "../config/environment.js";
import {Unauthorized} from "../models/validation/errors.js";

export function authHandler(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token)
    return res.send(new Unauthorized("Access denied. No token provided."));
  try {
    const decoded = jwt.verify(token, environment.sha256);
    req.user = decoded;
    next(); //passing req with its user properties to the next middleware function
  } catch (err) {
    console.log("Invalid token in authHandler.js", err);
    return res.send(
      new Unauthorized("Invalid token - User has been disconnected !")
    );
  }
}
