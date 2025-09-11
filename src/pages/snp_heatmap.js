import React, { useEffect, useState } from "react";
import Heatmap from "../components/heatmap";
import { DNA } from "react-loader-spinner";

// eslint-disable-next-line react/prop-types
export default function SNPHeatmap({ studyId }) {
  const [chromosomes, setChromosomes] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [windowWidth, setWindowWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map study IDs to their respective AWS URLs
  const getHeatmapUrl = (study) => {
    // Debug logging to see what studyId is being passed
    console.log("Received studyId for heatmap:", study);
    console.log("StudyId type:", typeof study);

    // Convert to string for consistent comparison
    const studyString = String(study);

    const urls = {
      // Map based on your actual study_id values from the database
      "00N":
        "https://piper-nigrum-genomics.s3.eu-north-1.amazonaws.com/heatmap/snp_bins_556_new.json", // study1
      "00H":
        "https://piper-nigrum-genomics.s3.eu-north-1.amazonaws.com/heatmap/snp_bins_393_new.json", // study2

      // Also keep study name mappings as fallback
      study1:
        "https://piper-nigrum-genomics.s3.eu-north-1.amazonaws.com/heatmap/snp_bins_556_new.json",
      study2:
        "https://piper-nigrum-genomics.s3.eu-north-1.amazonaws.com/heatmap/snp_bins_393_new.json",
    };

    // Try exact match first
    if (urls[studyString]) {
      console.log("Found exact match for studyId:", studyString);
      return urls[studyString];
    }

    // Try lowercase match
    const lowerStudy = studyString.toLowerCase();
    if (urls[lowerStudy]) {
      console.log("Found lowercase match for studyId:", lowerStudy);
      return urls[lowerStudy];
    }

    // Default fallback - use study1 heatmap
    console.warn(
      "No match found for studyId:",
      study,
      "- using default (00N/study1)"
    );
    return urls["00N"];
  };

  const loadFile = async (study) => {
    if (!study) {
      console.log("No studyId provided to loadFile");
      setLoading(false);
      return;
    }

    // console.log("Loading heatmap data for study:", study);
    setLoading(true);
    setError(null);

    try {
      const url = getHeatmapUrl(study);
      console.log("Fetching heatmap from URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch SNP JSON: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Successfully loaded heatmap data:", data);

      // Validate data structure
      if (!data.chromosomes || !data.heatmapData) {
        throw new Error("Invalid heatmap data structure");
      }

      setChromosomes(data.chromosomes);
      setHeatmapData(data.heatmapData);
    } catch (error) {
      console.error("Error loading SNP JSON:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data when studyId changes
  useEffect(() => {
    console.log("studyId changed, loading new data:", studyId);
    loadFile(studyId);
  }, [studyId]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Error state
  if (error) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "#e74c3c",
          border: "1px solid #e74c3c",
          borderRadius: "8px",
          backgroundColor: "#fdf2f2",
        }}
      >
        <h3>Error Loading Heatmap</h3>
        <p>{error}</p>
        <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
          StudyId: {studyId}
        </p>
        <button
          onClick={() => loadFile(studyId)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#196f5f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
          padding: "1rem",
          width: "100%",
        }}
      >
        <DNA
          color="#2b655d"
          height={windowWidth && windowWidth < 500 ? 80 : 120}
          width={windowWidth && windowWidth < 500 ? 80 : 120}
        />
        <p style={{ marginTop: "1rem", color: "#666" }}>
          Loading heatmap data for study {studyId}...
        </p>
      </div>
    );
  }

  // No data state
  if (heatmapData.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "#666",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3>No Heatmap Data Available</h3>
        <p>No heatmap data found for study: {studyId}</p>
        <button
          onClick={() => loadFile(studyId)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#196f5f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // Success state - render heatmap
  return (
    <div
      style={{
        padding: "1rem",
        boxSizing: "border-box",
        width: "100%",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        marginBottom: "2rem",
      }}
    >
      <div style={{ marginBottom: "1rem", textAlign: "center" }}>
        {/* <h3 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
          SNP Distribution Heatmap
        </h3> */}
        {/* <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
          Study ID: {studyId} | Chromosomes: {chromosomes.length} | Data Points:{" "}
          {heatmapData.length}
        </p> */}
      </div>
      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <Heatmap chromosomes={chromosomes} heatmapData={heatmapData} />
      </div>
    </div>
  );
}
