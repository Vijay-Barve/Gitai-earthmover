#!/usr/bin/env node
/** Fix loan/machine alignment after Gitai (1) merge */
const path = require('path');
const XLSX = require('xlsx');

const M1 = 'M1- Mahindra earthmaster sx iv 2022';
const M2 = 'M2-Mahindra earthmaster sx iv 2023';
const OLD = 'Machine 1';

const file = path.join(__dirname, '..', 'Gitai.xlsx');
const wb = XLSX.readFile(file, { cellDates: true });

function rows(name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
}

function write(name, headers, data) {
  const dateH = new Set(['Date', 'PurchaseDate', 'DisbursalDate', 'DueDate', 'PaidDate']);
  const ws = {};
  headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }; });
  data.forEach((row, ri) => {
    headers.forEach((h, c) => {
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c });
      ws[ref] = { t: 's', v: String(row[h] ?? '') };
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(data.length, 1), c: headers.length - 1 } });
  wb.Sheets[name] = ws;
}

const remap = n => (n === OLD || n === 'Machine 1' ? M2 : n);

// Income/expense/EMI → M2 (2022 purchase + 2222000 loan + historical register)
const income = rows('Income').map(r => ({ ...r, Machine: remap(r.Machine) === M1 ? M2 : remap(r.Machine) }));
const expenses = rows('Expenses').map(r => ({ ...r, Machine: remap(r.Machine) === M1 ? M2 : remap(r.Machine) }));
const emi = rows('EMI').map(r => ({ ...r, Machine: M2 }));

const machines = rows('Machines').map(m => {
  if (m.MachineName === M2) {
    return {
      ...m,
      PurchaseDate: '2022-01-27',
      RegistrationNo: 'MH-38-AD-0794',
      EngineNo: 'NMG5SGE0074',
      ChassisNo: 'MDZBS2EFCM6L50335',
      Make: 'MAHINDRA BACKHOE LOADER',
      Model: 'EARTH MASTER SX',
      CurrentValue: m.CurrentValue || 1650000,
      Remarks: 'Tata Capital loan. RC/Invoice/Insurance on file. NOC pending.'
    };
  }
  return {
    ...m,
    Make: m.Make || 'MAHINDRA BACKHOE LOADER',
    Model: m.Model || 'EARTH MASTER SX IV 2022',
    Remarks: m.Remarks || 'Update registration & loan details'
  };
});

const loans = [
  {
    ID: 1,
    Machine: M2,
    LoanAmount: 2222000,
    PrincipalPaid: 1850312,
    InterestPaid: 666436,
    OutstandingLoan: 371688,
    AgreementNo: 'X0CENDD00004530947',
    Lender: 'Tata Capital',
    CustomerID: '8993419',
    DisbursalDate: '2022-01-27',
    EMIAmount: 48399,
    TenureMonths: 60,
    BalanceTenure: 8,
    IRR: 11.08,
    InterestType: 'Fixed',
    Applicant: 'MS. BALIRAM DATTRAO BARVE',
    CoApplicant: 'RATNAMALA DATTARAO BARVE',
    ProductType: 'CONSTRUCTION EQUIPMENT',
    LoanStatus: 'Active',
    OverdueAmount: 158,
    DisbursalStatus: 'Fully Disbursed',
    Frequency: 'Monthly',
    Remarks: 'Tata Capital — primary machine (2022 register data)'
  },
  {
    ID: 2,
    Machine: M1,
    LoanAmount: 2500000,
    PrincipalPaid: 0,
    InterestPaid: 0,
    OutstandingLoan: 2500000,
    AgreementNo: '',
    Lender: '',
    CustomerID: '',
    DisbursalDate: '2023-01-14',
    EMIAmount: 0,
    TenureMonths: 0,
    BalanceTenure: 0,
    IRR: 0,
    InterestType: 'Fixed',
    Applicant: '',
    CoApplicant: '',
    ProductType: 'CONSTRUCTION EQUIPMENT',
    LoanStatus: 'Active',
    OverdueAmount: 0,
    DisbursalStatus: '',
    Frequency: 'Monthly',
    Remarks: 'From Gitai workbook — add lender details'
  }
];

write('Machines', ['ID', 'MachineName', 'PurchaseDate', 'PurchaseCost', 'LoanAmount', 'DownPayment', 'CurrentValue', 'Status', 'Make', 'Model', 'RegistrationNo', 'EngineNo', 'ChassisNo', 'Remarks'], machines);
write('Loans', ['ID', 'Machine', 'LoanAmount', 'PrincipalPaid', 'InterestPaid', 'OutstandingLoan', 'AgreementNo', 'Lender', 'CustomerID', 'DisbursalDate', 'EMIAmount', 'TenureMonths', 'BalanceTenure', 'IRR', 'InterestType', 'Applicant', 'CoApplicant', 'ProductType', 'LoanStatus', 'OverdueAmount', 'DisbursalStatus', 'Frequency', 'Remarks'], loans);
write('Income', ['ID', 'Date', 'Customer', 'Machine', 'Site', 'HoursWorked', 'BillAmount', 'ReceivedAmount', 'PendingAmount', 'Remarks'], income);
write('Expenses', ['ID', 'Date', 'ExpenseType', 'Machine', 'Amount', 'PaidBy', 'Remarks'], expenses);
write('EMI', ['ID', 'Machine', 'DueDate', 'EMIAmount', 'PaidDate', 'BounceCharges', 'PenaltyCharges', 'TotalPaid', 'Status'], emi);

XLSX.writeFile(wb, file);
console.log('Aligned: M2 = Tata loan + income + EMIs | M1 = 25L loan stub');
console.log('Income machine sample:', income[0]?.Machine);
