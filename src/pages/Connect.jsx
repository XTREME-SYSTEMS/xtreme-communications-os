import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Link2, MessageSquare, Bot, Code, RefreshCw, ShieldCheck } from "lucide-react";

const CLIENTS = [
  {
    key: "claude",
    label: "Claude",
    icon: Bot,
    steps: [
      "Open Claude and go to your profile menu (top-right).",
      "Click Settings → Connectors → \"Add custom connector\".",
      "Give it a name (e.g. \"XTREME Comms\").",
      "Paste the server URL above into the URL field.",
      "Click Add. Claude will open the app's consent page in a browser.",
      "Sign in with your app account and approve access.",
    ],
  },
  {
    key: "chatgpt",
    label: "ChatGPT",
    icon: MessageSquare,
    steps: [
      "In ChatGPT, go to Apps and enable Developer mode (confirm the risk prompt).",
      "Click \"Create app\" and give it a name.",
      "Paste the server URL above into the MCP server URL field.",
      "Click Create, then enable the app from the chat composer before prompting it.",
      "ChatGPT will open the consent page — sign in with your app account and approve.",
    ],
  },
  {
    key: "cursor",
    label: "Cursor",
    icon: Code,
    steps: [
      "In Cursor, open Settings → Tools & Integrations.",
      "Click \"New MCP Server\" — this opens your mcp.json file.",
      "Add an entry with the server URL above as the \"url\" field.",
      "Save the file and toggle the server on.",
      "Cursor will prompt you to sign in — approve on the consent page with your app account.",
    ],
  },
  {
    key: "custom",
    label: "Custom",
    icon: Link2,
    steps: [
      "Copy the server URL above.",
      "Add it as a streamable HTTP MCP server in your client.",
      "Most clients just need a name and the URL — that's it.",
      "Reload the client so it picks up the new server.",
      "On first use, your client will open the consent page — sign in with your app account and approve.",
    ],
  },
];

export default function Connect() {
  const [copied, setCopied] = useState(false);
  const serverUrl = new URL("/api/mcp", window.location.origin).toString();

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Link2 className="h-6 w-6 text-accent-orange" />
          Connect an AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Point ChatGPT, Claude, Cursor, or any MCP-compatible client at your app so it can read and act on your data.
        </p>
      </div>

      {/* Server URL card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">MCP Server URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 rounded-lg bg-muted text-sm text-foreground font-mono break-all">
              {serverUrl}
            </code>
            <Button onClick={copyUrl} variant="outline" size="icon" className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-status-green" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This URL is unique to your app. Anyone you share it with can connect — they'll sign in with their own app account.
          </p>
        </CardContent>
      </Card>

      {/* OAuth notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Sign-in required</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your app uses OAuth. Each AI assistant acts as the signed-in user — it can only access data and take actions that person is allowed to. The assistant will open the consent page on first use so the user can approve.
          </p>
        </div>
      </div>

      {/* Client tabs */}
      <Tabs defaultValue="claude">
        <TabsList className="grid grid-cols-4 w-full mb-4">
          {CLIENTS.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="text-xs md:text-sm">
              <c.icon className="h-3.5 w-3.5 md:mr-1.5" />
              <span className="hidden md:inline">{c.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CLIENTS.map((c) => (
          <TabsContent key={c.key} value={c.key}>
            <Card>
              <CardContent className="pt-6">
                <ol className="space-y-3">
                  {c.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Refresh note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted mt-6">
        <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Refresh after changes.</span> AI assistants cache the tool list. If we add or change tools, refresh or re-add the connector in your client so it picks up the latest.
        </p>
      </div>
    </div>
  );
}