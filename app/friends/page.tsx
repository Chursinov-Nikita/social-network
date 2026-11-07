"use client";

import PageHeader from "@/app/components/shell/PageHeader";
import Avatar from "@/app/components/ui/Avatar";
import { ConfirmDialog } from "@/app/components/ui/Dialog";
import { EmptyText, RowSkeletons } from "@/app/components/ui/States";
import { useSession } from "next-auth/react";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import type {
  Friendship,
  FriendUser,
  SearchUser,
  Tab,
  FriendToRemove,
} from "@/app/types/friends";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const ROW_CLASS = "flex items-center gap-3 px-4 py-2.5";

const Friends = () => {
  const { data: session } = useSession();
  const { lang } = useLang();
  const tr = t[lang];

  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<FriendToRemove | null>(
    null,
  );
  const [removingFriend, setRemovingFriend] = useState(false);

  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (!currentUserId) return;
    Promise.all([
      fetch("/api/friends").then((r) => r.json()),
      fetch("/api/friends/requests").then((r) => r.json()),
    ])
      .then(([fr, rq]: [Friendship[], Friendship[]]) => {
        setFriends(fr);
        setRequests(rq);
      })
      .finally(() => setLoaded(true));
  }, [currentUserId]);

  const friendOf = (f: Friendship): FriendUser =>
    f.senderId === currentUserId ? f.receiver : f.sender;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/friends/search?q=${encodeURIComponent(searchQuery)}`,
      );
      setSearchResults(await res.json());
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (receiverId: string) => {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId }),
    });
    setSearchResults((prev) =>
      prev.map((u) =>
        u.id === receiverId ? { ...u, relationStatus: "pending" as const } : u,
      ),
    );
  };

  const acceptRequest = async (id: string) => {
    await fetch(`/api/friends/${id}`, { method: "PATCH" });
    const accepted = requests.find((r) => r.id === id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (accepted)
      setFriends((prev) => [...prev, { ...accepted, status: "accepted" }]);
  };

  const rejectRequest = async (id: string) => {
    await fetch(`/api/friends/${id}`, { method: "DELETE" });
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const removeFriend = async () => {
    if (!friendToRemove || removingFriend) return;
    setRemovingFriend(true);
    await fetch(`/api/friends/${friendToRemove.id}`, { method: "DELETE" });
    setFriends((prev) => prev.filter((f) => f.id !== friendToRemove.id));
    setFriendToRemove(null);
    setRemovingFriend(false);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "friends", label: tr.friendsTab, count: friends.length },
    { id: "requests", label: tr.requestsTab, count: requests.length },
    { id: "search", label: tr.findPeople },
  ];

  return (
    <>
      <PageHeader title={tr.friendsTitle}>
        <div
          role="tablist"
          className="no-scrollbar flex overflow-x-auto [justify-content:safe_center]"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`tab ${tab === item.id ? "tab-active" : ""}`}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className="text-xs font-normal text-muted tabular-nums">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="mx-auto max-w-2xl py-2 sm:px-4 sm:py-4">
        {tab === "friends" && (
          <div className="panel py-1.5">
            {!loaded ? (
              <RowSkeletons />
            ) : friends.length === 0 ? (
              <EmptyText>{tr.noFriendsYet}</EmptyText>
            ) : (
              friends.map((f) => {
                const friend = friendOf(f);
                return (
                  <div key={f.id} className={ROW_CLASS}>
                    <Link href={`/profile/${friend.id}`} className="shrink-0">
                      <Avatar
                        name={friend.name}
                        image={friend.image}
                        size={48}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${friend.id}`}
                        className="block truncate text-base font-medium hover:underline"
                      >
                        {friend.name}
                      </Link>
                      <p className="text-sm text-muted">{tr.friend}</p>
                    </div>
                    <button
                      onClick={() =>
                        setFriendToRemove({ id: f.id, name: friend.name })
                      }
                      className="btn btn-ghost"
                    >
                      {tr.remove}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="panel py-1.5">
            {!loaded ? (
              <RowSkeletons count={2} />
            ) : requests.length === 0 ? (
              <EmptyText>{tr.noPendingRequests}</EmptyText>
            ) : (
              requests.map((r) => (
                <div key={r.id} className={ROW_CLASS}>
                  <Avatar
                    name={r.sender.name}
                    image={r.sender.image}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">
                      {r.sender.name}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {tr.wantsToBeFriends}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => rejectRequest(r.id)}
                      className="btn btn-ghost px-3"
                    >
                      {tr.decline}
                    </button>
                    <button
                      onClick={() => acceptRequest(r.id)}
                      className="btn btn-secondary px-3"
                    >
                      {tr.accept}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "search" && (
          <div className="panel">
            <div className="flex items-center gap-2 p-3">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  placeholder={tr.searchByUsername}
                  aria-label={tr.searchByUsername}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="field h-10 rounded-full pl-10"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="btn btn-primary h-10"
              >
                {searching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  tr.search
                )}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="pb-1.5">
                {searchResults.map((u) => (
                  <div key={u.id} className={ROW_CLASS}>
                    <Avatar name={u.name} image={u.image} size={48} />
                    <p className="min-w-0 flex-1 truncate text-base font-medium">
                      {u.name}
                    </p>
                    <button
                      onClick={() => sendRequest(u.id)}
                      disabled={u.relationStatus !== "none"}
                      className="btn btn-secondary"
                    >
                      {u.relationStatus === "pending"
                        ? tr.requestSent
                        : u.relationStatus === "accepted"
                          ? tr.alreadyFriends
                          : tr.addFriend}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {friendToRemove && (
        <ConfirmDialog
          title={tr.removeFriend}
          description={`${tr.removeFriendDesc} ${friendToRemove.name} ${tr.removeFriendDescEnd}`}
          confirmLabel={tr.remove}
          cancelLabel={tr.cancel}
          pendingLabel={tr.removing}
          pending={removingFriend}
          onConfirm={removeFriend}
          onCancel={() => setFriendToRemove(null)}
        />
      )}
    </>
  );
};

export default Friends;
