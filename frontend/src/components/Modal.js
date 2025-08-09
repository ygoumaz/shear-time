import styles from "./Modal.module.css";

const InfoModal = ({ message, onClose }) => (
    <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
        <div dangerouslySetInnerHTML={{ __html: message }} />
            <div className={styles.modalButtons}>
                <button onClick={onClose} className={styles.closeBtn}>Fermer</button>
            </div>
        </div>
    </div>
);

const ConfirmModal = ({ message, onClose, onConfirm }) => (
    <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
        <div dangerouslySetInnerHTML={{ __html: message }} />
            <div className={styles.modalButtons}>
                <button onClick={onConfirm} className={styles.confirmBtn}>Supprimer</button>
                <button onClick={onClose} className={styles.closeBtn}>Fermer</button>
            </div>
        </div>
    </div>
);

const Modal = ({ type="info", message, onClose, onConfirm }) => {
    console.log (type)
    console.log (message)
    switch (type) {
        case "confirm":
            return <ConfirmModal message={message} onClose={onClose} onConfirm={onConfirm} />;
        case "info":
        default:
            return <InfoModal message={message} onClose={onClose} />;
    }
};

export default Modal;
