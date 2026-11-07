"use client";

import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { ChatUser, GroupChat } from "@/app/types/chat";
import Avatar from "@/app/components/ui/Avatar";
import { Dialog } from "@/app/components/ui/Dialog";
import { t } from "@/app/translation/translation";
import { useLang } from "@/app/context/language";

type Props = {
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => Promise<GroupChat>;
};

const CreateGroupModal = ({ onClose, onCreate }: Props) => {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { lang } = useLang();
  const tr = t[lang];

  useEffect(() => {
    fetch("/api/chat/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  const filtered = users.filter((u) =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setLoading(true);
    try {
      await onCreate(name.trim(), selected);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Dialog title={tr.newGroup} onClose={() => !loading && onClose()}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={tr.groupName}
        aria-label={tr.groupName}
        autoFocus
        className="field mt-4"
      />

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const user = users.find((u) => u.id === id);
            if (!user) return null;
            return (
              <span
                key={id}
                className="flex h-7 items-center gap-1 rounded-full bg-raised pr-1 pl-3 text-sm"
              >
                {user.name}
                <button
                  onClick={() => toggle(id)}
                  aria-label={tr.remove}
                  className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-danger"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={tr.searchMembers}
        aria-label={tr.searchMembers}
        className="field mt-3"
      />

      <div className="thin-scroll -mx-2 mt-2 max-h-56 overflow-y-auto">
        {filtered.map((user) => {
          const isSelected = selected.includes(user.id);
          return (
            <button
              key={user.id}
              onClick={() => toggle(user.id)}
              aria-pressed={isSelected}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
                isSelected ? "bg-active" : "hover:bg-raised"
              }`}
            >
              <Avatar name={user.name} image={user.image} size={36} />
              <span className="min-w-0 flex-1 truncate text-left text-base">
                {user.name}
              </span>
              {isSelected && <Check className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end gap-1">
        <button onClick={onClose} disabled={loading} className="btn btn-ghost">
          {tr.cancel}
        </button>
        <button
          onClick={handleCreate}
          disabled={!name.trim() || selected.length === 0 || loading}
          className="btn btn-primary"
        >
          {loading ? tr.creating : tr.createFolder}
        </button>
      </div>
    </Dialog>
  );
};

export default CreateGroupModal;
