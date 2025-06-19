import path from "path";
import fs from "fs";

export default function handler(req, res) {
  // Define the path to the gene data file in the public directory
  const filePath = path.join(process.cwd(), "public", "data", "gene_data.json");

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Read the file and parse it as JSON
    const fileData = fs.readFileSync(filePath, "utf-8");
    const geneData = JSON.parse(fileData);

    // Send the gene data as the response
    res.status(200).json(geneData);
  } else {
    // Return an error if the file is not found
    res.status(404).json({ message: "Gene data not found" });
  }
}
