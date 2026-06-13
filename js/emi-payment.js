/**
 * EMI split payment helpers — machine account vs partner personal payment
 */
const EmiPaymentHelper = (function () {
  const MODES = ['Business', 'Partner', 'Split'];

  function totalDue(row) {
    if (parseNum(row.TotalPaid) > 0) return parseNum(row.TotalPaid);
    const emi = parseNum(row.EMIAmount);
    const bounce = parseNum(row.BounceCharges);
    const penalty = parseNum(row.PenaltyCharges);
    if (row.Status === 'Paid' || row.PaidDate) return emi + bounce + penalty;
    if (row.Status === 'Bounced') return bounce + penalty;
    return emi + bounce + penalty;
  }

  /** Infer or normalize business/partner split for one EMI row */
  function normalize(row) {
    const total = totalDue(row);
    let business = parseNum(row.BusinessPaid);
    let partner = parseNum(row.PartnerPaid);
    const paidByPartner = String(row.PaidByPartner || '').trim();
    const mode = String(row.PaymentMode || '').trim();

    if (business === 0 && partner === 0 && total > 0 && (row.Status === 'Paid' || row.PaidDate)) {
      if (mode === 'Partner' || (paidByPartner && mode !== 'Business' && mode !== 'Split')) {
        partner = total;
        business = 0;
      } else if (mode === 'Split') {
        business = total;
        partner = 0;
      } else {
        business = total;
        partner = 0;
      }
    }

    if (business + partner > 0 && total > 0 && Math.abs(business + partner - total) > 0.02) {
      if (partner > 0 && business === 0) business = Math.max(0, total - partner);
      else if (business > 0 && partner === 0) partner = Math.max(0, total - business);
    }

    let paymentMode = mode;
    if (!MODES.includes(paymentMode)) {
      if (partner > 0 && business > 0) paymentMode = 'Split';
      else if (partner > 0) paymentMode = 'Partner';
      else paymentMode = 'Business';
    }

    return { business, partner, total, paidByPartner, paymentMode };
  }

  function validateSplit(business, partner, total, paidByPartner, paymentMode) {
    if (paymentMode === 'Partner' || paymentMode === 'Split') {
      if (partner > 0 && !paidByPartner) {
        return { ok: false, message: 'Select the partner who paid their portion.' };
      }
    }
    if (total > 0 && Math.abs(business + partner - total) > 0.02) {
      return {
        ok: false,
        message: `Machine (${formatCurrency(business)}) + Partner (${formatCurrency(partner)}) must equal Total Paid (${formatCurrency(total)}).`
      };
    }
    if (paymentMode === 'Business' && partner > 0) {
      return { ok: false, message: 'Partner amount must be zero for Machine account payment.' };
    }
    if (paymentMode === 'Partner' && business > 0) {
      return { ok: false, message: 'Machine amount must be zero when partner pays full EMI.' };
    }
    return { ok: true };
  }

  function amountsForMode(mode, total) {
    if (mode === 'Partner') return { business: 0, partner: total };
    if (mode === 'Split') return { business: total, partner: 0 };
    return { business: total, partner: 0 };
  }

  function paymentSummary(row) {
    const { business, partner, paidByPartner, paymentMode } = normalize(row);
    if (paymentMode === 'Partner' && partner > 0) {
      return `${paidByPartner || 'Partner'} · ${formatCurrency(partner)}`;
    }
    if (paymentMode === 'Split' && partner > 0) {
      return `Machine ${formatCurrency(business)} + ${paidByPartner || 'Partner'} ${formatCurrency(partner)}`;
    }
    if (business > 0) return `Machine · ${formatCurrency(business)}`;
    return '—';
  }

  /** Partner name → total EMI paid personally (for settlement) */
  function partnerContributions(emiRows) {
    const map = {};
    (emiRows || []).forEach(row => {
      const { partner, paidByPartner } = normalize(row);
      if (partner > 0 && paidByPartner) {
        map[paidByPartner] = (map[paidByPartner] || 0) + partner;
      }
    });
    return map;
  }

  function businessTotal(emiRows) {
    return (emiRows || []).reduce((s, row) => s + normalize(row).business, 0);
  }

  function partnerTotal(emiRows) {
    return (emiRows || []).reduce((s, row) => s + normalize(row).partner, 0);
  }

  return {
    MODES,
    totalDue,
    normalize,
    validateSplit,
    amountsForMode,
    paymentSummary,
    partnerContributions,
    businessTotal,
    partnerTotal
  };
})();
