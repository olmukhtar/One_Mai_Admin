import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Send, Loader2, HeadphonesIcon, MessageSquare } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

type Message = {
  _id: string;
  sender: string;
  message: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
};

type Support = {
  _id: string;
  ticketId: string;
  full_name: string;
  email: string;
  description: string;
  status: string;
  priority: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

type SupportsResponse = {
  supports: Support[];
  message: string;
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

const BASE = API_BASE_URL;
const SUPPORTS_URL = `${BASE}/support`;

export default function SupportPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<SupportsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedTicket, setSelectedTicket] = useState<Support | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/support" } });
      return;
    }

    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    apiFetch(SUPPORTS_URL, {
      signal: ctl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          let m = `Failed to load support tickets: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.message) m = `Failed to load support tickets: ${j.message}`;
          } catch {}
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: any) => {
        const payload = j.data || j;
        const supports = payload.data || payload.supports || (Array.isArray(payload) ? payload : []);
        setData({
          supports,
          message: j.message || payload.message || "",
        });
      })
      .catch((e: any) => {
        if (e.name !== "AbortError") {
          setErr(e?.message || "Failed to load support tickets");
        }
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [token, navigate]);

  const handleViewTicket = (ticket: Support) => {
    setSelectedTicket(ticket);
    setReplyMessage("");
    setReplyError(null);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
    setReplyMessage("");
    setReplyError(null);
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket || !token) return;

    setSendingReply(true);
    setReplyError(null);

    try {
      const response = await apiFetch(`${SUPPORTS_URL}/${selectedTicket._id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: replyMessage }),
      });

      if (!response.ok) {
        let errorMsg = `Failed to send reply: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMsg = errorData.message;
        } catch {}
        throw new Error(errorMsg);
      }

      const result = await response.json();
      const payload = result.data || result;
      const newMessages = payload.messages || (Array.isArray(payload) ? payload : null);

      if (data) {
        const updatedSupports = data.supports.map((ticket) =>
          ticket._id === selectedTicket._id
            ? {
                ...ticket,
                messages:
                  newMessages || [
                    ...ticket.messages,
                    {
                      _id: Date.now().toString(),
                      sender: "admin",
                      message: replyMessage,
                      attachments: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
              }
            : ticket
        );
        setData({ ...data, supports: updatedSupports });
        setSelectedTicket((prev) =>
          prev
            ? {
                ...prev,
                messages:
                  newMessages || [
                    ...prev.messages,
                    {
                      _id: Date.now().toString(),
                      sender: "admin",
                      message: replyMessage,
                      attachments: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
              }
            : null
        );
      }

      setReplyMessage("");
    } catch (error: any) {
      setReplyError(error.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket || !token) return;

    try {
      const response = await apiFetch(`${SUPPORTS_URL}/${selectedTicket._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      if (data) {
        const updatedSupports = data.supports.map((ticket) =>
          ticket._id === selectedTicket._id ? { ...ticket, status: newStatus } : ticket
        );
        setData({ ...data, supports: updatedSupports });
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const filteredTickets = useMemo(() => {
    if (!data?.supports) return [];
    let filtered = [...data.supports];
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (ticket) => ticket.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    return filtered;
  }, [data, statusFilter]);

  const columns = [
    {
      key: "ticketId",
      label: "Ticket ID",
      render: (value: string, row: Support) => (
        <button
          onClick={() => handleViewTicket(row)}
          className="font-mono text-xs font-bold text-brand hover:underline"
        >
          {value}
        </button>
      ),
    },
    {
      key: "full_name",
      label: "Member Name",
      render: (v: string) => <span className="font-semibold text-xs text-foreground">{v}</span>,
    },
    { key: "email", label: "Email" },
    {
      key: "priority",
      label: "Priority",
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      key: "createdAt",
      label: "Submitted Date",
      render: (v: string) => (
        <span className="text-xs text-muted-foreground">
          {new Date(v).toLocaleDateString("en-NG", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Support Center Queue"
          subtitle="Customer inquiry tickets, help center requests, and dispute resolutions."
          breadcrumbs={[{ label: "Support" }]}
          showExportButtons
          rightSlot={
            <div className="w-36">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 rounded-xl text-xs border-border/80 bg-card font-medium">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {err && (
          <div className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
            {err}
          </div>
        )}

        <DataTable
          columns={columns}
          data={filteredTickets}
          actionItems={[
            { label: "Inspect Ticket Thread", onClick: (row: Support) => handleViewTicket(row) },
          ]}
          loading={loading}
          totalEntries={filteredTickets.length}
        />

        {/* Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] rounded-2xl border border-border shadow-2xl bg-card overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Ticket {selectedTicket.ticketId}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    From: {selectedTicket.full_name} ({selectedTicket.email})
                  </p>
                </div>
                <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 bg-muted/30 border-b border-border/60 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedTicket.status} />
                  <StatusBadge status={selectedTicket.priority} />
                </div>
                <p className="text-foreground font-medium">{selectedTicket.description}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${
                      msg.sender.includes("@") ? "items-start" : "items-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs space-y-1 ${
                        msg.sender.includes("@")
                          ? "bg-muted text-foreground"
                          : "bg-brand text-white"
                      }`}
                    >
                      <span className="font-bold block text-[10px] opacity-80">
                        {msg.sender.includes("@") ? selectedTicket.full_name : "Admin Support"}
                      </span>
                      <p>{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border/60 bg-muted/20 space-y-3 text-xs">
                {replyError && <p className="text-rose-600 font-medium">{replyError}</p>}
                <div className="flex gap-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type response to member..."
                    rows={2}
                    className="flex-1 rounded-xl border border-border bg-background p-2.5 text-xs"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyMessage.trim()}
                    className="h-auto px-4 bg-brand hover:bg-brand-hover text-white rounded-xl"
                  >
                    {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}