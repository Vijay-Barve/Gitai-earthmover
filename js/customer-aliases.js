/**
 * Customer name aliases — merge register spelling variants to one canonical name.
 */
const CustomerAliases = (function () {
  const CANONICAL = {
    GAJANAN_NANNAJI_DHORE: 'Gajanan Nannaji Dhore'
  };

  /** Exact keys after normalizeKey() → canonical display name */
  const EXACT = {
    'gajanan nannaji dhore': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan dhore': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'dhore gajanan': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan dore': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'dore gajanan': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan sarpanch': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan dore sarpanch': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan dhore sarpanch': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन सरपंच': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन ढोरे': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन दोरे': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन ढोरे सरपंच': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन दोरे सरपंच': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन नन्नाजी ढोरे': CANONICAL.GAJANAN_NANNAJI_DHORE
  };

  function normalizeKey(name) {
    return String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Pattern: Gajanan + Dhore/Dore (any order), optional Sarpanch —
   * does NOT match Thore / other villages (Wakhari, Babhulgaon, etc.).
   */
  function matchGajananNannajiDhore(key) {
    if (!key) return false;
    if (EXACT[key]) return true;

    const hasGajanan = /\bgajanan\b/.test(key) || key.includes('गजानन');
    if (!hasGajanan) return false;

    // Exclude known different people
    if (/\bthore\b|ठोरे|wakhari|babhulgaon|बाभुळगाव|maroti|मारोती|pavke|gangawale|गंगावणे|barve|sheikh|शेत|\bbend\b|बेंड/.test(key)) {
      return false;
    }

    const hasDhore = /\bdhore\b|\bdore\b|ढोरे|दोरे/.test(key);
    const isPlainSarpanch = /^(gajanan sarpanch|गजानन सरपंच)$/.test(key);
    const gajananSarpanchDhore = hasDhore && /sarpanch|सरपंच/.test(key);

    return hasDhore || isPlainSarpanch || gajananSarpanchDhore;
  }

  function canonicalize(name) {
    const original = String(name || '').trim().replace(/\s+/g, ' ');
    if (!original) return original;
    const key = normalizeKey(original);
    if (EXACT[key]) return EXACT[key];
    if (matchGajananNannajiDhore(key)) return CANONICAL.GAJANAN_NANNAJI_DHORE;
    return original;
  }

  /** Stable grouping key for ledgers (canonical, lowercased) */
  function ledgerKey(name) {
    return normalizeKey(canonicalize(name)) || '(no customer name)';
  }

  return {
    CANONICAL,
    canonicalize,
    ledgerKey,
    normalizeKey
  };
})();
