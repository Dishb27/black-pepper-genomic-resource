import { useEffect, useState } from "react";
import Heatmap from "../components/heatmap";
import { processSNPData } from "../utils/processSNP";
import { DNA } from "react-loader-spinner";

export default function Home() {
  const [chromosomes, setChromosomes] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  // Function to load the file from the public directory
  const loadFile = async () => {
    try {
      const response = await fetch("/data/processed_vcf_data.txt");
      if (!response.ok) {
        throw new Error("Failed to fetch the file");
      }

      const textContent = await response.text();
      const { chromosomes, heatmapData } = processSNPData(textContent);
      setChromosomes(chromosomes);
      setHeatmapData(heatmapData);
    } catch (error) {
      console.error("Error loading the file:", error);
    }
  };

  useEffect(() => {
    loadFile();
  }, []); // Load file when the component mounts

  return (
    <div
      style={{
        padding: "1rem",
        boxSizing: "border-box",
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f9f9f9",
      }}
    >
      {heatmapData.length > 0 ? (
        <div
          style={{
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          <Heatmap chromosomes={chromosomes} heatmapData={heatmapData} />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "80vh",
            padding: "1rem",
            width: "100%",
          }}
        >
          <DNA
            color="#2b655d"
            height={window.innerWidth < 500 ? 100 : 200}
            width={window.innerWidth < 500 ? 100 : 200}
          />
        </div>
      )}
    </div>
  );
}
