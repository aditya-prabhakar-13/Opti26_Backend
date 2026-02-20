export default function NewCaseView({
  hasCases,
  selectedFile,
  loading,
  onFileChange,
  onRunOptimization,
}) {
  return (
    <section
      className={
        hasCases ? "page newcase-page" : "page newcase-page onboarding"
      }>
      {!hasCases && (
        <div className="onboarding-badge" aria-hidden>
          <div className="paper-map" />
          <span className="pin red p1" />
          <span className="pin red p2" />
          <span className="pin red p3" />
          <span className="pin green p4" />
        </div>
      )}

      <div className="newcase-copy">
        <h1>NEW TEST CASE:</h1>
        <p>
          Streamline your commute planning by creating a new optimization
          scenario. Upload your latest Excel data and generate explainable
          routes.
        </p>

        <h2>UPLOAD EXCEL DATA:</h2>
        <div className="upload-card">
          <label className="upload-zone" htmlFor="upload-input">
            <input
              id="upload-input"
              type="file"
              accept=".xlsx"
              onChange={(event) =>
                onFileChange(event.target.files?.[0] || null)
              }
            />
            <span className="upload-icon">?</span>
            <span className="upload-label">
              {selectedFile ? selectedFile.name : "Tap to choose a file"}
            </span>
          </label>
          <div className="fake-progress" />
          <p>SUPPORTED FORMATS: .XLSX</p>
          <button
            type="button"
            className="gold-button"
            disabled={loading}
            onClick={onRunOptimization}>
            {loading ? "RUNNING..." : "RUN OPTIMIZATION"}
          </button>
        </div>
      </div>

      {hasCases && (
        <div className="newcase-art" aria-hidden>
          <div className="paper-map" />
          <span className="pin red p1" />
          <span className="pin red p2" />
          <span className="pin red p3" />
          <span className="pin green p4" />
        </div>
      )}
    </section>
  );
}
