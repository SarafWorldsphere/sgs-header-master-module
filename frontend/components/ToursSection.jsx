export default function ToursSection({ toursData }) {
  return (
    <div className="page-card">
      <div className="page-header">
        <h2>School Tours</h2>
      </div>

      <div className="table-scroll-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tour</th>
              <th>Description</th>
              <th>Date</th>
              <th>Applicable Class</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {toursData.map((tour) => (
              <tr key={tour.event_id}>
                <td>{tour.event_title}</td>
                <td>{tour.event_description}</td>
                <td>{tour.event_date}</td>
                <td>{tour.applicable_class}</td>
                <td>{tour.record_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}