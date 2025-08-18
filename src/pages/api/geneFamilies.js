// pages/api/geneFamilies.js
import pool from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [rows] = await pool.query(`
        SELECT 
          tf.TF_Family,
          COUNT(tf.GeneID) as Gene_Count
        FROM tf_family tf
        GROUP BY tf.TF_Family
        ORDER BY tf.TF_Family
      `);
      res.status(200).json(rows);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch gene families." });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
