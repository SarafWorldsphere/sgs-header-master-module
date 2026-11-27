export default function LogoutModal({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">Confirm Logout</h2>

        <p className="modal-text">
          Are you sure you want to logout?
        </p>

        <div className="modal-actions">
          <button
            className="modal-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="modal-logout-btn"
            onClick={onConfirm}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}