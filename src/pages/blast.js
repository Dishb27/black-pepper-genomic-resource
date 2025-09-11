// pages/blast.js - Complete implementation with AWS backend integration
import Head from "next/head";
import React, { useState, useEffect } from "react";
import {
  FaSpinner,
  FaChevronDown,
  FaChevronUp,
  FaUpload,
} from "react-icons/fa";
import styles from "../styles/blast.module.css";
import { useRouter } from "next/router";
import Header from "../components/header";
import Footer from "../components/footer";
import { runBlast, getDatabases } from "../../lib/blast-api";

// Import the API functions from our centralized module
const Blast = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    sequence: "",
    program: "blastn",
    database: "",
    numDescriptions: 5,
    numAlignments: 5,
    eValue: "1e-2",
  });
  const [file, setFile] = useState(null);
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [errors, setErrors] = useState({});
  const [fileUploaded, setFileUploaded] = useState(false);
  const [sequenceType, setSequenceType] = useState(null);
  const [databases, setDatabases] = useState({});
  const [backendStatus, setBackendStatus] = useState("checking");

  // Check backend status and load databases on component mount
  useEffect(() => {
    checkBackendStatus();
    loadDatabases();
  }, []);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", type: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Validate sequence type when program changes
  useEffect(() => {
    if (sequenceType && formData.program) {
      validateSequenceTypeWithProgram(formData.program, sequenceType);
    }
  }, [formData.program, sequenceType]);

  // Validate database compatibility
  useEffect(() => {
    if (formData.program && formData.database) {
      validateProgramDatabaseCompatibility(formData.program, formData.database);
    }
  }, [formData.program, formData.database]);

  // Helper function to count sequences in FASTA content
  const countSequencesInFasta = (content) => {
    if (!content || typeof content !== "string") return 0;

    // Count lines that start with ">" (FASTA headers)
    const sequenceCount = (content.match(/^>/gm) || []).length;
    return sequenceCount;
  };

  // Check backend status
  const checkBackendStatus = async () => {
    try {
      // Test the connection by fetching databases
      await getDatabases("/api/databases");
      setBackendStatus("online");
    } catch (error) {
      console.error("Backend connection error:", error);
      setBackendStatus("offline");
      setNotification({
        message: "Unable to connect to BLAST server",
        type: "error",
      });
    }
  };

  // Load available databases
  const loadDatabases = async () => {
    try {
      const data = await getDatabases();
      setDatabases(data.databases || {});
    } catch (error) {
      console.error("Error loading databases:", error);
      setNotification({
        message: "Failed to load databases. Please try again later.",
        type: "error",
      });
    }
  };

  const toggleAdvancedOptions = () => {
    setAdvancedOptions(!advancedOptions);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }

    if (name === "sequence" && value) {
      const detected = determineSequenceType(value);
      setSequenceType(detected);
      if (formData.program) {
        validateSequenceTypeWithProgram(formData.program, detected);
      }
    } else if (name === "sequence" && !value) {
      setSequenceType(null);
      setErrors({ ...errors, sequence: "" });
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      resetFileState();
      return;
    }

    // Validate file type and size
    const validExtensions = [".fasta", ".fa", ".fas", ".txt"];
    const fileExt = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();
    const maxSize = 10.1 * 1024 * 1024; // 10MB

    if (!validExtensions.includes(fileExt)) {
      setFileError("Invalid file type. Please upload a FASTA file.");
      resetFileState();
      return;
    }

    if (selectedFile.size > maxSize) {
      setFileError("File is too large. Maximum size is 10MB.");
      resetFileState();
      return;
    }

    try {
      const textContent = await readFileContent(selectedFile);

      // Check sequence count
      const sequenceCount = countSequencesInFasta(textContent);

      if (sequenceCount === 0) {
        setFileError("No valid FASTA sequences found in the file.");
        resetFileState();
        return;
      }

      if (sequenceCount > 5) {
        setFileError(
          `File contains ${sequenceCount} sequences. Maximum 5 sequences allowed.`
        );
        resetFileState();
        return;
      }

      const detected = determineSequenceType(textContent);
      setSequenceType(detected);

      if (formData.program) {
        validateSequenceTypeWithProgram(formData.program, detected);
      }

      setFileError("");
      setFile(selectedFile);
      setFileUploaded(true);
      setFormData({ ...formData, sequence: "" });
    } catch {
      setFileError("Failed to read file. Please try again.");
      resetFileState();
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsText(file);
    });
  };

  const resetFileState = () => {
    setFile(null);
    setFileUploaded(false);
    setSequenceType(null);
    setErrors({ ...errors, sequence: "" });
  };

  const determineSequenceType = (sequence) => {
    if (!sequence) return null;

    const cleanedSequence = sequence
      .split("\n")
      .filter((line) => !line.startsWith(">"))
      .join("")
      .replace(/\s/g, "")
      .toUpperCase();

    if (cleanedSequence.length === 0) return null;

    const nonNucleotideChars = cleanedSequence.replace(/[ATGCN]/g, "");
    return nonNucleotideChars.length / cleanedSequence.length > 0.1
      ? "protein"
      : "nucleotide";
  };

  const validateSequenceTypeWithProgram = (program, type) => {
    if (!type || !program) return true;

    const mismatches = {
      blastn:
        "Protein sequences cannot be used with blastn. Use blastp or provide nucleotide sequence.",
      blastp:
        "Nucleotide sequences cannot be used with blastp. Use blastn or provide protein sequence.",
    };

    if (
      (program === "blastn" && type === "protein") ||
      (program === "blastp" && type === "nucleotide")
    ) {
      setErrors({ ...errors, sequence: mismatches[program] });
      return false;
    }

    setErrors({ ...errors, sequence: "" });
    return true;
  };

  const validateProgramDatabaseCompatibility = (program, database) => {
    if (!program || !database || !databases[database]) return true;

    const dbInfo = databases[database];
    const mismatches = {
      blastn:
        "blastn cannot be used with protein databases. Select a nucleotide database or switch to blastp.",
      blastp:
        "blastp cannot be used with nucleotide databases. Select a protein database or switch to blastn.",
    };

    if (
      (program === "blastn" && dbInfo.type === "protein") ||
      (program === "blastp" && dbInfo.type === "nucleotide")
    ) {
      setErrors({ ...errors, database: mismatches[program] });
      return false;
    }

    setErrors({ ...errors, database: "" });
    return true;
  };

  const validateForm = () => {
    const newErrors = {};

    if (backendStatus !== "online") {
      newErrors.general =
        "BLAST server is not available. Please try again later.";
    }

    if (!formData.database) {
      newErrors.database = "Please select a database";
    }

    if (!formData.sequence && !file) {
      newErrors.sequence = "Please enter a sequence or upload a file";
    }

    // Check sequence count for manual input
    if (formData.sequence) {
      const sequenceCount = countSequencesInFasta(formData.sequence);
      if (sequenceCount > 5) {
        newErrors.sequence = "Maximum 5 sequences allowed";
      }
      if (sequenceCount === 0) {
        newErrors.sequence = "No valid FASTA sequences found";
      }
    }

    const eValuePattern = /^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;
    if (!eValuePattern.test(formData.eValue)) {
      newErrors.eValue = "Invalid e-value format (e.g., 1e-2)";
    }

    if (formData.numDescriptions <= 0) {
      newErrors.numDescriptions = "Must be greater than 0";
    }

    if (formData.numAlignments <= 0) {
      newErrors.numAlignments = "Must be greater than 0";
    }

    if (sequenceType) {
      const isCompatible = validateSequenceTypeWithProgram(
        formData.program,
        sequenceType
      );
      if (!isCompatible && !newErrors.sequence) {
        newErrors.sequence = errors.sequence;
      }
    }

    if (formData.program && formData.database) {
      const isCompatible = validateProgramDatabaseCompatibility(
        formData.program,
        formData.database
      );
      if (!isCompatible && !newErrors.database) {
        newErrors.database = errors.database;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setNotification({
        message: "Please fix the errors before submitting",
        type: "error",
      });
      return;
    }

    try {
      setIsLoading(true);

      let sequence = formData.sequence;
      if (file) {
        sequence = await readFileContent(file);
      }

      // Use the centralized API function
      const result = await runBlast({
        program: formData.program,
        database: formData.database,
        sequence,
        numDescriptions: formData.numDescriptions,
        numAlignments: formData.numAlignments,
        eValue: formData.eValue,
      });

      router.push({
        pathname: "/resultblast",
        query: {
          results: JSON.stringify(result.results),
          program: formData.program,
          database: formData.database,
        },
      });
    } catch (error) {
      console.error("BLAST error:", error);
      setNotification({
        message: error.message || "An error occurred",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      sequence: "",
      program: "blastn",
      database: "",
      numDescriptions: 5,
      numAlignments: 5,
      eValue: "1e-2",
    });
    setFile(null);
    setFileUploaded(false);
    setErrors({});
    setFileError("");
    setSequenceType(null);
  };

  const getDatabaseOptions = () => {
    const options = [
      <option key="default" value="">
        - Choose a database -
      </option>,
    ];

    Object.entries(databases).forEach(([dbName, dbInfo]) => {
      if (
        (formData.program === "blastn" && dbInfo.type === "nucleotide") ||
        (formData.program === "blastp" && dbInfo.type === "protein")
      ) {
        options.push(
          <option key={dbName} value={dbName}>
            {dbInfo.description}
          </option>
        );
      }
    });

    return options;
  };

  const BackendStatusIndicator = () => {
    const statusConfig = {
      checking: {
        text: "Checking BLAST server...",
        icon: <FaSpinner className={styles.spinner} />,
        className: styles.checking,
      },
      online: { text: "✅ BLAST server is online", className: styles.online },
      offline: {
        text: "⚠️ BLAST server is offline",
        className: styles.offline,
      },
    };

    const status = statusConfig[backendStatus] || statusConfig.offline;

    return (
      <div className={`${styles.statusIndicator} ${status.className}`}>
        {status.icon}
        <span>{status.text}</span>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>BLAST Tool - Black Pepper Knowledge Base</title>
        <meta
          name="description"
          content="Search the Black Pepper genome with BLAST"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Header />

      <div className={styles.backgroundOverlay}></div>
      <div className={styles.blastWrapper}>
        <div className={styles.blastContainer}>
          <h1 className={styles.blastTitle}>BLAST Search</h1>

          <BackendStatusIndicator />

          {notification.message && (
            <div
              className={`${styles.notification} ${styles[notification.type]}`}
            >
              {notification.message}
            </div>
          )}

          {errors.general && (
            <div className={`${styles.notification} ${styles.error}`}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.blastForm}>
            {/* BLAST Program Selection */}
            <div className={styles.fieldset}>
              <h3 className={styles.legend}>Select BLAST Program</h3>
              <div className={styles.formGroup}>
                <select
                  name="program"
                  value={formData.program}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="blastn">blastn (nucleotide-nucleotide)</option>
                  <option value="blastp">blastp (protein-protein)</option>
                </select>
              </div>
            </div>

            {/* Database Selection */}
            <div className={styles.fieldset}>
              <h3 className={styles.legend}>Choose a Search Set</h3>
              <div className={styles.formGroup}>
                <select
                  name="database"
                  value={formData.database}
                  onChange={handleInputChange}
                  className={`${styles.select} ${
                    errors.database ? styles.inputError : ""
                  }`}
                >
                  {getDatabaseOptions()}
                </select>
                {errors.database && (
                  <p className={styles.errorText}>{errors.database}</p>
                )}
              </div>
            </div>

            {/* Sequence Input */}
            <div className={styles.fieldset}>
              <h3 className={styles.legend}>Enter Query Sequence(s)</h3>
              <div className={styles.formGroup}>
                <textarea
                  name="sequence"
                  value={formData.sequence}
                  onChange={handleInputChange}
                  placeholder="Enter 1-5 sequences in FASTA format"
                  className={`${styles.textarea} ${
                    errors.sequence ? styles.inputError : ""
                  }`}
                  disabled={file !== null}
                  rows={8}
                />
                {errors.sequence && (
                  <p className={styles.errorText}>{errors.sequence}</p>
                )}

                {formData.sequence && sequenceType && (
                  <div
                    className={`${styles.sequenceTypeIndicator} ${
                      (formData.program === "blastn" &&
                        sequenceType === "protein") ||
                      (formData.program === "blastp" &&
                        sequenceType === "nucleotide")
                        ? styles.sequenceTypeMismatch
                        : styles.sequenceTypeMatch
                    }`}
                  >
                    Detected sequence type:{" "}
                    {sequenceType === "protein" ? "Protein" : "Nucleotide"}
                  </div>
                )}

                <div className={styles.fileUploadSection}>
                  <p className={styles.fileInstructions}>
                    Or upload a FASTA file (.fasta, .fa, .fas, .txt):
                  </p>

                  <label className={styles.fileInputLabel}>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".fasta,.fa,.fas,.txt"
                      className={styles.fileInput}
                      disabled={formData.sequence !== ""}
                    />
                    <span className={styles.customFileButton}>
                      <FaUpload />{" "}
                      {fileUploaded ? "File selected" : "Choose file"}
                    </span>
                    {file && (
                      <span className={styles.fileName}>{file.name}</span>
                    )}
                  </label>

                  {fileError && <p className={styles.errorText}>{fileError}</p>}

                  {file && sequenceType && (
                    <div
                      className={`${styles.sequenceTypeIndicator} ${
                        (formData.program === "blastn" &&
                          sequenceType === "protein") ||
                        (formData.program === "blastp" &&
                          sequenceType === "nucleotide")
                          ? styles.sequenceTypeMismatch
                          : styles.sequenceTypeMatch
                      }`}
                    >
                      Detected sequence type:{" "}
                      {sequenceType === "protein" ? "Protein" : "Nucleotide"}
                    </div>
                  )}

                  <p className={styles.fileNotice}>
                    Max 10MB • Max 5 sequences
                  </p>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className={styles.fieldset}>
              <div
                className={styles.advancedOptionsHeader}
                onClick={toggleAdvancedOptions}
              >
                <h3 className={styles.legend}>Advanced Options</h3>
                <span className={styles.toggleIcon}>
                  {advancedOptions ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              </div>

              {advancedOptions && (
                <div className={styles.advancedOptionsContent}>
                  <div className={styles.advancedOptionsGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Number of Descriptions
                      </label>
                      <input
                        type="number"
                        name="numDescriptions"
                        value={formData.numDescriptions}
                        onChange={handleInputChange}
                        className={`${styles.input} ${
                          errors.numDescriptions ? styles.inputError : ""
                        }`}
                        min="1"
                        max="100"
                      />
                      {errors.numDescriptions && (
                        <p className={styles.errorText}>
                          {errors.numDescriptions}
                        </p>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Number of Alignments
                      </label>
                      <input
                        type="number"
                        name="numAlignments"
                        value={formData.numAlignments}
                        onChange={handleInputChange}
                        className={`${styles.input} ${
                          errors.numAlignments ? styles.inputError : ""
                        }`}
                        min="1"
                        max="100"
                      />
                      {errors.numAlignments && (
                        <p className={styles.errorText}>
                          {errors.numAlignments}
                        </p>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        E-value Threshold
                      </label>
                      <input
                        type="text"
                        name="eValue"
                        value={formData.eValue}
                        onChange={handleInputChange}
                        className={`${styles.input} ${
                          errors.eValue ? styles.inputError : ""
                        }`}
                        placeholder="e.g., 1e-2"
                      />
                      {errors.eValue && (
                        <p className={styles.errorText}>{errors.eValue}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={handleClearForm}
                className={styles.clearButton}
                disabled={isLoading}
              >
                Clear
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading || backendStatus !== "online"}
              >
                {isLoading ? (
                  <>
                    <FaSpinner className={styles.spinner} />
                    Processing...
                  </>
                ) : (
                  "BLAST"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Blast;
