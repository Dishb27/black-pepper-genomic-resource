// pages/blast.js - Updated to use AWS backend
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

const Blast = () => {
  const router = useRouter();

  // AWS Backend URL - Update this with your actual AWS instance URL
  const AWS_BACKEND_URL =
    process.env.NEXT_PUBLIC_AWS_BACKEND_URL || "http://your-aws-instance-ip";

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

  // Effect to validate sequence type when program changes
  useEffect(() => {
    if (sequenceType && formData.program) {
      validateSequenceTypeWithProgram(formData.program, sequenceType);
    }
  }, [formData.program, sequenceType]);

  // Effect to validate database compatibility when program or database changes
  useEffect(() => {
    if (formData.program && formData.database) {
      validateProgramDatabaseCompatibility(formData.program, formData.database);
    }
  }, [formData.program, formData.database]);

  // Check if AWS backend is accessible
  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${AWS_BACKEND_URL}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setBackendStatus("online");
      } else {
        setBackendStatus("offline");
      }
    } catch (error) {
      console.error("Backend connection error:", error);
      setBackendStatus("offline");
      setNotification({
        message: "Unable to connect to BLAST server. Please try again later.",
        type: "error",
      });
    }
  };

  // Load available databases from AWS backend
  const loadDatabases = async () => {
    try {
      const response = await fetch(`${AWS_BACKEND_URL}/databases`);
      if (response.ok) {
        const data = await response.json();
        setDatabases(data.databases || {});
      }
    } catch (error) {
      console.error("Error loading databases:", error);
    }
  };

  const toggleAdvancedOptions = () => {
    setAdvancedOptions(!advancedOptions);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear related error when user makes changes
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }

    // Check sequence type when user inputs a sequence
    if (name === "sequence" && value) {
      const detected = determineSequenceType(value);
      setSequenceType(detected);

      // If program is already selected, validate compatibility
      if (formData.program) {
        validateSequenceTypeWithProgram(formData.program, detected);
      }
    } else if (name === "sequence" && !value) {
      setSequenceType(null);
      setErrors({ ...errors, sequence: "" });
    }
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      setFile(null);
      setFileUploaded(false);
      setSequenceType(null);
      setErrors({ ...errors, sequence: "" });
      return;
    }

    // Validate file type
    const validFileTypes = [".fasta", ".fa", ".fas", ".txt"];
    const fileExtension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!validFileTypes.includes(fileExtension)) {
      setFileError(
        "Invalid file type. Please upload a FASTA file (.fasta, .fa, .fas, .txt)"
      );
      setFile(null);
      setFileUploaded(false);
      return;
    }

    // File size validation (max 10MB to match backend)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      setFileError("File is too large. Maximum size is 10MB.");
      setFile(null);
      setFileUploaded(false);
      return;
    }

    // Read file content to determine sequence type
    const reader = new FileReader();
    reader.onload = (event) => {
      const textContent = event.target.result;
      const detected = determineSequenceType(textContent);
      setSequenceType(detected);

      // If program is already selected, validate compatibility
      if (formData.program) {
        validateSequenceTypeWithProgram(formData.program, detected);
      }

      setFileError("");
      setFile(selectedFile);
      setFileUploaded(true);

      // Clear sequence input if there was any
      if (formData.sequence) {
        setFormData({ ...formData, sequence: "" });
      }
    };

    reader.onerror = () => {
      setFileError("Failed to read file. Please try again.");
      setFile(null);
      setFileUploaded(false);
    };

    reader.readAsText(selectedFile);
  };

  // Helper function to determine if sequence is protein or nucleotide
  const determineSequenceType = (sequence) => {
    if (!sequence) return null;

    // Remove FASTA header lines and whitespace
    const cleanedSequence = sequence
      .split("\n")
      .filter((line) => !line.startsWith(">"))
      .join("")
      .replace(/\s/g, "")
      .toUpperCase();

    if (cleanedSequence.length === 0) return null;

    // Count non-nucleotide characters (not A, T, G, C, N)
    const nonNucleotideChars = cleanedSequence.replace(/[ATGCN]/g, "");

    // If more than 10% of characters are non-nucleotide, likely a protein sequence
    return nonNucleotideChars.length / cleanedSequence.length > 0.1
      ? "protein"
      : "nucleotide";
  };

  // Validate sequence type with program
  const validateSequenceTypeWithProgram = (program, type) => {
    if (!type || !program) return true;

    if (program === "blastn" && type === "protein") {
      setErrors({
        ...errors,
        sequence:
          "Protein sequences cannot be used with blastn. Please use blastp for protein sequences or provide a nucleotide sequence.",
      });
      return false;
    }

    if (program === "blastp" && type === "nucleotide") {
      setErrors({
        ...errors,
        sequence:
          "Nucleotide sequences cannot be used with blastp. Please use blastn for nucleotide sequences or provide a protein sequence.",
      });
      return false;
    }

    // Clear error if types match
    setErrors({ ...errors, sequence: "" });
    return true;
  };

  // Validate program and database compatibility
  const validateProgramDatabaseCompatibility = (program, database) => {
    if (!program || !database || !databases[database]) return true;

    const dbInfo = databases[database];

    // For blastn, protein databases are incompatible
    if (program === "blastn" && dbInfo.type === "protein") {
      setErrors({
        ...errors,
        database:
          "blastn cannot be used with protein databases. Please select a nucleotide database or switch to blastp.",
      });
      return false;
    }

    // For blastp, nucleotide databases are incompatible
    if (program === "blastp" && dbInfo.type === "nucleotide") {
      setErrors({
        ...errors,
        database:
          "blastp cannot be used with nucleotide databases. Please select a protein database or switch to blastn.",
      });
      return false;
    }

    // Clear error if compatible
    setErrors({ ...errors, database: "" });
    return true;
  };

  const validateForm = () => {
    const newErrors = {};

    // Check backend status first
    if (backendStatus !== "online") {
      newErrors.general =
        "BLAST server is not available. Please try again later.";
    }

    // Validate database selection
    if (!formData.database) {
      newErrors.database = "Please select a database";
    }

    // Validate sequence input or file upload
    if (!formData.sequence && !file) {
      newErrors.sequence = "Please enter a sequence or upload a file";
    }

    // Validate sequence count if sequence is provided
    if (formData.sequence) {
      const sequenceCount = (formData.sequence.match(/^>/gm) || []).length;
      if (sequenceCount > 5) {
        newErrors.sequence = "You can only submit a maximum of 5 sequences";
      }
    }

    // Validate e-value format
    const eValuePattern = /^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;
    if (!eValuePattern.test(formData.eValue)) {
      newErrors.eValue = "Please enter a valid e-value (e.g., 1e-2)";
    }

    // Validate numerical inputs
    if (formData.numDescriptions <= 0) {
      newErrors.numDescriptions = "Value must be greater than 0";
    }

    if (formData.numAlignments <= 0) {
      newErrors.numAlignments = "Value must be greater than 0";
    }

    // Check sequence type compatibility with program
    if (sequenceType) {
      const isCompatible = validateSequenceTypeWithProgram(
        formData.program,
        sequenceType
      );
      if (!isCompatible && !newErrors.sequence) {
        newErrors.sequence = errors.sequence;
      }
    }

    // Check program-database compatibility
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

      // Create FormData for file upload to AWS backend
      const formDataToSend = new FormData();
      formDataToSend.append("sequence", formData.sequence);
      formDataToSend.append("program", formData.program);
      formDataToSend.append("database", formData.database);
      formDataToSend.append(
        "numDescriptions",
        formData.numDescriptions.toString()
      );
      formDataToSend.append("numAlignments", formData.numAlignments.toString());
      formDataToSend.append("eValue", formData.eValue);

      // Add file if uploaded
      if (file) {
        formDataToSend.append("file", file);
      }

      // Send request to AWS backend
      const response = await fetch(`${AWS_BACKEND_URL}/blast`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit BLAST query");
      }

      // Redirect to results page with the results
      router.push({
        pathname: "/resultblast",
        query: {
          results: JSON.stringify(data.results),
          program: formData.program,
          database: formData.database,
        },
      });
    } catch (error) {
      console.error("Error submitting BLAST query:", error);
      setNotification({
        message:
          error.message || "An error occurred while processing your request",
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

  // Helper function to get database options based on selected program and available databases
  const getDatabaseOptions = () => {
    const options = [
      <option key="default" value="">
        - Choose a database -
      </option>,
    ];

    for (const [dbName, dbInfo] of Object.entries(databases)) {
      // Filter databases based on program compatibility
      if (formData.program === "blastn" && dbInfo.type === "nucleotide") {
        options.push(
          <option key={dbName} value={dbName}>
            {dbInfo.description}
          </option>
        );
      } else if (formData.program === "blastp" && dbInfo.type === "protein") {
        options.push(
          <option key={dbName} value={dbName}>
            {dbInfo.description}
          </option>
        );
      }
    }

    return options;
  };

  // Show backend status indicator
  const BackendStatusIndicator = () => {
    if (backendStatus === "checking") {
      return (
        <div className={styles.statusIndicator}>
          <FaSpinner className={styles.spinner} />
          <span>Checking BLAST server...</span>
        </div>
      );
    } else if (backendStatus === "offline") {
      return (
        <div className={`${styles.statusIndicator} ${styles.offline}`}>
          <span>⚠️ BLAST server is offline</span>
        </div>
      );
    } else {
      return (
        <div className={`${styles.statusIndicator} ${styles.online}`}>
          <span>✅ BLAST server is online</span>
        </div>
      );
    }
  };

  return (
    <>
      <Head>
        <title>BLAST Tool - Black Pepper Knowledgebase</title>
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
                  id="program"
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
                  id="database"
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
                  id="sequence"
                  name="sequence"
                  value={formData.sequence}
                  onChange={handleInputChange}
                  placeholder={`Enter one or more queries (1 to 5 sequences) in FASTA format`}
                  className={`${styles.textarea} ${
                    errors.sequence ? styles.inputError : ""
                  }`}
                  disabled={file !== null}
                />
                {errors.sequence && (
                  <p className={styles.errorText}>{errors.sequence}</p>
                )}

                {/* Sequence type indicator */}
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
                    Or upload a FASTA file (.fasta, .fa, .fas, .txt) containing
                    your sequence(s):
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

                  {/* File sequence type indicator */}
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

                  <p className={styles.fileNotice}>Maximum file size: 10MB</p>
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
                      <label
                        htmlFor="numDescriptions"
                        className={styles.formLabel}
                      >
                        Number of Descriptions
                      </label>
                      <input
                        type="number"
                        id="numDescriptions"
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
                      <label
                        htmlFor="numAlignments"
                        className={styles.formLabel}
                      >
                        Number of Alignments
                      </label>
                      <input
                        type="number"
                        id="numAlignments"
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
                      <label htmlFor="eValue" className={styles.formLabel}>
                        E-value (Expected Threshold)
                      </label>
                      <input
                        type="text"
                        id="eValue"
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
