import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const setEnv = () => {
  const writeFile = fs.writeFile;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const targetPath = path.join(__dirname, "/environment.js");

  const configFile = `export const environment = {
    user: '${process.env.SALONS_DB_USER}',
    userPwd: '${process.env.SALONS_DB_USERPWD}',
    db_host:'${process.env.SALONS_DB_HOST}',
    production: true,
  };`;
  writeFile(targetPath, configFile, (err) => {
    if (err) console.error(err);
    else
      console.log(
        `Node.js environment.js file generated correctly at ${targetPath} \n`
      );
  });
};

setEnv();
