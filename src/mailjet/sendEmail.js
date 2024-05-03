import Mailjet from "node-mailjet";
import environment from "../config/environment.js";

const mailjet = new Mailjet({
  apiKey: environment.mail_jet_api_key,
  apiSecret: environment.mail_jet_api_secret,
});

export const sendBasicEmail = (
  recipient,
  subject,
  htmlPart,
  source,
  callback = null
) => {
  mailjet
    .post("send", {version: "v3.1"})
    .request({
      Messages: [
        {
          From: {
            Email: "noreply@salons_api.com",
            Name: "messagerie salons_api",
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
      console.log({success: true, email: recipient, source});
      if (callback) callback();
    })
    .catch((error) => {
      console.log({success: false, email: recipient, source, error});
      if (callback) callback(error);
    });
};
