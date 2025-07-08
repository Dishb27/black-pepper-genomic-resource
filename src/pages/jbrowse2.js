import React from "react";
import dynamic from "next/dynamic";
import styles from "../styles/jbrowse2.module.css";
import Footer from "../components/footer";
import Header from "../components/header";

const JBrowse2Viewer = dynamic(() => import("../components/jbrowse2viewer"), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingContainer}>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
    </div>
  ),
});

const JBrowse2Page = () => {
  return (
    <>
      <Header />
      {/* Main Content */}
      <div className={styles.pageContainer}>
        <h1 className={styles.heading}>
          <em>Piper nigrum</em> Genome Browser (JBrowse 2)
        </h1>
        <h3 className={styles.subHeading}>
          Explore the reference genome of black pepper (<em> Piper nigrum </em>)
          with integrated gene annotations (GFF3) and genomic variants.{" "}
        </h3>
        {/* <p className={styles.description}>
          Explore the Piper nigrum genome, with reference sequences, GFF3
          annotations, and variant data.
        </p> */}
        <JBrowse2Viewer />
      </div>

      <Footer />
    </>
  );
};

export default JBrowse2Page;
