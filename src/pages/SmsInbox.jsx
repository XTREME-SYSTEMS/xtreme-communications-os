import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Send, Phone, ArrowLeft, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, Inbox, Search
} from "lucide-react";

export default function SmsInbox() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [numbers, setNumbers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [nums, keys, convs, inboundMsgs] = await Promise.all([
        base44.entities.PhoneNumber.list("-created_date", 20).catch(() => []),
        base44.entities.ApiKey.filter({ status: "active" }).catch(() => []),
        base44.entities.Conversation.list("-last_message_at", 50).catch(() => []),
        base44.entities.CommsEvent.filter({ direction: "inbound", channel: "sms" }, "-created_date", 50).catch(() => []),
      ]);
      setNumbers(nums || []);
      setApiKey(keys?.[0]?.key_value || "");
      const telnyxNum = nums?.find(n => n.provider_id && n.capabilities?.includes("sms"));
      setFromNumber(telnyxNum?.e164 || nums?.[0]?.e164 || "+19546979011");

      // Merge Conversation entity records with conversations derived from inbound CommsEvent records
      const convByIdentity = new Map();
      for (const c of (convs || [])) {
        convByIdentity.set(c.participant_identity, c);
      }
      // Add conversations from inbound SMS that don't have a Conversation record
      for (const msg of (inboundMsgs || [])) {
        if (msg.from_addr && !convByIdentity.has(msg.from_addr)) {
          convByIdentity.set(msg.from_addr, {
            id: `derived-${msg.from_addr}`,
            participant_identity: msg.from_addr,
            channels: [msg.channel],
            status: "active",
            last_message_at: msg.created_date,
            _derived: true,
          });
        }
      }
      const allConvs = Array.from(convByIdentity.values()).sort(
        (a, b) => new Date(b.last_message_at || b.created_date || 0) - new Date(a.last_message_at || a.created_date || 0)
      );
      setConversations(allConvs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = useCallback(async (participant) => {
    if (!participant) return;
    try {
      // Get all SMS/MMS events involving this participant (inbound or outbound)
      const [inbound, outbound] = await Promise.all([
        base44.entities.CommsEvent.filter({ from_addr: participant, channel: "sms" }, "-created_date", 50).catch(() => []),
        base44.entities.CommsEvent.filter({ to_addr: participant, channel: "sms" }, "-created_date", 50).catch(() => []),
      ]);
      const all = [...(inbound || []), ...(outbound || [])];
      // Sort by created_date ascending
      all.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(all);

      // Auto-detect the best "from" number: use the to_addr of the most recent inbound message
      const lastInbound = all.find(m => m.direction === "inbound");
      if (lastInbound?.to_addr) {
        setFromNumber(lastInbound.to_addr);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const selectConversation = (conv) => {
    setSelectedConv(conv);
    loadMessages(conv.participant_identity);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke("executeAutonomousAction", {
        api_key: apiKey,
        action: "send_sms",
        from_number: fromNumber,
        to_number: selectedConv.participant_identity,
        message: replyText.trim(),
      });
      const data = res?.data || res;
      if (data?.delivered || data?.api_accepted) {
        // Add the message to the thread immediately
        setMessages(prev => [...prev, {
          id: "temp-" + Date.now(),
          channel: "sms",
          direction: "outbound",
          from_addr: fromNumber,
          to_addr: selectedConv.participant_identity,
          summary: replyText.trim(),
          status: data?.delivered ? "completed" : "queued",
          created_date: new Date().toISOString(),
        }]);
        setReplyText("");
      } else {
        setError(data?.error_detail || data?.error || "Failed to send");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.participant_identity?.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Inbox className="h-5 w-5 text-accent-orange" />
            SMS Inbox
          </h1>
          <p className="text-xs text-muted-foreground">View inbound messages and reply directly</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/70 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main content — split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <div className={cn(
          "w-full md:w-80 border-r border-border flex flex-col",
          selectedConv && "hidden md:flex"
        )}>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Send a test SMS from Workflow Test Lab, then reply from your phone</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 border-b border-border hover:bg-muted/50 transition-colors text-left",
                    selectedConv?.id === conv.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{conv.participant_identity}</p>
                    <p className="text-xs text-muted-foreground">
                      {conv.channels?.join(", ") || "sms"} • {conv.status}
                    </p>
                  </div>
                  {conv.last_message_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedConv && "hidden md:flex"
        )}>
          {selectedConv ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 p-3 border-b border-border">
                <button
                  onClick={() => setSelectedConv(null)}
                  className="md:hidden p-1 rounded hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{selectedConv.participant_identity}</p>
                  <p className="text-xs text-muted-foreground">Replying from: {fromNumber}</p>
                </div>
                <select
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                  className="text-xs rounded-lg border border-border bg-background px-2 py-1 text-foreground"
                >
                  {numbers.length === 0 && <option value={fromNumber}>{fromNumber}</option>}
                  {numbers.map((n) => (
                    <option key={n.id} value={n.e164}>{n.e164}</option>
                  ))}
                </select>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No messages in this conversation yet</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isInbound = msg.direction === "inbound";
                    return (
                      <div key={msg.id} className={cn("flex", isInbound ? "justify-start" : "justify-end")}>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5",
                          isInbound
                            ? "bg-muted text-foreground rounded-bl-sm"
                            : "bg-primary text-primary-foreground rounded-br-sm"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">{msg.summary || "(no content)"}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] opacity-70">
                              {new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {!isInbound && msg.status === "completed" && (
                              <CheckCircle2 className="h-3 w-3 opacity-70" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="Type a reply..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl transition-colors shrink-0",
                      !replyText.trim() || sending
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}