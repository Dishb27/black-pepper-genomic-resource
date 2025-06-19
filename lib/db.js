// lib/db.js 
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// Resolve full path to ca.pem
const caPath = process.env.DB_SSL_CA_PATH
  ? path.join(process.cwd(), process.env.DB_SSL_CA_PATH)
  : null;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(caPath),
  },
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
