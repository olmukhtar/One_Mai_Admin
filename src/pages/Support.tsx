import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, X, Send, Loader2 } from "lucide-react";

import { apiFetch, AUTH_STORAGE_KEY } from "@/lib/api";

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

const BASE = "https://api.joinonemai.com/api";
const SUPPORTS_URL = `${BASE}/admin/supports`;

function useToken() {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.token as string | null;
    } catch {
      return null;
    }
  }, []);
}

function useUserRole(): UserRole | null {
  return useMemo(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return (parsed?.role as UserRole) || null;
    } catch {
      return null;
    }
  }, []);
}

const Support = () => {
  const token = useToken();
  const role = useUserRole();
  const navigate = useNavigate();

  const [data, setData] = useState<SupportsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchId, setSearchId] = useState("");

  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<Support | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Permission checks based on roles
  // getAllSupportRequests: admin (full), account (full), customer_support (manage + respond), front_desk (view only)
  const canView = role === "admin" || role === "account" || role === "customer_support" || role === "front_desk";
  const canRespond = role === "admin" || role === "account" || role === "customer_support";
  const isViewOnly = role === "front_desk";

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/support" } });
      return;
    }

    if (!canView) {
      setErr("You don't have permission to view support tickets.");
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
          } catch { }
          throw new Error(m);
        }
        return r.json();
      })
      .then((j: SupportsResponse) => setData(j))
      .catch((e: any) => {
        if (e.name !== "AbortError") {
          setErr(e?.message || "Failed to load support tickets");
        }
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [token, canView, navigate]);

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

    // Check if user can respond
    if (!canRespond) {
      setReplyError("You don't have permission to respond to tickets.");
      return;
    }

    setSendingReply(true);
    setReplyError(null);

    try {
      const response = await apiFetch(`${SUPPORTS_URL}/${selectedTicket._id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: replyMessage })
      });

      if (!response.ok) {
        let errorMsg = `Failed to send reply: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMsg = errorData.message;
        } catch { }
        throw new Error(errorMsg);
      }

      const result = await response.json();

      // Update the ticket in the state
      if (data) {
        const updatedSupports = data.supports.map(ticket =>
          ticket._id === selectedTicket._id
            ? {
              ...ticket, messages: result.messages || [...ticket.messages, {
                _id: Date.now().toString(),
                sender: "admin",
                message: replyMessage,
                attachments: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }]
            }
            : ticket
        );
        setData({ ...data, supports: updatedSupports });
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: result.messages || [...prev.messages, {
            _id: Date.now().toString(),
            sender: "admin",
            message: replyMessage,
            attachments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        } : null);
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

    // Check if user can manage (update status)
    if (!canRespond) {
      return;
    }

    try {
      const response = await apiFetch(`${SUPPORTS_URL}/${selectedTicket._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Update local state
      if (data) {
        const updatedSupports = data.supports.map(ticket =>
          ticket._id === selectedTicket._id
            ? { ...ticket, status: newStatus }
            : ticket
        );
        setData({ ...data, supports: updatedSupports });
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const columns = [
    {
      key: "ticketId",
      label: "Ticket ID",
      render: (value: string, row: Support) => (
        <button
          onClick={() => handleViewTicket(row)}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {value}
        </button>
      )
    },
    {
      key: "full_name",
      label: "Name",
      render: (value: string) => (
        <span className="text-slate-700">{value}</span>
      )
    },
    { key: "email", label: "Email" },
    {
      key: "description",
      label: "Description",
      render: (value: string) => (
        <span className="text-slate-600 truncate max-w-xs block">
          {value.length > 50 ? `${value.substring(0, 50)}...` : value}
        </span>
      )
    },
    {
      key: "priority",
      label: "Priority",
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => <StatusBadge status={value} />
    },
    {
      key: "createdAt",
      label: "Date Created",
      render: (value: string) =>
        new Date(value).toLocaleString("en-NG", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
    },
  ];

  // Action items - only for users who can manage
  const actionItems = canRespond ? [
    {
      label: "View Details",
      onClick: (row: Support) => handleViewTicket(row)
    },
    {
      label: "Mark as Resolved",
      onClick: (row: Support) => handleUpdateStatus("resolved")
    },
    {
      label: "Mark as Closed",
      onClick: (row: Support) => handleUpdateStatus("closed")
    },
  ] : [
    {
      label: "View Details",
      onClick: (row: Support) => handleViewTicket(row)
    }
  ];

  const filteredTickets = useMemo(() => {
    if (!data?.supports) return [];

    let filtered = [...data.supports];

    if (statusFilter !== "all") {
      filtered = filtered.filter(ticket =>
        ticket.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (searchId.trim()) {
      filtered = filtered.filter(ticket =>
        ticket.ticketId.toLowerCase().includes(searchId.toLowerCase())
      );
    }

    return filtered;
  }, [data, statusFilter, searchId]);

  const exportToCSV = () => {
    if (!filteredTickets.length) return;

    const headers = ["Ticket ID", "Name", "Email", "Description", "Priority", "Status", "Date Created"];
    const rows = filteredTickets.map(t => [
      t.ticketId,
      t.full_name,
      t.email,
      t.description,
      t.priority,
      t.status,
      new Date(t.createdAt).toLocaleString()
    ]);

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${cell}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-tickets-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Support"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Support" }
          ]}
          showSearch={false}
        />

        {isViewOnly && (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            You have view-only access to support tickets. You cannot respond or update ticket status.
          </div>
        )}

        {err && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
            {err}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Date
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ticket ID</span>
              <input
                type="text"
                placeholder="Search ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-32 h-9 border rounded-md px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <span className="text-primary">📄</span>
              <span className="ml-2">CSV</span>
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={loading ? [] : filteredTickets}
          actionItems={actionItems}
          totalEntries={filteredTickets.length}
        />

        {loading && (
          <div className="text-center text-sm text-slate-500 py-4">
            Loading support tickets...
          </div>
        )}

        {!loading && filteredTickets.length === 0 && !err && (
          <div className="text-center text-sm text-slate-500 py-8">
            No support tickets found
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedTicket.ticketId}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedTicket.full_name} • {selectedTicket.email}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ticket Info */}
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedTicket.status} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500">Priority</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedTicket.priority} />
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-500">Description</span>
                  <p className="mt-1 text-sm text-slate-700">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Status Update Buttons - Only show if user can respond/manage */}
              {canRespond && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus("resolved")}
                    disabled={selectedTicket.status === "resolved"}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus("closed")}
                    disabled={selectedTicket.status === "closed"}
                  >
                    Close Ticket
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus("open")}
                    disabled={selectedTicket.status === "open"}
                  >
                    Reopen
                  </Button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedTicket.messages.map((msg, idx) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender.includes("@") ? "justify-start" : "justify-end"}`}
                >
                  <div className={`max-w-[70%] ${msg.sender.includes("@") ? "bg-slate-100" : "bg-blue-100"} rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-slate-700">
                        {msg.sender.includes("@") ? selectedTicket.full_name : "Admin"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(msg.createdAt).toLocaleString("en-NG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input - Only show if user can respond */}
            {canRespond && (
              <div className="p-6 border-t border-slate-200 bg-slate-50">
                {replyError && (
                  <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                    {replyError}
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    disabled={sendingReply}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sendingReply}
                    className="self-end"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* View Only Message for Front Desk */}
            {isViewOnly && (
              <div className="p-6 border-t border-slate-200 bg-amber-50">
                <p className="text-sm text-amber-700 text-center">
                  You have view-only access and cannot respond to this ticket.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Support;