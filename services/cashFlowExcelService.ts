import * as XLSX from 'xlsx';
import { Project, CashFlowTransaction, AppSettings, CashFlowItem } from '../types';

export const migrateLegacyFinancialsToCashFlow = (p: Partial<Project>): { incomes: CashFlowItem[], expenses: CashFlowItem[] } => {
  const rawIncomes: CashFlowItem[] = Array.isArray(p.incomes) ? [...p.incomes] : [];
  const rawExpenses: CashFlowItem[] = Array.isArray(p.expenses) ? [...p.expenses] : [];

  // Remove any previously auto-injected milestone items so itemized lines stay purely progressive
  const incomes = rawIncomes.filter(i => 
    !i.id.startsWith('inc-sale-') && 
    i.description !== 'Sale Price (Project Completion / Exit)' &&
    i.description !== 'Anticipated Sale Price (Completion / Exit)'
  );

  const expenses = rawExpenses.filter(e => 
    !e.id.startsWith('exp-init-dep-') &&
    !e.id.startsWith('exp-final-dep-') &&
    !e.id.startsWith('exp-settlement-') &&
    !e.id.startsWith('exp-soft-cost-') &&
    !e.id.startsWith('exp-holding-cost-') &&
    !e.id.startsWith('exp-build-cost-')
  );

  // Default GST to INC and status to projected for any progressive items
  incomes.forEach(i => {
    if (!i.gstType) i.gstType = 'INC';
    if (!i.status) i.status = 'projected';
  });
  expenses.forEach(e => {
    if (!e.gstType) e.gstType = 'INC';
    if (!e.status) e.status = 'projected';
  });

  return { incomes, expenses };
};

export const migrateProjectToNewCashFlow = (p: Project): Project => {
  const { incomes, expenses } = migrateLegacyFinancialsToCashFlow(p);
  return {
    ...p,
    incomes,
    expenses,
    // Preserve milestone figures as the initial high-level estimate
    initialDeposit: p.initialDeposit,
    initialDepositDate: p.initialDepositDate,
    finalDeposit: p.finalDeposit,
    finalDepositDate: p.finalDepositDate,
    settlementFigure: p.settlementFigure,
    settlementDate: p.settlementDate,
    softCost: p.softCost,
    softCostDate: p.softCostDate,
    holdingCost: p.holdingCost,
    holdingCostDate: p.holdingCostDate,
    holdingCostNotes: p.holdingCostNotes,
    buildCost: p.buildCost,
    buildCostDate: p.buildCostDate,
    builderName: p.builderName,
    buildCostNotes: p.buildCostNotes,
    salePrice: p.salePrice,
    salePriceDate: p.salePriceDate,
  };
};

