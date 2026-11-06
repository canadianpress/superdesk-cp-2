import * as React from "react";
import { superdesk } from "../superdesk";
import { toFormChat } from "../transform";
import type { ApiChat, Chat, FormChat } from "../typings/chat";
import { SelectedChatProvider } from "./selected-chat-context";

type ChatsAction =
  | { type: "ADD_CHAT"; payload: { id: string; title: Chat["title"] } }
  | {
      type: "ADD_MESSAGES";
      payload: { chatId: string; messages: Chat["messages"] };
    }
  | {
      type: "ADD_CITATIONS";
      payload: { chatId: string; citations: Chat["citations"] };
    }
  | {
      type: "UPDATE_CHAT";
      payload: { id: string } & Partial<Omit<FormChat, "id" | "readonly">>;
    }
  | { type: "REMAP_CHAT"; payload: { id: string; newId: string } }
  | { type: "HYDRATE_CHATS"; payload: Record<string, FormChat> }
  | { type: "REMOVE_CHAT"; payload: { id: string } };

const ChatsContext = React.createContext<Record<string, FormChat> | null>(null);

const ChatsDispatchContext =
  React.createContext<React.Dispatch<ChatsAction> | null>(null);

export const useChats = () => {
  const context = React.useContext(ChatsContext);
  if (!context) throw new Error("useChats must be used within a ChatsProvider");

  return context;
};

const useChatsDispatch = () => {
  const context = React.useContext(ChatsDispatchContext);
  if (!context)
    throw new Error("useChatsDispatch must be used within ChatsProvider");
  return context;
};

export const useChatsActions = () => {
  const dispatch = useChatsDispatch();

  const addChat = React.useCallback(
    (id: string, title: string) => {
      dispatch({ type: "ADD_CHAT", payload: { id, title } });
    },
    [dispatch],
  );

  const addMessages = React.useCallback(
    (chatId: string, messages: Chat["messages"]) => {
      dispatch({ type: "ADD_MESSAGES", payload: { chatId, messages } });
    },
    [dispatch],
  );

  const addCitations = React.useCallback(
    (chatId: string, citations: Chat["citations"]) => {
      dispatch({ type: "ADD_CITATIONS", payload: { chatId, citations } });
    },
    [dispatch],
  );

  const updateChat = React.useCallback(
    (id: string, chat: Partial<FormChat>) => {
      dispatch({ type: "UPDATE_CHAT", payload: { ...chat, id } });
    },
    [dispatch],
  );

  const remapChat = React.useCallback(
    (id: string, newId: string) => {
      dispatch({ type: "REMAP_CHAT", payload: { id, newId } });
    },
    [dispatch],
  );

  const hydrateChats = React.useCallback(
    (payload: Record<string, FormChat>) => {
      dispatch({ type: "HYDRATE_CHATS", payload });
    },
    [dispatch],
  );

  const removeChat = React.useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_CHAT", payload: { id } });
    },
    [dispatch],
  );

  return React.useMemo(
    () => ({
      addChat,
      addMessages,
      addCitations,
      updateChat,
      remapChat,
      hydrateChats,
      removeChat,
    }),
    [
      addChat,
      addMessages,
      addCitations,
      updateChat,
      remapChat,
      hydrateChats,
      removeChat,
    ],
  );
};

const chatsReducer = (state: Record<string, FormChat>, action: ChatsAction) => {
  switch (action.type) {
    case "ADD_CHAT": {
      return {
        ...state,
        [action.payload.id]: {
          ...action.payload,
          updated: new Date().toISOString(),
          messages: [],
          citations: {},
          isStreaming: false,
          hasError: false,
          readonly: false,
        },
      };
    }
    case "ADD_MESSAGES": {
      const { chatId, messages: newMessages } = action.payload;
      if (!state[chatId]) return state;

      const messages = [...state[chatId]["messages"]];
      for (const message of newMessages) {
        const last = messages.length - 1;
        if (
          message.type !== "RESPONSE" ||
          message.type !== messages[last]?.type
        ) {
          messages.push(message);
          continue;
        }

        messages[last] = {
          ...messages[last],
          value: messages[last].value.concat(message.value),
        };
      }

      return { ...state, [chatId]: { ...state[chatId], messages } };
    }
    case "ADD_CITATIONS": {
      const { chatId, citations } = action.payload;
      if (!state[chatId]) return state;

      return {
        ...state,
        [chatId]: {
          ...state[chatId],
          citations: {
            ...state[chatId].citations,
            ...Object.entries(citations).reduce<Chat["citations"]>(
              (acc, [key, value]) => ({
                ...acc,
                [key]: { ...state[chatId].citations?.[key], ...value },
              }),
              {},
            ),
          },
        },
      };
    }
    case "UPDATE_CHAT": {
      const { id, ...rest } = action.payload;
      return { ...state, [id]: { ...state[id], ...rest } };
    }
    case "REMAP_CHAT": {
      const { id, newId } = action.payload;
      const { [id]: old, ...rest } = state;
      return {
        ...rest,
        [newId]: { ...old, id: newId },
      };
    }
    case "HYDRATE_CHATS": {
      return { ...state, ...action.payload };
    }
    case "REMOVE_CHAT": {
      const { id } = action.payload;
      const { [id]: _removed, ...rest } = state;
      return rest;
    }
    default:
      return state;
  }
};

export const ChatsProvider = ({ children }: { children: React.ReactNode }) => {
  const [chats, dispatch] = React.useReducer(chatsReducer, {});

  const shareId = superdesk.browser.location.urlParams.getString("shareId");

  React.useEffect(() => {
    const fetchChats = async () => {
      try {
        const { _items: chats } = await superdesk.httpRequestJsonLocal<{
          _items: Array<ApiChat>;
        }>({
          method: "GET",
          path: "/research_tool/chat",
        });
        if (!Array.isArray(chats)) throw new Error();

        const payload = chats.reduce<Record<string, FormChat>>(
          (acc, chat: ApiChat) => {
            acc[chat.chat_id] = toFormChat(chat) as FormChat;
            return acc;
          },
          {},
        );
        dispatch({ type: "HYDRATE_CHATS", payload });
      } catch {
        superdesk.ui.notify.error(
          superdesk.localization.gettext("Failed to fetch chats."),
        );
      }
    };
    fetchChats();
  }, []);

  React.useEffect(() => {
    if (!shareId) return;

    const fetchSharedChat = async () => {
      try {
        const chat = await superdesk.httpRequestJsonLocal<ApiChat>({
          method: "GET",
          path: `/research_tool/chat/${shareId}`,
        });
        if (!chat) throw new Error();

        const payload = { [chat.chat_id]: toFormChat(chat) as FormChat };
        dispatch({ type: "HYDRATE_CHATS", payload });
      } catch {
        superdesk.ui.notify.error(
          superdesk.localization.gettext("Failed to fetch shared chat."),
        );
      }
    };
    fetchSharedChat();
  }, [shareId]);

  return (
    <ChatsContext.Provider value={chats}>
      <ChatsDispatchContext.Provider value={dispatch}>
        <SelectedChatProvider>{children}</SelectedChatProvider>
      </ChatsDispatchContext.Provider>
    </ChatsContext.Provider>
  );
};
