import React from "react";
import dynamic from "next/dynamic";
import PropTypes from "prop-types";

// Dynamically import Plotly to disable SSR for this component
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const Heatmap = ({ chromosomes, heatmapData }) => {
  // Compute maximum row length for x-axis bins
  const maxLength = Math.max(...heatmapData.map((row) => row.length));

  return (
    <Plot
      data={[
        {
          z: heatmapData,
          x: Array.from({ length: maxLength }, (_, i) => `${i + 1}Mb`),
          y: chromosomes,
          type: "heatmap",
          colorscale: "Viridis",
        },
      ]}
      layout={{
        title: "SNP Distribution Heatmap",
        xaxis: { title: "1Mb Bins" },
        yaxis: { title: "Chromosomes" },
        height: 600,
        width: 1000,
        margin: { t: 50, l: 100, r: 50, b: 50 },
      }}
    />
  );
};

// Prop type validation for ESLint and code clarity
Heatmap.propTypes = {
  chromosomes: PropTypes.arrayOf(PropTypes.string).isRequired,
  heatmapData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))
    .isRequired,
};

export default Heatmap;
