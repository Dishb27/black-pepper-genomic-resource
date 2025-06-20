// pages/api/checkFiles.js
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const caPath = path.join(process.cwd(), "lib", "ca.pem");
  const dbPath = path.join(process.cwd(), "lib", "db.js");
  const caExists = fs.existsSync(caPath);
  const dbExists = fs.existsSync(dbPath);

  res.status(200).json({ caExists, dbExists });
}
