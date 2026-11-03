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
import { extractGuidFromUrl } from "./guid";
import { superdesk } from "./superdesk";
import type { ApiChat, FormChat } from "./typings/chat";

const fetchChat = async (
  id: string,
  {
    updateChat,
  }: { updateChat: ReturnType<typeof useChatsActions>["updateChat"] },
) => {
  const { url: serverUrl } = superdesk.instance.config.server;

  try {
    const res = await fetch(`${serverUrl}/research_tool/chat/${id}`, {
      credentials: "include",
    });
    if (!res.ok) return;

    const { messages } = await res.json();
    if (!Array.isArray(messages)) return;

    const chat = messages.reduce<Pick<FormChat, "messages" | "citations">>(
      (chat, { type, value, citations }: ApiChat["messages"][number]) => {
        chat.messages.push({ type, value });
        for (const citation of citations ?? []) {
          const id = extractGuidFromUrl(citation.uri) ?? citation.citation_id;
          chat.citations[id] = citation;
        }
        return chat;
      },
      { messages: [], citations: {} },
    );
    updateChat(id, chat);
  } catch (err) {
    console.error("Failed to fetch chat", err);
  }
};

const renameChat = async (id: string, newTitle: string) => {
  return superdesk.httpRequestRawLocal({
    path: `/research_tool/chat/${id}`,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    payload: { chat_title: newTitle },
  });
};

const shareChat = async (id: string) => {
  return superdesk.httpRequestRawLocal({
    method: "GET",
    path: `/research_tool/chat/${id}/share`,
  });
};

const deleteChat = async (id: string) =>
  superdesk.httpRequestRawLocal({
    method: "DELETE",
    path: `/research_tool/chat/${id}`,
  });

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
      if (!(await renameChat(chat.id, newTitle)).ok) throw new Error();
      updateChat(chat.id, { title: newTitle });
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
                  const res = await shareChat(chat.id);
                  if (!res.ok) throw new Error();

                  const data = await res.text();
                  await navigator.clipboard.writeText(data);
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
