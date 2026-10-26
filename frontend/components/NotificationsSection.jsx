
"use client";

import styles from "../app/styles/notifications.module.css";

export default function NotificationsSection({
  notifications = [],
  loaded = false,
}) {
  return (
    <section className={styles.notificationsContent}>
      <div className={styles.card}>
        <div className={styles.pageHeader}>
          <h2>Notifications</h2>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
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
    </section>
  );
}
