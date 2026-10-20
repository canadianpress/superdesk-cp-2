# Research Tool

The Research Tool is a Superdesk client extension for asking research questions
and exploring the cited archive content. It presents a streaming chat alongside
the conversation list and a citation panel.

## Using the extension

The extension is registered by the Superdesk client as `research-tool`. Once
available in the application, open **Research Tool** from the side menu or use
the `Ctrl+Alt+R` shortcut. Start a chat with the pencil button, enter a question
in the prompt at the bottom of the conversation, and submit it. The response
streams into the chat; citations are shown in the right-hand panel and can be
opened for more detail.

Conversations are loaded for the signed-in user. Select a conversation in the
left panel to restore its messages and citations. The citation panel supports
selecting individual citations or all citations and copying citation fields
from its actions menu. Responses can be copied; if a response stream fails, the
last question can be regenerated.

## Interface and state

The extension entry point (`src/extension.tsx`) registers the page and composes
the interface. React context providers share chat, citation, and selection
state across these components:

| Component | Responsibility |
| --- | --- |
| `ChatList` / `ChatListItem` | Show saved conversations, start a chat, and load a selected conversation's full history. |
| `Form` / `SearchBar` | Accept and submit a research question. |
| `ChatWindow` / `MessageList` / `MessageItem` | Display the selected conversation, keep the view near the newest message while appropriate, render response Markdown, and provide copy/regenerate actions. Citation links in response Markdown open citation previews. |
| `CitationWindow` / `CitationList` / `CitationItem` | Show citations for the active conversation, preview citation metadata and snippets, and select citations for copy actions. |
| `CitationDetails` | Fetch and display the full archive article details for a selected citation. |
| `CitationTooltip` / `CitationLinkPreview` | Show citation previews from response links and identify the linked source domain. |

The contexts in `src/context/` manage conversations, chat actions and streaming,
the active conversation, citations for that conversation, the active citation,
and the set of selected citations. `src/typings/chat.ts` defines the client and
API data shapes. `src/guid.ts` extracts an article GUID from citation URLs, and
`src/turndown.ts` converts article HTML to Markdown for display.

## What data appears in each area

| Area | Data displayed |
| --- | --- |
| Chat list (left panel) | Each saved chat's `chat_title`, sorted with the most recently updated chat first using `_updated`. |
| Conversation | User messages (`QUERY`) display their `value` as text. Assistant messages (`RESPONSE`) display their `value` as Markdown; citation links in the Markdown display the citation label/ID and open a preview. An unfinished response shows a loader. |
| Citation cards (right panel) | `date_published` as a formatted date, `slugline`, `headline`, and a link preview showing the URL's domain and favicon. The card description shows `snippets` (the first snippet initially, with the rest expandable). If there are no snippets and article data is available, it shows the first section of `article.body_html` instead. Footer badges show `citation_id`, `language`, `source`, and each `content_types` value. |
| Citation link preview | `headline`, `slugline`, `date_published`, `language`, `source`, and each `content_types` value, plus the URL domain/favicon. Hovering over a citation link fetches article data when needed; selecting the preview opens citation details. |
| Citation details (overlay panel) | The panel title is `slugline`. Its body can show `article.firstcreated` (created date), `date_published` (modified date), `headline`, `article.headline_extended`, `article.byline`, `article.dateline.text` (placeline), `article.description_text`, and `article.body_html` converted to Markdown. The footer repeats the citation ID, language, source, and content-type badges. Fields are omitted when their values are unavailable. |
| Citation copy menu | Copies `slugline`, `headline`, `date_published`, `language`, `source`, or `content_types`, individually or together. The details panel also offers `snippets` under the label “Description.” |

## Backend connection

The client reads the Superdesk server URL from
`superdesk.instance.config.server.url` and sends requests with the current
browser session's credentials. The server routes are defined in
`server/cp/ai/research_tool.py` under `/api`:

| Route | Purpose |
| --- | --- |
| `GET /api/research_tool/chat` | List the signed-in user's chat summaries. |
| `GET /api/research_tool/chat/<chat_id>` | Load a chat's messages and citations. |
| `GET /api/research_tool/stream?q=<question>&chat_id=<id>` | Stream a response and citation events using Server-Sent Events (SSE). |
| `GET /api/research_tool/article_lookup?guid=<guid>` | Look up an archive article for citation details. |

The chat list is fetched when the chat provider mounts. Selecting a chat fetches
its full history. Submitting a question opens an authenticated `EventSource` to
the stream route. The backend proxies the request to the configured research
agent, returns response deltas and citation events, and persists completed
query/response exchanges. The client updates the active conversation as events
arrive. Article details are fetched on demand through the article lookup route;
the backend resolves the GUID through `ArchiveSearchProvider`.

The backend restricts chat reads and updates to their owning user. The browser
does not connect directly to the agent service and does not receive its API key.
The server must be configured with these environment variables:

| Variable | Purpose |
| --- | --- |
| `RESEARCH_TOOL_PROXY_URL` | Agent API URL used by the backend proxy. |
| `RESEARCH_TOOL_API_KEY` | Credential used by the backend proxy. Keep it server-side. |
| `RESEARCH_TOOL_AGENT_ID` | Agent identifier sent with each research request. |
| `RESEARCH_TOOL_TIMEOUT_SECONDS` | Proxy request timeout in seconds; defaults to `300`. |

These settings are declared in `server/settings.py`. The backend module is
included in the server's `INSTALLED_APPS` configuration there.
The proxy URL, API key, and agent ID are required for streaming; if any is
missing, the backend emits a configuration error on the stream.

### Streaming contract

The stream is Server-Sent Events. The client handles these named events:

| Event | Meaning |
| --- | --- |
| `chat.id` | Supplies the server chat ID, which may replace the temporary client ID. |
| `response.output_text.delta` | Adds a response text fragment to the active chat. |
| `response.citation` | Adds a citation received for the response. |
| `response.done` | Marks the response complete and closes the client stream. |

Backend errors are sent as `error` events with a JSON payload containing
`type`, `status`, and `value`. The backend sends the configured agent a JSON
request with `agent` (agent ID), `input` (question), `stream: true`, and
`thread_id` (chat ID).

The backend persists an exchange when the response completes and contains
response text. If a stream fails before that point, the incomplete exchange may
not appear in the chat's reloaded history. Regenerating resubmits the most
recent question in the same chat; it does not replace an earlier partial
response.

Article lookup requires a GUID. The backend returns an error if the GUID is
missing, the article is not found, or archive search is unavailable.
