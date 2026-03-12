import * as React from "react";
import { IExtension, IExtensionActivationResult, IPage } from "superdesk-api";
import { Spacer } from "superdesk-ui-framework/react";
import { CitationList } from "./citation-list";
import { CitationsProvider } from "./context/citations-context";
import { MarkdownProvider } from "./context/markdown-context";
import { Form } from "./form";
import { MarkdownList } from "./markdown-list";

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
          gap="16"
          alignItems="stretch"
          style={{ flex: 1, padding: "1rem", overflowY: "scroll" }}
        >
          <Spacer v noWrap gap="0" style={{ flex: 1 }}>
            <div style={{ flex: 1, width: "100%", overflowY: "scroll" }}>
              <MarkdownList />
            </div>
            <Form />
          </Spacer>
          <div style={{ overflowY: "scroll" }}>
            <CitationList />
          </div>
        </Spacer>
      </CitationsProvider>
    </MarkdownProvider>
  );
};

export default extension;
