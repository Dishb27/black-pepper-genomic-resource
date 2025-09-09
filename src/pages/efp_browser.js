import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import styles from "../styles/efpBrowser.module.css";
import Header from "../components/header";
import Footer from "../components/footer";

function EFPBrowserPage() {
  const [loadingState, setLoadingState] = useState({
    isLoading: true,
    iframeError: false,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const iframeRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Set a timeout to handle cases where the iframe never loads
    loadingTimeoutRef.current = setTimeout(() => {
      if (loadingState.isLoading) {
        setLoadingError(true);
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    }, 30000); // 30 seconds timeout

    return () => {
      window.removeEventListener("resize", checkMobile);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loadingState.isLoading]);

  const handleIframeLoad = () => {
    // Clear the timeout since iframe loaded successfully
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Add a small delay to ensure the Shiny app is fully rendered
    setTimeout(() => {
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
      }));
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
    setLoadingState({
      isLoading: false,
      iframeError: true,
    });
    setLoadingError(true);
  };

  const retryLoading = () => {
    setLoadingState({
      isLoading: true,
      iframeError: false,
    });
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
      if (loadingState.isLoading) {
        setLoadingError(true);
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    }, 30000);
  };

  const openInNewTab = () => {
    window.open("https://dish2711.shinyapps.io/pepper-eFP/", "_blank");
  };

  return (
    <>
      <Head>
        <title>eFP Browser - PepperKB</title>
        <meta
          name="description"
          content="Explore tissue-specific gene expression in peppers using the Expression Flower Plot (eFP) Browser"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Header />

      <main className={styles.appContainer}>
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.heroTextContainer}>
              <h1 className={styles.appTitle}>Pepper-eFP</h1>
              <p className={styles.appDescription}>
                Visualize tissue-specific gene expression patterns
              </p>

              {/* New Tab Button under description */}
              <div className={styles.quickAccessContainer}>
                <button className={styles.newTabBtn} onClick={openInNewTab}>
                  <i className="fas fa-external-link-alt"></i>
                  Open in New Tab
                </button>
                <p className={styles.quickAccessText}>
                  If the app takes too long to respond or doesn&apos;t load
                  properly
                </p>
              </div>
            </div>
          </div>

          {/* Mobile warning and external link */}
          {isMobile && (
            <div className={styles.mobileNotice}>
              <p className={styles.noticeText}>
                <i className="fas fa-mobile-alt"></i>
                For the best mobile experience, we recommend opening the app in
                a new tab
              </p>
              <button className={styles.openExternalBtn} onClick={openInNewTab}>
                <i className="fas fa-external-link-alt"></i>
                Open in New Tab
              </button>
            </div>
          )}
        </section>

        <section className={styles.contentContainer}>
          <div className={styles.card}>
            <div className={styles.iframeContainer}>
              {/* Enhanced Loading Overlay */}
              {loadingState.isLoading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.loadingContent}>
                    <div className={styles.spinner}></div>
                    <h3 className={styles.loadingTitle}>
                      Loading Pepper-eFP...
                    </h3>
                    <p className={styles.loadingText}>
                      Please wait while we initialize the tissue-specific
                      expression browser
                    </p>
                    <div className={styles.loadingSteps}>
                      <div className={styles.loadingStep}>
                        <i className="fas fa-server"></i>
                        <span>Connecting to server</span>
                      </div>
                      <div className={styles.loadingStep}>
                        <i className="fas fa-seedling"></i>
                        <span>Loading tissue data</span>
                      </div>
                      <div className={styles.loadingStep}>
                        <i className="fas fa-chart-pie"></i>
                        <span>Preparing eFP visualization</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Error Overlay */}
              {(loadingError || loadingState.iframeError) && (
                <div className={styles.errorOverlay}>
                  <div className={styles.errorContent}>
                    <i
                      className={
                        styles.errorIcon + " fas fa-exclamation-triangle"
                      }
                    ></i>
                    <h3 className={styles.errorTitle}>Loading Failed</h3>
                    <p className={styles.errorText}>
                      The eFP Browser application is taking longer than expected
                      to load. This might be due to server maintenance or
                      network issues.
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
                src="https://dish2711.shinyapps.io/pepper-eFP/"
                className={styles.responsiveIframe}
                frameBorder="0"
                title="Pepper eFP Browser"
                aria-label="Interactive tissue-specific gene expression visualization"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{
                  minHeight: isMobile ? "600px" : "800px",
                  opacity: loadingState.isLoading ? 0 : 1,
                  transition: "opacity 0.3s ease-in-out",
                }}
                // Enable scrolling on mobile
                scrolling={isMobile ? "yes" : "auto"}
              />
            </div>

            {/* Alternative mobile view */}
            {isMobile && (
              <div className={styles.mobileAlternative}>
                <p className={styles.alternativeText}>
                  Having trouble with the embedded app?
                  <button className={styles.linkButton} onClick={openInNewTab}>
                    Click here to open it directly
                  </button>
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default EFPBrowserPage;
