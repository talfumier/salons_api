import express from "express";
import {errorHandler} from "../middleware/errorHandler.js";
import {invalidPathHandler} from "../middleware/invalidPathHandler.js";
import salons from "./salons.js";
import reports from "./reports.js";
import users from "./users/users.js";
import register from "./users/register.js";
import profile from "./users/profile.js";
import login from "./users/login.js";

export function routes(app) {
  app.use(express.json()); //express built-in middleware applies to any route

  app.use("/api/salons", salons);
  app.use("/api/reports", reports);
  app.use("/api/register", register);
  app.use("/api/login", login);
  app.use("/api/profile", profile);
  app.use("/api/users", users);

  app.use(errorHandler); //custom error handler middleware > function signature : function (err,req,res,next)
  app.use(invalidPathHandler); //invalid path handler middleware > eventually triggerered when none of the routes matches
}
