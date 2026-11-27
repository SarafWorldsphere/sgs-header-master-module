export default function NotificationsSection({
  notifications = [],
  loaded = false,
}) {
  return (
    <div className="page-card">
      <h2>Notifications</h2>

      <div className="table-scroll-wrapper">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Notice</th>
              <th>Date</th>
              <th>Class</th>
            </tr>
          </thead>

      <tbody>
  {!loaded ? (
    <tr>
      <td colSpan="4">Loading notifications...</td>
    </tr>
  ) : notifications.length === 0 ? (
    <tr>
      <td colSpan="4">No notifications found</td>
    </tr>
  ) : (
    notifications.map((item) => (
      <tr key={item.notice_id}>
        <td>{item.notice_title}</td>
        <td>{item.notice_text}</td>
        <td>{item.notice_date}</td>
        <td>{item.applicable_class || "-"}</td>
      </tr>
    ))
  )}
</tbody>
        </table>
      </div>
    </div>
  );
}