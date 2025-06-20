import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import styles from "../styles/genes_structure.module.css";

const GeneStructure = ({
  geneRange,
  exons,
  introns,
  exonStyles,
  intronStyles,
  legendStyles,
  orientation = "forward",
}) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!geneRange || !exons) {
      console.error("Invalid gene data provided");
      return;
    }

    const [geneStart, geneEnd] = geneRange.split(":").map(Number);
    if (isNaN(geneStart) || isNaN(geneEnd)) {
      console.error("Invalid gene range format.");
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 100;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const scale = d3
      .scaleLinear()
      .domain([geneStart, geneEnd])
      .range([margin.left, width - margin.right]);

    svg
      .append("line")
      .attr("class", "gene-baseline")
      .attr("x1", scale(geneStart))
      .attr("x2", scale(geneEnd))
      .attr("y1", height / 2)
      .attr("y2", height / 2)
      .style("stroke", "#E0E0E0")
      .style("stroke-width", 2);

    if (introns && introns.length > 0) {
      svg
        .selectAll(".intron")
        .data(introns)
        .enter()
        .append("line")
        .attr("class", "intron")
        .attr("x1", (d) => {
          if (typeof d === "string" && d.includes(":")) {
            const [start] = d.split(":");
            return scale(parseInt(start));
          } else if (d && typeof d === "object" && d.start) {
            return scale(parseInt(d.start));
          } else {
            console.error("Invalid intron format:", d);
            return 0;
          }
        })
        .attr("x2", (d) => {
          if (typeof d === "string" && d.includes(":")) {
            const [, end] = d.split(":");
            return scale(parseInt(end));
          } else if (d && typeof d === "object" && d.end) {
            return scale(parseInt(d.end));
          } else {
            console.error("Invalid intron format:", d);
            return 0;
          }
        })
        .attr("y1", height / 2)
        .attr("y2", height / 2)
        .style("stroke", intronStyles?.strokeColor || "gray")
        .style("stroke-width", intronStyles?.strokeWidth || 4);
    }

    svg
      .selectAll(".exon")
      .data(exons)
      .enter()
      .append("rect")
      .attr("class", "exon")
      .attr("x", (d) => {
        if (typeof d === "string" && d.includes(":")) {
          const [start] = d.split(":");
          return scale(parseInt(start));
        } else if (d && typeof d === "object" && d.start) {
          return scale(parseInt(d.start));
        } else {
          console.error("Invalid exon format:", d);
          return 0;
        }
      })
      .attr("y", height / 2 - (exonStyles?.height || 20) / 2)
      .attr("width", (d) => {
        if (typeof d === "string" && d.includes(":")) {
          const [start, end] = d.split(":").map(Number);
          return scale(end) - scale(start);
        } else if (d && typeof d === "object" && d.start && d.end) {
          return scale(parseInt(d.end)) - scale(parseInt(d.start));
        } else {
          console.error("Invalid exon format:", d);
          return 0;
        }
      })
      .attr("height", exonStyles?.height || 20)
      .style("fill", exonStyles?.fillColor || "#37a496");

    const labelOffset = 15;

    if (orientation === "forward") {
      svg
        .append("text")
        .attr("class", "orientation-label")
        .attr("x", scale(geneStart) - 10)
        .attr("y", height / 2 - labelOffset)
        .attr("text-anchor", "end")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("5'");

      svg
        .append("text")
        .attr("class", "orientation-label")
        .attr("x", scale(geneEnd) + 10)
        .attr("y", height / 2 - labelOffset)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("3'");
    } else {
      svg
        .append("text")
        .attr("class", "orientation-label")
        .attr("x", scale(geneStart) - 10)
        .attr("y", height / 2 - labelOffset)
        .attr("text-anchor", "end")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("3'");

      svg
        .append("text")
        .attr("class", "orientation-label")
        .attr("x", scale(geneEnd) + 10)
        .attr("y", height / 2 - labelOffset)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("5'");
    }
  }, [geneRange, exons, introns, exonStyles, intronStyles, orientation]);

  return (
    <div className={styles.geneStructureContainer}>
      <svg ref={svgRef} width="800" height="150"></svg>

      <div
        className={legendStyles?.legendClass || styles.defaultLegendContainer}
      >
        <div className={styles.defaultLegend}>
          <div
            className={
              legendStyles?.legendRectClass || styles.defaultLegendRect
            }
            style={{ backgroundColor: exonStyles?.fillColor || "#37a496" }}
          />
          <span
            className={
              legendStyles?.legendTextClass || styles.defaultLegendText
            }
          >
            Exon
          </span>
        </div>

        <div className={styles.defaultLegend}>
          <div
            className={
              legendStyles?.legendRectClass || styles.defaultLegendRect
            }
            style={{
              backgroundColor: intronStyles?.strokeColor || "gray",
            }}
          />
          <span
            className={
              legendStyles?.legendTextClass || styles.defaultLegendText
            }
          >
            Intron
          </span>
        </div>
      </div>
    </div>
  );
};

GeneStructure.propTypes = {
  geneRange: PropTypes.string.isRequired,
  exons: PropTypes.array.isRequired,
  introns: PropTypes.array,
  exonStyles: PropTypes.object,
  intronStyles: PropTypes.object,
  legendStyles: PropTypes.object,
  orientation: PropTypes.oneOf(["forward", "reverse"]),
};

export default GeneStructure;
