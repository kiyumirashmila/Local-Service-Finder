const ResultsHeader = ({ count, loading }) => (
  <div className="results-header">
    <div className="results-left">
      <h2>
        Available Services <span>({count})</span>
      </h2>
      <p className="results-subtitle">{loading ? 'Fetching services...' : 'Contact local experts in minutes.'}</p>
    </div>
  </div>
);

export default ResultsHeader;