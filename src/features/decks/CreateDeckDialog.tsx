import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { createDeck, renameDeck } from "../../db/repos/deckRepo";
export function CreateDeckDialog({
  onClose,
  deck,
}: {
  onClose: () => void;
  deck?: { id: string; name: string };
}) {
  const [name, setName] = useState(deck?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  return (
    <Modal
      title={deck ? "Rename deck" : "New deck"}
      onClose={onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || !name.trim()) return;
          setBusy(true);
          try {
            if (deck) {
              await renameDeck(deck.id, name);
              onClose();
            } else {
              const created = await createDeck(name);
              navigate(`/decks/${created.id}`);
              onClose();
            }
          } catch {
            setError("The deck was not saved. Try again.");
            setBusy(false);
          }
        }}
      >
        <label className="field-label">
          Deck name
          <input
            autoFocus
            className="text-input"
            placeholder="For example: Interview notes"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-again">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            disabled={busy || !name.trim()}
          >
            {busy ? "Saving…" : deck ? "Save name" : "Create deck"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
