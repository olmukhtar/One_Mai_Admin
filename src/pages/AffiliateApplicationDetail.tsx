// src/pages/AffiliateApplicationDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

type ApplicationStatus = "pending" | "approved" | "rejected" | "more_information" | "interview";

type ApplicationUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  email: string;
  userType?: string;
  accountStatus?: string;
  phoneNumber?: string;
  country?: string;
  currency?: string;
  isApproved?: boolean;
  isVerified?: boolean;
  integrity?: number;
  completedCycle?: number;
  payoutBalance?: number;
  totalReferrals?: number;
};

type Application = {
  _id: string;
  user: ApplicationUser;
  socials?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  estimatedAudienceSize?: number;
  hasAudience: boolean;
  hasProductPromotionExperience: boolean;
  promotionChannels: string[];
  reason: string;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  status: ApplicationStatus;
  commissionRate?: number;
  totalReferrals?: number;
};

type KycRecord = {
  _id: string;
  provider?: string;
  status?: string;
  submittedAt?: string;
  verifiedAt?: string;
  data?: {
    bvnInformationVerification?: {
      responseBody?: {
        name?: { matchStatus?: string; matchPercentage?: number };
        dateOfBirth?: string;
        mobileNo?: string;
      };
    };
    ninVerification?: {
      responseBody?: {
        firstName?: string;
        lastName?: string;
        middleName?: string;
        dateOfBirth?: string;
        gender?: string;
        mobileNumber?: string;
      };
    };
    summary?: { name?: string };
  };
};

type DetailsResponse = {
  success: boolean;
  message: string;
  data: {
    application: Application;
    kyc?: KycRecord | null;
  };
};

type UserRole = "admin" | "account" | "front_desk" | "customer_support";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "more_information", label: "More Information Needed" },
  { value: "interview", label: "Interview" },
];

const CHANNEL_LABELS: Record<string, string> = {
  social_media: "Social Media",
  whatsapp: "WhatsApp",
  community: "Community",
  campus_ambassador: "Campus Ambassador",
  website_blog: "Website / Blog",
  business_network: "Business Network",
  other: "Other",
};



function nameOf(u?: ApplicationUser) {
  if (!u) return "—";
  return `${(u.firstName || "").trim()} ${(u.lastName || "").trim()}`.trim() || u.email || "—";
}

