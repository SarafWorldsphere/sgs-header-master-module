"use client";

export default function ReportPanel({
  title,
  icon,
  report,
  previewTitle,
  previewText,
}) {
  return (
    <div className="content-card">

      <h3>
        {icon} {title}
      </h3>

      <hr />

      {!report ? (
        <div className="report-empty">
          <h4>{previewTitle}</h4>

          <p>{previewText}</p>
        </div>
      ) : (
        <pre className="report-text">
          {report}
        </pre>
      )}

    </div>
  );
}