export const getMilestoneCashFlowTransactions = (projects: Project[]): CashFlowTransaction[] => {
  const transactions: CashFlowTransaction[] = [];

  projects.filter(p => !p.isArchived).forEach(p => {
    const defaultDate = p.startDate 
      ? (typeof p.startDate === 'number' ? new Date(p.startDate).toISOString().split('T')[0] : String(p.startDate).split('T')[0])
      : new Date().toISOString().split('T')[0];

    // Inflow: Sale Price
    if (p.salePrice !== undefined && p.salePrice > 0) {
      const amtK = Number(p.salePrice);
      const dateStr = p.salePriceDate || defaultDate;
      transactions.push({
        id: `ms-sale-${p.id}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: 'Anticipated Sale Price',
        category: 'Sales',
        description: 'Expected Overall Income (Completion / Exit)',
        type: 'inflow',
        amountK: amtK,
        amount: amtK * 1000,
        gstType: 'INC',
        status: 'projected',
        source: 'milestone',
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    }

    // Outflows: Initial Deposit
    if (p.initialDeposit !== undefined && p.initialDeposit > 0) {
      const amtK = Number(p.initialDeposit);
      const dateStr = p.initialDepositDate || defaultDate;
      transactions.push({
        id: `ms-init-dep-${p.id}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: 'Initial Deposit',
        category: 'Deposit',
        description: 'Upfront milestone deposit',
        type: 'outflow',
        amountK: amtK,
        amount: amtK * 1000,
        gstType: 'INC',
        status: 'projected',
        source: 'milestone',
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    }

    // Outflows: Final Deposit
    if (p.finalDeposit !== undefined && p.finalDeposit > 0) {
      const amtK = Number(p.finalDeposit);
      const dateStr = p.finalDepositDate || defaultDate;
      transactions.push({
        id: `ms-final-dep-${p.id}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: 'Final Deposit',
        category: 'Deposit',
        description: 'Second milestone deposit',
        type: 'outflow',
        amountK: amtK,
        amount: amtK * 1000,
        gstType: 'INC',
        status: 'projected',
        source: 'milestone',
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    }

    // Outflows: Settlement Figure
    if (p.settlementFigure !== undefined && p.settlementFigure > 0) {
      const amtK = Number(p.settlementFigure);
      const dateStr = p.settlementDate || defaultDate;
      transactions.push({
        id: `ms-settlement-${p.id}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: 'Settlement Figure',
        category: 'Settlement',
        description: 'Settlement payment',
        type: 'outflow',
        amountK: amtK,
        amount: amtK * 1000,
        gstType: 'INC',
        status: 'projected',
        source: 'milestone',
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    }

    // Outflows: Soft Cost
    if (p.softCost !== undefined && p.softCost > 0) {
      const amtK = Number(p.softCost);
      const dateStr = p.softCostDate || defaultDate;
      transactions.push({
        id: `ms-soft-cost-${p.id}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: 'Soft Cost',
        category: 'Consultant / Legal',
        description: 'Consultants, permits, legal',
        type: 'outflow',
        amountK: amtK,
        amount: amtK * 1000,
        gstType: 'INC',
        status: 'projected',
        source: 'milestone',
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    }

    // Outflows: Holding Cost
    if (p.holdingCost !== undefined && p.holdingCost > 0) {
      const amtK = Number(p.holdingCost);
      const dateStr = p.holdingCostDate || defaultDate;
      transactions.push({
        id: `ms-holding-cost-${p.id}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: 'Holding Cost',
        category: 'Holding Cost',
        description: p.holdingCostNotes || 'Interest, land tax & rates',
        type: 'outflow',
        amountK: amtK,
        amount: amtK * 1000,
        gstType: 'INC',
        status: 'projected',
        source: 'milestone',
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    }

    // Outflows: Build Cost
    if (p.buildCost !== undefined && p.buildCost > 0) {
      const amtK = Number(p.buildCost);
      const dateStr = p.buildCostDate || defaultDate;
      const desc = [p.builderName, p.buildCostNotes].filter(Boolean).join(' - ') || 'Construction contract';
      transactions.push({
        id: `ms-build-cost-${p.id}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: 'Build Cost',
        category: 'Construction',
        description: desc,
        type: 'outflow',
        amountK: amtK,
        amount: amtK * 1000,
        gstType: 'INC',
        status: 'projected',
        source: 'milestone',
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    }
  });

  transactions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.type !== b.type) return a.type === 'outflow' ? -1 : 1;
    return a.projectName.localeCompare(b.projectName);
  });

  return transactions;
};

export const getItemizedCashFlowTransactions = (projects: Project[]): CashFlowTransaction[] => {
  const transactions: CashFlowTransaction[] = [];

  projects.filter(p => !p.isArchived).forEach(p => {
    const { incomes, expenses } = migrateLegacyFinancialsToCashFlow(p);
    const defaultDate = p.startDate 
      ? (typeof p.startDate === 'number' ? new Date(p.startDate).toISOString().split('T')[0] : String(p.startDate).split('T')[0])
      : new Date().toISOString().split('T')[0];

    incomes.forEach((inc, idx) => {
      if (!inc) return;
      const amt = Number(inc.amount) || 0;
      const dateStr = inc.date || defaultDate;
      transactions.push({
        id: inc.id || `${p.id}-income-${idx}-${Date.now()}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: inc.description || inc.category || 'Income',
        category: inc.category || 'Income',
        description: inc.description || '',
        type: 'inflow',
        amountK: amt / 1000,
        amount: amt,
        gstType: inc.gstType || 'INC',
        status: inc.status || 'projected',
        source: 'itemized',
        link: inc.link,
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    });

    expenses.forEach((exp, idx) => {
      if (!exp) return;
      const amt = Number(exp.amount) || 0;
      const dateStr = exp.date || defaultDate;
      transactions.push({
        id: exp.id || `${p.id}-expense-${idx}-${Date.now()}`,
        projectId: p.id,
        projectName: p.name,
        projectDisplayId: p.displayId,
        company: p.company,
        item: exp.description || exp.category || 'Expense',
        category: exp.category || 'Expense',
        description: exp.description || '',
        type: 'outflow',
        amountK: amt / 1000,
        amount: amt,
        gstType: exp.gstType || 'INC',
        status: exp.status || 'projected',
        source: 'itemized',
        link: exp.link,
        date: dateStr,
        timestamp: new Date(dateStr).getTime()
      });
    });
  });

  transactions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.type !== b.type) return a.type === 'outflow' ? -1 : 1;
    return a.projectName.localeCompare(b.projectName);
  });

  return transactions;
};

export const getProjectCashFlowTransactions = (
  projects: Project[],
  source: 'all' | 'milestone' | 'itemized' = 'itemized'
): CashFlowTransaction[] => {
  if (source === 'milestone') {
    return getMilestoneCashFlowTransactions(projects);
  }
  if (source === 'itemized') {
    return getItemizedCashFlowTransactions(projects);
  }
  
  const milestoneTxs = getMilestoneCashFlowTransactions(projects);
  const itemizedTxs = getItemizedCashFlowTransactions(projects);
  const combined = [...milestoneTxs, ...itemizedTxs];
  combined.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.type !== b.type) return a.type === 'outflow' ? -1 : 1;
    return a.projectName.localeCompare(b.projectName);
  });
  return combined;
};

export const formatCurrency = (val: number, inThousands = false): string => {
  if (inThousands) {
    return `$${val.toLocaleString()}k`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};

export const formatDateWithSettings = (dateStr: string | number | undefined, format: 'DD/MM/YY' | 'MM/DD/YY' = 'DD/MM/YY'): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return format === 'DD/MM/YY' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
};

export interface CashFlowExcelOptions {
  projects: Project[];
  settings: AppSettings;
  filterProjectId?: string;
  startDate?: string;
  endDate?: string;
  filterType?: 'ALL' | 'inflow' | 'outflow';
  filterItem?: string;
  filterStatus?: 'ALL' | 'projected' | 'paid';
  source?: 'all' | 'milestone' | 'itemized';
}

export const exportCashFlowToExcel = (options: CashFlowExcelOptions) => {
  const { projects, settings, filterProjectId, startDate, endDate, filterType, filterItem, filterStatus, source = 'all' } = options;
  
  let targetProjects = projects.filter(p => !p.isArchived);
  if (filterProjectId && filterProjectId !== 'ALL') {
    targetProjects = targetProjects.filter(p => p.id === filterProjectId);
  }

  let txs = getProjectCashFlowTransactions(targetProjects, source);

  if (startDate) {
    txs = txs.filter(t => t.date >= startDate);
  }
  if (endDate) {
    txs = txs.filter(t => t.date <= endDate);
  }
  if (filterType && filterType !== 'ALL') {
    txs = txs.filter(t => t.type === filterType);
  }
  if (filterItem && filterItem !== 'ALL') {
    txs = txs.filter(t => t.item === filterItem || t.category === filterItem);
  }
  if (filterStatus && filterStatus !== 'ALL') {
    txs = txs.filter(t => (t.status || 'projected') === filterStatus);
  }

  // Calculate Running Cumulative Balance
  let runningBalance = 0;
  const scheduleRows = txs.map(t => {
    const netMultiplier = t.type === 'inflow' ? 1 : -1;
    const netAmount = t.amount * netMultiplier;
    runningBalance += netAmount;

    return {
      'Estimated Date': formatDateWithSettings(t.date, settings.dateFormat),
      'ISO Date': t.date,
      'Project ID': t.projectDisplayId || '',
      'Project Name': t.projectName,
      'Company': t.company || '',
      'Category': t.category || t.item,
      'Description': t.description || '',
      'Projection Item': t.item,
      'Flow Type': t.type === 'inflow' ? 'Cash Inflow (Income)' : 'Cash Outflow (Expense)',
      'Status': (t.status === 'paid' ? 'Paid' : 'Projected'),
      'Source': (t.source === 'milestone' ? 'Milestone' : 'Itemized'),
      'GST': t.gstType || 'INC',
      "Amount ($'000s)": t.amountK,
      'Amount ($)': t.amount,
      'Net Cash Flow ($)': netAmount,
      'Cumulative Balance ($)': runningBalance,
      'Link': t.link || ''
    };
  });

  // Build Project Summary Rows
  const summaryRows = targetProjects.map(p => {
    const { incomes, expenses } = migrateLegacyFinancialsToCashFlow(p);
    const customExpensesK = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) / 1000;
    const customIncomesK = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0) / 1000;
    
    // Milestone overall figures
    const milestoneOutK = (p.initialDeposit || 0) + (p.finalDeposit || 0) + (p.settlementFigure || 0) + (p.softCost || 0) + (p.holdingCost || 0) + (p.buildCost || 0);
    const milestoneInK = (p.salePrice || 0);

    const paidExpensesK = expenses.filter(e => e.status === 'paid').reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) / 1000;
    const paidIncomesK = incomes.filter(i => i.status === 'paid').reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0) / 1000;

    return {
      'Project ID': p.displayId || '',
      'Project Name': p.name,
      'Company': p.company || '',
      'Category': p.type || '',
      'Start Date': formatDateWithSettings(p.startDate, settings.dateFormat),
      "Milestone Expected Costs ($'000s)": milestoneOutK,
      "Milestone Expected Income ($'000s)": milestoneInK,
      "Holding Cost ($'000s)": p.holdingCost || 0,
      "Build Cost ($'000s)": p.buildCost || 0,
      "Itemized Total Expenses ($'000s)": customExpensesK,
      "Itemized Paid Expenses ($'000s)": paidExpensesK,
      "Itemized Projected Expenses ($'000s)": customExpensesK - paidExpensesK,
      "Itemized Total Incomes ($'000s)": customIncomesK,
      "Itemized Paid Incomes ($'000s)": paidIncomesK,
      "Net Projected Cash Flow ($'000s)": customIncomesK - customExpensesK,
      "Net Actual Cash Flow ($'000s)": paidIncomesK - paidExpensesK,
      "Value at Completion ($'000s)": p.valueAtCompletion || 0,
      "Projected Profit ($'000s)": p.profit || 0,
      "Cash Requirement ($'000s)": p.cashRequirement || 0,
      "Debt Requirement ($'000s)": p.debtRequirement || 0
    };
  });

  // Create Workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Detailed Schedule
  const wsSchedule = XLSX.utils.json_to_sheet(scheduleRows);
  wsSchedule['!cols'] = [
    { wch: 15 }, // Estimated Date
    { wch: 12 }, // ISO Date
    { wch: 12 }, // Project ID
    { wch: 30 }, // Project Name
    { wch: 20 }, // Company
    { wch: 20 }, // Category
    { wch: 30 }, // Description
    { wch: 20 }, // Projection Item
    { wch: 24 }, // Flow Type
    { wch: 12 }, // Status
    { wch: 14 }, // Source
    { wch: 10 }, // GST
    { wch: 16 }, // Amount ($'000s)
    { wch: 16 }, // Amount ($)
    { wch: 18 }, // Net Cash Flow ($)
    { wch: 22 }, // Cumulative Balance ($)
    { wch: 30 }  // Link
  ];
  XLSX.utils.book_append_sheet(wb, wsSchedule, 'Cash Flow Schedule');

  // Sheet 2: Project Summary
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{
    'Project ID': '',
    'Project Name': 'No projects available',
    'Company': '',
    'Category': '',
    'Start Date': '',
    "Milestone Expected Costs ($'000s)": 0,
    "Milestone Expected Income ($'000s)": 0,
    "Holding Cost ($'000s)": 0,
    "Build Cost ($'000s)": 0,
    "Itemized Total Expenses ($'000s)": 0,
    "Itemized Paid Expenses ($'000s)": 0,
    "Itemized Projected Expenses ($'000s)": 0,
    "Itemized Total Incomes ($'000s)": 0,
    "Itemized Paid Incomes ($'000s)": 0,
    "Net Projected Cash Flow ($'000s)": 0,
    "Net Actual Cash Flow ($'000s)": 0,
    "Value at Completion ($'000s)": 0,
    "Projected Profit ($'000s)": 0,
    "Cash Requirement ($'000s)": 0,
    "Debt Requirement ($'000s)": 0
  }]);
  wsSummary['!cols'] = [
    { wch: 12 }, // Project ID
    { wch: 30 }, // Project Name
    { wch: 20 }, // Company
    { wch: 18 }, // Category
    { wch: 14 }, // Start Date
    { wch: 24 }, // Milestone Expected Costs
    { wch: 24 }, // Milestone Expected Income
    { wch: 18 }, // Holding Cost
    { wch: 18 }, // Build Cost
    { wch: 22 }, // Itemized Total Expenses
    { wch: 22 }, // Itemized Paid Expenses
    { wch: 24 }, // Itemized Projected Expenses
    { wch: 22 }, // Itemized Total Incomes
    { wch: 20 }, // Itemized Paid Incomes
    { wch: 24 }, // Net Projected Cash Flow
    { wch: 22 }, // Net Actual Cash Flow
    { wch: 22 }, // Value at Completion
    { wch: 20 }, // Projected Profit
    { wch: 20 }, // Cash Requirement
    { wch: 20 }  // Debt Requirement
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Projects Financial Summary');

  // Sheet 3: Monthly Aggregate Summary
  const monthlyMap: Record<string, { month: string; inflows: number; outflows: number }> = {};
  txs.forEach(t => {
    const monthKey = t.date.slice(0, 7) || 'Unspecified';
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { month: monthKey, inflows: 0, outflows: 0 };
    }
    if (t.type === 'inflow') {
      monthlyMap[monthKey].inflows += t.amount;
    } else {
      monthlyMap[monthKey].outflows += t.amount;
    }
  });

  const sortedMonths = Object.keys(monthlyMap).sort();
  let monthlyRunning = 0;
  const monthlyRows = sortedMonths.map(mKey => {
    const data = monthlyMap[mKey];
    const net = data.inflows - data.outflows;
    monthlyRunning += net;
    return {
      'Month': data.month,
      'Projected Inflows ($)': data.inflows,
      'Projected Outflows ($)': data.outflows,
      'Net Cash Flow ($)': net,
      'Cumulative Balance ($)': monthlyRunning
    };
  });

  if (monthlyRows.length > 0) {
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows);
    wsMonthly['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 24 }
    ];
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Summary');
  }

  // Sheet 4: Itemized Incomes
  const incomeRows: any[] = [];
  targetProjects.forEach(p => {
    (p.incomes || []).forEach(inc => {
      incomeRows.push({
        'Date': formatDateWithSettings(inc.date, settings.dateFormat),
        'ISO Date': inc.date,
        'Project ID': p.displayId || '',
        'Project Name': p.name,
        'Company': p.company || '',
        'Category': inc.category || 'Income',
        'Description': inc.description || '',
        'Status': inc.status === 'paid' ? 'Paid' : 'Projected',
        'Amount ($)': Number(inc.amount) || 0,
        "Amount ($'000s)": (Number(inc.amount) || 0) / 1000,
        'GST': inc.gstType || 'INC',
        'Link': inc.link || ''
      });
    });
  });

  if (incomeRows.length > 0) {
    const wsIncomes = XLSX.utils.json_to_sheet(incomeRows);
    wsIncomes['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsIncomes, 'Itemized Incomes');
  }

  // Sheet 5: Itemized Expenses
  const expenseRows: any[] = [];
  targetProjects.forEach(p => {
    (p.expenses || []).forEach(exp => {
      expenseRows.push({
        'Date': formatDateWithSettings(exp.date, settings.dateFormat),
        'ISO Date': exp.date,
        'Project ID': p.displayId || '',
        'Project Name': p.name,
        'Company': p.company || '',
        'Category': exp.category || 'Expense',
        'Description': exp.description || '',
        'Status': exp.status === 'paid' ? 'Paid' : 'Projected',
        'Amount ($)': Number(exp.amount) || 0,
        "Amount ($'000s)": (Number(exp.amount) || 0) / 1000,
        'GST': exp.gstType || 'INC',
        'Link': exp.link || ''
      });
    });
  });

  if (expenseRows.length > 0) {
    const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
    wsExpenses['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Itemized Expenses');
  }

  // Generate filename
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `ProjectFlow_Cash_Flow_Report_${dateStamp}.xlsx`;

  XLSX.writeFile(wb, filename);
};

