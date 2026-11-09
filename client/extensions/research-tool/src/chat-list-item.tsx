import * as React from "react";
import {
  ContentListItem,
  Dropdown,
  IconButton,
  Input,
  Spacer,
} from "superdesk-ui-framework/react";
import { useChatsActions } from "./context/chats-context";
import { useSelectedChat } from "./context/selected-chat-context";
import { superdesk } from "./superdesk";
import { toFormChat } from "./transform";
import type { ApiChat, FormChat } from "./typings/chat";

const fetchChat = async (
  id: string,
  {
    updateChat,
  }: { updateChat: ReturnType<typeof useChatsActions>["updateChat"] },
) => {
  try {
    const { messages } = await superdesk.httpRequestJsonLocal<{
      messages: ApiChat["messages"];
    }>({
      method: "GET",
      path: `/research_tool/chat/${id}`,
    });
    if (!Array.isArray(messages)) throw new Error();

    updateChat(id, toFormChat({ messages }));
  } catch {
    superdesk.ui.notify.error(
      superdesk.localization.gettext("Failed to fetch chat."),
    );
  }
};

const renameChat = async (id: string, newTitle: string) =>
  superdesk.httpRequestJsonLocal<
    Pick<ApiChat, "_id" | "_updated" | "chat_id" | "chat_title">
  >({
    path: `/research_tool/chat/${id}`,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    payload: { chat_title: newTitle },
  });

const shareChat = async (id: string) =>
  superdesk.httpRequestJsonLocal<ApiChat>({
    method: "POST",
    path: `/research_tool/chat/${id}/share`,
  });

const deleteChat = async (id: string) =>
  superdesk.httpRequestRawLocal({
    method: "DELETE",
    path: `/research_tool/chat/${id}`,
  });

const generateShareLink = (chatId: string) => {
  const url = new URL(window.location.href);
  const [route, existingParams = ""] = url.hash.split("?");
  const params = new URLSearchParams(existingParams);
  params.set("shareId", chatId);
  url.hash = `${route}?${params.toString()}`;
  return url.toString();
};

export const ChatListItem = ({ chat }: { chat: FormChat }) => {
  const { chat: selectedChat, setSelectedChat } = useSelectedChat();
  const { updateChat, removeChat } = useChatsActions();

  const [isEditing, setIsEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(chat.title);

  const draftTitleRef = React.useRef<HTMLDivElement>(null);

  const cancelEditing = () => {
    setDraftTitle(chat.title);
    setIsEditing(false);
  };

  const startEditing = () => {
    setDraftTitle(chat.title);
    setIsEditing(true);
  };

  const commitEditing = async () => {
    const newTitle = draftTitle.trim();
    if (!newTitle || newTitle === chat.title) {
      setIsEditing(false);
      setDraftTitle(chat.title);
      return;
    }

    try {
      const updatedChat = await renameChat(chat.id, newTitle);
      if (!updatedChat) throw new Error();

      const { chat_title, _updated } = updatedChat;
      updateChat(chat.id, toFormChat({ chat_title, _updated }));
      setIsEditing(false);
    } catch {
      superdesk.ui.notify.error(
        superdesk.localization.gettext("Failed to rename chat."),
      );
    }
  };

  React.useEffect(() => {
    if (isEditing) {
      const inputEl =
        draftTitleRef.current?.querySelector<HTMLInputElement>("input");
      inputEl?.focus();
    }
  }, [isEditing]);

  if (isEditing)
    return (
      <Spacer h noWrap gap="4" style={{ padding: "4px 0" }}>
        <div
          ref={draftTitleRef}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEditing();
            } else if (e.key === "Enter") {
              e.preventDefault();
              commitEditing();
            }
          }}
        >
          <Input
            type="text"
            inlineLabel
            labelHidden
            value={draftTitle}
            onChange={setDraftTitle}
          />
        </div>
        <IconButton
          icon="close-small"
          ariaValue={superdesk.localization.gettext("Cancel")}
          onClick={() => {
            cancelEditing();
          }}
        />
        <IconButton
          icon="ok"
          ariaValue={superdesk.localization.gettext("Save")}
          onClick={() => {
            commitEditing();
          }}
        />
      </Spacer>
    );

  return (
    <ContentListItem
      itemColum={[
        { itemRow: [{ content: <div>{chat.title}</div> }], fullwidth: true },
      ]}
      action={
        <Dropdown
          key="chat-list-item-actions-menu"
          items={[
            {
              label: superdesk.localization.gettext("Rename"),
              icon: "pencil",
              onSelect: () => {
                startEditing();
              },
            },
            {
              label: superdesk.localization.gettext("Share"),
              icon: "share-alt",
              onSelect: async () => {
                try {
                  const sharedChat = await shareChat(chat.id);
                  if (!sharedChat) throw new Error();

                  await navigator.clipboard.writeText(
                    generateShareLink(sharedChat.chat_id),
                  );
                  superdesk.ui.notify.success(
                    superdesk.localization.gettext(
                      "Share link copied to clipboard",
                    ),
                  );
                } catch {
                  superdesk.ui.notify.error(
                    superdesk.localization.gettext("Failed to share chat."),
                  );
                }
              },
            },
            {
              label: superdesk.localization.gettext("Delete"),
              icon: "trash",
              onSelect: async () => {
                const shouldDelete = await superdesk.ui.confirm(
                  superdesk.localization.gettext(
                    "Shared links will be disabled.",
                  ),
                  superdesk.localization.gettext("Delete this chat?"),
                );
                if (!shouldDelete) return;

                try {
                  if (!(await deleteChat(chat.id)).ok) throw new Error();
                  removeChat(chat.id);
                  if (chat.id === selectedChat?.id) setSelectedChat(null);
                } catch {
                  superdesk.ui.notify.error(
                    superdesk.localization.gettext("Failed to delete chat."),
                  );
                }
              },
            },
          ]}
        >
          <IconButton
            icon="dots-vertical"
            ariaValue={superdesk.localization.gettext("Actions")}
            onClick={() => {}}
          />
        </Dropdown>
      }
      onClick={async () => {
        if (!chat.isStreaming) await fetchChat(chat.id, { updateChat });
        setSelectedChat(chat.id);
      }}
      selected={chat.id === selectedChat?.id}
    />
  );
};
