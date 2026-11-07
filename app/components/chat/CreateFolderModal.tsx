"use client";

import { useState } from "react";
import { Dialog } from "@/app/components/ui/Dialog";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void> | void;
};

const CreateFolderModal = ({ isOpen, onClose, onCreate }: Props) => {
  const { lang } = useLang();
  const tr = t[lang];
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreate = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    await onCreate(trimmed);
    setNewFolderName("");
  };

  if (!isOpen) return null;

  return (
    <Dialog title={tr.newFolder} onClose={onClose}>
      <input
        type="text"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder={tr.folderName}
        aria-label={tr.folderName}
        autoFocus
        className="field mt-4"
      />
      <div className="mt-5 flex justify-end gap-1">
        <button onClick={onClose} className="btn btn-ghost">
          {tr.cancel}
        </button>
        <button
          onClick={handleCreate}
          disabled={!newFolderName.trim()}
          className="btn btn-primary"
        >
          {tr.createFolder}
        </button>
      </div>
    </Dialog>
  );
};

export default CreateFolderModal;
