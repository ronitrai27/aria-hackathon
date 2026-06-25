import { NextResponse } from "next/server";

const FALLBACK_ACTIONS: Record<string, any[]> = {
  gmail: [
    {
      name: "gmail_email_received",
      description: "Triggers when a new email is received in your inbox.",
      type: "trigger",
    },
    {
      name: "gmail_send_email",
      description: "Send a brand new email to one or multiple recipients.",
      type: "action",
    },
    {
      name: "gmail_create_draft",
      description: "Create a new draft email in your drafts folder.",
      type: "action",
    },
    {
      name: "gmail_reply_email",
      description: "Reply to an existing thread or message.",
      type: "action",
    },
    {
      name: "gmail_label_added",
      description: "Triggers when a specific label is added to an email.",
      type: "trigger",
    },
  ],
  slack: [
    {
      name: "slack_message_received",
      description: "Triggers when a message is posted to a channel or DM.",
      type: "trigger",
    },
    {
      name: "slack_post_message",
      description: "Post a new text message to a specific channel.",
      type: "action",
    },
    {
      name: "slack_create_channel",
      description: "Create a new channel under your workspace.",
      type: "action",
    },
  ],
  notion: [
    {
      name: "notion_page_created",
      description: "Triggers when a new page is added to a database.",
      type: "trigger",
    },
    {
      name: "notion_create_page",
      description: "Create a new page in a database or sub-page.",
      type: "action",
    },
    {
      name: "notion_update_page",
      description: "Modify properties of an existing page.",
      type: "action",
    },
  ],
  github: [
    {
      name: "github_issue_created",
      description: "Triggers when a new issue is created in a repository.",
      type: "trigger",
    },
    {
      name: "github_pr_opened",
      description: "Triggers when a new pull request is opened.",
      type: "trigger",
    },
    {
      name: "github_create_issue",
      description: "Create a new issue in a specific repository.",
      type: "action",
    },
  ],
};

const COMPOSIO_BASES = [
  "https://api.composio.dev",
  "https://backend.composio.dev",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawToolkitSlug = searchParams.get("toolkit_slug");

  if (!rawToolkitSlug) {
    return NextResponse.json(
      { error: "toolkit_slug is required" },
      { status: 400 },
    );
  }

  const toolkitSlug = rawToolkitSlug.toLowerCase();
  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    console.warn("COMPOSIO_API_KEY is not set, using fallback.");
    return NextResponse.json({
      items: getFallbackItems(toolkitSlug),
      source: "fallback-no-api-key",
    });
  }

  // Try each base (api.composio.dev, backend.composio.dev)
  for (const base of COMPOSIO_BASES) {
    try {
      const url = `${base}/api/v3.1/tools?toolkit_slug=${encodeURIComponent(
        toolkitSlug,
      )}&limit=200`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        // Fail fast if DNS/network is broken in dev sandbox
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        console.warn(
          `Composio tools fetch failed from ${base}:`,
          response.status,
          response.statusText,
        );
        continue;
      }

      const data = await response.json();

      // Normalize: always return { items: ToolSummary[] }
      const items =
        data.items?.map((item: any) => ({
          name: item.name,
          slug: item.slug,
          toolkit_slug: item.toolkit_slug,
          description: item.description,
          type: item.type ?? "action",
        })) ?? [];

      return NextResponse.json({ items, source: base });
    } catch (err) {
      console.warn(`Composio API fetch failed from ${base}:`, err);
      // continue to next base
    }
  }

  // If we reach here, all network attempts failed – use fallback
  console.warn("All Composio endpoints failed, using fallback mock data.");
  return NextResponse.json({
    items: getFallbackItems(toolkitSlug),
    source: "fallback-network-error",
  });
}

function getFallbackItems(toolkitSlug: string) {
  const hardcoded = FALLBACK_ACTIONS[toolkitSlug];
  if (hardcoded) {
    return hardcoded.map((a) => ({
      name: a.name,
      slug: a.name,
      toolkit_slug: toolkitSlug,
      description: a.description,
      type: a.type,
    }));
  }

  // Generic mock if we don't know this toolkit
  return [
    {
      name: `${toolkitSlug}_item_created`,
      slug: `${toolkitSlug}_item_created`,
      toolkit_slug: toolkitSlug,
      description: `Triggers when an item is created in ${toolkitSlug}.`,
      type: "trigger",
    },
    {
      name: `${toolkitSlug}_create_item`,
      slug: `${toolkitSlug}_create_item`,
      toolkit_slug: toolkitSlug,
      description: `Create a new item in ${toolkitSlug}.`,
      type: "action",
    },
    {
      name: `${toolkitSlug}_update_item`,
      slug: `${toolkitSlug}_update_item`,
      toolkit_slug: toolkitSlug,
      description: `Update an item in ${toolkitSlug}.`,
      type: "action",
    },
  ];
}
