/**
 * Customer name aliases — surname spelling fixes + known person merges.
 */
const CustomerAliases = (function () {
  const CANONICAL = {
    GAJANAN_NANNAJI_DHORE: 'Gajanan Nannaji Dhore'
  };

  /**
   * Register surname variants that mean Dhore / ढोरे.
   * Word-boundary aware so "Khatore" is not changed.
   */
  function normalizeSurnames(text) {
    let s = String(text || '');
    if (!s) return s;

    // English / Latin spellings (whole words only)
    s = s.replace(/\bThombre\b/gi, m => preserveCase(m, 'Dhore'));
    s = s.replace(/\bThaure\b/gi, m => preserveCase(m, 'Dhore'));
    s = s.replace(/\bThore\b/gi, m => preserveCase(m, 'Dhore'));
    s = s.replace(/\bTore\b/gi, m => preserveCase(m, 'Dhore'));
    // Dore is the same family name in many register rows
    s = s.replace(/\bDore\b/gi, m => preserveCase(m, 'Dhore'));

    // Devanagari spellings
    s = s.replace(/ठोंबरे/g, 'ढोरे');
    s = s.replace(/ठौरे/g, 'ढोरे');
    s = s.replace(/ठोरे/g, 'ढोरे');
    s = s.replace(/तोरे/g, 'ढोरे');
    s = s.replace(/दोरे/g, 'ढोरे');

    return s.replace(/\s+/g, ' ').trim();
  }

  function preserveCase(sample, replacement) {
    if (sample === sample.toUpperCase()) return replacement.toUpperCase();
    if (sample === sample.toLowerCase()) return replacement.toLowerCase();
    return replacement;
  }

  /** Exact keys after surname normalize + normalizeKey() → canonical display name */
  const EXACT = {
    'gajanan nannaji dhore': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'nannaji dhore': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'nannaji gajanan dhore': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan dhore': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'dhore gajanan': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan sarpanch': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gajanan dhore sarpanch': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन सरपंच': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन ढोरे': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन ढोरे सरपंच': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजानन नन्नाजी ढोरे': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'नान्नाजी ढोरे': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gaju sarpanch degav wat': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gaju sarpanch degav': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'gaju dhore sarpanch': CANONICAL.GAJANAN_NANNAJI_DHORE,
    'गजू ढोरे सरपंच': CANONICAL.GAJANAN_NANNAJI_DHORE
  };

  function normalizeKey(name) {
    return String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Pattern: Gajanan + Dhore (any order), optional Sarpanch —
   * excludes other villages / middle names that mark a different person.
   */
  function matchGajananNannajiDhore(key) {
    if (!key) return false;
    if (EXACT[key]) return true;

    const hasGajanan = /\bgajanan\b/.test(key) || key.includes('गजानन');
    const hasNannaji = /\bnannaji\b/.test(key) || key.includes('नान्नाजी') || key.includes('नन्नाजी');
    if (!hasGajanan && !hasNannaji) return false;

    // Different people / places — keep separate even if surname is Dhore
    if (/wakhari|babhulgaon|बाभुळगाव|maroti|मारोती|pavke|gangawale|गंगावणे|barve|sheikh|शेत|\bbend\b|बेंड/.test(key)) {
      return false;
    }

    const hasDhore = /\bdhore\b|ढोरे/.test(key);
    const isPlainSarpanch = /^(gajanan sarpanch|गजानन सरपंच)$/.test(key);
    const gajananSarpanchDhore = hasDhore && /sarpanch|सरपंच/.test(key);

    if (hasNannaji && hasDhore) return true;
    // Gaju = common short name for Gajanan Nannaji (Degav Wat / Dhore Sarpanch)
    if (/\bgaju\b/.test(key) || key.includes('गजू')) {
      if (/degav|\bwat\b|देगव/.test(key) && /sarpanch|सरपंच/.test(key)) return true;
      if (/sarpanch|सरपंच/.test(key) && hasDhore) return true;
    }
    return hasDhore || isPlainSarpanch || gajananSarpanchDhore;
  }

  function canonicalize(name) {
    const withSurname = normalizeSurnames(name);
    if (!withSurname) return withSurname;
    const key = normalizeKey(withSurname);
    if (EXACT[key]) return EXACT[key];
    if (matchGajananNannajiDhore(key)) return CANONICAL.GAJANAN_NANNAJI_DHORE;
    return withSurname;
  }

  /** Stable grouping key for ledgers (canonical, lowercased) */
  function ledgerKey(name) {
    return normalizeKey(canonicalize(name)) || '(no customer name)';
  }

  return {
    CANONICAL,
    normalizeSurnames,
    canonicalize,
    ledgerKey,
    normalizeKey
  };
})();
