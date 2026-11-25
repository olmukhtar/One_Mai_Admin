import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import {
  FeeConfig as FeeConfigShape,
  FeeTier,
  MAX_RATE,
  MIN_RATE,
  fromKobo,
  quoteFee,
  validateFeeConfig,
} from "@/lib/feeEngine";

const URL_FEE_CONFIG = `${API_BASE_URL}/admin/fee-config`;

/**
 * Shown only when the current configuration cannot be loaded, as a starting
 * point to edit — never saved on its own. The scope is explicit that these
 * numbers are placeholders and the real values are set here by the business.
 */
const TEMPLATE: FeeConfigShape = {
  cap: 25000,
  tiers: [
    { tier: 1, minPod: 0, maxPod: 100000, rate: 4 },
    { tier: 2, minPod: 100000, maxPod: 500000, rate: 3 },
    { tier: 3, minPod: 500000, maxPod: 2000000, rate: 2 },
    { tier: 4, minPod: 2000000, maxPod: null, rate: 1 },
  ],
};

/** Only what the endpoint is known to return; everything else is ignored. */
type RawTier = { tier?: number; minPod?: number; maxPod?: number | null; rate?: number };

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

const ngn = (amount: number) => `₦${Math.round(amount).toLocaleString()}`;

const parseAmount = (raw: string): number => {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
};

