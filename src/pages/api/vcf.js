import fs from "fs";
import path from "path";
import VCF from "vcf"; // This package helps us parse the VCF file

export default async function handler(req, res) {
  try {
    // Define the path to the VCF file
    const vcfFilePath = path.resolve("public/data", "30miss.ann.vcf");

    // Read the VCF file content
    const vcfData = fs.readFileSync(vcfFilePath, "utf-8");

    // Initialize the VCF parser
    const vcfParser = new VCF();

    // Parse the VCF data
    vcfParser.parse(vcfData, function (err, records) {
      if (err) {
        return res.status(500).json({ error: "Error parsing VCF file" });
      }

      // Map the VCF records to a structured format
      const parsedData = records.map((record) => ({
        chromosome: record.CHROM,
        position: record.POS,
        geneId: record.ID,
        reference: record.REF,
      }));

      // Return the parsed data as JSON response
      res.status(200).json(parsedData);
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Server error while processing the VCF file" });
  }
}
