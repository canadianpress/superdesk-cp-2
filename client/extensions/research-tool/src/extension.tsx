import * as React from "react";
import { IExtension, IExtensionActivationResult, IPage } from "superdesk-api";
import { Spacer } from "superdesk-ui-framework/react";
import { ChatWindow } from "./chat-window";
import { CitationList } from "./citation-list";
import { CitationsProvider } from "./context/citations-context";
import { MarkdownProvider } from "./context/markdown-context";
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

const ResearchTool: IPage["component"] = () => {
  return (
    <MarkdownProvider>
      <CitationsProvider>
        <Spacer
          h
          noWrap
          gap="8"
          alignItems="stretch"
          style={{ padding: "1rem 0 1rem 1rem", overflowY: "auto" }}
        >
          <Spacer v noWrap gap="0" style={{ flex: 1 }}>
            <ChatWindow />
            <Form />
          </Spacer>
          <CitationList />
        </Spacer>
      </CitationsProvider>
    </MarkdownProvider>
  );
};

export default extension;
