import {Sequelize} from "sequelize";
import express from "express";
import nodeSchedule from "node-schedule";
import {defineSqlServerModels} from "./models/sqlServerModels.js";
import config from "./config/config.json" assert {type: "json"};
import {environment} from "./config/environment.js";
import {routes} from "./routes/routes.js";
import {sendReminder} from "./cron/reminder.js";
import {generateData, initDeptRegionData} from "./models/fakeData/dataInit.js";

/*DEALING MITH MYSQL*/
const sqlServerConnection = new Sequelize(
  config.db_name,
  environment.production ? process.env.SALONS_DB_USER : environment.user,
  environment.production ? process.env.SALONS_DB_USERPWD : environment.userPwd,
  {
    dialect: "mysql",
    host: environment.production
      ? process.env.SALONS_DB_HOST
      : environment.db_host,
    logging: false,
  }
);
//define models
const sqlModels = defineSqlServerModels(sqlServerConnection);
//define relationships
sqlModels.Region.hasMany(sqlModels.Dept, {
  foreignKey: "codeRegion",
});
sqlModels.Dept.belongsTo(sqlModels.Region, {
  foreignKey: "code",
});
sqlModels.Salon.belongsTo(sqlModels.Dept, {
  foreignKey: "code",
});
sqlModels.Dept.hasMany(sqlModels.Salon, {
  foreignKey: "code",
});
sqlModels.Salon.hasMany(sqlModels.Report, {
  foreignKey: "salon_id",
});
sqlModels.Report.belongsTo(sqlModels.Salon, {
  foreignKey: "salon_id",
});

sqlModels.Salon.belongsToMany(sqlModels.User, {
  through: sqlModels.User_Salon, //CASCADE DELETE by default
});
sqlModels.User.belongsToMany(sqlModels.Salon, {
  through: sqlModels.User_Salon, //CASCADE DELETE by default
});

let flg = 0; //error flag if any
sqlServerConnection
  .authenticate()
  .then(() => {
    flg += 1; //indicates a successful connection
    console.log("[API]: successfully connected to MySQL server !");
    return sqlServerConnection.sync({alter: true}); //returned promise should sync all tables and models, alter=true means update tables where actual model definition has changed
  })
  .then(() => {
    console.log("[API]: MySQL tables and models successfully synced !");
  })
  .catch((err) => {
    // at this stage, one error has occured
    let msg = "";
    switch (flg) {
      case 0: //connection failure
        msg = "[API]: failed to connect to MySQL server !";
        break;
      case 1: //connection succeeded but sync operation has failed
        msg = "[API]: MySQL tables and models syncing failed !";
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
/*INITIALIZE DEPARTMENT/REGION DATA*/
let data = await sqlModels.Dept.findOne();
if (!data) await initDeptRegionData();
/*INITIALIZE FAKE DATA WHEN DATABASE IS EMPTY*/
data = await sqlModels.Report.findOne();
if (!data) await generateData();
/*LAUNCH CRON TASKS SCHEDULING*/
nodeSchedule.scheduleJob(
  {
    date: 5, //job scheduled every 5th day of every month at 02:00
    hour: 2,
    minute: 0,
    // second: 35,
  },
  () => {
    sendReminder();
  }
);
