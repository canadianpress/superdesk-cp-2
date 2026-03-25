import * as React from "react";
import { IExtension, IExtensionActivationResult, IPage } from "superdesk-api";
import { Spacer, SpacerBlock } from "superdesk-ui-framework/react";
import { ChatList } from "./chat-list";
import { ChatWindow } from "./chat-window";
import { CitationWindow } from "./citation-window";
import { ChatsProvider } from "./context/chats-context";
import { CitationsProvider } from "./context/citations-context";
import { Form } from "./form";

const extension: IExtension = {
  activate: (superdesk) => {
    const result: IExtensionActivationResult = {
      contributions: {
        pages: [
          {
            title: superdesk.localization.gettext("Research Tool"),
            url: "/research-tool",
            component: ResearchTool,
            showSideMenu: true,
            addToSideMenu: {
              icon: "comments",
              order: 10000,
              keyBinding: "ctrl+alt+r",
            },
          },
        ],
      },
    };

    return Promise.resolve(result);
  },
};

const ResearchTool: IPage["component"] = () => (
  <ChatsProvider>
    <CitationsProvider>
      <Spacer
        h
        gap="0"
        noWrap
        alignItems="stretch"
        style={{ overflowY: "auto" }}
      >
        <ChatList />
        <Spacer v noWrap gap="0" alignItems="center" style={{ flex: 1 }}>
          <ChatWindow />
          <Form />
          <SpacerBlock v gap="32" />
        </Spacer>
        <CitationWindow />
      </Spacer>
    </CitationsProvider>
  </ChatsProvider>
);

export default extension;
