import React, { useState } from "react";
import Head from "next/head";
import GeneStructure from "../components/GeneStructure";
import styles from "../styles/genetool.module.css";
import Header from "../components/header";
import Footer from "../components/footer";

const MAX_GENES = 5;

const GeneToolPage = () => {
  const [geneIds, setGeneIds] = useState("");
  const [geneDetails, setGeneDetails] = useState([]);
  const [error, setError] = useState("");
  const [invalidGeneIds, setInvalidGeneIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rawGeneData, setRawGeneData] = useState([]);

  const fetchGeneData = async (ids) => {
    setIsLoading(true);
    try {
      // Make API call to fetch gene data
      const response = await fetch("/api/genes-by-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ geneIds: ids }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const fetchedGenes = await response.json();

      // Store raw data for download
      setRawGeneData(fetchedGenes);

      // Check which IDs were not found
      const fetchedIds = fetchedGenes.map((gene) => gene.GeneID.toUpperCase());
      const notFoundIds = ids.filter(
        (id) => !fetchedIds.includes(id.toUpperCase())
      );

      setInvalidGeneIds(notFoundIds);

      // Transform fetched data to the format expected by the component
      const formattedGenes = fetchedGenes.map((gene) => {
        // Parse exon ranges from the database format (comma-separated ranges)
        const exonRanges = gene.ExonRange
          ? gene.ExonRange.split(", ").map((range) => range)
          : [];

        // Parse intron ranges from the database format (comma-separated ranges)
        const intronRanges =
          gene.IntronRange && gene.IntronRange !== "-"
            ? gene.IntronRange.split(", ").map((range) => range)
            : [];

        return {
          id: gene.GeneID,
          geneRange: gene.GeneRange,
          exons: exonRanges,
          introns: intronRanges,
          numberOfExons: gene.NumberOfExons || 0,
          numberOfIntrons: gene.NumberOfIntrons || 0,
        };
      });

      setGeneDetails(formattedGenes);

      if (formattedGenes.length === 0) {
        setError("No valid GeneIDs found.");
      } else {
        setError("");
      }
    } catch (err) {
      console.error("Error fetching gene data:", err);
      setError("Failed to fetch gene data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setInvalidGeneIds([]);

    const ids = geneIds
      .toUpperCase()
      .split(/[,\n]+/)
      .map((id) => id.trim())
      .filter((id) => id);

    if (ids.length === 0) {
      setError("Please enter at least one GeneID.");
      return;
    }

    if (ids.length > MAX_GENES) {
      setError(`You can enter a maximum of ${MAX_GENES} GeneIDs.`);
      return;
    }

    fetchGeneData(ids);
  };

  const handleClear = () => {
    setGeneIds("");
    setGeneDetails([]);
    setError("");
    setInvalidGeneIds([]);
    setRawGeneData([]);
  };

  const handleExample = () => {
    setGeneIds("Pn1.2085, Pn1.102, Pn10.1094, Pn11.2697, Pn15.2213");
  };

  // Function to download gene data as CSV
  const downloadCSV = () => {
    if (rawGeneData.length === 0) {
      alert("No data available to download.");
      return;
    }

    // Define CSV headers based on database structure
    const headers = [
      "GeneID",
      "Chromosome",
      "GeneRange",
      "NumberOfExons",
      "ExonRanges",
      "NumberOfIntrons",
      "IntronRanges",
      "CDS_Sequence",
      "ProteinSequence",
    ];

    // Create CSV content
    const csvContent = [
      headers.join(","), // Header row
      ...rawGeneData.map((gene) =>
        [
          gene.GeneID || "",
          gene.Chromosome || "",
          gene.GeneRange || "",
          gene.NumberOfExons || 0,
          `"${gene.ExonRange || ""}"`, // Wrap in quotes to handle commas
          gene.NumberOfIntrons || 0,
          `"${gene.IntronRange || ""}"`, // Wrap in quotes to handle commas
          `"${gene.CDS_Sequence || ""}"`, // Wrap in quotes for long sequences
          `"${gene.ProteinSequence || ""}"`, // Wrap in quotes for long sequences
        ].join(",")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `gene_data_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to download gene data as TSV
  const downloadTSV = () => {
    if (rawGeneData.length === 0) {
      alert("No data available to download.");
      return;
    }

    // Define TSV headers
    const headers = [
      "GeneID",
      "Chromosome",
      "GeneRange",
      "NumberOfExons",
      "ExonRanges",
      "NumberOfIntrons",
      "IntronRanges",
      "CDS_Sequence",
      "ProteinSequence",
    ];

    // Create TSV content
    const tsvContent = [
      headers.join("\t"), // Header row
      ...rawGeneData.map((gene) =>
        [
          gene.GeneID || "",
          gene.Chromosome || "",
          gene.GeneRange || "",
          gene.NumberOfExons || 0,
          gene.ExonRange || "",
          gene.NumberOfIntrons || 0,
          gene.IntronRange || "",
          gene.CDS_Sequence || "",
          gene.ProteinSequence || "",
        ].join("\t")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([tsvContent], {
      type: "text/tab-separated-values;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `gene_data_${new Date().toISOString().split("T")[0]}.tsv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Customize styles for gene structure
  const exonStyles = {
    fillColor: "#137369", // Custom color for exon
    height: 25, // Custom height for exons
  };

  const intronStyles = {
    strokeColor: "#949494", // Custom color for introns
    strokeWidth: 3, // Custom width for intron lines
  };

  return (
    <>
      <Head>
        <title>GeneViz - PepperKB</title>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
      </Head>

      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>GeneViz</h1>
        <p className={styles.subtitle}>
          Visualize the structure of your gene(s) of interest. Input Gene IDs to
          generate detailed exon-intron structures.
        </p>

        <div className={styles.formCard}>
          <button
            type="button"
            onClick={handleExample}
            className={styles.exampleBtn}
          >
            Try an Example
          </button>

          <form onSubmit={handleSubmit}>
            <textarea
              value={geneIds}
              onChange={(e) => setGeneIds(e.target.value)}
              placeholder={`Enter up to ${MAX_GENES} gene IDs, separated by commas or new lines.`}
              rows={5}
              className={styles.textarea}
            />
            <div className={styles.buttons}>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Submit"}
              </button>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
          </form>

          {error && <div className={styles.error}>{error}</div>}

          {invalidGeneIds.length > 0 && (
            <div className={styles.warning}>
              The following GeneIDs were not found: {invalidGeneIds.join(", ")}
            </div>
          )}
        </div>

        {/* Gene Structure Visualizations */}
        <div className={styles.results}>
          {geneDetails.map((gene) =>
            gene ? (
              <div key={gene.id} className={styles.geneCard}>
                <h3 className={styles.geneTitle}>{gene.id}</h3>
                <div className={styles.geneInfoCard}>
                  <h4 className={styles.subHeading}>
                    Number of Exons:{" "}
                    <span className={styles.boldText}>
                      {gene.numberOfExons}
                    </span>
                  </h4>
                  <h4 className={styles.subHeading}>
                    Number of Introns:{" "}
                    <span className={styles.boldText}>
                      {gene.numberOfIntrons}
                    </span>
                  </h4>
                </div>
                {gene.geneRange && gene.exons && gene.introns ? (
                  <div className={styles.geneContent}>
                    <GeneStructure
                      geneRange={gene.geneRange}
                      exons={gene.exons}
                      introns={gene.introns}
                      exonStyles={exonStyles}
                      intronStyles={intronStyles}
                    />
                  </div>
                ) : (
                  <p className={styles.error}>
                    Data not available for {gene.id}
                  </p>
                )}
              </div>
            ) : null
          )}
        </div>

        {/* Detailed Gene Information Table */}
        {rawGeneData.length > 0 && (
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <div className={styles.tableHeaderLeft}>
                <h2 className={styles.tableTitle}>Detailed Gene Information</h2>
                <p className={styles.tableDescription}>
                  Access complete gene data, including chromosomal locations,
                  genomic ranges and corresponding CDS and protein sequences.
                </p>
              </div>

              {/* Download Section moved into table container */}
              <div className={styles.downloadSection}>
                <h3 className={styles.downloadTitle}>Download Data</h3>
                <p className={styles.downloadDescription}>
                  Retrieve the complete gene information, including full
                  sequences, for detailed analysis.
                </p>
                <div className={styles.downloadButtons}>
                  <button
                    type="button"
                    className={styles.downloadBtn}
                    onClick={downloadCSV}
                  >
                    <i className="fas fa-download"></i> Download CSV
                  </button>
                  <button
                    type="button"
                    className={styles.downloadBtn}
                    onClick={downloadTSV}
                  >
                    <i className="fas fa-download"></i> Download TSV
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.geneTable}>
                <thead>
                  <tr>
                    <th>Gene ID</th>
                    <th>Chromosome</th>
                    <th>Genomic Range</th>
                    <th>Exons Counts</th>
                    <th>Exon Coordinates</th>
                    <th>Intron Counts</th>
                    <th>Intron Coordinates</th>
                    <th>Coding Sequence</th>
                    <th>Protein Sequence</th>
                  </tr>
                </thead>
                <tbody>
                  {rawGeneData.map((gene, index) => (
                    <tr key={gene.GeneID || index}>
                      <td className={styles.geneIdCell}>
                        {gene.GeneID || "-"}
                      </td>
                      <td>{gene.Chromosome || "-"}</td>
                      <td>{gene.GeneRange || "-"}</td>
                      <td className={styles.numberCell}>
                        {gene.NumberOfExons || 0}
                      </td>
                      <td className={styles.sequenceCell}>
                        {gene.ExonRange ? (
                          <div className={styles.sequencePreview}>
                            {gene.ExonRange.length > 50
                              ? `${gene.ExonRange.substring(0, 50)}...`
                              : gene.ExonRange}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={styles.numberCell}>
                        {gene.NumberOfIntrons || 0}
                      </td>
                      <td className={styles.sequenceCell}>
                        {gene.IntronRange && gene.IntronRange !== "-" ? (
                          <div className={styles.sequencePreview}>
                            {gene.IntronRange.length > 50
                              ? `${gene.IntronRange.substring(0, 50)}...`
                              : gene.IntronRange}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={styles.sequenceCell}>
                        {gene.CDS_Sequence ? (
                          <div className={styles.sequencePreview}>
                            {gene.CDS_Sequence.length > 30
                              ? `${gene.CDS_Sequence.substring(0, 30)}...`
                              : gene.CDS_Sequence}
                            <div className={styles.sequenceLength}>
                              ({gene.CDS_Sequence.length} bp)
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={styles.sequenceCell}>
                        {gene.ProteinSequence ? (
                          <div className={styles.sequencePreview}>
                            {gene.ProteinSequence.length > 30
                              ? `${gene.ProteinSequence.substring(0, 30)}...`
                              : gene.ProteinSequence}
                            <div className={styles.sequenceLength}>
                              ({gene.ProteinSequence.length} aa)
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.tableNote}>
              <i className="fas fa-info-circle"></i>
              <span>
                Sequences are truncated for display. Download the complete data
                using the buttons above for full sequences.
              </span>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default GeneToolPage;
