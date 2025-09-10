import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import styles from "../styles/resultblast.module.css";
import Head from "next/head";
import { AlignJustify, Download, ArrowLeft, RefreshCw } from "lucide-react";

const ResultBlast = () => {
  const router = useRouter();
  const [blastResults, setBlastResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [program, setProgram] = useState("");
  const [database, setDatabase] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [programInfo, setProgramInfo] = useState({
    program: "",
    database: "",
  });
  const [queryId, setQueryId] = useState("");
  const [executionTime, setExecutionTime] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [expandedResults, setExpandedResults] = useState({});

  useEffect(() => {
    if (!router.isReady) return;

    setIsLoading(true);

    if (router.query.results) {
      try {
        const parsedResults = JSON.parse(router.query.results);
        console.log("Parsed results:", parsedResults);

        // Handle error messages from AWS backend
        if (router.query.error) {
          setErrorMessage(router.query.error);
        } else if (
          parsedResults.message &&
          parsedResults.hits &&
          parsedResults.hits.length === 0
        ) {
          setErrorMessage(parsedResults.message);
        }

        // Set program and database info from query params or results
        const programFromQuery =
          router.query.program || parsedResults.program || "";
        const databaseFromQuery =
          router.query.database || parsedResults.database || "";

        setProgramInfo({
          program: programFromQuery,
          database: databaseFromQuery,
        });
        setProgram(programFromQuery);
        setDatabase(databaseFromQuery);

        // Set additional metadata if available
        if (router.query.queryId) setQueryId(router.query.queryId);
        if (router.query.executionTime)
          setExecutionTime(router.query.executionTime);
        if (router.query.timestamp) setTimestamp(router.query.timestamp);

        // Process results
        if (parsedResults?.hits && Array.isArray(parsedResults.hits)) {
          const formattedResults = parsedResults.hits.map((hit, index) => ({
            id: hit.id || `hit_${index + 1}`,
            description: hit.description || "No description provided",
            score: hit.score || "N/A",
            evalue: hit.evalue || "N/A",
            alignLength: hit.alignLength || "N/A",
            alignments:
              hit.alignments?.map((alignment, alignIndex) => ({
                id: `${index}_${alignIndex}`,
                querySeq: alignment.querySeq || "N/A",
                hitSeq: alignment.hitSeq || "N/A",
                midline: alignment.midline || "N/A",
                alignLength: alignment.alignLength || "N/A",
                queryFrom: alignment.queryFrom || "N/A",
                queryTo: alignment.queryTo || "N/A",
                hitFrom: alignment.hitFrom || "N/A",
                hitTo: alignment.hitTo || "N/A",
                identity: alignment.identity || "N/A",
                gaps: alignment.gaps || "N/A",
                bitScore: alignment.bitScore || "N/A",
              })) || [],
          }));

          setBlastResults(formattedResults);

          // Initialize expanded state for first result
          if (formattedResults.length > 0) {
            setExpandedResults({ 0: true });
          }
        } else if (parsedResults.error) {
          setError(parsedResults.error);
          setErrorMessage(parsedResults.error);
        } else {
          setError("Invalid BLAST results format.");
          setErrorMessage("No valid results received from server.");
        }
      } catch (error) {
        console.error("Error parsing results:", error);
        setError(`Error parsing BLAST results: ${error.message}`);
        setErrorMessage(
          "Failed to load results. The results data may be corrupted."
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("No results data found.");
      setErrorMessage(
        "No results were provided. Please run a BLAST search first."
      );
      setIsLoading(false);
    }
  }, [
    router.isReady,
    router.query.results,
    router.query.program,
    router.query.database,
    router.query.error,
    router.query.queryId,
    router.query.executionTime,
    router.query.timestamp,
  ]);

  // Function to get the appropriate unit based on program type
  const getLengthUnit = () => {
    return program === "blastn" ? "bp" : "aa";
  };

  // Function to calculate identity percentage
  const calculateIdentityPercentage = (identity, alignLength) => {
    if (identity === "N/A" || alignLength === "N/A") return "N/A";
    const identityNum = parseInt(identity);
    const lengthNum = parseInt(alignLength);
    if (isNaN(identityNum) || isNaN(lengthNum) || lengthNum === 0) return "N/A";
    return ((identityNum / lengthNum) * 100).toFixed(1) + "%";
  };

  // Function to format e-value for better readability
  const formatEValue = (evalue) => {
    if (evalue === "N/A") return "N/A";
    const num = parseFloat(evalue);
    if (isNaN(num)) return evalue;
    if (num === 0) return "0.0";
    if (num < 1e-100) return "<1e-100";
    return num.toExponential(2);
  };

  // Function to toggle result expansion
  const toggleResultExpansion = (index) => {
    setExpandedResults((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Function to format sequence for display (break long sequences)
  const formatSequence = (sequence, lineLength = 60) => {
    if (!sequence || sequence === "N/A") return sequence;
    const lines = [];
    for (let i = 0; i < sequence.length; i += lineLength) {
      lines.push(sequence.substring(i, i + lineLength));
    }
    return lines.join("\n");
  };

  // Function to export results as text
  const exportResults = () => {
    if (!blastResults || blastResults.length === 0) return;

    let exportText = `BLAST Search Results\n`;
    exportText += `Program: ${program}\n`;
    exportText += `Database: ${database}\n`;
    if (timestamp)
      exportText += `Date: ${new Date(timestamp).toLocaleString()}\n`;
    if (executionTime) exportText += `Execution Time: ${executionTime}ms\n`;
    if (queryId) exportText += `Query ID: ${queryId}\n`;
    exportText += `Total Hits: ${blastResults.length}\n`;
    exportText += `\n${"=".repeat(80)}\n\n`;

    blastResults.forEach((hit, index) => {
      exportText += `Hit ${index + 1}: ${hit.description}\n`;
      exportText += `Score: ${hit.score}, E-value: ${formatEValue(
        hit.evalue
      )}\n`;
      exportText += `Length: ${hit.alignLength} ${getLengthUnit()}\n\n`;

      hit.alignments.forEach((alignment, alignIndex) => {
        exportText += `  Alignment ${alignIndex + 1}:\n`;
        exportText += `  Query: ${alignment.queryFrom}-${alignment.queryTo}\n`;
        exportText += `  Hit:   ${alignment.hitFrom}-${alignment.hitTo}\n`;
        exportText += `  Identity: ${calculateIdentityPercentage(
          alignment.identity,
          alignment.alignLength
        )}\n`;
        exportText += `  Bit Score: ${alignment.bitScore}\n\n`;

        exportText += `  Query: ${formatSequence(alignment.querySeq)}\n`;
        exportText += `         ${formatSequence(alignment.midline)}\n`;
        exportText += `  Hit:   ${formatSequence(alignment.hitSeq)}\n\n`;
      });

      exportText += `${"-".repeat(60)}\n\n`;
    });

    // Create and download the file
    const blob = new Blob([exportText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blast_results_${queryId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Component to display errors or no results messages
  const ResultsMessage = () => {
    if (errorMessage) {
      return (
        <div className={styles.resultsMessage}>
          <div className={styles.alertBox}>
            <div className={styles.alertIcon}>
              {errorMessage.includes("No significant matches") ? "🔍" : "⚠️"}
            </div>
            <h3>Message:</h3>
            <p>{errorMessage}</p>

            {/* Display program-database mismatch errors with helpful suggestions */}
            {errorMessage.includes("Incompatible selection") && (
              <div className={styles.incompatibilityHelp}>
                <h4>Program and Database Compatibility:</h4>
                <ul>
                  <li>
                    <strong>blastn</strong> - Use with nucleotide databases
                    (genome or CDS)
                  </li>
                  <li>
                    <strong>blastp</strong> - Use with protein databases only
                  </li>
                </ul>
                <p>Please go back and adjust your selection.</p>
              </div>
            )}

            {/* Display sequence type mismatch errors */}
            {errorMessage.includes("Your sequence appears to be") && (
              <div className={styles.incompatibilityHelp}>
                <h4>Sequence Type Mismatch:</h4>
                <p>
                  The sequence you provided doesn&apos;t match the selected
                  program:
                </p>
                <ul>
                  <li>
                    <strong>blastn</strong> - For nucleotide sequences (DNA/RNA)
                  </li>
                  <li>
                    <strong>blastp</strong> - For protein sequences (amino
                    acids)
                  </li>
                </ul>
                <p>Please go back and adjust your selection.</p>
              </div>
            )}

            <div className={styles.actionButtons}>
              <button
                onClick={() => router.push("/blast")}
                className={styles.goBackButton}
              >
                <ArrowLeft size={16} />
                Go Back to BLAST Search
              </button>
              <button
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle loading state
  if (isLoading) {
    return (
      <>
        <Head>
          <title>Loading Results - Black Pepper Knowledge base</title>
        </Head>
        <div className={styles.container}>
          <div className={styles.loader}>
            <div className={styles.spinnerRing}></div>
            <p>Loading BLAST results...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>BLAST Results - Black Pepper Knowledge base</title>
        <meta name="description" content="BLAST sequence analysis results" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>BLAST Search Results</h1>
            <div className={styles.headerActions}>
              <button
                onClick={() => router.push("/blast")}
                className={styles.backButton}
              >
                <ArrowLeft size={16} />
                New Search
              </button>
              {blastResults && blastResults.length > 0 && (
                <button onClick={exportResults} className={styles.exportButton}>
                  <Download size={16} />
                  Export Results
                </button>
              )}
            </div>
          </div>

          {/* Display program information and metadata */}
          {programInfo.program && (
            <div className={styles.programInfo}>
              <div className={styles.programTag}>
                <span className={styles.programLabel}>Program:</span>
                <span className={styles.programValue}>
                  {programInfo.program.toUpperCase()}
                </span>
              </div>
              <div className={styles.programTag}>
                <span className={styles.programLabel}>Database:</span>
                <span className={styles.programValue}>
                  {programInfo.database}
                </span>
              </div>
              {executionTime && (
                <div className={styles.programTag}>
                  <span className={styles.programLabel}>Time:</span>
                  <span className={styles.programValue}>{executionTime}ms</span>
                </div>
              )}
              {timestamp && (
                <div className={styles.programTag}>
                  <span className={styles.programLabel}>Date:</span>
                  <span className={styles.programValue}>
                    {new Date(timestamp).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Results summary with better styling */}
          {blastResults && blastResults.length > 0 && (
            <div className={styles.resultsSummary}>
              <div className={styles.summaryContent}>
                <div className={styles.summaryText}>
                  <h3>
                    {blastResults.length} significant match
                    {blastResults.length !== 1 ? "es" : ""} found
                  </h3>
                  <p>Click on any result to view detailed alignments</p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Display error message or no results message */}
        <ResultsMessage />

        {/* Handle error state */}
        {error && !errorMessage && (
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>!</div>
            <h3>Error Loading Results</h3>
            <p>{error}</p>
            <div className={styles.actionButtons}>
              <button
                onClick={() => router.push("/blast")}
                className={styles.goBackButton}
              >
                <ArrowLeft size={16} />
                Go Back to BLAST Search
              </button>
              <button
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Display results if available */}
        {blastResults && blastResults.length > 0 && (
          <div className={styles.resultsGrid}>
            {blastResults.map((hit, hitIndex) => (
              <div key={hitIndex} className={styles.resultCard}>
                <div
                  className={styles.resultHeader}
                  onClick={() => toggleResultExpansion(hitIndex)}
                >
                  <div className={styles.resultTitleSection}>
                    <h3 className={styles.resultTitle}>
                      Hit {hitIndex + 1}: {hit.description}
                    </h3>
                    <div className={styles.resultId}>ID: {hit.id}</div>
                  </div>
                  <div className={styles.resultStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Score</span>
                      <span className={styles.statValue}>{hit.score}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>E-value</span>
                      <span className={styles.statValue}>
                        {formatEValue(hit.evalue)}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Length</span>
                      <span className={styles.statValue}>
                        {hit.alignLength} {getLengthUnit()}
                      </span>
                    </div>
                  </div>
                  <div className={styles.expandIcon}>
                    {expandedResults[hitIndex] ? "▼" : "▶"}
                  </div>
                </div>

                {expandedResults[hitIndex] && (
                  <div className={styles.alignmentsContainer}>
                    <h4 className={styles.alignmentsTitle}>
                      <AlignJustify
                        size={18}
                        className={styles.alignmentIcon}
                      />
                      <span>Alignments ({hit.alignments.length})</span>
                    </h4>

                    {hit.alignments.length > 0 ? (
                      hit.alignments.map((alignment, alignmentIndex) => (
                        <div
                          key={alignment.id}
                          className={styles.alignmentCard}
                        >
                          <div className={styles.alignmentInfo}>
                            <h5 className={styles.alignmentTitle}>
                              Alignment {alignmentIndex + 1}
                            </h5>
                            <div className={styles.rangeInfo}>
                              <div className={styles.rangeItem}>
                                <span className={styles.rangeLabel}>Query</span>
                                <span className={styles.rangeValue}>
                                  {alignment.queryFrom} - {alignment.queryTo}
                                </span>
                              </div>
                              <div className={styles.rangeItem}>
                                <span className={styles.rangeLabel}>Hit</span>
                                <span className={styles.rangeValue}>
                                  {alignment.hitFrom} - {alignment.hitTo}
                                </span>
                              </div>
                              <div className={styles.rangeItem}>
                                <span className={styles.rangeLabel}>
                                  Length
                                </span>
                                <span className={styles.rangeValue}>
                                  {alignment.alignLength} {getLengthUnit()}
                                </span>
                              </div>
                              <div className={styles.rangeItem}>
                                <span className={styles.rangeLabel}>
                                  Identity
                                </span>
                                <span className={styles.rangeValue}>
                                  {calculateIdentityPercentage(
                                    alignment.identity,
                                    alignment.alignLength
                                  )}
                                  {alignment.identity !== "N/A" &&
                                    alignment.alignLength !== "N/A" &&
                                    ` (${alignment.identity}/${alignment.alignLength})`}
                                </span>
                              </div>
                              <div className={styles.rangeItem}>
                                <span className={styles.rangeLabel}>Gaps</span>
                                <span className={styles.rangeValue}>
                                  {alignment.gaps}
                                </span>
                              </div>
                              <div className={styles.rangeItem}>
                                <span className={styles.rangeLabel}>
                                  Bit Score
                                </span>
                                <span className={styles.rangeValue}>
                                  {alignment.bitScore}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className={styles.sequenceViewer}>
                            <div className={styles.sequencePair}>
                              <div className={styles.sequenceLabel}>Query</div>
                              <pre className={styles.querySeq}>
                                {alignment.querySeq}
                              </pre>
                            </div>

                            <div className={styles.sequencePair}>
                              <div className={styles.sequenceLabel}></div>
                              <pre className={styles.midline}>
                                {alignment.midline}
                              </pre>
                            </div>

                            <div className={styles.sequencePair}>
                              <div className={styles.sequenceLabel}>Hit</div>
                              <pre className={styles.hitSeq}>
                                {alignment.hitSeq}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.noAlignments}>
                        <p>No alignments available for this hit</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ResultBlast;
