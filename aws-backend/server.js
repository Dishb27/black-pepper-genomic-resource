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
const PORT = process.env.PORT || 8080;

// Enhanced CORS configuration for Vercel integration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://*.vercel.app",
    "https://black-pepper-genomic-resource.vercel.app/",
    /^https:\/\/.*\.vercel\.app$/, // Allow all vercel.app subdomains
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${
      req.path
    } - Origin: ${req.get("Origin")}`
  );
  next();
});

// Configure multer for file uploads with better error handling
const upload = multer({
  dest: "/tmp/uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Accept FASTA files and text files
    const allowedMimes = [
      "text/plain",
      "application/octet-stream",
      "text/x-fasta",
    ];
    const allowedExts = [".fasta", ".fa", ".fas", ".txt"];

    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Please upload FASTA files (.fasta, .fa, .txt)"
        )
      );
    }
  },
});

// Database configurations for AWS
const DB_BASE_PATH = "/data/black_pepper_blast_db";

const DATABASES = {
  Piper_nigrum_genome_db: {
    path: `${DB_BASE_PATH}/Piper_nigrum_genome_db`,
    type: "nucleotide",
    description: "Black Pepper Genome Database",
  },
  Piper_nigrum_cds_db: {
    path: `${DB_BASE_PATH}/Piper_nigrum_cds_db`,
    type: "nucleotide",
    description: "Black Pepper CDS Database",
  },
  Piper_nigrum_prot_db: {
    path: `${DB_BASE_PATH}/Piper_nigrum_prot_db`,
    type: "protein",
    description: "Black Pepper Protein Database",
  },
};

// Enhanced health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Black Pepper BLAST API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      health: "GET /",
      databases: "GET /databases",
      blast: "POST /blast",
    },
  });
});

// Enhanced database status endpoint
app.get("/databases", (req, res) => {
  try {
    const availableDbs = {};

    for (const [dbName, dbInfo] of Object.entries(DATABASES)) {
      const dbPath = dbInfo.path;
      let exists = false;
      let fileCount = 0;

      if (dbInfo.type === "nucleotide") {
        exists = fs.existsSync(`${dbPath}.nin`);
        if (exists) {
          // Count all related files
          const baseName = path.basename(dbPath);
          const dirName = path.dirname(dbPath);
          const files = fs
            .readdirSync(dirName)
            .filter((f) => f.startsWith(baseName));
          fileCount = files.length;
        }
      } else {
        exists = fs.existsSync(`${dbPath}.pin`);
        if (exists) {
          const baseName = path.basename(dbPath);
          const dirName = path.dirname(dbPath);
          const files = fs
            .readdirSync(dirName)
            .filter((f) => f.startsWith(baseName));
          fileCount = files.length;
        }
      }

      availableDbs[dbName] = {
        type: dbInfo.type,
        description: dbInfo.description,
        available: exists,
        path: dbPath,
        fileCount: fileCount,
        lastChecked: new Date().toISOString(),
      };
    }

    res.json({
      status: "success",
      databases: availableDbs,
      totalDatabases: Object.keys(DATABASES).length,
      availableCount: Object.values(availableDbs).filter((db) => db.available)
        .length,
    });
  } catch (error) {
    console.error("Error checking databases:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to check database status",
      error: error.message,
    });
  }
});

// Enhanced BLAST endpoint with better error handling and logging
app.post("/blast", upload.single("file"), async (req, res) => {
  const startTime = Date.now();
  let queryId = null;

  try {
    queryId = uuidv4();
    console.log(`[${queryId}] Starting BLAST request`);

    const {
      sequence,
      program,
      database,
      numDescriptions = 5,
      numAlignments = 5,
      eValue = "1e-2",
    } = req.body;

    console.log(
      `[${queryId}] Parameters: program=${program}, database=${database}, eValue=${eValue}`
    );

    // Input validation
    if (!program || !database) {
      return res.status(400).json({
        status: "error",
        error:
          "Missing required parameters: program and database must be specified",
        queryId,
      });
    }

    if (!sequence && !req.file) {
      return res.status(400).json({
        status: "error",
        error:
          "No sequence provided. Please provide a sequence or upload a file",
        queryId,
      });
    }

    // Validate program type
    const validPrograms = ["blastn", "blastp"];
    if (!validPrograms.includes(program)) {
      return res.status(400).json({
        status: "error",
        error: "Invalid BLAST program. Please use blastn or blastp",
        queryId,
      });
    }

    // Validate database
    if (!DATABASES[database]) {
      return res.status(400).json({
        status: "error",
        error: "Invalid database selected",
        availableDatabases: Object.keys(DATABASES),
        queryId,
      });
    }

    // Check program-database compatibility
    const compatibilityCheck = checkProgramDatabaseCompatibility(
      program,
      database
    );
    if (!compatibilityCheck.valid) {
      return res.status(400).json({
        status: "error",
        error: compatibilityCheck.message,
        queryId,
      });
    }

    // Get sequence content
    let sequenceContent = sequence;
    if (req.file) {
      try {
        console.log(
          `[${queryId}] Reading uploaded file: ${req.file.originalname}`
        );
        sequenceContent = fs.readFileSync(req.file.path, "utf8");
      } catch (error) {
        console.error(`[${queryId}] File read error:`, error);
        return res.status(400).json({
          status: "error",
          error: "Failed to read uploaded file",
          queryId,
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
        status: "error",
        error: sequenceTypeCheck.message,
        queryId,
      });
    }

    // Count sequences
    const sequenceCount = countFastaSequences(sequenceContent);
    console.log(`[${queryId}] Sequence count: ${sequenceCount}`);

    if (sequenceCount > 5) {
      return res.status(400).json({
        status: "error",
        error:
          "Too many sequences. Maximum 5 sequences allowed per submission.",
        sequenceCount,
        queryId,
      });
    }

    if (sequenceCount === 0) {
      return res.status(400).json({
        status: "error",
        error: "No valid sequences found in input. Please check FASTA format.",
        queryId,
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
      console.error(`[${queryId}] Database not found: ${blastDbPath}`);
      return res.status(500).json({
        status: "error",
        error: "Database not found. Please contact the administrator.",
        database: database,
        queryId,
      });
    }

    // Create temporary directory
    const tempDir = path.join(os.tmpdir(), "blast", queryId);

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`[${queryId}] Created temp directory: ${tempDir}`);
    } catch (error) {
      console.error(`[${queryId}] Failed to create temp directory:`, error);
      return res.status(500).json({
        status: "error",
        error: "Failed to create temporary storage for BLAST query",
        queryId,
      });
    }

    const queryFilePath = path.join(tempDir, "query.fasta");
    const resultsFilePath = path.join(tempDir, "results.xml");

    try {
      // Write query sequence to file
      fs.writeFileSync(queryFilePath, sequenceContent);
      console.log(`[${queryId}] Query file written: ${queryFilePath}`);

      // Construct BLAST command with better parameter validation
      const numDesc = Math.max(1, Math.min(100, parseInt(numDescriptions)));
      const numAlign = Math.max(1, Math.min(100, parseInt(numAlignments)));

      const command = `${program} -db ${blastDbPath} -query ${queryFilePath} -out ${resultsFilePath} -outfmt 5 -num_descriptions ${numDesc} -num_alignments ${numAlign} -evalue ${eValue}`;

      console.log(`[${queryId}] Executing BLAST command: ${command}`);

      // Execute BLAST command with extended timeout
      exec(command, { timeout: 300000 }, async (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;

        try {
          if (error) {
            console.error(
              `[${queryId}] BLAST execution error (${executionTime}ms):`,
              stderr
            );
            return res.status(500).json({
              status: "error",
              error: stderr || "Failed to execute BLAST search",
              executionTime,
              queryId,
            });
          }

          console.log(`[${queryId}] BLAST completed in ${executionTime}ms`);

          // Check if results file exists
          if (!fs.existsSync(resultsFilePath)) {
            console.error(`[${queryId}] Results file not generated`);
            return res.status(500).json({
              status: "error",
              error: "BLAST process did not generate results file",
              executionTime,
              queryId,
            });
          }

          const fileSize = fs.statSync(resultsFilePath).size;
          console.log(`[${queryId}] Results file size: ${fileSize} bytes`);

          if (fileSize === 0) {
            return res.status(200).json({
              status: "success",
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
              executionTime,
              queryId,
            });
          }

          // Parse XML results
          const xmlResults = fs.readFileSync(resultsFilePath, "utf-8");
          const parsedResults = await parseBlastXML(xmlResults);

          if (parsedResults.hits.length === 0) {
            parsedResults.message =
              "No significant matches were found for your query. Please check the input sequence or try adjusting search parameters.";
          }

          console.log(`[${queryId}] Found ${parsedResults.hits.length} hits`);

          res.status(200).json({
            status: "success",
            results: parsedResults,
            programDatabase: {
              program: program,
              database: database,
            },
            executionTime,
            queryId,
            timestamp: new Date().toISOString(),
          });
        } catch (processError) {
          console.error(
            `[${queryId}] Error processing BLAST results:`,
            processError
          );
          res.status(500).json({
            status: "error",
            error: processError.message,
            executionTime: Date.now() - startTime,
            queryId,
          });
        } finally {
          // Clean up temporary files
          setTimeout(() => cleanupTempFiles(tempDir), 1000);
          // Clean up uploaded file if exists
          if (req.file && fs.existsSync(req.file.path)) {
            setTimeout(() => {
              try {
                fs.unlinkSync(req.file.path);
              } catch (e) {
                console.error(`[${queryId}] Error cleaning uploaded file:`, e);
              }
            }, 1000);
          }
        }
      });
    } catch (err) {
      console.error(`[${queryId}] Unexpected error:`, err);
      cleanupTempFiles(tempDir);
      res.status(500).json({
        status: "error",
        error: "An unexpected error occurred",
        queryId,
      });
    }
  } catch (uncaughtError) {
    console.error(
      `[${queryId || "unknown"}] Uncaught API error:`,
      uncaughtError
    );
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      queryId: queryId || "unknown",
    });
  }
});

// Add error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        error: "File too large. Maximum size is 10MB.",
      });
    }
    return res.status(400).json({
      status: "error",
      error: error.message,
    });
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      status: "error",
      error: error.message,
    });
  }

  next(error);
});

// Helper functions (enhanced with better logging)
function cleanupTempFiles(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Cleaned up temp directory: ${dirPath}`);
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

// XML parsing function (same logic but with better error handling)
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

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Black Pepper BLAST API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Database check: http://localhost:${PORT}/databases`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Check database availability on startup
  setTimeout(() => {
    console.log("\nChecking database availability...");
    for (const [dbName, dbInfo] of Object.entries(DATABASES)) {
      const exists =
        dbInfo.type === "nucleotide"
          ? fs.existsSync(`${dbInfo.path}.nin`)
          : fs.existsSync(`${dbInfo.path}.pin`);
      console.log(`${dbName}: ${exists ? "✅ Available" : "❌ Not found"}`);
    }
  }, 1000);
});
