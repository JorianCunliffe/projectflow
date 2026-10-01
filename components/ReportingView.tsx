import React, { useState, useMemo } from 'react';
import { Project, AppSettings, Subtask, Milestone, ActivityLog } from '../types';
import { 
  BarChart3, Filter, Calendar, CheckCircle2, Circle, AlertCircle, Clock, 
  Activity, Target, Banknote, Download, FileSpreadsheet, ArrowUpRight, 
  ArrowDownLeft, DollarSign, ExternalLink, TrendingUp, TrendingDown, Layers, Hammer,
  ChevronDown, ChevronUp, Scale
} from 'lucide-react';
import { 
  exportCashFlowToExcel, exportCashFlowToCSV, getProjectCashFlowTransactions, 
  formatCurrency, formatDateWithSettings 
} from '../services/cashFlowExcelService';

interface ReportingViewProps {
  projects: Project[];
  settings: AppSettings;
  activityLogs: ActivityLog[];
  onTaskClick?: (projectId: string, taskId: string) => void;
  onEditProject?: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
}

export const ReportingView: React.FC<ReportingViewProps> = ({ 
  projects, 
  settings, 
  activityLogs, 
  onTaskClick, 
  onEditProject,
  onUpdateProject 
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'current' | 'cashflow'>('progress');
  const [cashFlowMode, setCashFlowMode] = useState<'milestones' | 'payments' | 'comparison'>('milestones');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'projected' | 'paid'>('ALL');
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [filterMember, setFilterMember] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFlowType, setFilterFlowType] = useState<'ALL' | 'inflow' | 'outflow'>('ALL');
  const [filterItem, setFilterItem] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [cashFlowStartDate, setCashFlowStartDate] = useState<string>('');
  const [cashFlowEndDate, setCashFlowEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Flatten all tasks from non-archived projects
  const allTasks = useMemo(() => {
    const list: { task: Subtask, milestone: Milestone, project: Project }[] = [];
    projects.filter(p => !p.isArchived).forEach(project => {
      project.milestones.forEach(milestone => {
        milestone.subtasks.forEach(task => {
          list.push({ task, milestone, project });
        });
      });
    });
    return list;
  }, [projects]);

  // Non-archived projects filtered by selected project filter
  const displayedProjects = useMemo(() => {
    let list = projects.filter(p => !p.isArchived);
    if (filterProject !== 'ALL') {
      list = list.filter(p => p.id === filterProject);
    }
    return list;
  }, [projects, filterProject]);

  const filteredTasks = useMemo(() => {
    let result = allTasks;

    if (filterProject !== 'ALL') {
      result = result.filter(item => item.project.id === filterProject);
    }
    if (filterMember !== 'ALL') {
      result = result.filter(item => item.task.assignedTo === filterMember);
    }
    if (filterStatus !== 'ALL') {
      result = result.filter(item => item.task.status === filterStatus);
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      result = result.filter(item => item.task.dueDate && item.task.dueDate >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      result = result.filter(item => item.task.dueDate && item.task.dueDate <= (endMs + 86399999));
    }

    result.sort((a, b) => {
      if (a.task.dueDate && b.task.dueDate) return a.task.dueDate - b.task.dueDate;
      if (a.task.dueDate) return -1;
      if (b.task.dueDate) return 1;
      return a.project.name.localeCompare(b.project.name);
    });

    return result;
  }, [allTasks, filterProject, filterMember, filterStatus, startDate, endDate]);

  // Activity logs filtered for the progress report
  const progressLogs = useMemo(() => {
    let logs = activityLogs.filter(log => log.action === 'updated' && log.details && (log.details.includes('Status') || log.details.includes('Completed')));

    if (filterProject !== 'ALL') {
      logs = logs.filter(log => log.projectId === filterProject);
    }
    if (filterMember !== 'ALL') {
      // Find the task to check assigned member, or use userId
      logs = logs.filter(log => {
        const taskObj = allTasks.find(t => t.task.id === log.taskId);
        return taskObj?.task.assignedTo === filterMember;
      });
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      logs = logs.filter(log => log.timestamp >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      logs = logs.filter(log => log.timestamp <= (endMs + 86399999));
    }

    // Sort newest first
    logs.sort((a, b) => b.timestamp - a.timestamp);
    return logs;
  }, [activityLogs, filterProject, filterMember, startDate, endDate, allTasks]);

  // Progress summary metrics
  const progressSummary = useMemo(() => {
    let completed = 0;
    let otherUpdates = 0;

    progressLogs.forEach(log => {
      if (log.details?.includes('Completed') || log.details?.includes('Status changed to Complete')) {
        completed++;
      } else {
        otherUpdates++;
      }
    });

    // Determine total actual time grouped by task in these logs
    const taskIdsInLogs = new Set(progressLogs.map(l => l.taskId));
    let totalActualTimeInPeriod = 0;
    allTasks.forEach(({ task }) => {
      if (taskIdsInLogs.has(task.id) && task.actualTime) {
        totalActualTimeInPeriod += task.actualTime;
      }
    });

    return { completed, otherUpdates, totalActualTimeInPeriod };
  }, [progressLogs, allTasks]);

  // Current state summary
  const currentSummary = useMemo(() => {
    let totalTasks = filteredTasks.length;
    let completedTasks = 0; let totalEstimated = 0; let totalActual = 0; let overdueTasks = 0;
    const now = Date.now();

    filteredTasks.forEach(({ task }) => {
      if (task.status === 'Complete') completedTasks++;
      if (task.estimatedTime) totalEstimated += task.estimatedTime;
      if (task.actualTime) totalActual += task.actualTime;
      if (task.dueDate && task.dueDate < now && task.status !== 'Complete') overdueTasks++;
    });

    return { totalTasks, completedTasks, totalEstimated, totalActual, overdueTasks };
  }, [filteredTasks]);

  // Cash Flow Calculations
  const uniqueFinancialItems = useMemo(() => {
    const benchmarkItems = ['Build Cost', 'Soft Cost', 'Holding Cost', 'Initial Deposit', 'Final Deposit', 'Settlement Figure', 'Sale Price'];
    const customIncomeCategories = new Set<string>();
    const customExpenseCategories = new Set<string>();

    displayedProjects.forEach(p => {
      (p.incomes || []).forEach(inc => {
        if (inc.category) customIncomeCategories.add(inc.category);
      });
      (p.expenses || []).forEach(exp => {
        if (exp.category) customExpenseCategories.add(exp.category);
      });
    });

    return {
      benchmarks: benchmarkItems,
      incomes: Array.from(customIncomeCategories).sort(),
      expenses: Array.from(customExpenseCategories).sort()
    };
  }, [displayedProjects]);

  const cashFlowTransactions = useMemo(() => {
    const source = cashFlowMode === 'milestones' ? 'milestone' : cashFlowMode === 'payments' ? 'itemized' : 'milestone';
    let txs = getProjectCashFlowTransactions(displayedProjects, source);

    if (cashFlowStartDate) {
      txs = txs.filter(t => t.date >= cashFlowStartDate);
    }
    if (cashFlowEndDate) {
      txs = txs.filter(t => t.date <= cashFlowEndDate);
    }
    if (filterFlowType !== 'ALL') {
      txs = txs.filter(t => t.type === filterFlowType);
    }
    if (paymentStatusFilter !== 'ALL' && cashFlowMode !== 'milestones') {
      txs = txs.filter(t => t.status === paymentStatusFilter);
    }
    if (filterItem !== 'ALL') {
      txs = txs.filter(t => t.item === filterItem || t.category === filterItem);
    }
    return txs;
  }, [displayedProjects, cashFlowMode, paymentStatusFilter, cashFlowStartDate, cashFlowEndDate, filterFlowType, filterItem]);

  const cashFlowSummary = useMemo(() => {
    let totalInflowsK = 0;
    let totalOutflowsK = 0;
    let peakCapitalK = 0;
    let runningBalanceK = 0;

    let paidInflowsK = 0;
    let projectedInflowsK = 0;
    let paidOutflowsK = 0;
    let projectedOutflowsK = 0;
    let paidCount = 0;
    let projectedCount = 0;

    cashFlowTransactions.forEach(t => {
      if (t.type === 'inflow') {
        totalInflowsK += t.amountK;
        runningBalanceK += t.amountK;
        if (t.status === 'paid') {
          paidInflowsK += t.amountK;
          paidCount++;
        } else {
          projectedInflowsK += t.amountK;
          projectedCount++;
        }
      } else {
        totalOutflowsK += t.amountK;
        runningBalanceK -= t.amountK;
        if (runningBalanceK < peakCapitalK) {
          peakCapitalK = runningBalanceK;
        }
        if (t.status === 'paid') {
          paidOutflowsK += t.amountK;
          paidCount++;
        } else {
          projectedOutflowsK += t.amountK;
          projectedCount++;
        }
      }
    });

    const netCashFlowK = totalInflowsK - totalOutflowsK;
    const netActualCashK = paidInflowsK - paidOutflowsK;

    return {
      totalInflowsK,
      totalOutflowsK,
      netCashFlowK,
      peakCapitalK: Math.abs(peakCapitalK),
      transactionCount: cashFlowTransactions.length,
      paidInflowsK,
      projectedInflowsK,
      paidOutflowsK,
      projectedOutflowsK,
      netActualCashK,
      paidCount,
      projectedCount
    };
  }, [cashFlowTransactions]);

  // Model Comparison: Initial Milestone Estimates vs Progressive Realized/Projected Tracking
  const comparisonSummary = useMemo(() => {
    let milestoneExpectedCostsK = 0;
    let milestoneExpectedInflowK = 0;

    let progressiveIncomesK = 0;
    let progressivePaidIncomesK = 0;
    let progressiveExpensesK = 0;
    let progressivePaidExpensesK = 0;

    displayedProjects.forEach(p => {
      const initialDep = p.initialDeposit || 0;
      const finalDep = p.finalDeposit || 0;
      const settlement = p.settlementFigure || 0;
      const soft = p.softCost || 0;
      const holding = p.holdingCost || 0;
      const build = p.buildCost || 0;
      const sale = p.salePrice || 0;

      milestoneExpectedCostsK += (initialDep + finalDep + settlement + soft + holding + build);
      milestoneExpectedInflowK += sale;

      (p.incomes || []).forEach(inc => {
        const amtK = (Number(inc.amount) || 0) / 1000;
        progressiveIncomesK += amtK;
        if (inc.status === 'paid') progressivePaidIncomesK += amtK;
      });

      (p.expenses || []).forEach(exp => {
        const amtK = (Number(exp.amount) || 0) / 1000;
        progressiveExpensesK += amtK;
        if (exp.status === 'paid') progressivePaidExpensesK += amtK;
      });
    });

    const milestoneNetYieldK = milestoneExpectedInflowK - milestoneExpectedCostsK;
    const progressiveNetK = progressiveIncomesK - progressiveExpensesK;
    const progressiveActualNetK = progressivePaidIncomesK - progressivePaidExpensesK;

    return {
      milestoneExpectedCostsK,
      milestoneExpectedInflowK,
      milestoneNetYieldK,
      progressiveIncomesK,
      progressivePaidIncomesK,
      progressiveExpensesK,
      progressivePaidExpensesK,
      progressiveNetK,
      progressiveActualNetK,
      costVarianceK: progressiveExpensesK - milestoneExpectedCostsK,
      incomeVarianceK: progressiveIncomesK - milestoneExpectedInflowK,
      netVarianceK: progressiveNetK - milestoneNetYieldK
    };
  }, [displayedProjects]);

  const handleToggleItemStatus = (tx: any) => {
    if (!onUpdateProject || tx.source === 'milestone') return;
    const project = projects.find(p => p.id === tx.projectId);
    if (!project) return;

    const newStatus: 'paid' | 'projected' = tx.status === 'paid' ? 'projected' : 'paid';

    let updated = false;
    let newIncomes = project.incomes ? [...project.incomes] : [];
    let newExpenses = project.expenses ? [...project.expenses] : [];

    const incIdx = newIncomes.findIndex(i => i.id === tx.id);
    if (incIdx !== -1) {
      newIncomes[incIdx] = { ...newIncomes[incIdx], status: newStatus };
      updated = true;
    } else {
      const expIdx = newExpenses.findIndex(e => e.id === tx.id);
      if (expIdx !== -1) {
        newExpenses[expIdx] = { ...newExpenses[expIdx], status: newStatus };
        updated = true;
      }
    }

    if (updated) {
      onUpdateProject({
        ...project,
        incomes: newIncomes,
        expenses: newExpenses,
        updatedAt: Date.now()
      });
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportCashFlowToExcel({
        projects,
        settings,
        filterProjectId: filterProject,
        startDate: cashFlowStartDate,
        endDate: cashFlowEndDate,
        filterType: filterFlowType,
        filterItem: filterItem,
        filterStatus: paymentStatusFilter,
        source: cashFlowMode === 'milestones' ? 'milestone' : cashFlowMode === 'payments' ? 'itemized' : 'milestone'
      });
    } catch (e) {
      console.error("Export Excel error", e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    exportCashFlowToCSV({
      projects,
      settings,
      filterProjectId: filterProject,
      startDate: cashFlowStartDate,
      endDate: cashFlowEndDate,
      filterType: filterFlowType,
      filterItem: filterItem,
      filterStatus: paymentStatusFilter,
      source: cashFlowMode === 'milestones' ? 'milestone' : cashFlowMode === 'payments' ? 'itemized' : 'milestone'
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="p-6 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={24} /> 
            Reporting
          </h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black tracking-wide shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              title="Export Project Financial Projections & Cash Flow Report to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet size={16} />
              <span>{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
            </button>

            {activeTab === 'cashflow' && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Download CSV"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
            )}

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('progress')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'progress' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Activity size={16} /> Progress
              </button>
              <button
                onClick={() => setActiveTab('current')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'current' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Target size={16} /> Current State
              </button>
              <button
                onClick={() => setActiveTab('cashflow')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'cashflow' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Banknote size={16} className={activeTab === 'cashflow' ? 'text-emerald-600' : ''} /> Cash Flow Report
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project</label>
            <select 
              value={filterProject} 
              onChange={e => setFilterProject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Projects</option>
              {projects.filter(p => !p.isArchived).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {activeTab !== 'cashflow' ? (
            <>
              <div className="w-40">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Member</label>
                <select 
                  value={filterMember} 
                  onChange={e => setFilterMember(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Members</option>
                  {(settings.people || []).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="">Unassigned</option>
                </select>
              </div>
              {activeTab === 'current' && (
                <div className="w-40">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Statuses</option>
                    {(settings.statuses || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="w-40">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={10}/> {activeTab === 'progress' ? 'From' : 'Due After'}</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="w-40">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={10}/> {activeTab === 'progress' ? 'To' : 'Due Before'}</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-44">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Flow Type</label>
                <select 
                  value={filterFlowType} 
                  onChange={e => setFilterFlowType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Flows (In & Out)</option>
                  <option value="outflow">Outflows (Costs & Expenses)</option>
                  <option value="inflow">Inflows (Revenues & Incomes)</option>
                </select>
              </div>
              <div className="w-48">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Financial Item / Category</label>
                <select 
                  value={filterItem} 
                  onChange={e => setFilterItem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Items & Categories</option>
                  <optgroup label="Milestone Benchmarks">
                    <option value="Build Cost">Build Cost (Construction)</option>
                    <option value="Soft Cost">Soft Cost</option>
                    <option value="Holding Cost">Holding Cost (Interest & Rates)</option>
                    <option value="Initial Deposit">Initial Deposit</option>
                    <option value="Final Deposit">Final Deposit</option>
                    <option value="Settlement Figure">Settlement Figure</option>
                    <option value="Sale Price">Sale Price</option>
                  </optgroup>
                  {uniqueFinancialItems.incomes.length > 0 && (
                    <optgroup label="Income Categories">
                      {uniqueFinancialItems.incomes.map(cat => (
                        <option key={`inc-${cat}`} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  )}
                  {uniqueFinancialItems.expenses.length > 0 && (
                    <optgroup label="Expense Categories">
                      {uniqueFinancialItems.expenses.map(cat => (
                        <option key={`exp-${cat}`} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              {cashFlowMode !== 'milestones' && (
                <div className="w-40">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Status</label>
                  <select 
                    value={paymentStatusFilter} 
                    onChange={e => setPaymentStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="projected">Projected Only</option>
                    <option value="paid">Paid Only</option>
                  </select>
                </div>
              )}
              <div className="w-40">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={10}/> From Date</label>
                <input 
                  type="date" 
                  value={cashFlowStartDate} 
                  onChange={e => setCashFlowStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-40">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={10}/> To Date</label>
                <input 
                  type="date" 
                  value={cashFlowEndDate} 
                  onChange={e => setCashFlowEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          <button 
            onClick={() => {
              setFilterProject('ALL');
              setFilterMember('ALL');
              setFilterStatus('ALL');
              setPaymentStatusFilter('ALL');
              setFilterFlowType('ALL');
              setFilterItem('ALL');
              setCashFlowStartDate('');
              setCashFlowEndDate('');
              const d = new Date();
              setEndDate(d.toISOString().split('T')[0]);
              d.setDate(d.getDate() - 7);
              setStartDate(d.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-500 transition-colors uppercase tracking-wider"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {activeTab === 'progress' ? (
          <>
            {/* Progress Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Tasks Completed</div>
                <div className="text-3xl font-black text-emerald-900">{progressSummary.completed}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Other Status Moves</div>
                <div className="text-3xl font-black text-indigo-900">{progressSummary.otherUpdates}</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Total Actual Time Logged (for touched tasks)</div>
                <div className="text-3xl font-black text-amber-900">{progressSummary.totalActualTimeInPeriod.toFixed(1)} <span className="text-sm font-bold text-amber-500">units</span></div>
              </div>
            </div>

            {/* Progress Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4">Date/Time</th>
                    <th className="p-4">Task Name</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Change</th>
                    <th className="p-4">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {progressLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                        No progress logged matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    progressLogs.map(log => {
                      const taskObj = allTasks.find(t => t.task.id === log.taskId);
                      const projectName = projects.find(p => p.id === log.projectId)?.name || 'Unknown Project';
                      return (
                        <tr 
                          key={log.id} 
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group"
                          onClick={() => onTaskClick?.(log.projectId, log.taskId)}
                        >
                          <td className="p-4 text-sm font-medium text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {log.taskName}
                            </div>
                            {taskObj?.task.displayId && <div className="text-[10px] text-slate-400 mt-0.5">{taskObj.task.displayId}</div>}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-600">{projectName}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Activity size={12} />
                              {log.details || 'Status updated'}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-700">{taskObj?.task.assignedTo || <span className="text-slate-400">Unassigned</span>}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'current' ? (
          <>
            {/* Current Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tasks</div>
                <div className="text-3xl font-black text-slate-900">{currentSummary.totalTasks}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Completed</div>
                <div className="text-3xl font-black text-emerald-900">{currentSummary.completedTasks}</div>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Overdue</div>
                <div className="text-3xl font-black text-rose-900">{currentSummary.overdueTasks}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Est. Time</div>
                <div className="text-3xl font-black text-indigo-900">{currentSummary.totalEstimated.toFixed(1)} <span className="text-sm font-bold text-indigo-500 line-clamp-1">units</span></div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 shadow-sm">
                <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Actual Time</div>
                <div className="text-3xl font-black text-amber-900">{currentSummary.totalActual.toFixed(1)} <span className="text-sm font-bold text-amber-500 line-clamp-1">units</span></div>
              </div>
            </div>

            {/* Current Data Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4">Task Name</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assignee</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-right">Est. Time</th>
                    <th className="p-4 text-right">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                        No tasks found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(({ task, project }) => (
                      <tr 
                        key={`${project.id}-${task.id}`} 
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group"
                        onClick={() => onTaskClick?.(project.id, task.id)}
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {task.name}
                          </div>
                          {task.displayId && <div className="text-[10px] text-slate-400 mt-0.5">{task.displayId}</div>}
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-600">{project.name}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            task.status === 'Complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            task.status === 'Not started' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {task.status === 'Complete' ? <CheckCircle2 size={12} /> : task.status === 'Not started' ? <Circle size={12} /> : <AlertCircle size={12} />}
                            {task.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-700">{task.assignedTo || <span className="text-slate-400">Unassigned</span>}</td>
                        <td className="p-4 text-sm font-medium text-slate-600">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-right text-sm font-medium text-slate-600">{task.estimatedTime || '-'}</td>
                        <td className="p-4 text-right text-sm font-medium text-slate-600">{task.actualTime || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Cash Flow Report Tab */
          <>
            {/* Cash Flow Mode Selector & Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCashFlowMode('milestones')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    cashFlowMode === 'milestones'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers size={14} className={cashFlowMode === 'milestones' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>Projected Cash Flow (Milestones)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCashFlowMode('payments')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    cashFlowMode === 'payments'
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Banknote size={14} className={cashFlowMode === 'payments' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>Expected & Actual Payments (Income/Expenses)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCashFlowMode('comparison')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    cashFlowMode === 'comparison'
                      ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scale size={14} className={cashFlowMode === 'comparison' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>Model Comparison (Milestones vs. Itemized)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium">
                {cashFlowMode === 'milestones' && (
                  <span className="inline-flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 font-bold">
                    <span>Expected overall costs (including holding cost) & revenue based on project milestone payments</span>
                  </span>
                )}
                {cashFlowMode === 'payments' && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 font-bold">
                    <span>Expected vs Actual payments tracking progressively entered income & expense items</span>
                  </span>
                )}
                {cashFlowMode === 'comparison' && (
                  <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-bold">
                    <span>Side-by-side comparison keeping milestone baseline distinct from progressive itemized cash flow</span>
                  </span>
                )}
              </div>
            </div>

            {/* ==================== CASH FLOW CONTENT ==================== */}
            {cashFlowMode === 'comparison' ? (
              /* ==================== 1. MODEL COMPARISON VIEW ==================== */
              <div className="space-y-5">
                {/* 3 Overview Comparison KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Milestones (Initial Baseline) */}
                  <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers size={14} /> Initial Milestone Estimate
                      </span>
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                        High-Level Baseline
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-black text-indigo-950">
                        {comparisonSummary.milestoneNetYieldK >= 0 ? '+' : '-'}${Math.abs(comparisonSummary.milestoneNetYieldK).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k
                      </div>
                      <span className="text-xs text-indigo-700 font-semibold block">Net Projected Milestone Yield</span>
                    </div>
                    <div className="pt-2 border-t border-indigo-200/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Expected Inflow</span>
                        <span className="font-black text-emerald-700">${comparisonSummary.milestoneExpectedInflowK.toLocaleString()}k</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Expected Costs</span>
                        <span className="font-black text-rose-700">${comparisonSummary.milestoneExpectedCostsK.toLocaleString()}k</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Progressive Itemized Cash Flow */}
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Banknote size={14} /> Progressive Itemized Flow
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Actuals & Invoices
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className={`text-2xl font-black ${
                        comparisonSummary.progressiveNetK >= 0 ? 'text-emerald-950' : 'text-rose-950'
                      }`}>
                        {comparisonSummary.progressiveNetK >= 0 ? '+' : '-'}${Math.abs(comparisonSummary.progressiveNetK).toFixed(1)}k
                      </div>
                      <span className="text-xs text-emerald-700 font-semibold block">Progressive Net Position</span>
                    </div>
                    <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Incomes (Paid)</span>
                        <span className="font-black text-emerald-700">${comparisonSummary.progressivePaidIncomesK.toFixed(1)}k <span className="text-[10px] text-slate-400 font-normal">/ ${comparisonSummary.progressiveIncomesK.toFixed(1)}k</span></span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Expenses (Paid)</span>
                        <span className="font-black text-rose-700">${comparisonSummary.progressivePaidExpensesK.toFixed(1)}k <span className="text-[10px] text-slate-400 font-normal">/ ${comparisonSummary.progressiveExpensesK.toFixed(1)}k</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Model Variance Analysis */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Scale size={14} /> Model Variance
                      </span>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-full">
                        Reconciliation
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className={`text-2xl font-black ${
                        comparisonSummary.costVarianceK <= 0 ? 'text-emerald-900' : 'text-amber-900'
                      }`}>
                        {comparisonSummary.costVarianceK > 0 ? '+' : ''}${comparisonSummary.costVarianceK.toFixed(1)}k
                      </div>
                      <span className="text-xs text-slate-600 font-semibold block">
                        Cost Variance vs. Milestone Allowance
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Revenue Realized/Projected:</span>
                        <span className="font-bold text-slate-800">${comparisonSummary.progressiveIncomesK.toFixed(1)}k vs ${comparisonSummary.milestoneExpectedInflowK}k</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Actual Net Cash Realized:</span>
                        <span className={`font-bold ${comparisonSummary.progressiveActualNetK >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {comparisonSummary.progressiveActualNetK >= 0 ? '+' : '-'}${Math.abs(comparisonSummary.progressiveActualNetK).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Model Comparison Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                    <div className="flex items-center gap-2">
                      <Scale className="text-indigo-600" size={18} />
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                          Side-by-Side Financial Model Comparison
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Milestones (Initial Estimate) kept strictly distinct from progressive itemized cash flow
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <FileSpreadsheet size={13} />
                        <span>Export Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-4">Project</th>
                          <th className="p-4 text-right">Milestone Revenue</th>
                          <th className="p-4 text-right">Milestone Costs</th>
                          <th className="p-4 text-right">Holding Cost</th>
                          <th className="p-4 text-right">Build Cost</th>
                          <th className="p-4 text-right">Milestone Net Yield</th>
                          <th className="p-4 text-right bg-emerald-50/30">Itemized Incomes</th>
                          <th className="p-4 text-right bg-rose-50/30">Itemized Expenses</th>
                          <th className="p-4 text-right">Progressive Net</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedProjects.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="p-12 text-center text-slate-400 font-medium">
                              No projects found matching the selected filter.
                            </td>
                          </tr>
                        ) : (
                          displayedProjects.map(project => {
                            const initialDep = project.initialDeposit || 0;
                          const finalDep = project.finalDeposit || 0;
                          const settlement = project.settlementFigure || 0;
                          const soft = project.softCost || 0;
                          const holding = project.holdingCost || 0;
                          const build = project.buildCost || 0;
                          const sale = project.salePrice || 0;

                          const mCostsK = initialDep + finalDep + settlement + soft + holding + build;
                          const mNetK = sale - mCostsK;

                          const customExpK = (project.expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) / 1000;
                          const customIncK = (project.incomes || []).reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0) / 1000;
                          const pNetK = customIncK - customExpK;

                          const paidExpK = (project.expenses || []).filter(e => e.status === 'paid').reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) / 1000;
                          const paidIncK = (project.incomes || []).filter(i => i.status === 'paid').reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0) / 1000;

                          return (
                            <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-slate-900">{project.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {project.displayId && <span className="font-semibold text-slate-500 mr-1.5">{project.displayId}</span>}
                                  {project.company}
                                </div>
                              </td>
                              <td className="p-4 text-right text-sm font-bold text-emerald-700">
                                ${sale}k
                              </td>
                              <td className="p-4 text-right text-sm font-bold text-rose-700">
                                ${mCostsK}k
                              </td>
                              <td className="p-4 text-right text-sm font-medium text-amber-800">
                                ${holding}k
                              </td>
                              <td className="p-4 text-right text-sm font-medium text-amber-800">
                                ${build}k
                              </td>
                              <td className={`p-4 text-right text-sm font-black ${
                                mNetK >= 0 ? 'text-emerald-800' : 'text-rose-800'
                              }`}>
                                {mNetK >= 0 ? '+' : '-'}${Math.abs(mNetK)}k
                              </td>
                              <td className="p-4 text-right text-sm font-bold text-emerald-800 bg-emerald-50/20">
                                <div>${customIncK.toFixed(1)}k</div>
                                <span className="text-[10px] text-emerald-600 font-normal">${paidIncK.toFixed(1)}k paid</span>
                              </td>
                              <td className="p-4 text-right text-sm font-bold text-rose-800 bg-rose-50/20">
                                <div>${customExpK.toFixed(1)}k</div>
                                <span className="text-[10px] text-rose-600 font-normal">${paidExpK.toFixed(1)}k paid</span>
                              </td>
                              <td className={`p-4 text-right text-sm font-black ${
                                pNetK >= 0 ? 'text-emerald-800' : 'text-rose-800'
                              }`}>
                                {pNetK >= 0 ? '+' : '-'}${Math.abs(pNetK).toFixed(1)}k
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  (project.incomes || []).length > 0 || (project.expenses || []).length > 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {(project.incomes || []).length + (project.expenses || []).length} Progressive items
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                {onEditProject && (
                                  <button
                                    type="button"
                                    onClick={() => onEditProject(project)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* ==================== 2. TRANSACTION SCHEDULE VIEW (MILESTONES OR PAYMENTS) ==================== */
              <>
                {/* Mode-Specific Cash Flow KPI Cards */}
                {cashFlowMode === 'payments' ? (
                  /* Expected vs Actual Payments KPIs */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-1.5">
                          <ArrowUpRight size={14} className="text-rose-600" /> Paid Outflows (Actual)
                        </span>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">Actual Expenses</span>
                      </div>
                      <div className="text-3xl font-black text-rose-950 mt-1">
                        ${cashFlowSummary.paidOutflowsK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k
                      </div>
                      <p className="text-xs text-rose-700 font-medium mt-1">
                        ${cashFlowSummary.projectedOutflowsK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k remaining projected
                      </p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                          <ArrowDownLeft size={14} className="text-emerald-600" /> Received Inflows (Actual)
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Actual Incomes</span>
                      </div>
                      <div className="text-3xl font-black text-emerald-950 mt-1">
                        ${cashFlowSummary.paidInflowsK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k
                      </div>
                      <p className="text-xs text-emerald-700 font-medium mt-1">
                        ${cashFlowSummary.projectedInflowsK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k remaining projected
                      </p>
                    </div>

                    <div className={`border rounded-2xl p-5 shadow-sm ${
                      cashFlowSummary.netActualCashK >= 0 ? 'bg-indigo-50 border-indigo-200/80' : 'bg-amber-50 border-amber-200/80'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          cashFlowSummary.netActualCashK >= 0 ? 'text-indigo-700' : 'text-amber-700'
                        }`}>
                          {cashFlowSummary.netActualCashK >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 
                          Actual Net Cash Position
                        </span>
                      </div>
                      <div className={`text-3xl font-black mt-1 ${
                        cashFlowSummary.netActualCashK >= 0 ? 'text-indigo-950' : 'text-amber-950'
                      }`}>
                        {cashFlowSummary.netActualCashK >= 0 ? '+' : '-'}${Math.abs(cashFlowSummary.netActualCashK).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k
                      </div>
                      <p className={`text-xs font-medium mt-1 ${
                        cashFlowSummary.netActualCashK >= 0 ? 'text-indigo-700' : 'text-amber-700'
                      }`}>
                        Net overall projected: {cashFlowSummary.netCashFlowK >= 0 ? '+' : '-'}${Math.abs(cashFlowSummary.netCashFlowK).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" /> Payment Status Ratio
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                          {cashFlowSummary.transactionCount} Items
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                        <span className="text-emerald-700">{cashFlowSummary.paidCount} Paid</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-amber-700">{cashFlowSummary.projectedCount} Projected</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Interactive toggles available below
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Milestone Cash Flow KPIs */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                          <ArrowDownLeft size={14} className="text-emerald-600" /> Projected Inflows
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">Expected Overall Income</span>
                      </div>
                      <div className="text-3xl font-black text-emerald-950 mt-1">
                        ${cashFlowSummary.totalInflowsK.toLocaleString()}k
                      </div>
                      <p className="text-xs text-emerald-700 font-medium mt-1">
                        {formatCurrency(cashFlowSummary.totalInflowsK * 1000)} total revenue
                      </p>
                    </div>

                    <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-1.5">
                          <ArrowUpRight size={14} className="text-rose-600" /> Projected Outflows
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 px-2 py-0.5 rounded-full">Expected Overall Costs</span>
                      </div>
                      <div className="text-3xl font-black text-rose-950 mt-1">
                        ${cashFlowSummary.totalOutflowsK.toLocaleString()}k
                      </div>
                      <p className="text-xs text-rose-700 font-medium mt-1">
                        {formatCurrency(cashFlowSummary.totalOutflowsK * 1000)} total commitments
                      </p>
                    </div>

                    <div className={`border rounded-2xl p-5 shadow-sm ${
                      cashFlowSummary.netCashFlowK >= 0 ? 'bg-indigo-50 border-indigo-200/80' : 'bg-amber-50 border-amber-200/80'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          cashFlowSummary.netCashFlowK >= 0 ? 'text-indigo-700' : 'text-amber-700'
                        }`}>
                          {cashFlowSummary.netCashFlowK >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 
                          Net Projected Cash Flow
                        </span>
                      </div>
                      <div className={`text-3xl font-black mt-1 ${
                        cashFlowSummary.netCashFlowK >= 0 ? 'text-indigo-950' : 'text-amber-950'
                      }`}>
                        {cashFlowSummary.netCashFlowK >= 0 ? '+' : '-'}${Math.abs(cashFlowSummary.netCashFlowK).toLocaleString()}k
                      </div>
                      <p className={`text-xs font-medium mt-1 ${
                        cashFlowSummary.netCashFlowK >= 0 ? 'text-indigo-700' : 'text-amber-700'
                      }`}>
                        {cashFlowSummary.netCashFlowK >= 0 ? 'Net positive return' : 'Projected deficit'}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <DollarSign size={14} className="text-slate-400" /> Peak Capital Exposure
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">{cashFlowSummary.transactionCount} Events</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mt-1">
                        ${cashFlowSummary.peakCapitalK.toLocaleString()}k
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Max cumulative capital required
                      </p>
                    </div>
                  </div>
                )}

                {/* Cash Flow Schedule Data Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                    <div className="flex items-center gap-2">
                      <Banknote className="text-emerald-600" size={18} />
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                          {cashFlowMode === 'milestones'
                            ? 'Projected Milestone Cash Flow Schedule (Expected Overall Costs & Income)'
                            : 'Expected & Actual Payment Ledger (Income & Expense Items)'}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {cashFlowMode === 'milestones'
                            ? 'Deposits, Settlement, Soft Cost, Holding Cost, Build Cost, and Anticipated Sale Price'
                            : 'Itemized payment commitments with Projected vs. Paid verification'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">
                        Showing {cashFlowTransactions.length} scheduled transactions
                      </span>
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <FileSpreadsheet size={13} />
                        <span>Download Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <Download size={13} />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-4">Estimated Date</th>
                          <th className="p-4">Project</th>
                          <th className="p-4">Item & Description</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Type</th>
                          <th className="p-4 text-center">Payment Status</th>
                          <th className="p-4 text-center">GST</th>
                          <th className="p-4 text-right">Amount ($K)</th>
                          <th className="p-4 text-right">Amount ($)</th>
                          <th className="p-4 text-right">Net Flow ($)</th>
                          <th className="p-4 text-right">Cumulative Balance ($)</th>
                          <th className="p-4 text-center">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashFlowTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="p-12 text-center text-slate-400 font-medium">
                              {cashFlowMode === 'milestones'
                                ? 'No milestone projection items found. Configure Initial Deposit, Final Deposit, Settlement Figure, Soft Cost, Holding Cost, Build Cost, or Sale Price in Project Settings.'
                                : 'No payment items found matching the selected filters. Add itemized Incomes and Expenses with Projected or Paid status in Project Settings.'}
                            </td>
                          </tr>
                        ) : (() => {
                          let runningBal = 0;
                          return cashFlowTransactions.map((tx) => {
                            const netAmount = tx.type === 'inflow' ? tx.amount : -tx.amount;
                            runningBal += netAmount;

                            return (
                              <tr 
                                key={tx.id} 
                                className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="p-4 text-sm font-bold text-slate-800 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                                    <Calendar size={12} className="text-slate-400" />
                                    {formatDateWithSettings(tx.date, settings.dateFormat)}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                                    {tx.projectName}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    {tx.projectDisplayId && <span className="font-semibold text-slate-500">{tx.projectDisplayId}</span>}
                                    {tx.company && <span>• {tx.company}</span>}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                    {tx.item === 'Build Cost' && <Hammer size={14} className="text-amber-600 shrink-0" />}
                                    {tx.item}
                                  </div>
                                  {tx.description && (
                                    <div className="text-[11px] text-slate-500 font-normal italic mt-0.5 truncate max-w-xs">
                                      {tx.description}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                    {tx.category || tx.item}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                    tx.type === 'inflow' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {tx.type === 'inflow' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                    {tx.type === 'inflow' ? 'Cash Inflow' : 'Cash Outflow'}
                                  </span>
                                </td>

                                {/* Status Column */}
                                <td className="p-4 text-center">
                                  {tx.source === 'milestone' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Milestone
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleItemStatus(tx)}
                                      title="Click to toggle between Paid and Projected"
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                                        tx.status === 'paid'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      }`}
                                    >
                                      {tx.status === 'paid' ? <CheckCircle2 size={11} className="text-emerald-700" /> : <Clock size={11} className="text-amber-600" />}
                                      <span>{tx.status === 'paid' ? 'Paid' : 'Projected'}</span>
                                    </button>
                                  )}
                                </td>

                                <td className="p-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                    tx.gstType === 'EX' 
                                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {tx.gstType || 'INC'}
                                  </span>
                                </td>
                                <td className="p-4 text-right text-sm font-black text-slate-900">
                                  ${tx.amountK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k
                                </td>
                                <td className="p-4 text-right text-sm font-bold text-slate-700">
                                  ${tx.amount.toLocaleString()}
                                </td>
                                <td className={`p-4 text-right text-sm font-black ${
                                  tx.type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {tx.type === 'inflow' ? '+' : '-'}${tx.amount.toLocaleString()}
                                </td>
                                <td className={`p-4 text-right text-sm font-black ${
                                  runningBal >= 0 ? 'text-emerald-700' : 'text-slate-800'
                                }`}>
                                  {runningBal >= 0 ? '+' : '-'}${Math.abs(runningBal).toLocaleString()}
                                </td>
                                <td className="p-4 text-center">
                                  {tx.link ? (
                                    <a
                                      href={tx.link.startsWith('http') ? tx.link : `https://${tx.link}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                                      title="Open Document / Link"
                                    >
                                      <ExternalLink size={14} />
                                    </a>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Project by Project Financial Summaries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  Project Financial Projections Overview
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {displayedProjects.length} {displayedProjects.length === 1 ? 'Project' : 'Active Projects'}
                  {filterProject !== 'ALL' && ' (Filtered)'}
                </span>
              </div>

              {displayedProjects.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-medium">
                  No projects found matching the selected filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {displayedProjects.map(project => {
                  const customExpensesK = (project.expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) / 1000;
                  const customIncomesK = (project.incomes || []).reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0) / 1000;
                  const paidExpensesK = (project.expenses || []).filter(e => e.status === 'paid').reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) / 1000;
                  const paidIncomesK = (project.incomes || []).filter(i => i.status === 'paid').reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0) / 1000;

                  // Milestone figures: Initial high-level baseline (including holding cost)
                  const milestoneOutK = (project.initialDeposit || 0) + (project.finalDeposit || 0) + (project.settlementFigure || 0) + (project.softCost || 0) + (project.holdingCost || 0) + (project.buildCost || 0);
                  const milestoneInK = project.salePrice || 0;
                  const milestoneNetK = milestoneInK - milestoneOutK;

                  // Progressive figures: Detailed itemized cash flow
                  const progressiveNetK = customIncomesK - customExpensesK;
                  const isExpanded = !!expandedProjects[project.id];
                  const hasCustomItems = (project.incomes || []).length > 0 || (project.expenses || []).length > 0;

                  return (
                    <div 
                      key={project.id} 
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {project.displayId && (
                              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                {project.displayId}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{project.type}</span>
                            {project.company && <span className="text-[10px] text-slate-400">• {project.company}</span>}
                          </div>
                          <h4 className="text-base font-black text-slate-900">{project.name}</h4>
                        </div>
                        {onEditProject && (
                          <button
                            type="button"
                            onClick={() => onEditProject(project)}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                            title="Edit Project Financial Projections"
                          >
                            <Banknote size={14} />
                            <span>Edit Financials</span>
                          </button>
                        )}
                      </div>

                      {/* Financial Projection Items Grid (Now includes Holding Cost) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Initial Deposit</span>
                          <span className="font-extrabold text-slate-900 block">
                            {project.initialDeposit ? `$${project.initialDeposit}k` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {project.initialDepositDate ? formatDateWithSettings(project.initialDepositDate, settings.dateFormat) : 'No date set'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Final Deposit</span>
                          <span className="font-extrabold text-slate-900 block">
                            {project.finalDeposit ? `$${project.finalDeposit}k` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {project.finalDepositDate ? formatDateWithSettings(project.finalDepositDate, settings.dateFormat) : 'No date set'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Settlement Figure</span>
                          <span className="font-extrabold text-slate-900 block">
                            {project.settlementFigure ? `$${project.settlementFigure}k` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {project.settlementDate ? formatDateWithSettings(project.settlementDate, settings.dateFormat) : 'No date set'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Soft Cost</span>
                          <span className="font-extrabold text-slate-900 block">
                            {project.softCost ? `$${project.softCost}k` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {project.softCostDate ? formatDateWithSettings(project.softCostDate, settings.dateFormat) : 'No date set'}
                          </span>
                        </div>

                        {/* Holding Cost */}
                        <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                          <span className="text-[9px] font-black text-amber-800 uppercase block mb-0.5">Holding Cost</span>
                          <span className="font-extrabold text-slate-900 block">
                            {project.holdingCost ? `$${project.holdingCost}k` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {project.holdingCostDate ? formatDateWithSettings(project.holdingCostDate, settings.dateFormat) : 'No date set'}
                            {project.holdingCostNotes ? ` • ${project.holdingCostNotes}` : ''}
                          </span>
                        </div>

                        <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                          <span className="text-[9px] font-black text-amber-800 uppercase flex items-center gap-1 mb-0.5">
                            <Hammer size={10} className="text-amber-600" /> Build Cost
                          </span>
                          <span className="font-extrabold text-slate-900 block">
                            {project.buildCost ? `$${project.buildCost}k` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate block">
                            {project.buildCostDate ? formatDateWithSettings(project.buildCostDate, settings.dateFormat) : 'No date set'}
                            {project.builderName ? ` • ${project.builderName}` : ''}
                          </span>
                        </div>

                        <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[9px] font-black text-emerald-700 uppercase block mb-0.5">Sale Price (Inflow)</span>
                          <span className="font-black text-emerald-950 block">
                            {project.salePrice ? `$${project.salePrice}k` : '-'}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium truncate block">
                            {project.salePriceDate ? formatDateWithSettings(project.salePriceDate, settings.dateFormat) : 'No date set'}
                          </span>
                        </div>

                        <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80">
                          <span className="text-[9px] font-black text-emerald-800 uppercase block mb-0.5">
                            Itemized Incomes ({(project.incomes || []).length})
                          </span>
                          <span className="font-black text-emerald-950 block">
                            {customIncomesK > 0 ? `$${customIncomesK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k` : '-'}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium truncate block">
                            {paidIncomesK > 0 ? `${formatCurrency(paidIncomesK * 1000)} paid` : 'All projected'}
                          </span>
                        </div>

                        <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/80">
                          <span className="text-[9px] font-black text-rose-800 uppercase block mb-0.5">
                            Itemized Expenses ({(project.expenses || []).length})
                          </span>
                          <span className="font-black text-rose-950 block">
                            {customExpensesK > 0 ? `$${customExpensesK.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k` : '-'}
                          </span>
                          <span className="text-[10px] text-rose-700 font-medium truncate block">
                            {paidExpensesK > 0 ? `${formatCurrency(paidExpensesK * 1000)} paid` : 'All projected'}
                          </span>
                        </div>
                      </div>

                      {/* Expand Itemized Incomes & Expenses List */}
                      {hasCustomItems && (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setExpandedProjects(prev => ({ ...prev, [project.id]: !prev[project.id] }))}
                            className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Banknote size={13} className="text-emerald-600" />
                              <span>View Itemized Breakdown ({ (project.incomes || []).length } incomes, { (project.expenses || []).length } expenses)</span>
                            </span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isExpanded && (
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs animate-in fade-in duration-150">
                              {(project.incomes || []).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Incomes</span>
                                  {(project.incomes || []).map((inc, i) => (
                                    <div key={inc.id || i} className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <ArrowDownLeft size={13} className="text-emerald-600 shrink-0" />
                                        <div className="truncate">
                                          <span className="font-bold text-slate-800">{inc.category}</span>
                                          {inc.description && <span className="text-slate-500 font-normal"> - {inc.description}</span>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-slate-400 text-[11px]">{inc.date ? formatDateWithSettings(inc.date, settings.dateFormat) : ''}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleItemStatus({ ...inc, projectId: project.id, type: 'inflow', source: 'itemized' })}
                                          title="Click to toggle Paid / Projected"
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer ${
                                            inc.status === 'paid'
                                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                              : 'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}
                                        >
                                          {inc.status === 'paid' ? 'Paid' : 'Projected'}
                                        </button>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{inc.gstType || 'INC'}</span>
                                        <span className="font-black text-emerald-700">${Number(inc.amount).toLocaleString()}</span>
                                        {inc.link && (
                                          <a 
                                            href={inc.link.startsWith('http') ? inc.link : `https://${inc.link}`}
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-indigo-600 hover:text-indigo-800"
                                            title="Open link"
                                          >
                                            <ExternalLink size={12} />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(project.expenses || []).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Expenses</span>
                                  {(project.expenses || []).map((exp, i) => (
                                    <div key={exp.id || i} className="bg-white p-2 rounded-lg border border-rose-100 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <ArrowUpRight size={13} className="text-rose-600 shrink-0" />
                                        <div className="truncate">
                                          <span className="font-bold text-slate-800">{exp.category}</span>
                                          {exp.description && <span className="text-slate-500 font-normal"> - {exp.description}</span>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-slate-400 text-[11px]">{exp.date ? formatDateWithSettings(exp.date, settings.dateFormat) : ''}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleItemStatus({ ...exp, projectId: project.id, type: 'outflow', source: 'itemized' })}
                                          title="Click to toggle Paid / Projected"
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer ${
                                            exp.status === 'paid'
                                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                              : 'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}
                                        >
                                          {exp.status === 'paid' ? 'Paid' : 'Projected'}
                                        </button>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{exp.gstType || 'INC'}</span>
                                        <span className="font-black text-rose-700">${Number(exp.amount).toLocaleString()}</span>
                                        {exp.link && (
                                          <a 
                                            href={exp.link.startsWith('http') ? exp.link : `https://${exp.link}`}
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-indigo-600 hover:text-indigo-800"
                                            title="Open link"
                                          >
                                            <ExternalLink size={12} />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Project Dual Model Return Bar */}
                      <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-slate-200/80">
                        {/* Milestone High-Level Model */}
                        <div className="space-y-1 pr-2 sm:border-r border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-indigo-700">Milestone Baseline</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${milestoneNetK >= 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'}`}>
                              {milestoneInK > 0 ? `${Math.round((milestoneNetK / milestoneInK) * 100)}% Margin` : '0%'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Costs / Inflow:</span>
                            <span className="font-bold text-slate-800">${Math.round(milestoneOutK)}k / ${Math.round(milestoneInK)}k</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Milestone Net Yield:</span>
                            <span className={`font-black ${milestoneNetK >= 0 ? 'text-indigo-900' : 'text-rose-700'}`}>
                              {milestoneNetK >= 0 ? '+' : '-'}${Math.abs(Math.round(milestoneNetK))}k
                            </span>
                          </div>
                        </div>

                        {/* Progressive Itemized Model */}
                        <div className="space-y-1 pl-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-emerald-700">Progressive Cash Flow</span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {(project.incomes || []).length + (project.expenses || []).length} items
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Realized (Paid):</span>
                            <span className="font-bold text-emerald-700">
                              +${paidIncomesK.toFixed(1)}k <span className="text-slate-400 font-normal">/</span> -${paidExpensesK.toFixed(1)}k
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Progressive Net:</span>
                            <span className={`font-black ${progressiveNetK >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                              {progressiveNetK >= 0 ? '+' : '-'}${Math.abs(progressiveNetK).toFixed(1)}k
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>
        )}

      </div>
    </div>
  );
};

