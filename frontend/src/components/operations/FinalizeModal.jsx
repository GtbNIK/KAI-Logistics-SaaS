const FinalizeModal = ({ isOpen, onClose, note, onSuccess }) => {
    if (!isOpen || !note) return null;

	onClose();
	onSuccess?.();
	return null;
};

export default FinalizeModal;
