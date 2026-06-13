/**
 * Gitai Earthmovers — Loan amortization helpers
 */
const LoanUtils = (function () {
  function addMonths(isoDate, months) {
    const d = new Date(isoDate + 'T12:00:00');
    d.setMonth(d.getMonth() + months);
    const pad = n => (n < 10 ? '0' + n : String(n));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function amortize(principal, annualIrr, emi, monthsPaid) {
    const r = annualIrr / 12 / 100;
    let balance = principal;
    let totalInterest = 0;
    let totalPrincipal = 0;

    for (let i = 0; i < monthsPaid; i++) {
      const interest = balance * r;
      const principalPart = Math.min(emi - interest, balance);
      totalInterest += interest;
      totalPrincipal += principalPart;
      balance -= principalPart;
    }

    return {
      outstanding: Math.max(0, Math.round(balance)),
      principalPaid: Math.round(totalPrincipal),
      interestPaid: Math.round(totalInterest)
    };
  }

  function buildEmiSchedule(options) {
    const {
      machine,
      disbursalDate,
      emiAmount,
      tenureMonths,
      paidCount,
      agreementNo
    } = options;

    const schedule = [];
    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = addMonths(disbursalDate, i);
      const isPaid = i <= paidCount;
      schedule.push({
        Machine: machine,
        DueDate: dueDate,
        EMIAmount: emiAmount,
        PaidDate: isPaid ? dueDate : '',
        BounceCharges: 0,
        PenaltyCharges: 0,
        TotalPaid: isPaid ? emiAmount : 0,
        Status: isPaid ? 'Paid' : (dueDate < todayISO() ? 'Overdue' : 'Pending'),
        Remarks: agreementNo ? `Agreement ${agreementNo}` : ''
      });
    }
    return schedule;
  }

  function getLoanForMachine(machineName) {
    return AppData.loans.find(l => l.Machine === machineName);
  }

  function getMachineLabel(machine) {
    if (!machine) return '—';
    const parts = [machine.MachineName];
    if (machine.Make || machine.Model) {
      parts.push([machine.Make, machine.Model].filter(Boolean).join(' '));
    }
    if (machine.RegistrationNo) parts.push(`(${machine.RegistrationNo})`);
    return parts.join(' — ');
  }

  return { addMonths, amortize, buildEmiSchedule, getLoanForMachine, getMachineLabel };
})();