export const exportCashFlowToCSV = (options: CashFlowExcelOptions) => {
  const { projects, settings, filterProjectId, startDate, endDate, filterType, filterItem, filterStatus, source = 'all' } = options;
  
  let targetProjects = projects.filter(p => !p.isArchived);
  if (filterProjectId && filterProjectId !== 'ALL') {
    targetProjects = targetProjects.filter(p => p.id === filterProjectId);
  }

  let txs = getProjectCashFlowTransactions(targetProjects, source);
  if (startDate) txs = txs.filter(t => t.date >= startDate);
  if (endDate) txs = txs.filter(t => t.date <= endDate);
  if (filterType && filterType !== 'ALL') txs = txs.filter(t => t.type === filterType);
  if (filterItem && filterItem !== 'ALL') txs = txs.filter(t => t.item === filterItem || t.category === filterItem);
  if (filterStatus && filterStatus !== 'ALL') txs = txs.filter(t => (t.status || 'projected') === filterStatus);

  const headers = ['Date', 'Project ID', 'Project Name', 'Company', 'Category', 'Description', 'Item', 'Flow Type', 'Status', 'Source', 'GST', "Amount ($'000s)", 'Amount ($)', 'Net Amount ($)', 'Cumulative Balance ($)', 'Link'];
  
  let runningBalance = 0;
  const rows = txs.map(t => {
    const netMultiplier = t.type === 'inflow' ? 1 : -1;
    const netAmount = t.amount * netMultiplier;
    runningBalance += netAmount;

    return [
      `"${formatDateWithSettings(t.date, settings.dateFormat)}"`,
      `"${t.projectDisplayId || ''}"`,
      `"${t.projectName.replace(/"/g, '""')}"`,
      `"${(t.company || '').replace(/"/g, '""')}"`,
      `"${(t.category || t.item).replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.item.replace(/"/g, '""')}"`,
      `"${t.type === 'inflow' ? 'Income' : 'Expense'}"`,
      `"${t.status === 'paid' ? 'Paid' : 'Projected'}"`,
      `"${t.source === 'milestone' ? 'Milestone' : 'Itemized'}"`,
      `"${t.gstType || 'INC'}"`,
      t.amountK,
      t.amount,
      netAmount,
      runningBalance,
      `"${(t.link || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `ProjectFlow_Cash_Flow_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
