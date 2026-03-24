import * as React from "react";
import type { Chat, Chats } from "../typings/chat";
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
  | { type: "UPDATE_CHAT"; payload: { id: string } & Partial<Chat> };

const ChatsContext = React.createContext<Chats | null>(null);

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
    (id: string, chat: Partial<Chat>) => {
      dispatch({ type: "UPDATE_CHAT", payload: { ...chat, id } });
    },
    [dispatch],
  );

  return React.useMemo(
    () => ({ addChat, addMessages, addCitations, updateChat }),
    [addChat, addMessages, addCitations, updateChat],
  );
};

const chatsReducer = (state: Chats, action: ChatsAction) => {
  switch (action.type) {
    case "ADD_CHAT": {
      return {
        ...state,
        [action.payload.id]: {
          ...action.payload,
          messages: [],
          citations: {},
        },
      };
    }
    case "ADD_MESSAGES": {
      const { chatId, messages: newMessages } = action.payload;
      if (!state[chatId]) return state;

      const messages = [...state[chatId]["messages"]];
      for (const message of newMessages) {
        const last = messages.length - 1;
        if (message.type !== messages[last]?.type) {
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
          citations: { ...state[chatId].citations, ...citations },
        },
      };
    }
    case "UPDATE_CHAT": {
      const { id, ...rest } = action.payload;
      return { ...state, [id]: { ...state[id], ...rest } };
    }
    default:
      return state;
  }
};

export const ChatsProvider = ({ children }: { children: React.ReactNode }) => {
  const [chats, dispatch] = React.useReducer(chatsReducer, {});

  return (
    <ChatsContext.Provider value={chats}>
      <ChatsDispatchContext.Provider value={dispatch}>
        <SelectedChatProvider>{children}</SelectedChatProvider>
      </ChatsDispatchContext.Provider>
    </ChatsContext.Provider>
  );
};
