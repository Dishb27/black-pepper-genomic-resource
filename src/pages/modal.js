import React from "react";
import styles from "../styles/modal.module.css"; 

const Modal = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
        {content}
      </div>
    </div>
  );
};

export default Modal;
