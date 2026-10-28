export const PAGE_SIZE = 50;

export type MessageType = "text" | "audio";

export type Message = {
  id: string;
  senderId: string;
  receiverId?: string | null;
  groupId?: string | null;
  content: string;
  type: MessageType;
  read: boolean;
  createdAt: string;
  pinned: boolean;
  pinnedAt?: string | null;
  sender?: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export type ChatUser = {
  id: string;
  name: string | null;
  image: string | null;
  isGroup?: boolean;
};

export type MessagePreview = {
  content: string;
  type: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  read: boolean;
};

export type Folder = {
  id: string;
  name: string;
  members: { companionId: string }[];
};

export type GroupChat = {
  id: string;
  name: string;
  avatar: string | null;
  createdBy: string;
  createdAt: string;
  members: GroupMember[];
  messages?: Message[];
};

export type GroupMember = {
  userId: string;
  role: "owner" | "member";
  user: ChatUser;
};

export type DeleteMode = "mine" | "all" | "chat" | null;
