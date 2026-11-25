/**
 * Platform fee engine — the rules from "OneMAI Platform Fee Engine — Dev Scope".
 *
 * The fee on a payout is the pot's tier rate times the payout amount, capped at
 * a maximum, rounded to the kobo:
 *
 *     fee = min(rate(pot size) x payout amount, cap)
 *
 * Everything here is integer kobo. The scope is explicit that no floating-point
 * arithmetic may appear anywhere in the fee path, so naira amounts are converted
 * to kobo on the way in and the rate is held in basis points (4% = 400 bps),
 * which keeps the multiplication exact.
 *
 * The admin endpoint (PUT /api/admin/fee-config) speaks naira and whole
 * percents, so that is the shape used for the config here; the kobo/bps
 * conversion happens inside the calculation.
 */

export type FeeTier = {
  /** 1-based tier number, in ascending pot-size order. */
  tier: number;
  /** Lower bound of the pot size in naira. Inclusive. */
  minPod: number;
  /** Upper bound of the pot size in naira. Exclusive. null on the top tier. */
  maxPod: number | null;
  /** Percentage points, 1-4. */
  rate: number;
};

export type FeeConfig = {
  /** Maximum fee per payout, in naira. */
  cap: number;
  tiers: FeeTier[];
};

export const MIN_RATE = 1;
export const MAX_RATE = 4;

export const toKobo = (naira: number) => Math.round(Number(naira || 0) * 100);
export const fromKobo = (kobo: number) => kobo / 100;

/**
 * The tier whose range contains the pot size. Lower bound inclusive, upper
 * bound exclusive, so a pot sitting exactly on a boundary belongs to the
 * higher tier. The top tier has no upper bound.
 */
export const findTier = (tiers: FeeTier[], potSize: number): FeeTier | null => {
  const pot = Number(potSize || 0);
  for (const tier of tiers) {
    const min = Number(tier.minPod || 0);
    const max = tier.maxPod === null || tier.maxPod === undefined ? null : Number(tier.maxPod);
    if (pot >= min && (max === null || pot < max)) return tier;
  }
  return null;
};

export type FeeQuote = {
  tier: number | null;
  rate: number;
  /** Fee before the cap, in kobo. */
  calculatedFeeKobo: number;
  /** Fee actually charged, in kobo. */
  feeKobo: number;
  capApplied: boolean;
  netKobo: number;
};

/**
 * The fee on one payout. `potSize` picks the tier (it is the circle's locked
 * pot size, not the payout), `payoutAmount` is what is actually being paid out
 * — on a partial or late payout the two differ, and the scope says the fee is
 * charged on the amount actually paid.
 */
export const quoteFee = (config: FeeConfig, potSize: number, payoutAmount: number): FeeQuote => {
  const tier = findTier(config.tiers || [], potSize);
  const rateBps = tier ? Math.round(Number(tier.rate || 0) * 100) : 0;
  const amountKobo = toKobo(payoutAmount);
  const capKobo = toKobo(config.cap);

  // Round half up to the nearest kobo without leaving integer arithmetic:
  // (a * bps + 5000) / 10000, floored.
  const calculatedFeeKobo = Math.floor((amountKobo * rateBps + 5000) / 10000);

  let feeKobo = calculatedFeeKobo;
  const capApplied = capKobo > 0 && feeKobo > capKobo;
  if (capApplied) feeKobo = capKobo;

  // A fee can never exceed the payout, so the net is never negative.
  if (feeKobo > amountKobo) feeKobo = amountKobo;

  return {
    tier: tier ? tier.tier : null,
    rate: tier ? tier.rate : 0,
    calculatedFeeKobo,
    feeKobo,
    capApplied,
    netKobo: amountKobo - feeKobo,
  };
};

/**
 * Validation the admin editor applies before saving: tiers must cover every pot
 * size from 0 upward with no gaps or overlaps, every rate must sit between 1%
 * and 4%, and the cap must be greater than zero.
 */
export const validateFeeConfig = (config: FeeConfig): string[] => {
  const errors: string[] = [];
  const tiers = Array.isArray(config.tiers) ? config.tiers : [];

  if (!(Number(config.cap) > 0)) errors.push("Cap must be greater than zero.");
  if (tiers.length === 0) {
    errors.push("Add at least one tier.");
    return errors;
  }

  if (Number(tiers[0].minPod) !== 0) {
    errors.push("The first tier must start at ₦0 so every pot size is covered.");
  }

  tiers.forEach((tier, index) => {
    const label = `Tier ${tier.tier ?? index + 1}`;
    const min = Number(tier.minPod);
    const isLast = index === tiers.length - 1;
    const max = tier.maxPod === null || tier.maxPod === undefined ? null : Number(tier.maxPod);

    if (!Number.isFinite(min) || min < 0) errors.push(`${label}: minimum pot size is not a valid amount.`);
    if (!Number.isFinite(Number(tier.rate)) || Number(tier.rate) < MIN_RATE || Number(tier.rate) > MAX_RATE) {
      errors.push(`${label}: rate must be between ${MIN_RATE}% and ${MAX_RATE}%.`);
    }

    if (max === null) {
      if (!isLast) errors.push(`${label}: only the top tier can be open-ended.`);
    } else {
      if (!Number.isFinite(max)) errors.push(`${label}: maximum pot size is not a valid amount.`);
      else if (max <= min) errors.push(`${label}: maximum pot size must be above the minimum.`);
    }

    // No gaps or overlaps: each tier starts exactly where the previous ended.
    if (index > 0) {
      const previous = tiers[index - 1];
      const previousMax =
        previous.maxPod === null || previous.maxPod === undefined ? null : Number(previous.maxPod);
      if (previousMax === null) {
        errors.push(`${label}: nothing can follow an open-ended tier.`);
      } else if (previousMax !== min) {
        errors.push(
          `${label}: starts at ₦${min.toLocaleString()} but Tier ${previous.tier ?? index} ends at ₦${previousMax.toLocaleString()} — tiers must meet exactly.`
        );
      }
    }
  });

  const last = tiers[tiers.length - 1];
  if (last.maxPod !== null && last.maxPod !== undefined) {
    errors.push("The top tier must be open-ended so pot sizes above it are still covered.");
  }

  return errors;
};
