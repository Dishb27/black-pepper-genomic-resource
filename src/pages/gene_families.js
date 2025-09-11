import Head from "next/head";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Header from "../components/header";
import Footer from "../components/footer";
import styles from "../styles/gene_families.module.css";

const GeneFamilies = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [downloadingFamily, setDownloadingFamily] = useState(null);
  const [downloadingType, setDownloadingType] = useState(null);
  const router = useRouter();

  // Enhanced loading messages
  const loadingMessages = [
    { message: "Connecting to database...", progress: 20 },
    { message: "Fetching gene family data...", progress: 40 },
    { message: "Processing family information...", progress: 60 },
    { message: "Organizing results...", progress: 80 },
    { message: "Almost ready...", progress: 95 },
  ];

  // Simulate progressive loading updates
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          const newProgress = Math.min(prev + 2, 95);

          // Update message based on progress
          const currentMessage = loadingMessages.find(
            (msg) =>
              newProgress >= msg.progress - 20 && newProgress < msg.progress
          );
          if (currentMessage) {
            setLoadingMessage(currentMessage.message);
          }

          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [loading]);

  // Fetch gene families from the API
  useEffect(() => {
    const fetchGeneFamilies = async () => {
      try {
        setLoadingMessage("Connecting to server...");
        setLoadingProgress(10);

        const response = await fetch("/api/geneFamilies");

        setLoadingMessage("Receiving data...");
        setLoadingProgress(50);

        if (!response.ok) {
          throw new Error("Failed to fetch gene families");
        }

        const data = await response.json();

        setLoadingMessage("Processing gene families...");
        setLoadingProgress(80);

        // Sort families alphabetically by TF_Family
        const sortedFamilies = data.sort((a, b) =>
          a.TF_Family.localeCompare(b.TF_Family)
        );

        setLoadingMessage("Finalizing...");
        setLoadingProgress(100);

        // Small delay to show completion
        setTimeout(() => {
          setFamilies(sortedFamilies);
          setLoading(false);
        }, 300);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchGeneFamilies();
  }, []);

  const handleFamilyClick = (familyName) => {
    const formattedFamilyName = familyName.toLowerCase().replace(/\s+/g, "-");
    router.push(`/families/${formattedFamilyName}`);
  };

  // Handle sequence downloads with better feedback
  const handleDownload = async (familyName, sequenceType) => {
    setDownloadingFamily(familyName);
    setDownloadingType(sequenceType);

    try {
      const response = await fetch(
        `/api/download-sequences?family=${encodeURIComponent(
          familyName
        )}&type=${sequenceType}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to download ${sequenceType} sequences`
        );
      }

      // Get the filename from the response headers or create a default one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${familyName}_${sequenceType}_sequences.fasta`;

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
      alert(`Error downloading ${sequenceType} sequences: ${error.message}`);
    } finally {
      setDownloadingFamily(null);
      setDownloadingType(null);
    }
  };

  // Group families by first letter for alphabetical categorization
  const groupedFamilies = families.reduce((acc, family) => {
    const firstLetter = family.TF_Family.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(family);
    return acc;
  }, {});

  const categories = Object.keys(groupedFamilies).sort();

  // Enhanced Loading Component
  const LoadingComponent = () => (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCard}>
        <div className={styles.loadingIcon}>
          <i className="fas fa-dna fa-2x"></i>
        </div>

        <h3 className={styles.loadingTitle}>Loading Gene Families</h3>
        <p className={styles.loadingSubtitle}>
          Fetching TF family data from the database...
        </p>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className={styles.progressText}>
            {Math.round(loadingProgress)}%
          </div>
        </div>

        <p className={styles.loadingMessage}>
          <i className="fas fa-circle-notch fa-spin"></i>
          {loadingMessage}
        </p>

        <div className={styles.loadingDisclaimer}>
          <i className="fas fa-info-circle"></i>
          <span>
            This may take a few seconds as we fetch comprehensive genomic data
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.appContainer}>
      <Head>
        <title>Gene Families - Black Pepper Knowledge Base</title>
        <meta
          name="description"
          content="Explore gene families of black pepper"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
      </Head>

      <Header />

      <main className={styles.mainContent}>
        <div className={styles.heroSection}>
          <h2>TF Families of Black Pepper</h2>
          <p className={styles.subtitle}>
            Explore the genomic diversity of <em>Piper nigrum</em>
          </p>
        </div>

        {loading && <LoadingComponent />}

        {error && (
          <div className={styles.errorMessage}>
            <i className="fas fa-exclamation-circle"></i>
            <div>
              <p>
                <strong>Unable to load gene families</strong>
              </p>
              <p>Error: {error}</p>
              <button
                className={styles.retryButton}
                onClick={() => window.location.reload()}
              >
                <i className="fas fa-redo"></i>
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className={styles.familiesContainer}>
            <div className={styles.familiesHeader}>
              <div className={styles.familiesStats}>
                <i className="fas fa-chart-bar"></i>
                <span>{families.length} gene families loaded</span>
              </div>
            </div>

            <div className={styles.categoryTabs}>
              <button
                className={`${styles.categoryTab} ${
                  activeCategory === "all" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveCategory("all")}
              >
                All ({families.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`${styles.categoryTab} ${
                    activeCategory === category ? styles.activeTab : ""
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category} ({groupedFamilies[category].length})
                </button>
              ))}
            </div>

            <div className={styles.familiesGrid}>
              {(activeCategory === "all"
                ? families
                : groupedFamilies[activeCategory]
              ).map((family, index) => (
                <div key={index} className={styles.familyCard}>
                  <div
                    className={styles.familyCardContent}
                    onClick={() => handleFamilyClick(family.TF_Family)}
                  >
                    <div className={styles.familyIcon}>
                      <i className="fas fa-dna"></i>
                    </div>
                    <h3 className={styles.familyName}>{family.TF_Family}</h3>
                    {family.Gene_Count && (
                      <div className={styles.familyMeta}>
                        <span className={styles.geneCount}>
                          {family.Gene_Count} genes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Download Options */}
                  <div className={styles.downloadSection}>
                    <div className={styles.downloadButtons}>
                      <button
                        className={styles.downloadBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(family.TF_Family, "cds");
                        }}
                        disabled={
                          downloadingFamily === family.TF_Family &&
                          downloadingType === "cds"
                        }
                        title="Download CDS sequences"
                      >
                        {downloadingFamily === family.TF_Family &&
                        downloadingType === "cds" ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-download"></i>
                        )}
                        CDS
                      </button>

                      <button
                        className={styles.downloadBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(family.TF_Family, "protein");
                        }}
                        disabled={
                          downloadingFamily === family.TF_Family &&
                          downloadingType === "protein"
                        }
                        title="Download protein sequences"
                      >
                        {downloadingFamily === family.TF_Family &&
                        downloadingType === "protein" ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-download"></i>
                        )}
                        Protein
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default GeneFamilies;
