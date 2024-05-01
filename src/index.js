import {Sequelize} from "sequelize";
import express from "express";
import {defineSqlServerModels} from "./models/sqlServerModels.js";
import config from "./config/config.json" assert {type: "json"};
import {environment} from "./config/environment.js";
import {routes} from "./routes/routes.js";

/*DEALING MITH MS SQL SERVER*/
const sqlServerConnection = new Sequelize(
  config.db_name,
  environment.production ? process.env.SALONS_DB_USER : environment.user,
  environment.production ? process.env.SALONS_DB_USERPWD : environment.userPwd,
  {
    dialect: "mssql",
    host: environment.production
      ? process.env.SALONS_DB_HOST
      : environment.db_host,
    logging: false,
  }
);
//define models
const sqlModels = defineSqlServerModels(sqlServerConnection);
//define relationships
sqlModels.Report.belongsTo(sqlModels.Salon, {
  foreignKey: "salon_id",
});
sqlModels.Salon.hasMany(sqlModels.Report, {
  foreignKey: "salon_id",
});
sqlModels.User.belongsTo(sqlModels.Salon, {
  foreignKey: "salon_id",
});
sqlModels.Salon.hasMany(sqlModels.User, {
  foreignKey: "salon_id",
});

let flg = 0; //error flag if any
sqlServerConnection
  .authenticate()
  .then(() => {
    flg += 1; //indicates a successful connection
    console.log("[API]: successfully connected to MS SQL Server !");
    return sqlServerConnection.sync({alter: true}); //returned promise should sync all tables and models, alter=true means update tables where actual model definition has changed
  })
  .then(() => {
    console.log("[API]: SqlServer tables and models successfully synced !");
  })
  .catch((err) => {
    // at this stage, one error has occured
    let msg = "";
    switch (flg) {
      case 0: //connection failure
        msg = "[API]: failed to connect to MS SQL Server !";
        break;
      case 1: //connection succeeded but sync operation has failed
        msg = "[API]: SqlServer tables and models syncing failed !";
    }
    console.log(msg, err.message);
  });
/*DEALING WITH EXPRESS*/
const app = express();
routes(app); //request pipeline including error handling

const port = process.env.PORT || 8000;
app.listen(port, () => {
  return console.log(
    `[API]: ${
      environment.production ? "production" : "development"
    } server is listening on port ${port} 🚀`
  );
});
