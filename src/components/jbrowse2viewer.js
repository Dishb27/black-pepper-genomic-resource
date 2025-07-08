import React, { useEffect, useRef } from "react";
import {
  createViewState,
  JBrowseLinearGenomeView,
} from "@jbrowse/react-linear-genome-view";

const JBrowse2Viewer = () => {
  console.log("Rendering component...");
  const viewerRef = useRef(null);

  const viewState = createViewState({
    assembly: {
      name: "Piper_nigrum.genome",
      sequence: {
        type: "ReferenceSequenceTrack",
        trackId: "refseq_track",
        adapter: {
          type: "BgzipFastaAdapter",
          fastaLocation: {
            uri: "https://piper-nigrum-genomics.s3.eu-north-1.amazonaws.com/Piper_nigrum.genome.fa.gz",
          },
          faiLocation: {
            uri: "https://piper-nigrum-jbrowse.web.app/Piper_nigrum.genome.fa.gz.fai",
          },
          gziLocation: {
            uri: "https://piper-nigrum-jbrowse.web.app/Piper_nigrum.genome.fa.gz.gzi",
          },
        },
      },
    },
    tracks: [
      {
        type: "FeatureTrack",
        trackId: "gff_track",
        name: "Annotations",
        adapter: {
          type: "Gff3TabixAdapter",
          gffGzLocation: {
            uri: "https://piper-nigrum-genomics.s3.eu-north-1.amazonaws.com/Piper_nigrum_edited.sorted.gff.gz",
          },
          index: {
            location: {
              uri: "https://piper-nigrum-genomics.s3.eu-north-1.amazonaws.com/Piper_nigrum_edited.sorted.gff.gz.tbi",
            },
            indexType: "TBI",
          },
        },
        assemblyNames: ["Piper_nigrum.genome"],
      },
      // Add VCF track for variants
      {
        type: "VariantTrack",
        trackId: "vcf_track",
        name: "Variants",
        adapter: {
          type: "VcfTabixAdapter",
          vcfGzLocation: {
            uri: "https://piper-nigrum-jbrowse.web.app/20miss.recode.vcf.gz", // Path to your VCF file
          },
          index: {
            location: {
              uri: "https://piper-nigrum-jbrowse.web.app/20miss.recode.vcf.gz.tbi", // Path to your index file
            },
            indexType: "TBI", // Tabix index type
          },
        },
        assemblyNames: ["Piper_nigrum.genome"],
      },
    ],
  });

  useEffect(() => {
    // Ensuring viewerRef is not null before performing any operations
    if (viewerRef.current) {
      // Do something with the ref (e.g., interact with JBrowse component)
      console.log("Viewer mounted successfully");
    }
  }, []);

  return (
    <div ref={viewerRef}>
      <JBrowseLinearGenomeView viewState={viewState} />
    </div>
  );
};

export default JBrowse2Viewer;