function formatDate(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanizeStatus(status: string) {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const DETAILS_URL = (id: string) => `${API_BASE_URL}/admin/affiliate-applications/${id}`;

export default function AffiliateApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, adminId } = useAuth();

  const [details, setDetails] = useState<DetailsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ApplicationStatus>("pending");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) {
      navigate("/affiliate-applications", { replace: true });
      return;
    }

    setLoading(true);
    setErr(null);

    apiFetch(DETAILS_URL(id))
      .then(async (res) => {
        if (!res.ok) {
          let msg = `Failed to load application: ${res.status}`;
          try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json: DetailsResponse) => {
        setDetails(json.data);
        setReviewStatus(json.data.application.status || "pending");
        setReviewNote(json.data.application.reviewNote || "");
        setReviewReason("");
        setCommissionRate((json.data.application.commissionRate || "").toString());
      })
      .catch((e: any) => setErr(e?.message || "Failed to load application"))
      .finally(() => setLoading(false));
  }, [token, id, navigate]);

  const handleSubmitReview = async () => {
    if (!id) return;
    if (!adminId) {
      setSubmitError("Couldn't determine your admin ID. Please sign in again.");
      return;
    }

    if (reviewStatus === "approved" && !commissionRate) {
      setSubmitError("Commission rate is required when approving an application.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload: any = {
        status: reviewStatus,
        reviewNote: reviewNote || undefined,
        reviewedBy: adminId,
        reason: reviewReason || undefined,
      };

      if (reviewStatus === "approved" && commissionRate) {
        payload.commissionRate = parseFloat(commissionRate);
      }

      const res = await apiFetch(DETAILS_URL(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || `Failed to update application: ${res.status}`);
      }

      setSubmitSuccess(body?.message || "Application updated successfully.");

      const updatedApplication: Application | undefined = body?.data;
      if (updatedApplication) {
        setDetails((prev) => (prev ? { ...prev, application: updatedApplication } : prev));
      }
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to update application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!details) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Affiliate Application"
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Affiliate Applications", href: "/affiliate-applications" },
              { label: "Application" },
            ]}
            rightSlot={
              <Button variant="outline" onClick={() => navigate("/affiliate-applications")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            }
          />
          {err && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  const u = details.application.user;
  const app = details.application;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={nameOf(u)}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Affiliate Applications", href: "/affiliate-applications" },
            { label: nameOf(u) },
          ]}
          rightSlot={
            <Button variant="outline" onClick={() => navigate("/affiliate-applications")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applicant Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={u?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameOf(u))}`}
                    alt={nameOf(u)}
                    className="h-16 w-16 rounded-full border object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-lg">{nameOf(u)}</h3>
                    <p className="text-xs text-slate-500 font-mono">{u?._id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm border-t pt-4">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={u?.accountStatus || "unknown"} />
                  <span className="text-slate-500">Verified</span>
                  <StatusBadge status={u?.isVerified ? "Verified" : "Unverified"} />
                  <span className="text-slate-500">Integrity</span>
                  <span className="font-medium">{u?.integrity || 0}%</span>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 w-20">Email:</span>
                    <span>{u?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 w-20">Phone:</span>
                    <span>{u?.phoneNumber || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 w-20">Country:</span>
                    <span>{u?.country || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Application Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <StatusBadge status={humanizeStatus(app.status)} />
                  </dd>
                  <dt className="text-slate-500">Has Audience</dt>
                  <dd className="text-slate-800">{app.hasAudience ? "Yes" : "No"}</dd>
                  {app.hasAudience && (
                    <>
                      <dt className="text-slate-500">Estimated Audience</dt>
                      <dd className="text-slate-800">{app.estimatedAudienceSize?.toLocaleString() || "—"}</dd>
                    </>
                  )}
                  <dt className="text-slate-500">Promotion Experience</dt>
                  <dd className="text-slate-800">{app.hasProductPromotionExperience ? "Yes" : "No"}</dd>
                  <dt className="text-slate-500">Applied</dt>
                  <dd className="text-slate-700">{formatDate(app.createdAt)}</dd>
                </dl>

                {app.promotionChannels && app.promotionChannels.length > 0 && (
                  <div className="border-t pt-4">
                    <dt className="text-slate-500 mb-2 text-sm">Promotion Channels</dt>
                    <dd className="flex flex-wrap gap-2">
                      {app.promotionChannels.map((c) => (
                        <span
                          key={c}
                          className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200"
                        >
                          {CHANNEL_LABELS[c] || c}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}

                {app.reason && (
                  <div className="border-t pt-4">
                    <dt className="text-slate-500 mb-1 text-sm">Reason</dt>
                    <dd className="text-slate-700 leading-relaxed">{app.reason}</dd>
                  </div>
                )}

                {app.socials && Object.keys(app.socials).length > 0 && (
                  <div className="border-t pt-4">
                    <dt className="text-slate-500 mb-2 text-sm">Social Profiles</dt>
                    <dd className="flex flex-col gap-2">
                      {Object.entries(app.socials).map(([key, url]) =>
                        url ? (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span className="capitalize font-medium text-slate-600 w-20">{key}:</span>
                            <span className="truncate">{url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : null
                      )}
                    </dd>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KYC Card */}
            {details.kyc && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Identity Verification (KYC)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <dt className="text-slate-500">Provider</dt>
                    <dd className="capitalize">{details.kyc.provider || "—"}</dd>
                    <dt className="text-slate-500">Status</dt>
                    <dd>
                      <StatusBadge status={details.kyc.status || "unknown"} />
                    </dd>
                    <dt className="text-slate-500">Verified Name</dt>
                    <dd>{details.kyc.data?.summary?.name || "—"}</dd>
                  </dl>

                  {details.kyc.data?.bvnInformationVerification?.responseBody?.name && (
                    <div className="border-t pt-4">
                      <dt className="text-slate-500 mb-2 text-sm">BVN Verification</dt>
                      <dd className="text-sm">
                        <p className="text-slate-700">
                          Match: {details.kyc.data.bvnInformationVerification.responseBody.name.matchStatus}
                          {typeof details.kyc.data.bvnInformationVerification.responseBody.name.matchPercentage === "number" &&
                            ` (${details.kyc.data.bvnInformationVerification.responseBody.name.matchPercentage}%)`}
                        </p>
                      </dd>
                    </div>
                  )}

                  {details.kyc.data?.ninVerification?.responseBody && (
                    <div className="border-t pt-4">
                      <dt className="text-slate-500 mb-2 text-sm">NIN Verification</dt>
                      <dd className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Name:</span> {details.kyc.data.ninVerification.responseBody.firstName}{" "}
                          {details.kyc.data.ninVerification.responseBody.lastName}
                        </div>
                        <div>
                          <span className="text-slate-500">Gender:</span> {details.kyc.data.ninVerification.responseBody.gender}
                        </div>
                        <div>
                          <span className="text-slate-500">DOB:</span> {details.kyc.data.ninVerification.responseBody.dateOfBirth}
                        </div>
                      </dd>
                    </div>
                  )}

                  <div className="border-t pt-4 text-sm">
                    <span className="text-slate-500">Verified At: </span>
                    <span>{formatDate(details.kyc.verifiedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Review Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Review Application</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submitError && (
                  <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
                {submitSuccess && (
                  <div className="text-xs text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="review-status" className="text-sm font-semibold">
                    Decision
                  </Label>
                  <Select
                    value={reviewStatus}
                    onValueChange={(val) => setReviewStatus(val as ApplicationStatus)}
                  >
                    <SelectTrigger id="review-status" className="w-full text-xs rounded-xl h-9">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approve Application</SelectItem>
                      <SelectItem value="rejected">Reject Application</SelectItem>
                      <SelectItem value="more_information">Request Info</SelectItem>
                      <SelectItem value="interview">Invite to Interview</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reviewStatus === "approved" && (
                  <div className="space-y-2">
                    <Label htmlFor="commission-rate" className="text-xs font-semibold">
                      Commission Rate (%)
                    </Label>
                    <input
                      id="commission-rate"
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 h-9"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="review-note" className="text-xs font-semibold">
                    Internal Note
                  </Label>
                  <Textarea
                    id="review-note"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Notes for other admins"
                    rows={3}
                    className="text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-reason" className="text-xs font-semibold text-slate-700">
                    Applicant Feedback Note
                  </Label>
                  <Textarea
                    id="review-reason"
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="Optional feedback"
                    rows={3}
                    className="text-sm font-medium"
                  />
                </div>

                <Button onClick={handleSubmitReview} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Decision"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
