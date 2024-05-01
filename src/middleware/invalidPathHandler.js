import {BadRequest} from "../models/validation/errors.js";

export function invalidPathHandler(req, res, next) {
  res.send(new BadRequest("Invalid path"));
}
