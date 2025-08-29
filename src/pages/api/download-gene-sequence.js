// pages/api/download-gene-sequence.js
import pool from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { geneId, type } = req.query;

    // Validate required parameters
    if (!geneId || !type) {
      return res.status(400).json({
        error: "Missing required parameters: geneId and type",
      });
    }

    // Validate sequence type
    if (!["cds", "protein"].includes(type.toLowerCase())) {
      return res.status(400).json({
        error: "Invalid sequence type. Must be 'cds' or 'protein'",
      });
    }

    try {
      let query;
      let fileExtension = "fasta";

      if (type.toLowerCase() === "cds") {
        // Query for CDS sequences from gene table
        query = `
          SELECT 
            g.GeneID,
            g.CDS_Sequence as sequence
          FROM gene g 
          WHERE g.GeneID = ?
        `;
      } else {
        // Query for Protein sequences from gene table
        query = `
          SELECT 
            g.GeneID,
            g.ProteinSequence as sequence
          FROM gene g 
          WHERE g.GeneID = ?
        `;
      }

      const [rows] = await pool.query(query, [geneId]);

      if (rows.length === 0) {
        return res.status(404).json({
          error: `Gene with ID '${geneId}' not found`,
        });
      }

      const gene = rows[0];

      // Check if sequence exists
      if (!gene.sequence || gene.sequence.trim() === "") {
        return res.status(404).json({
          error: `${type.toUpperCase()} sequence not available for gene ${geneId}`,
        });
      }

      // Format the sequence in FASTA format
      const fastaContent = `>${geneId}_${type.toUpperCase()}\n${
        gene.sequence
      }\n`;

      // Set response headers for file download
      const filename = `${geneId}_${type.toLowerCase()}.${fileExtension}`;
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Length", Buffer.byteLength(fastaContent, "utf8"));

      // Send the FASTA content
      res.status(200).send(fastaContent);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({
        error: "Failed to download sequence. Please try again later.",
      });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}


