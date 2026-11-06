
export default function FunctionsSection({
  functionsData = [],
  loaded = false,
  error = "",
}) {
  return (
    <div className="page-card">
      <div className="page-header">
        <h2>School Functions</h2>
      </div>

      <div className="table-scroll-wrapper">
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Description</th>
              <th>Date</th>
              <th>Applicable Class</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {!loaded ? (
              <tr>
                <td colSpan={5}>Loading school functions...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} style={{ color: "#f87171" }}>
                  {error}
                </td>
              </tr>
            ) : functionsData.length === 0 ? (
              <tr>
                <td colSpan={5}>No school functions found.</td>
              </tr>
            ) : (
              functionsData.map((item) => (
                <tr key={item.event_id}>
                  <td>{item.event_title || "-"}</td>
                  <td>{item.event_description || "-"}</td>
                  <td>{item.event_date || "-"}</td>
                  <td>{item.applicable_class || "-"}</td>
                  <td>{item.record_status || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
