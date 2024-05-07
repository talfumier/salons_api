import {format} from "date-fns";
import {getModels} from "../models/sqlServerModels.js";
import {sendBasicEmail} from "../mailjet/sendEmail.js";

export async function sendReminder() {
  const models = getModels();
  const User = models.User,
    Salon = models.Salon,
    User_Salon = models.User_Salon,
    Report = models.Report,
    connection = models.connection;
  //salons to be reminded
  const period = format(new Date(), "yyyy-MM");
  let sql = `SELECT max(s.id) as salonId FROM salons.salons s 
  LEFT JOIN salons.reports r ON s.id=r.salon_id 
  GROUP BY s.id HAVING (max(r.period) IS NULL or max(r.period) NOT LIKE '${period}')`;
  const salons_tbr = (
    await connection.query(sql, {
      type: connection.QueryTypes.SELECT,
    })
  ).map((item) => {
    return item.salonId;
  });
  //admin_salon users to be reminded
  sql = `SELECT u.email,u.role,s.id,s.name_salon from salons.users u 
  JOIN salons.users_salons us on u.id=us.userId 
  JOIN salons.salons s on s.id=us.salonId 
  WHERE (u.role='admin_salon' AND s.id IN (${salons_tbr.join(",")}))`;
  //send reminder by email
  (
    await connection.query(sql, {
      type: connection.QueryTypes.SELECT,
    })
  ).map((item) => {
    sendBasicEmail(
      item.email,
      `Salon ${item.name_salon}: CA ${period}`,
      `Merci de bien vouloir saisir le chiffre d'affaire du salon ${item.name_salon} pour la période ${period}.`
    );
  });
}
