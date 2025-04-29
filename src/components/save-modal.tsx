import Modal from "./modal";
import { Button } from "./ui/button";

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const SaveModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
}: SaveModalProps) => {
  return (
    <Modal
      title="Save Answer?"
      description="Do you want to save this answer? You can always try again to improve your score!"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="pt-6 space-x-2 flex items-center justify-end w-full">
        <Button disabled={loading} variant={"outline"} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-800"
          onClick={onConfirm}
        >
          Save Answer
        </Button>
      </div>
    </Modal>
  );
};
