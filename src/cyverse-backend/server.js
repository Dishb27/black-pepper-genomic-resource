const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { parseStringPromise } = require("xml2js");
const { v4: uuidv4 } = require("uuid");
const os = require("os");

const app = express();
const PORT = 8080;

// Middleware
app.use(cors()); // Allow requests from Vercel
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({
  dest: "/tmp/uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Database configurations for CyVerse
const DB_BASE_PATH = "/data/black_pepper_blast_db";

const DATABASES = {
  Piper_nigrum_genome_db: {
    path: `${DB_BASE_PATH}/Piper_nigrum_genome_db`,
    type: "nucleotide",
  },
  Piper_nigrum_cds_db: {
    path: `${DB_BASE_PATH}/Piper_nigrum_cds_db`,
    type: "nucleotide",
  },
  Piper_nigrum_prot_db: {
    path: `${DB_BASE_PATH}/Piper_nigrum_prot_db`,
    type: "protein",
  },
};

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Black Pepper BLAST API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// List available databases
app.get("/databases", (req, res) => {
  const availableDbs = {};

  for (const [dbName, dbInfo] of Object.entries(DATABASES)) {
    const dbPath = dbInfo.path;
    let exists = false;

    if (dbInfo.type === "nucleotide") {
      exists = fs.existsSync(`${dbPath}.nin`);
    } else {
      exists = fs.existsSync(`${dbPath}.pin`);
    }

    availableDbs[dbName] = {
      type: dbInfo.type,
      available: exists,
      path: dbPath,
    };
  }

  res.json(availableDbs);
});

// BLAST endpoint - keeping the same structure as your original API
app.post("/blast", upload.single("file"), async (req, res) => {
  try {
    const {
      sequence,
      program,
      database,
      numDescriptions = 5,
      numAlignments = 5,
      eValue = "1e-2",
    } = req.body;

    // Input validation (same as your original)
    if (!program || !database) {
      return res.status(400).json({
        error:
          "Missing required parameters: program and database must be specified",
      });
    }

    if (!sequence && !req.file) {
      return res.status(400).json({
        error:
          "No sequence provided. Please provide a sequence or upload a file",
      });
    }

    // Validate program type
    const validPrograms = ["blastn", "blastp"];
    if (!validPrograms.includes(program)) {
      return res.status(400).json({
        error: "Invalid BLAST program. Please use blastn or blastp",
      });
    }

    // Validate database
    if (!DATABASES[database]) {
      return res.status(400).json({
        error: "Invalid database selected",
      });
    }

    // Check program-database compatibility
    const compatibilityCheck = checkProgramDatabaseCompatibility(
      program,
      database
    );
    if (!compatibilityCheck.valid) {
      return res.status(400).json({
        error: compatibilityCheck.message,
      });
    }

    // Get sequence content
    let sequenceContent = sequence;
    if (req.file) {
      try {
        sequenceContent = fs.readFileSync(req.file.path, "utf8");
      } catch (error) {
        console.error("File read error:", error); // <--- use it here
        return res.status(400).json({
          error: "Failed to read uploaded file",
        });
      }
    }

    // Validate sequence compatibility
    const sequenceTypeCheck = checkSequenceTypeCompatibility(
      program,
      sequenceContent
    );
    if (!sequenceTypeCheck.valid) {
      return res.status(400).json({
        error: sequenceTypeCheck.message,
      });
    }

    // Count sequences
    const sequenceCount = countFastaSequences(sequenceContent);
    if (sequenceCount > 5) {
      return res.status(400).json({
        error:
          "Too many sequences. Maximum 5 sequences allowed per submission.",
      });
    }

    // Get database path
    const dbInfo = DATABASES[database];
    const blastDbPath = dbInfo.path;

    // Check if database exists
    const dbExists =
      dbInfo.type === "nucleotide"
        ? fs.existsSync(`${blastDbPath}.nin`)
        : fs.existsSync(`${blastDbPath}.pin`);

    if (!dbExists) {
      return res.status(500).json({
        error: "Database not found. Please contact the administrator.",
      });
    }

    // Create temporary directory
    const queryId = uuidv4();
    const tempDir = path.join(os.tmpdir(), "blast", queryId);

    try {
      fs.mkdirSync(tempDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create temp directory:", error);
      return res.status(500).json({
        error: "Failed to create temporary storage for BLAST query",
      });
    }

    const queryFilePath = path.join(tempDir, "query.fasta");
    const resultsFilePath = path.join(tempDir, "results.xml");

    try {
      // Write query sequence to file
      fs.writeFileSync(queryFilePath, sequenceContent);

      // Construct BLAST command
      const command = `${program} -db ${blastDbPath} -query ${queryFilePath} -out ${resultsFilePath} -outfmt 5 -num_descriptions ${parseInt(
        numDescriptions
      )} -num_alignments ${parseInt(numAlignments)} -evalue ${eValue}`;

      // Execute BLAST command
      exec(command, { timeout: 300000 }, async (error, stdout, stderr) => {
        try {
          if (error) {
            console.error(`BLAST execution error: ${stderr}`);
            return res.status(500).json({
              error: stderr || "Failed to execute BLAST search",
            });
          }

          // Check if results file exists
          if (!fs.existsSync(resultsFilePath)) {
            return res.status(500).json({
              error: "BLAST process did not generate results file",
            });
          }

          if (fs.statSync(resultsFilePath).size === 0) {
            return res.status(200).json({
              results: {
                hits: [],
                stats: {},
                program: program,
                database: database,
                message:
                  "No results found. Please check your sequence and parameters.",
              },
              programDatabase: {
                program: program,
                database: database,
              },
            });
          }

          // Parse XML results
          const xmlResults = fs.readFileSync(resultsFilePath, "utf-8");
          const parsedResults = await parseBlastXML(xmlResults);

          if (parsedResults.hits.length === 0) {
            parsedResults.message =
              "No significant matches were found for your query. Please check the input sequence or try adjusting search parameters.";
          }

          res.status(200).json({
            results: parsedResults,
            programDatabase: {
              program: program,
              database: database,
            },
          });
        } catch (processError) {
          console.error(
            `Error processing BLAST results: ${processError.message}`
          );
          res.status(500).json({
            error: processError.message,
          });
        } finally {
          // Clean up temporary files
          cleanupTempFiles(tempDir);
          // Clean up uploaded file if exists
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        }
      });
    } catch (err) {
      console.error(`Unexpected error: ${err.message}`);
      cleanupTempFiles(tempDir);
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  } catch (uncaughtError) {
    console.error(`Uncaught API error: ${uncaughtError.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper functions (same as your original)
function cleanupTempFiles(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`Error cleaning up temporary files: ${error.message}`);
  }
}

function countFastaSequences(content) {
  if (!content) return 0;
  return (content.match(/^>/gm) || []).length;
}

function checkProgramDatabaseCompatibility(program, database) {
  const dbInfo = DATABASES[database];

  if (program === "blastn" && dbInfo.type === "protein") {
    return {
      valid: false,
      message:
        "Incompatible selection: blastn cannot be used with protein databases. Please use a nucleotide database or switch to blastp.",
    };
  }

  if (program === "blastp" && dbInfo.type === "nucleotide") {
    return {
      valid: false,
      message:
        "Incompatible selection: blastp cannot be used with nucleotide databases. Please use a protein database or switch to blastn.",
    };
  }

  return { valid: true };
}

function checkSequenceTypeCompatibility(program, sequenceContent) {
  if (!sequenceContent) {
    return { valid: true };
  }

  const isProteinLike = determineSequenceType(sequenceContent);

  if (program === "blastn" && isProteinLike) {
    return {
      valid: false,
      message:
        "Your sequence appears to be a protein sequence, but you selected blastn. Use blastp for protein sequences.",
    };
  }

  if (program === "blastp" && !isProteinLike) {
    return {
      valid: false,
      message:
        "Your sequence appears to be a nucleotide sequence, but you selected blastp. Use blastn for nucleotide sequences.",
    };
  }

  return { valid: true };
}

function determineSequenceType(sequence) {
  const cleanedSequence = sequence
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("")
    .replace(/\s/g, "")
    .toUpperCase();

  if (cleanedSequence.length === 0) return false;

  const nonNucleotideChars = cleanedSequence.replace(/[ATGCN]/g, "");
  return nonNucleotideChars.length / cleanedSequence.length > 0.1;
}

// XML parsing function (same logic as your original)
async function parseBlastXML(xmlResults) {
  try {
    const json = await parseStringPromise(xmlResults);

    if (!json.BlastOutput) {
      throw new Error("Invalid BLAST output format");
    }

    const hits =
      json.BlastOutput?.BlastOutput_iterations?.[0]?.Iteration?.[0]?.Iteration_hits?.[0]?.Hit?.map(
        (hit) => {
          const hsps = hit.Hit_hsps?.[0]?.Hsp || [];

          const alignments = hsps.map((hsp) => ({
            querySeq: hsp.Hsp_qseq?.[0] || "N/A",
            hitSeq: hsp.Hsp_hseq?.[0] || "N/A",
            midline: hsp.Hsp_midline?.[0] || "N/A",
            alignLength: hsp["Hsp_align-len"]?.[0] || "N/A",
            queryFrom: hsp["Hsp_query-from"]?.[0] || "N/A",
            queryTo: hsp["Hsp_query-to"]?.[0] || "N/A",
            hitFrom: hsp["Hsp_hit-from"]?.[0] || "N/A",
            hitTo: hsp["Hsp_hit-to"]?.[0] || "N/A",
            gaps: hsp["Hsp_gaps"]?.[0] || "N/A",
            identity: hsp["Hsp_identity"]?.[0] || "N/A",
            bitScore: hsp["Hsp_bit-score"]?.[0] || "N/A",
          }));

          return {
            id: hit.Hit_id?.[0] || "N/A",
            description: hit.Hit_def?.[0] || "N/A",
            score: hit.Hit_hsps?.[0]?.Hsp?.[0]?.Hsp_score?.[0] || "N/A",
            evalue: hit.Hit_hsps?.[0]?.Hsp?.[0]?.Hsp_evalue?.[0] || "N/A",
            alignLength:
              alignments.length > 0 ? alignments[0].alignLength : "N/A",
            alignments:
              alignments.length > 0
                ? alignments
                : [
                    {
                      querySeq: "N/A",
                      hitSeq: "N/A",
                      midline: "N/A",
                      alignLength: "N/A",
                      queryFrom: "N/A",
                      queryTo: "N/A",
                      hitFrom: "N/A",
                      hitTo: "N/A",
                      gaps: "N/A",
                      identity: "N/A",
                      bitScore: "N/A",
                    },
                  ],
          };
        }
      ) || [];

    const statistics =
      json.BlastOutput?.BlastOutput_iterations?.[0]?.Iteration?.[0]
        ?.Iteration_stat?.[0]?.Statistics?.[0] || {};

    const stats = {
      dbNum: statistics["Statistics_db-num"]?.[0] || "N/A",
      dbLen: statistics["Statistics_db-len"]?.[0] || "N/A",
      hspLen: statistics["Statistics_hsp-len"]?.[0] || "N/A",
      effSpace: statistics["Statistics_eff-space"]?.[0] || "N/A",
      kappa: statistics["Statistics_kappa"]?.[0] || "N/A",
      lambda: statistics["Statistics_lambda"]?.[0] || "N/A",
      entropy: statistics["Statistics_entropy"]?.[0] || "N/A",
    };

    const program = json.BlastOutput?.BlastOutput_program?.[0] || "N/A";
    const database = json.BlastOutput?.BlastOutput_db?.[0] || "N/A";

    return {
      hits,
      stats,
      program,
      database,
      message:
        hits.length > 0
          ? "Your search has been completed successfully. You can now view the results."
          : "No hits found.",
    };
  } catch (error) {
    console.error(`Error parsing XML: ${error.message}`);
    throw new Error("Failed to parse BLAST results");
  }
}

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Black Pepper BLAST API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Database check: http://localhost:${PORT}/databases`);
});
