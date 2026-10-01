import React, { useState, useMemo } from 'react';
import { 
  Activity, Calendar, Wand2, Banknote, AlertTriangle, Users, 
  CheckCircle2, Clock, DollarSign, TrendingUp, TrendingDown, 
  Hammer, X, ChevronRight, AlertCircle, ArrowUpRight, ArrowDownLeft,
  Percent, Star, Flame, ShieldAlert, Sparkles, User, Briefcase, Layers
} from 'lucide-react';
import { AppSettings, Project, Subtask, Milestone } from '../types';
import { getStatusBorderColor } from '../constants';

interface ProjectSidebarProps {
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalEstimatedDays: number;
    totalEstimatedInUnit: number;
    bufferUsedInUnit: number;
    finishDate: Date;
    statusCount: Record<string, number>;
  } | null;
  settings: AppSettings;
  formatDate: (date: Date | number) => string;
  projectTimeUnit: string;
  projectTimeBuffer: number;
  project?: Project;
  onTaskClick?: (milestoneId: string, subtaskIndex: number) => void;
  onEditProject?: (project: Project) => void;
  onClose?: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ 
  stats, 
  settings, 
  formatDate, 
  projectTimeUnit, 
  projectTimeBuffer,
  project,
  onTaskClick,
  onEditProject,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'risks' | 'team'>('overview');
  const [financialSubTab, setFinancialSubTab] = useState<'milestones' | 'progressive'>('milestones');

  // Flatten all subtasks with milestone references for deep analysis
  const taskAnalysis = useMemo(() => {
    type AssigneeData = { total: number; completed: number; open: number; totalEstimatedTime: number };
    const emptyAssignees: Record<string, AssigneeData> = {};
    if (!project) return { all: [], held: [], overdue: [], pendingApprovals: [], unstaffed: [], assignees: emptyAssignees };
    
    const now = Date.now();
    const all: { task: Subtask; milestoneId: string; milestoneName: string; subtaskIndex: number }[] = [];
    const held: { task: Subtask; milestoneId: string; milestoneName: string; subtaskIndex: number }[] = [];
    const overdue: { task: Subtask; milestoneId: string; milestoneName: string; subtaskIndex: number; daysOverdue: number }[] = [];
    const pendingApprovals: { task: Subtask; milestoneId: string; milestoneName: string; subtaskIndex: number }[] = [];
    const unstaffed: { task: Subtask; milestoneId: string; milestoneName: string; subtaskIndex: number }[] = [];
    const assignees: Record<string, AssigneeData> = {};

    project.milestones.forEach(m => {
      (m.subtasks || []).forEach((s, idx) => {
        const item = { task: s, milestoneId: m.id, milestoneName: m.name, subtaskIndex: idx };
        all.push(item);

        if (s.status === 'Held') {
          held.push(item);
        }

        if (s.dueDate && s.dueDate < now && s.status !== 'Complete') {
          const daysOverdue = Math.max(1, Math.round((now - s.dueDate) / (1000 * 60 * 60 * 24)));
          overdue.push({ ...item, daysOverdue });
        }

        if (s.requiresApproval && s.approvalStatus === 'pending') {
          pendingApprovals.push(item);
        }

        if (s.role && !s.assignedTo) {
          unstaffed.push(item);
        }

        const person = s.assignedTo || 'Unassigned';
        if (!assignees[person]) {
          assignees[person] = { total: 0, completed: 0, open: 0, totalEstimatedTime: 0 };
        }
        assignees[person].total += 1;
        if (s.status === 'Complete') {
          assignees[person].completed += 1;
        } else {
          assignees[person].open += 1;
        }
        if (s.estimatedTime) {
          assignees[person].totalEstimatedTime += s.estimatedTime;
        }
      });
    });

    return { all, held, overdue, pendingApprovals, unstaffed, assignees };
  }, [project]);

  if (!stats) return null;

  const bufferRemaining = projectTimeBuffer - stats.bufferUsedInUnit;
  const bufferColor = bufferRemaining < 0 ? 'text-rose-600' : 'text-emerald-600';
  const bufferBg = bufferRemaining < 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100';

  // Overall progress percentage
  const progressPct = Math.round((stats.completedTasks / (stats.totalTasks || 1)) * 100);

  // Composite Health Score (0 - 100)
  const healthMetrics = useMemo(() => {
    let score = 50; // base score

    // Buffer impact: up to +25 or -25
    if (projectTimeBuffer > 0) {
      const bufferRatio = bufferRemaining / projectTimeBuffer;
      score += Math.max(-25, Math.min(25, Math.round(bufferRatio * 25)));
    } else {
      score += 15;
    }

    // Completion progress impact: up to +25
    score += Math.round((progressPct / 100) * 25);

    // Penalties for risks
    score -= taskAnalysis.held.length * 10;
    score -= taskAnalysis.overdue.length * 8;
    score -= taskAnalysis.unstaffed.length * 4;

    const finalScore = Math.max(15, Math.min(100, score));
    let label = 'On Track';
    let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let barColor = 'bg-emerald-500';

    if (finalScore < 60) {
      label = 'Critical Attention';
      colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
      barColor = 'bg-rose-500';
    } else if (finalScore < 80) {
      label = 'Moderate Risk';
      colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
      barColor = 'bg-amber-500';
    }

    return { score: finalScore, label, colorClass, barColor };
  }, [bufferRemaining, projectTimeBuffer, progressPct, taskAnalysis]);

  // Financial Calculations
  const financials = useMemo(() => {
    if (!project) return null;

    const initialDep = project.initialDeposit || 0;
    const finalDep = project.finalDeposit || 0;
    const settlement = project.settlementFigure || 0;
    const soft = project.softCost || 0;
    const holding = project.holdingCost || 0;
    const build = project.buildCost || 0;
    const sale = project.salePrice || 0;

    // Milestone figures: Initial high-level estimate
    const milestoneCostsK = initialDep + finalDep + settlement + soft + holding + build;
    const milestoneInflowK = sale;
    const milestoneNetK = milestoneInflowK - milestoneCostsK;
    const milestoneMarginPct = milestoneInflowK > 0 ? Math.round((milestoneNetK / milestoneInflowK) * 100) : 0;

    // Progressive itemized tracking: separate and not added to milestones
    const customExpensesK = (project.expenses || []).reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0) / 1000;
    const customIncomesK = (project.incomes || []).reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0) / 1000;
    const paidExpensesK = (project.expenses || []).filter(e => e.status === 'paid').reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0) / 1000;
    const paidIncomesK = (project.incomes || []).filter(i => i.status === 'paid').reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0) / 1000;
    const progressiveNetK = customIncomesK - customExpensesK;

    // Upcoming cash flow transactions sorted chronologically
    const milestoneTxs = [
      { name: 'Initial Deposit', amountK: initialDep, date: project.initialDepositDate, type: 'outflow', source: 'milestone' },
      { name: 'Final Deposit', amountK: finalDep, date: project.finalDepositDate, type: 'outflow', source: 'milestone' },
      { name: 'Settlement Figure', amountK: settlement, date: project.settlementDate, type: 'outflow', source: 'milestone' },
      { name: 'Soft Cost', amountK: soft, date: project.softCostDate, type: 'outflow', source: 'milestone' },
      { name: 'Holding Cost', amountK: holding, date: project.holdingCostDate, type: 'outflow', notes: project.holdingCostNotes, source: 'milestone' },
      { name: 'Build Cost', amountK: build, date: project.buildCostDate, type: 'outflow', builder: project.builderName, source: 'milestone' },
      { name: 'Sale Price', amountK: sale, date: project.salePriceDate, type: 'inflow', source: 'milestone' },
    ].filter(t => t.amountK > 0 || t.date);

    const customIncomeTxs = (project.incomes || []).map(inc => ({
      name: inc.description || inc.category || 'Income',
      amountK: (Number(inc.amount) || 0) / 1000,
      date: inc.date,
      type: 'inflow',
      status: inc.status || 'projected',
      source: 'itemized'
    })).filter(t => t.amountK > 0 || t.date);

    const customExpenseTxs = (project.expenses || []).map(exp => ({
      name: exp.description || exp.category || 'Expense',
      amountK: (Number(exp.amount) || 0) / 1000,
      date: exp.date,
      type: 'outflow',
      status: exp.status || 'projected',
      source: 'itemized'
    })).filter(t => t.amountK > 0 || t.date);

    const transactions = [...milestoneTxs, ...customIncomeTxs, ...customExpenseTxs];

    transactions.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

    const nextUpcoming = transactions.find(t => t.date && t.date >= new Date().toISOString().split('T')[0]) || transactions[0];

    return {
      initialDep, finalDep, settlement, soft, holding, build, sale,
      milestoneCostsK, milestoneInflowK, milestoneNetK, milestoneMarginPct,
      customExpensesK, customIncomesK, paidExpensesK, paidIncomesK, progressiveNetK,
      milestoneTxs, customIncomeTxs, customExpenseTxs,
      transactions, nextUpcoming
    };
  }, [project]);

  // Dynamic AI & Heuristic Project Insights
  const dynamicInsights = useMemo(() => {
    const list: string[] = [];

    if (taskAnalysis.held.length > 0) {
      list.push(`⚠️ ${taskAnalysis.held.length} task${taskAnalysis.held.length > 1 ? 's are' : ' is'} currently Held. Review blocker reasons in the Risks tab.`);
    }

    if (taskAnalysis.overdue.length > 0) {
      list.push(`🚨 ${taskAnalysis.overdue.length} task${taskAnalysis.overdue.length > 1 ? 's are' : ' is'} past due date and require immediate rescheduling or completion.`);
    }

    if (bufferRemaining < 0) {
      list.push(`⏱️ Project time buffer is depleted by ${Math.abs(bufferRemaining)} ${projectTimeUnit}. Consider fast-tracking dependent milestones.`);
    } else if (bufferRemaining > 0 && bufferRemaining <= 3) {
      list.push(`⏳ Time buffer is running thin (${bufferRemaining} ${projectTimeUnit} remaining). Monitor critical path closely.`);
    }

    if (financials && financials.build > 0 && !project?.builderName) {
      list.push(`🔨 Build Cost allocated ($${financials.build}k), but builder contractor has not yet been appointed.`);
    }

    if (taskAnalysis.unstaffed.length > 0) {
      list.push(`👤 ${taskAnalysis.unstaffed.length} task${taskAnalysis.unstaffed.length > 1 ? 's have' : ' has'} roles assigned but remain unstaffed.`);
    }

    if (list.length === 0) {
      list.push(`✨ Project is executing smoothly! All milestones are pacing toward ${formatDate(stats.finishDate)}.`);
      if (financials && financials.netCashFlowK > 0) {
        list.push(`📈 Financial projections show a healthy projected net return of $${financials.netCashFlowK}k (${financials.marginPct}% margin).`);
      }
    }

    return list;
  }, [taskAnalysis, bufferRemaining, projectTimeUnit, financials, project, formatDate, stats.finishDate]);

  const totalRisksCount = taskAnalysis.held.length + taskAnalysis.overdue.length + taskAnalysis.unstaffed.length;

  return (
    <div className="hidden lg:flex w-[370px] bg-white border-l border-slate-200 shrink-0 flex-col z-30 shadow-xl shadow-slate-200/50 print:hidden h-full">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              Project Intelligence
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[200px]">
              {project?.name || 'Active Project Analysis'}
            </p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Collapse Intelligence Panel"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Composite Health Score Banner */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Activity size={12} className="text-indigo-600" /> Health Index
          </span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${healthMetrics.colorClass}`}>
            {healthMetrics.score}% • {healthMetrics.label}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${healthMetrics.barColor}`} 
            style={{ width: `${healthMetrics.score}%` }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 px-3 pt-2 shrink-0 gap-1 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-1 text-center font-bold text-[11px] rounded-t-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Calendar size={13} />
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`flex-1 py-2 px-1 text-center font-bold text-[11px] rounded-t-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'financials'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Banknote size={13} />
          <span>Financials</span>
        </button>

        <button
          onClick={() => setActiveTab('risks')}
          className={`flex-1 py-2 px-1 text-center font-bold text-[11px] rounded-t-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'risks'
              ? 'bg-white text-rose-600 border-t-2 border-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert size={13} />
          <span>Risks</span>
          {totalRisksCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
              {totalRisksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-2 px-1 text-center font-bold text-[11px] rounded-t-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'team'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Users size={13} />
          <span>Team</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* ===================== TAB 1: OVERVIEW / TIMELINE ===================== */}
        {activeTab === 'overview' && (
          <>
            {/* Timeline Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-slate-800 font-bold text-xs uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" /> Timeline & Velocity
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">
                  Critical Path
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Est. Duration</span>
                  <span className="text-sm font-black text-slate-900 capitalize">
                    {stats.totalEstimatedInUnit} {projectTimeUnit}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Target Finish</span>
                  <span className="text-sm font-black text-indigo-950">
                    {formatDate(stats.finishDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Time Buffer Health Gauge */}
            <div className={`rounded-2xl p-4 border shadow-xs space-y-3 ${bufferBg}`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${bufferColor} font-bold text-xs uppercase tracking-wider`}>
                  <Activity size={14} /> Time Buffer Analysis
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  bufferRemaining < 0 ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {bufferRemaining >= 0 ? `${bufferRemaining} ${projectTimeUnit?.[0] || 'd'} Safe` : 'Deficit'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/70 p-2 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">Allocated</span>
                  <span className="text-sm font-black text-slate-800 capitalize">{projectTimeBuffer} {projectTimeUnit?.[0] || 'd'}</span>
                </div>
                <div className="bg-white/70 p-2 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">Consumed</span>
                  <span className="text-sm font-black text-slate-800 capitalize">{stats.bufferUsedInUnit} {projectTimeUnit?.[0] || 'd'}</span>
                </div>
                <div className="bg-white/70 p-2 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">Remaining</span>
                  <span className={`text-sm font-black capitalize ${bufferColor}`}>
                    {bufferRemaining} {projectTimeUnit?.[0] || 'd'}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Progress Section */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Overall Execution</span>
                  <span className="text-xs text-slate-400 font-medium">
                    {stats.completedTasks} of {stats.totalTasks} tasks complete
                  </span>
                </div>
                <span className="text-xl font-black text-slate-900">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 h-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Status Breakdown Mini Bars */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-indigo-600" /> Status Distribution
              </span>
              <div className="space-y-2">
                {(settings.statuses || []).map(status => {
                  const count = stats.statusCount[status] || 0;
                  const pct = Math.round((count / (stats.totalTasks || 1)) * 100);
                  const color = getStatusBorderColor(status);
                  return (
                    <div key={status} className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          {status}
                        </span>
                        <span className="text-slate-500">{count} <span className="text-[10px] font-normal text-slate-400">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%`, backgroundColor: color }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Strategic Intelligence Insights */}
            <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Wand2 size={13} className="text-indigo-600" /> Strategic Briefing
                </h4>
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  Live Engine
                </span>
              </div>
              <ul className="space-y-2">
                {dynamicInsights.map((insight, idx) => (
                  <li key={idx} className="text-xs text-indigo-950 leading-relaxed font-medium flex items-start gap-2">
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* ===================== TAB 2: FINANCIALS & COSTS ===================== */}
        {activeTab === 'financials' && (
          <div className="space-y-4">
            {financials ? (
              <>
                {/* Financial Perspective Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFinancialSubTab('milestones')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      financialSubTab === 'milestones'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Milestones (Estimate)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinancialSubTab('progressive')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      financialSubTab === 'progressive'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Banknote size={13} />
                    <span>Progressive Items</span>
                  </button>
                </div>

                {/* Sub-Tab 1: Milestones (Initial High-Level Estimate) */}
                {financialSubTab === 'milestones' && (
                  <div className="space-y-4">
                    {/* Net Return & Margin Card */}
                    <div className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
                      financials.milestoneNetK >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Initial Milestone Estimate Return
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          financials.milestoneNetK >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {financials.milestoneMarginPct}% Margin
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Projected Milestone Yield</span>
                        <div className={`text-2xl font-black ${
                          financials.milestoneNetK >= 0 ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {financials.milestoneNetK >= 0 ? '+' : '-'}${Math.abs(financials.milestoneNetK).toLocaleString()}k
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ${(Math.abs(financials.milestoneNetK) * 1000).toLocaleString()} expected net profit
                        </span>
                      </div>
                    </div>

                    {/* Milestone Capital Flow Overview (Inflows vs Outflows) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3">
                        <div className="flex items-center gap-1 text-[10px] font-black text-rose-700 uppercase mb-1">
                          <ArrowUpRight size={12} /> Expected Costs
                        </div>
                        <div className="text-lg font-black text-rose-950">
                          ${financials.milestoneCostsK.toLocaleString()}k
                        </div>
                        <span className="text-[10px] text-rose-600 font-medium">Build, Holding & Deposits</span>
                      </div>

                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3">
                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 uppercase mb-1">
                          <ArrowDownLeft size={12} /> Expected Revenue
                        </div>
                        <div className="text-lg font-black text-emerald-950">
                          ${financials.milestoneInflowK.toLocaleString()}k
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">Sale / Exit Price</span>
                      </div>
                    </div>

                    {/* Dedicated Build Cost Focus Card */}
                    <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <Hammer size={14} className="text-amber-600" />
                          <span>Build & Construction Cost</span>
                        </div>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          Hard Cost
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div className="text-xl font-black text-amber-950">
                          {financials.build > 0 ? `$${financials.build.toLocaleString()}k` : 'Not Specified'}
                        </div>
                        {financials.build > 0 && (
                          <span className="text-xs text-amber-700 font-semibold">
                            ${(financials.build * 1000).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-amber-200/60 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target Milestone:</span>
                          <span className="font-bold text-slate-700">{project?.buildCostDate ? formatDate(project.buildCostDate) : 'No date set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Appointed Builder:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">{project?.builderName || 'Unassigned'}</span>
                        </div>
                        {project?.buildCostNotes && (
                          <div className="text-[10px] text-slate-500 italic mt-1 bg-white/60 p-1.5 rounded">
                            "{project.buildCostNotes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Full Milestone Breakdown Items Table */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Milestone Figures Breakdown
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Initial Deposit</span>
                          <span className="font-bold text-slate-900">${financials.initialDep}k</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Final Deposit</span>
                          <span className="font-bold text-slate-900">${financials.finalDep}k</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Settlement Figure</span>
                          <span className="font-bold text-slate-900">${financials.settlement}k</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Soft Cost</span>
                          <span className="font-bold text-slate-900">${financials.soft}k</span>
                        </div>
                        {financials.holding > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-600 font-medium">Holding Cost</span>
                            <span className="font-bold text-slate-900">${financials.holding}k</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-amber-800 font-bold flex items-center gap-1">
                            <Hammer size={11} className="text-amber-600" /> Build Cost
                          </span>
                          <span className="font-black text-amber-900">${financials.build}k</span>
                        </div>
                        <div className="flex justify-between items-center py-1 pt-1.5 border-t border-slate-200 font-bold text-slate-900">
                          <span>Total Expected Costs</span>
                          <span>${financials.milestoneCostsK.toLocaleString()}k</span>
                        </div>
                      </div>
                    </div>

                    {/* Capital Requirements Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Cash Required</span>
                        <span className="text-sm font-black text-slate-800">${project?.cashRequirement || 0}k</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Debt Required</span>
                        <span className="text-sm font-black text-slate-800">${project?.debtRequirement || 0}k</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Value at Comp</span>
                        <span className="text-sm font-black text-slate-800">${project?.valueAtCompletion || 0}k</span>
                      </div>
                      <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                        <span className="text-[9px] font-black text-emerald-700 uppercase block">Target Profit</span>
                        <span className="text-sm font-black text-emerald-900">${project?.profit || 0}k</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Progressive Items (Itemized Income & Expenses) */}
                {financialSubTab === 'progressive' && (
                  <div className="space-y-4">
                    {/* Progressive Net Flow Card */}
                    <div className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
                      financials.progressiveNetK >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Progressive Net Cash Flow
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                          {(project?.incomes || []).length + (project?.expenses || []).length} Line Items
                        </span>
                      </div>
                      <div>
                        <div className={`text-2xl font-black ${
                          financials.progressiveNetK >= 0 ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {financials.progressiveNetK >= 0 ? '+' : '-'}${Math.abs(financials.progressiveNetK).toFixed(1)}k
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Itemized cash position (separate from milestone estimates)
                        </span>
                      </div>
                    </div>

                    {/* Inflows vs Outflows Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3">
                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 uppercase mb-1">
                          <ArrowDownLeft size={12} /> Total Incomes
                        </div>
                        <div className="text-base font-black text-emerald-950">
                          ${financials.customIncomesK.toFixed(1)}k
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          ${financials.paidIncomesK.toFixed(1)}k paid / ${(financials.customIncomesK - financials.paidIncomesK).toFixed(1)}k projected
                        </span>
                      </div>

                      <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3">
                        <div className="flex items-center gap-1 text-[10px] font-black text-rose-700 uppercase mb-1">
                          <ArrowUpRight size={12} /> Total Expenses
                        </div>
                        <div className="text-base font-black text-rose-950">
                          ${financials.customExpensesK.toFixed(1)}k
                        </div>
                        <span className="text-[10px] text-rose-600 font-medium">
                          ${financials.paidExpensesK.toFixed(1)}k paid / ${(financials.customExpensesK - financials.paidExpensesK).toFixed(1)}k projected
                        </span>
                      </div>
                    </div>

                    {/* Progressive Line Items List */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Progressive Entries ({(project?.incomes || []).length + (project?.expenses || []).length})
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          Projected vs Paid
                        </span>
                      </div>

                      {(project?.incomes || []).length === 0 && (project?.expenses || []).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4 italic">
                          No progressive income or expense items entered yet.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {(project?.incomes || []).map((inc) => (
                            <div key={inc.id} className="flex justify-between items-center py-1 px-2 bg-white rounded-lg border border-slate-200/60 text-xs">
                              <div className="truncate mr-2">
                                <span className="font-bold text-slate-800 block truncate">{inc.description || inc.category || 'Income'}</span>
                                <span className="text-[10px] text-slate-400">{inc.date || 'No date'}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-emerald-700 block">+${((Number(inc.amount) || 0) / 1000).toFixed(1)}k</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                                  inc.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {inc.status === 'paid' ? 'Paid' : 'Projected'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {(project?.expenses || []).map((exp) => (
                            <div key={exp.id} className="flex justify-between items-center py-1 px-2 bg-white rounded-lg border border-slate-200/60 text-xs">
                              <div className="truncate mr-2">
                                <span className="font-bold text-slate-800 block truncate">{exp.description || exp.category || 'Expense'}</span>
                                <span className="text-[10px] text-slate-400">{exp.date || 'No date'}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-rose-700 block">-${((Number(exp.amount) || 0) / 1000).toFixed(1)}k</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                                  exp.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {exp.status === 'paid' ? 'Paid' : 'Projected'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit Financials Action Button */}
                {onEditProject && (
                  <button
                    onClick={() => onEditProject(project)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Banknote size={14} />
                    <span>Edit Project Costs in Settings</span>
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                No financial projections configured.
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: RISKS & BLOCKERS ===================== */}
        {activeTab === 'risks' && (
          <div className="space-y-5">
            {/* Risk Counters Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className={`p-3 rounded-xl border ${taskAnalysis.held.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Held Tasks</span>
                  <AlertCircle size={14} className={taskAnalysis.held.length > 0 ? 'text-rose-600' : 'text-slate-400'} />
                </div>
                <div className={`text-xl font-black ${taskAnalysis.held.length > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {taskAnalysis.held.length}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${taskAnalysis.overdue.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Overdue Tasks</span>
                  <Clock size={14} className={taskAnalysis.overdue.length > 0 ? 'text-amber-600' : 'text-slate-400'} />
                </div>
                <div className={`text-xl font-black ${taskAnalysis.overdue.length > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                  {taskAnalysis.overdue.length}
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Unstaffed Roles</span>
                  <Briefcase size={14} className="text-slate-400" />
                </div>
                <div className="text-xl font-black text-slate-800">
                  {taskAnalysis.unstaffed.length}
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Signoff Pending</span>
                  <CheckCircle2 size={14} className="text-slate-400" />
                </div>
                <div className="text-xl font-black text-slate-800">
                  {taskAnalysis.pendingApprovals.length}
                </div>
              </div>
            </div>

            {/* Held / Blocked Tasks Radar */}
            <div className="space-y-2.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-500" /> Active Blockers ({taskAnalysis.held.length})
              </span>
              {taskAnalysis.held.length === 0 ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 text-center text-xs text-emerald-800 font-medium">
                  ✨ No held tasks. Workflows are flowing smoothly.
                </div>
              ) : (
                <div className="space-y-2">
                  {taskAnalysis.held.map(({ task, milestoneId, milestoneName, subtaskIndex }) => (
                    <div 
                      key={task.id}
                      onClick={() => onTaskClick?.(milestoneId, subtaskIndex)}
                      className="bg-white border-2 border-rose-200 hover:border-rose-400 rounded-xl p-3 shadow-xs transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                          {task.name}
                        </span>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-rose-600 shrink-0" />
                      </div>
                      <div className="text-[10px] text-slate-400 mb-1.5 font-medium">
                        Milestone: {milestoneName}
                      </div>
                      {task.holdQuestion && (
                        <div className="bg-rose-50 rounded-lg p-2 text-rose-900 text-xs font-medium leading-snug">
                          <span className="font-bold">Blocker Question:</span> {task.holdQuestion}
                        </div>
                      )}
                      {task.holdOwner && (
                        <div className="text-[10px] text-slate-500 font-semibold mt-1">
                          Owner waiting on: <span className="text-rose-700">{task.holdOwner}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue Tasks Radar */}
            <div className="space-y-2.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-amber-600" /> Overdue Tasks ({taskAnalysis.overdue.length})
              </span>
              {taskAnalysis.overdue.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500">
                  No overdue tasks. All deadlines are within schedule.
                </div>
              ) : (
                <div className="space-y-2">
                  {taskAnalysis.overdue.slice(0, 5).map(({ task, milestoneId, subtaskIndex, daysOverdue }) => (
                    <div 
                      key={task.id}
                      onClick={() => onTaskClick?.(milestoneId, subtaskIndex)}
                      className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-2.5 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700 truncate">
                          {task.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Assigned to: {task.assignedTo || 'Unassigned'}
                        </div>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                        {daysOverdue}d late
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 4: TEAM & WORKLOAD ===================== */}
        {activeTab === 'team' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" /> Team Workload
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {Object.keys(taskAnalysis.assignees).length} Members
              </span>
            </div>

            {/* Assignee Workload List */}
            <div className="space-y-3">
              {Object.entries(taskAnalysis.assignees).map(([member, rawData]) => {
                const data = rawData as { total: number; completed: number; open: number; totalEstimatedTime: number };
                const memberPct = Math.round((data.completed / (data.total || 1)) * 100);
                const isUnassigned = member === 'Unassigned';

                return (
                  <div key={member} className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          isUnassigned ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          <User size={12} />
                        </div>
                        <div>
                          <span className={`text-xs font-bold block ${isUnassigned ? 'text-amber-800' : 'text-slate-900'}`}>
                            {member}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {data.completed}/{data.total} tasks
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isUnassigned ? 'bg-amber-500' : 'bg-indigo-600'}`} 
                        style={{ width: `${memberPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>{data.open} open</span>
                      <span>{data.totalEstimatedTime > 0 ? `${data.totalEstimatedTime} ${projectTimeUnit} total` : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unstaffed Tasks Notice */}
            {taskAnalysis.unstaffed.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Briefcase size={14} className="text-amber-600" />
                  <span>Unstaffed Tasks ({taskAnalysis.unstaffed.length})</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  These tasks have designated roles but are not assigned to a team member yet:
                </p>
                <div className="space-y-1">
                  {taskAnalysis.unstaffed.slice(0, 4).map(({ task, milestoneId, subtaskIndex }) => (
                    <div 
                      key={task.id}
                      onClick={() => onTaskClick?.(milestoneId, subtaskIndex)}
                      className="bg-white/80 p-2 rounded-lg text-xs font-bold text-slate-800 flex justify-between items-center cursor-pointer hover:bg-white"
                    >
                      <span className="truncate pr-2">{task.name}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                        {task.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
