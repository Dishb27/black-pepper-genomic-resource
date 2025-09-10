import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import styles from "../styles/pepperClust.module.css";
import Header from "../components/header";
import Footer from "../components/footer";

const PepperClustPage = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [showDismissableBox, setShowDismissableBox] = useState(true);
  const iframeRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024); // Changed to 1024px for better tablet support
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Set a timeout to handle cases where the iframe never loads
    loadingTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setLoadingError(true);
        setIsLoading(false);
      }
    }, 30000); // 30 seconds timeout

    return () => {
      window.removeEventListener("resize", checkMobile);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  const handleIframeLoad = () => {
    // Clear the timeout since iframe loaded successfully
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Add a small delay to ensure the Shiny app is fully rendered
    setTimeout(() => {
      setIsLoading(false);
      setLoadingError(false);
    }, 2000); // 2 second delay to ensure Shiny app content is visible

    // Try to communicate with the iframe about viewport size
    if (iframeRef.current) {
      try {
        // Send viewport information to the Shiny app
        const message = {
          type: "viewport-update",
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: window.innerWidth <= 768,
        };

        iframeRef.current.contentWindow?.postMessage(message, "*");
      } catch (e) {
        console.log("Could not communicate with iframe (CORS restriction)", e);
      }
    }
  };

  const handleIframeError = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    setIsLoading(false);
    setLoadingError(true);
  };

  const openInNewTab = () => {
    window.open("https://dish2711.shinyapps.io/pepperClust/", "_blank");
  };

  const retryLoading = () => {
    setIsLoading(true);
    setLoadingError(false);

    // Reload the iframe by changing its src
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = "";
      setTimeout(() => {
        iframeRef.current.src = currentSrc;
      }, 100);
    }

    // Reset timeout
    loadingTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setLoadingError(true);
        setIsLoading(false);
      }
    }, 30000);
  };

  const handleDismissBox = () => {
    // Add closing animation class
    const box = document.querySelector(`.${styles.dismissableBox}`);
    if (box) {
      box.classList.add(styles.closing);
      setTimeout(() => {
        setShowDismissableBox(false);
      }, 300); // Match animation duration
    }
  };

  return (
    <>
      <Head>
        <title>PepperClust - PepperKB</title>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Header />
      <main className={styles.appContainer}>
        <div className={styles.heroSection}>
          <h1 className={styles.appTitle}>PepperClust</h1>
          <p className={styles.appDescription}>
            Explore gene clustering using interactive heatmaps and dendrogram
          </p>

          {/* Mobile-specific notice - only show on mobile */}
          {isMobile && (
            <div className={styles.mobileNotice}>
              <p className={styles.noticeText}>
                <i className="fas fa-mobile-alt"></i>
                For better mobile experience, we recommend opening the app in a
                new tab
              </p>
            </div>
          )}
        </div>

        <div className={styles.contentContainer}>
          {/* Dismissable Box - positioned above iframe container */}
          {showDismissableBox && (
            <div className={styles.dismissableContainer}>
              <div className={styles.dismissableBox}>
                <div className={styles.dismissableHeader}>
                  {/* <h3 className={styles.dismissableTitle}>
                    App Loading Information
                  </h3> */}
                  <button
                    className={styles.closeButton}
                    onClick={handleDismissBox}
                    aria-label="Close notification"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <p className={styles.dismissableText}>
                  This app may take a few seconds to load. Click here if you
                  prefer to open it in a new tab.
                </p>
                <button
                  className={styles.dismissableButton}
                  onClick={openInNewTab}
                >
                  <i className="fas fa-external-link-alt"></i>
                  Open in New Tab
                </button>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.iframeContainer}>
              {/* Loading Overlay */}
              {isLoading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.loadingContent}>
                    <div className={styles.spinner}></div>
                    <h3 className={styles.loadingTitle}>
                      Loading PepperClust...
                    </h3>
                    <p className={styles.loadingText}>
                      Please wait while we initialize the gene clustering
                      application
                    </p>
                    <div className={styles.loadingSteps}>
                      <div className={styles.loadingStep}>
                        <i className="fas fa-server"></i>
                        <span>Connecting to server</span>
                      </div>
                      <div className={styles.loadingStep}>
                        <i className="fas fa-database"></i>
                        <span>Loading gene data</span>
                      </div>
                      <div className={styles.loadingStep}>
                        <i className="fas fa-chart-line"></i>
                        <span>Preparing visualizations</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Overlay */}
              {loadingError && (
                <div className={styles.errorOverlay}>
                  <div className={styles.errorContent}>
                    <i
                      className={
                        styles.errorIcon + " fas fa-exclamation-triangle"
                      }
                    ></i>
                    <h3 className={styles.errorTitle}>Loading Failed</h3>
                    <p className={styles.errorText}>
                      The application is taking longer than expected to load.
                      This might be due to server maintenance or network issues.
                    </p>
                    <div className={styles.errorActions}>
                      <button
                        className={styles.retryBtn}
                        onClick={retryLoading}
                      >
                        <i className="fas fa-redo"></i>
                        Retry Loading
                      </button>
                      <button
                        className={styles.newTabBtn}
                        onClick={openInNewTab}
                      >
                        <i className="fas fa-external-link-alt"></i>
                        Open in New Tab
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <iframe
                ref={iframeRef}
                src="https://dish2711.shinyapps.io/pepperClust/"
                width="100%"
                height="800px"
                frameBorder="0"
                title="Pepper Gene Clustering"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{
                  minHeight: isMobile ? "600px" : "800px",
                  opacity: isLoading ? 0 : 1,
                  transition: "opacity 0.3s ease-in-out",
                }}
                // Enable scrolling on mobile
                scrolling={isMobile ? "yes" : "auto"}
                // Add sandbox permissions for better interaction
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock"
              />
            </div>

            {/* Alternative mobile view */}
            <div className={styles.mobileAlternative}>
              <p className={styles.alternativeText}>
                Having trouble with the embedded app?
                <button className={styles.linkButton} onClick={openInNewTab}>
                  Click here to open it directly
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PepperClustPage;
