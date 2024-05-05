import Mailjet from "node-mailjet";
import {environment} from "../config/environment.js";

const mailjet = new Mailjet({
  apiKey: environment.mail_jet_api_key,
  apiSecret: environment.mail_jet_api_secret,
});

export const sendBasicEmail = (
  recipient,
  subject,
  htmlPart,
  callback = null
) => {
  mailjet
    .post("send", {version: "v3.1"})
    .request({
      Messages: [
        {
          From: {
            Email: environment.mail_jet_sender,
            Name: "salons_api mailbox: do not reply",
          },
          To: [
            {
              Email: recipient,
              Name: recipient,
            },
          ],
          Subject: subject,
          HTMLPart: htmlPart,
        },
      ],
    })
    .then((resolved) => {
      console.log({success: true, email: recipient});
      if (callback) callback();
    })
    .catch((error) => {
      console.log({success: false, email: recipient, error});
      if (callback) callback(error);
    });
};