export default function FeeConfigPage() {
  const { toast } = useToast();
  const [cap, setCap] = useState<number>(TEMPLATE.cap);
  const [tiers, setTiers] = useState<FeeTier[]>(TEMPLATE.tiers);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The endpoint has no version history, so when the schedule last changed is
  // the only provenance available — worth showing rather than hiding.
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiFetch(URL_FEE_CONFIG);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = await response.json();
      const config = payload?.data ?? payload?.feeConfig ?? payload;
      const loadedTiers = Array.isArray(config?.tiers) ? config.tiers : null;
      if (!loadedTiers || !loadedTiers.length) throw new Error("No fee configuration returned");
      setCap(Number(config.cap) || 0);
      setUpdatedAt(config.updatedAt || config.createdAt || null);
      setTiers(
        loadedTiers.map((tier: RawTier, index: number) => ({
          tier: Number(tier?.tier ?? index + 1),
          minPod: Number(tier?.minPod ?? 0),
          maxPod:
            tier?.maxPod === null || tier?.maxPod === undefined ? null : Number(tier.maxPod),
          rate: Number(tier?.rate ?? 0),
        }))
      );
    } catch (e) {
      // Keep the template on screen so the admin can still build a schedule,
      // but say plainly that these are not the live values.
      setUpdatedAt(null);
      setLoadError(errorMessage(e, "Could not load the current fee configuration."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateTier = (index: number, patch: Partial<FeeTier>) => {
    setTiers((current) =>
      current.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
    );
  };

  const addTier = () => {
    setTiers((current) => {
      const last = current[current.length - 1];
      // The new tier takes over the open-ended top, starting where the
      // previous one now ends, so the ladder stays gap-free by construction.
      const boundary = last ? Math.max(Number(last.minPod) || 0, Number(last.maxPod) || 0) : 0;
      const closedLast = last ? { ...last, maxPod: last.maxPod ?? boundary } : null;
      return [
        ...current.slice(0, -1),
        ...(closedLast ? [closedLast] : []),
        {
          tier: current.length + 1,
          minPod: closedLast ? Number(closedLast.maxPod) : 0,
          maxPod: null,
          rate: MIN_RATE,
        },
      ];
    });
  };

  const removeTier = (index: number) => {
    setTiers((current) => {
      const next = current.filter((_, i) => i !== index);
      // Renumber and re-open the new top tier so the ladder stays valid.
      return next.map((tier, i) => ({
        ...tier,
        tier: i + 1,
        minPod: i === 0 ? 0 : next[i - 1].maxPod ?? tier.minPod,
        maxPod: i === next.length - 1 ? null : tier.maxPod,
      }));
    });
  };

  const config = useMemo<FeeConfigShape>(() => ({ cap, tiers }), [cap, tiers]);
  const errors = useMemo(() => validateFeeConfig(config), [config]);

  /**
   * Live preview at sample pot sizes: each tier's lower bound and the last
   * naira below its upper bound, which is exactly where the boundary rule
   * ("lower inclusive, upper exclusive") is easiest to get wrong.
   */
  const preview = useMemo(() => {
    const samples: number[] = [];
    tiers.forEach((tier) => {
      const min = Number(tier.minPod) || 0;
      samples.push(min);
      if (tier.maxPod !== null && tier.maxPod !== undefined) samples.push(Number(tier.maxPod) - 1);
      else samples.push(min * 2 || 1000000);
    });
    return Array.from(new Set(samples))
      .filter((pot) => Number.isFinite(pot) && pot >= 0)
      .sort((a, b) => a - b)
      .map((pot) => ({ pot, quote: quoteFee(config, pot, pot) }));
  }, [config, tiers]);

  const onSave = async () => {
    if (errors.length) {
      toast({
        title: "Fix the schedule first",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(URL_FEE_CONFIG, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cap,
          tiers: tiers.map((tier) => ({
            tier: tier.tier,
            minPod: tier.minPod,
            maxPod: tier.maxPod,
            rate: tier.rate,
          })),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || `Request failed (${response.status})`);
      }
      toast({
        title: "Fee schedule saved",
        description: "New circles will be created against this schedule.",
      });
      setLoadError(null);
      load();
    } catch (e) {
      toast({
        title: "Could not save the fee schedule",
        description: errorMessage(e, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Platform Fee Engine"
          subtitle="Tiered, capped fee charged once when a member collects their payout. The tier is set by the circle's pot size."
          breadcrumbs={[{ label: "Fee Engine" }]}
          rightSlot={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading || saving}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Reload
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving || loading || errors.length > 0}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {saving ? "Saving…" : "Save schedule"}
              </Button>
            </div>
          }
        />

        {loadError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              {loadError} The table below is a starting template, not the live schedule — review
              every value before saving.
            </span>
          </div>
        )}

        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Tiers</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="fee-cap">Cap per payout (₦)</Label>
              <Input
                id="fee-cap"
                inputMode="numeric"
                value={cap ? cap.toLocaleString() : ""}
                onChange={(e) => setCap(parseAmount(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                A calculated fee above this amount is charged at the cap.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Tier</TableHead>
                  <TableHead>Pot size from (₦)</TableHead>
                  <TableHead>Pot size up to (₦)</TableHead>
                  <TableHead className="w-32">Rate (%)</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier, index) => {
                  const isLast = index === tiers.length - 1;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{tier.tier}</TableCell>
                      <TableCell>
                        <Input
                          inputMode="numeric"
                          value={Number(tier.minPod || 0).toLocaleString()}
                          onChange={(e) => updateTier(index, { minPod: parseAmount(e.target.value) })}
                          // The first tier must start at zero for the ladder to
                          // cover every pot size, so it is not editable.
                          disabled={index === 0}
                        />
                      </TableCell>
                      <TableCell>
                        {isLast ? (
                          <span className="text-sm text-muted-foreground">and above</span>
                        ) : (
                          <Input
                            inputMode="numeric"
                            value={Number(tier.maxPod || 0).toLocaleString()}
                            onChange={(e) => {
                              const value = parseAmount(e.target.value);
                              updateTier(index, { maxPod: value });
                              // Keep the next tier flush against this one, so
                              // editing a boundary cannot open a gap.
                              updateTier(index + 1, { minPod: value });
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          inputMode="decimal"
                          value={String(tier.rate ?? "")}
                          onChange={(e) =>
                            updateTier(index, { rate: Number(e.target.value.replace(/[^\d.]/g, "")) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {tiers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTier(index)}
                            aria-label={`Remove tier ${tier.tier}`}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Button variant="outline" size="sm" onClick={addTier}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add tier
            </Button>

            <p className="text-xs text-muted-foreground">
              Lower bound inclusive, upper bound exclusive — a pot sitting exactly on a boundary
              pays the higher tier's rate. Rates must be between {MIN_RATE}% and {MAX_RATE}%.
            </p>

            {errors.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-700 mb-1">
                  This schedule cannot be saved yet
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-sm text-rose-700">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm rounded-2xl bg-card">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Preview — fee on a full payout
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pot size</TableHead>
                  <TableHead>Tier and rate</TableHead>
                  <TableHead>Calculated fee</TableHead>
                  <TableHead>Fee charged</TableHead>
                  <TableHead>Net payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map(({ pot, quote }) => (
                  <TableRow key={pot}>
                    <TableCell>{ngn(pot)}</TableCell>
                    <TableCell>
                      {quote.tier ? `${quote.tier} · ${quote.rate}%` : "— not covered"}
                    </TableCell>
                    <TableCell>{ngn(fromKobo(quote.calculatedFeeKobo))}</TableCell>
                    <TableCell>
                      {ngn(fromKobo(quote.feeKobo))}
                      {quote.capApplied && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(capped)</span>
                      )}
                    </TableCell>
                    <TableCell>{ngn(fromKobo(quote.netKobo))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">
              Figures assume the member collects the full pot. The fee is calculated in kobo as
              integers and rounded half up, so these match what the payout will charge.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          {updatedAt
            ? `Live schedule, last updated ${new Date(updatedAt).toLocaleString()}. `
            : ""}
          Saving affects new circles only. A circle keeps the schedule it was created under for its
          whole life.
        </p>
      </div>
    </AdminLayout>
  );
}
