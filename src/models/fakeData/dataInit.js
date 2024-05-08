import {fakerFR} from "@faker-js/faker";
import bcrypt from "bcrypt";
import axios from "axios";
import {Op} from "sequelize";
import {addMonths, format} from "date-fns";
import {getModels} from "../sqlServerModels.js";
import sNames from "./salons.json" assert {type: "json"};
import {environment} from "../../config/environment.js";

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}
function removeAccents(str, index = null) {
  if (!index) return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  else return removeAccents(str.slice(0, 1)) + str.slice(1);
}
function createUser(id, role) {
  const last_name = removeAccents(fakerFR.person.lastName(), 1),
    first_name = removeAccents(fakerFR.person.firstName(), 1);
  return {
    id,
    last_name,
    first_name,
    email: fakerFR.internet.email({
      firstName: first_name,
      lastName: last_name,
    }),
    role,
    pwd: `${first_name.slice(0, 1).toUpperCase()}${last_name
      .slice(0, 1)
      .toLowerCase()}12345$`,
  };
}
function getMonthlyTA(fte) {
  let result = 0;
  for (let i = 0; i <= fte; i += 0.1)
    result += 0.1 * getRandomNumber(5000, 10000); //monthly turn-around per fte
  return result.toFixed(2);
}
export async function initDeptRegionData() {
  const models = getModels();
  const Dept = models.Dept,
    Region = models.Region;
  let data = await axios.get("https://geo.api.gouv.fr/regions");
  await Region.bulkCreate(data.data);
  data = await axios.get("https://geo.api.gouv.fr/departements");
  await Dept.bulkCreate(data.data);
  console.log("[API]: Departments/regions data successfully initialized.");
}
export async function generateData() {
  const users = {admin_salon: [], user_salon: []},
    users_salons = [],
    reports = [],
    period_nte = format(new Date(), "yyyy-MM");
  let city = null,
    j = 0,
    nu = 1,
    date = null,
    fte = null,
    period = null;
  const res = await axios.get(
    `https://geo.api.gouv.fr/communes?fields=codesPostaux,codeDepartement,codeRegion`
  );
  const salons = sNames.names.map((name, ns) => {
    city = getRandomItem(res.data);
    // create a 'admin_salon' user for each salon
    date = fakerFR.date.between({from: "2023-09", to: "2024-04-30"});
    users.admin_salon.push(createUser(nu, "admin_salon"));
    users_salons.push({userId: nu, salonId: ns + 1, validated: date}); //add (userId, salonId) in many to many table
    nu += 1;
    //create a random number (between 0 and 5) of 'user_salon' user for each salon
    fte = getRandomItem(Array.from(Array(5), (x, i) => i + 1)); //full time equivalent
    for (j = 0; j <= fte; j++) {
      users.user_salon.push(createUser(nu, "user_salon"));
      users_salons.push({userId: nu, salonId: ns + 1, validated: date}); //add (userId, salonId) in many to many table
      nu += 1;
    }
    //create reports data
    period = format(date, "yyyy-MM");
    while (period < period_nte) {
      reports.push({
        period,
        salon_id: ns + 1,
        fte,
        turn_around: getMonthlyTA(fte),
      });
      period = format(addMonths(period, 1), "yyyy-MM");
    }
    //return salon data and populates salons array
    return {
      id: ns + 1,
      name_salon: name,
      address: fakerFR.location.streetAddress(),
      city: city.nom,
      zip: getRandomItem(city.codesPostaux),
      code: city.codeDepartement,
      date_open: date,
    };
  });
  users.admin_salon = await hashPwd(users.admin_salon);
  users.user_salon = await hashPwd(users.user_salon);
  await uploadDataInDb(users, salons, users_salons, reports);
}
async function uploadDataInDb(users, salons, users_salons, reports) {
  const models = getModels();
  const Salon = models.Salon,
    User = models.User,
    User_Salon = models.User_Salon,
    Report = models.Report;

  await Report.destroy({where: {id: {[Op.gt]: 0}}});
  await Salon.destroy({where: {id: {[Op.gt]: 0}}});
  await User.destroy({where: {role: {[Op.ne]: "admin"}}}); //do not delete full admin

  await User.bulkCreate(users.admin_salon);
  await User.bulkCreate(users.user_salon);
  await Salon.bulkCreate(salons);
  await User_Salon.bulkCreate(users_salons);
  await Report.bulkCreate(reports);

  console.log("[API]: Fake data successfully initialized.");
}
async function hashPwd(users) {
  users = await Promise.all(
    users.map(async (user) => {
      return {
        ...user,
        pwd: await bcrypt.hash(user.pwd, environment.salt_rounds),
      };
    })
  );
  return users;
}
