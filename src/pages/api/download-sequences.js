// pages/api/download-sequences.js
import pool from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { family, type } = req.query;

    if (!family || !type) {
      return res.status(400).json({
        error: "Both 'family' and 'type' parameters are required",
      });
    }

    if (!["cds", "protein"].includes(type.toLowerCase())) {
      return res.status(400).json({
        error: "Type must be either 'cds' or 'protein'",
      });
    }

    try {
      // Get genes for the specified family with their sequences
      const sequenceColumn =
        type.toLowerCase() === "cds" ? "CDS_Sequence" : "ProteinSequence";

      const [rows] = await pool.query(
        `
        SELECT 
          g.GeneID,
          g.${sequenceColumn} as sequence
        FROM gene g
        INNER JOIN tf_family tf ON g.GeneID = tf.GeneID
        WHERE tf.TF_Family = ?
        AND g.${sequenceColumn} IS NOT NULL
        AND g.${sequenceColumn} != ''
        ORDER BY g.GeneID
      `,
        [family]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: `No ${type} sequences found for family: ${family}`,
        });
      }

      // Generate FASTA content
      let fastaContent = "";
      rows.forEach((row) => {
        fastaContent += `>${row.GeneID}\n`;
        fastaContent += `${row.sequence}\n`;
      });

      // Set headers for file download
      const fileName = `${family}_${type}_sequences.fasta`;
      res.setHeader("Content-Type", "text/plain");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );

      res.status(200).send(fastaContent);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({
        error: `Failed to fetch ${type} sequences for family: ${family}`,
      });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
