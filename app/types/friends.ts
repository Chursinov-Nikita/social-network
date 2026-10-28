export type FriendUser = {
  id: string;
  name: string | null;
  image: string | null;
};

export type Friendship = {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  sender: FriendUser;
  receiver: FriendUser;
};

export type SearchUser = FriendUser & {
  relationStatus: "none" | "pending" | "accepted";
};

export type FriendToRemove = {
  id: string;
  name: string | null;
};

export type Tab = "friends" | "requests" | "search";
