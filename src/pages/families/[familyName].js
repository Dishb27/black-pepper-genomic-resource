import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  FaDna,
  FaSearch,
  FaTimes,
  FaDownload,
  FaSpinner,
} from "react-icons/fa";
import styles from "../../styles/genes.module.css";
import geneStructureStyles from "../../styles/genes_structure.module.css";
import Footer from "../../components/footer";
import Header from "../../components/header";
import GeneStructure from "../../components/GeneStructure";

// Gene Structure Popup Component (inline for completeness)
const GeneStructurePopup = ({ geneId, geneData, onClose }) => {
  const [gene, setGene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!geneId) {
      setError("Gene ID not provided.");
      setLoading(false);
      return;
    }

    try {
      // Find the gene matching the geneId from the passed data
      const selectedGene = geneData.find((gene) => gene.GeneID === geneId);

      if (selectedGene) {
        console.log("Matched Gene Data:", selectedGene);
        setGene(selectedGene);
      } else {
        console.error(`Gene with ID ${geneId} not found.`);
        setError(`Gene with ID ${geneId} not found.`);
      }
    } catch (err) {
      console.error("Error processing gene data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [geneId, geneData]);

  const renderGeneStructure = () => {
    if (!gene) return null;

    // Parse gene range from the database format
    const geneRange = gene.GeneRange;

    // Parse exon ranges from the database format (comma-separated ranges)
    const exonRanges = gene.ExonRanges
      ? gene.ExonRanges.split(", ").map((range) => {
          const [start, end] = range.split(":");
          return { start: parseInt(start), end: parseInt(end) };
        })
      : [];

    // Parse intron ranges from the database format (comma-separated ranges)
    const intronRanges = gene.IntronRanges
      ? gene.IntronRanges.split(", ").map((range) => {
          const [start, end] = range.split(":");
          return { start: parseInt(start), end: parseInt(end) };
        })
      : [];

    // Customize styles for gene structure
    const exonStyles = {
      fillColor: "#137369", // Example color for exon
      height: 25, // Custom height for exons
    };

    const intronStyles = {
      strokeColor: "#A9A9A9", // Example color for introns
      strokeWidth: 3, // Custom width for intron lines
    };

    const legendStyles = {
      legendClass: geneStructureStyles.customLegend,
      legendRectClass: geneStructureStyles.customLegendRect,
      legendTextClass: geneStructureStyles.customLegendText,
    };

    return (
      <GeneStructure
        geneRange={geneRange}
        exons={exonRanges}
        introns={intronRanges}
        exonStyles={exonStyles}
        intronStyles={intronStyles}
        legendStyles={legendStyles}
      />
    );
  };

  // Stop event propagation to prevent closing when clicking inside the modal
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={geneStructureStyles.modalOverlay} onClick={onClose}>
      <div
        className={geneStructureStyles.modalContent}
        onClick={handleModalClick}
      >
        <button className={geneStructureStyles.closeButton} onClick={onClose}>
          &times;
        </button>

        {loading ? (
          <p className={geneStructureStyles.loading}>Loading gene data...</p>
        ) : error ? (
          <p className={geneStructureStyles.error}>Error: {error}</p>
        ) : !gene ? (
          <p className={geneStructureStyles.error}>
            No data found for this gene.
          </p>
        ) : (
          <div className={geneStructureStyles.popupContent}>
            <div className={geneStructureStyles.geneInfoCard}>
              <h3 className={geneStructureStyles.geneId}>
                Gene ID: {gene.GeneID}
              </h3>
              <h4 className={geneStructureStyles.subHeading}>
                Number of Exons:{" "}
                <span className={geneStructureStyles.boldText}>
                  {gene.NumberOfExons || 0}
                </span>
              </h4>
              <h4 className={geneStructureStyles.subHeading}>
                Number of Introns:{" "}
                <span className={geneStructureStyles.boldText}>
                  {gene.NumberOfIntrons || 0}
                </span>
              </h4>
            </div>

            <div className={geneStructureStyles.visualizationCard}>
              <h4 className={geneStructureStyles.subHeading}>
                Gene Structure Visualization:
              </h4>
              {renderGeneStructure()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add PropTypes validation
GeneStructurePopup.propTypes = {
  geneId: PropTypes.string,
  geneData: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
};

// Main Family Page Component
const FamilyPage = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGeneId, setSelectedGeneId] = useState(null); // For popup functionality
  const [downloadingGene, setDownloadingGene] = useState(null); // Track which gene is being downloaded
  const [downloadingType, setDownloadingType] = useState(null); // Track download type
  const router = useRouter();
  const { familyName } = router.query;

  useEffect(() => {
    const fetchData = async () => {
      if (!familyName) return;

      try {
        const response = await fetch(`/api/genes?family=${familyName}`);
        if (!response.ok) {
          throw new Error("Failed to fetch gene data");
        }
        const result = await response.json();

        // Sort the result based on GeneID
        const sortedData = result.sort((a, b) => {
          // Extract numeric parts from GeneID (e.g., Pn1.102 -> [1, 102])
          const [chrA, numA] = a.GeneID.split(".");
          const [chrB, numB] = b.GeneID.split(".");

          // Extract numeric part from chromosome (e.g., Pn1 -> 1)
          const chrNumA = parseInt(chrA.replace("Pn", ""));
          const chrNumB = parseInt(chrB.replace("Pn", ""));

          // Compare chromosome numbers first
          if (chrNumA !== chrNumB) {
            return chrNumA - chrNumB;
          }

          // If same chromosome, compare the second part
          return parseInt(numA) - parseInt(numB);
        });

        setData(sortedData);
        setFilteredData(sortedData);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [familyName]);

  const handleSearch = (e) => {
    const term = e.target.value.trim();
    setSearchTerm(term);
  };

  const handleSearchButtonClick = () => {
    if (searchTerm === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter((gene) =>
        gene.Chromosome.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearchButtonClick();
    }
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setFilteredData(data);
  };

  // Handler to open the structure popup when a gene ID is clicked
  const handleGeneClick = (e, geneId) => {
    e.preventDefault(); // Prevent default link navigation
    setSelectedGeneId(geneId);
  };

  // Handler to close the popup
  const handleClosePopup = () => {
    setSelectedGeneId(null);
  };

  // Handler for individual gene sequence downloads
  const handleGeneDownload = async (geneId, sequenceType, e) => {
    e.stopPropagation(); // Prevent row click events

    setDownloadingGene(geneId);
    setDownloadingType(sequenceType);

    try {
      const response = await fetch(
        `/api/download-gene-sequence?geneId=${encodeURIComponent(
          geneId
        )}&type=${sequenceType}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to download ${sequenceType} sequence for ${geneId}`
        );
      }

      // Get the filename from the response headers or create a default one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${geneId}_${sequenceType}.fasta`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert(`Error downloading ${sequenceType} sequence: ${error.message}`);
    } finally {
      setDownloadingGene(null);
      setDownloadingType(null);
    }
  };

  return (
    <>
      <Head>
        <title>
          {familyName || "Gene"} TF Family - Black Pepper Knowledge base
        </title>
        <meta
          name="description"
          content={`${
            familyName || "Gene"
          } family information in the Black Pepper Knowledge base`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Header />

      <div className={styles.appContainer}>
        {/* Main Content */}
        <main className={styles.mainContent}>
          <div className={styles.familyHeader}>
            <FaDna className={styles.dnaIcon} />
            <h1>
              {familyName ? familyName.toUpperCase() : "Loading..."} Gene Family
            </h1>
          </div>

          {loading && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Loading gene data...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorContainer}>
              <p className={styles.errorMessage}>Error: {error}</p>
              <button
                className={styles.retryButton}
                onClick={() => router.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Search Bar */}
              <div className={styles.searchSection}>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Search by Chromosome ID"
                    value={searchTerm}
                    onChange={handleSearch}
                    onKeyPress={handleKeyPress}
                    className={styles.searchInput}
                  />

                  {searchTerm && (
                    <button
                      className={styles.resetButton}
                      onClick={handleResetSearch}
                    >
                      <FaTimes />
                    </button>
                  )}

                  <button
                    className={styles.searchButton}
                    onClick={handleSearchButtonClick}
                  >
                    <FaSearch />
                  </button>
                </div>

                <div className={styles.searchInfo}>
                  Showing {filteredData.length} of {data.length} genes
                </div>
              </div>

              {/* Data Table */}
              {filteredData.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Gene ID</th>
                        <th>Chromosome</th>
                        <th>Location</th>
                        <th>Download Sequences</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((gene) => (
                        <tr key={gene.GeneID}>
                          <td>
                            <a
                              href="#"
                              className={styles.geneLink}
                              onClick={(e) => handleGeneClick(e, gene.GeneID)}
                            >
                              {gene.GeneID}
                            </a>
                          </td>
                          <td>{gene.Chromosome}</td>
                          <td>{gene.GeneRange}</td>
                          <td>
                            <div className={styles.downloadButtonsContainer}>
                              <button
                                className={styles.downloadButton}
                                onClick={(e) =>
                                  handleGeneDownload(gene.GeneID, "cds", e)
                                }
                                disabled={
                                  downloadingGene === gene.GeneID &&
                                  downloadingType === "cds"
                                }
                                title="Download CDS sequence"
                              >
                                {downloadingGene === gene.GeneID &&
                                downloadingType === "cds" ? (
                                  <FaSpinner className={styles.spinning} />
                                ) : (
                                  <FaDownload />
                                )}
                                CDS
                              </button>
                              <button
                                className={styles.downloadButton}
                                onClick={(e) =>
                                  handleGeneDownload(gene.GeneID, "protein", e)
                                }
                                disabled={
                                  downloadingGene === gene.GeneID &&
                                  downloadingType === "protein"
                                }
                                title="Download Protein sequence"
                              >
                                {downloadingGene === gene.GeneID &&
                                downloadingType === "protein" ? (
                                  <FaSpinner className={styles.spinning} />
                                ) : (
                                  <FaDownload />
                                )}
                                Protein
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.noResults}>
                  <p>No genes found matching &quot;{searchTerm}&quot;</p>
                  <button
                    className={styles.resetSearchButton}
                    onClick={handleResetSearch}
                  >
                    Show all genes
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Render the popup when a gene is selected */}
      {selectedGeneId && (
        <GeneStructurePopup
          geneId={selectedGeneId}
          geneData={data}
          onClose={handleClosePopup}
        />
      )}

      <Footer />
    </>
  );
};

export default FamilyPage;
