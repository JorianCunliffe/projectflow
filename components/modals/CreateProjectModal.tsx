import React, { useState } from 'react';
import { Wand2, Banknote, Copy, X, Plus, Trash2, ExternalLink, ArrowDownLeft, ArrowUpRight, Layers, Clock, Hammer } from 'lucide-react';
import { AppSettings, ProjectType, Project, CashFlowItem } from '../../types';
import { migrateLegacyFinancialsToCashFlow } from '../../services/cashFlowExcelService';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  isGenerating: boolean;
  onCreate: (projectData: any, useAI: boolean) => void;
  archivedProjects: Project[];
  activeProjects: Project[];
  onReinstate: (projectId: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, onClose, settings, isGenerating, onCreate, archivedProjects, activeProjects, onReinstate 
}) => {
  const [cashFlowTab, setCashFlowTab] = useState<'milestones' | 'income' | 'expenses'>('milestones');
  const [newProject, setNewProject] = useState({ 
    name: '', 
    company: '', 
    type: '', 
    folder: '',
    cloneFromId: '',
    startDate: new Date().toISOString().split('T')[0],
    timeUnit: 'days',
    timeBuffer: 0,
    cashRequirement: 0,
    debtRequirement: 0,
    valueAtCompletion: 0,
    profit: 0,
    // Milestone Initial Estimates (separate from progressive items)
    salePrice: undefined as number | undefined,
    salePriceDate: '',
    initialDeposit: undefined as number | undefined,
    initialDepositDate: '',
    finalDeposit: undefined as number | undefined,
    finalDepositDate: '',
    settlementFigure: undefined as number | undefined,
    settlementDate: '',
    softCost: undefined as number | undefined,
    softCostDate: '',
    holdingCost: undefined as number | undefined,
    holdingCostDate: '',
    holdingCostNotes: '',
    buildCost: undefined as number | undefined,
    buildCostDate: '',
    builderName: '',
    buildCostNotes: '',
    incomes: [] as CashFlowItem[],
    expenses: [] as CashFlowItem[]
  });

  // Income Handlers
  const handleAddIncome = () => {
    const newItem: CashFlowItem = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: 'Sales',
      description: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      gstType: 'INC',
      status: 'projected',
      link: ''
    };
    setNewProject(prev => ({
      ...prev,
      incomes: [...(prev.incomes || []), newItem]
    }));
  };

  const handleUpdateIncome = (id: string, updates: Partial<CashFlowItem>) => {
    setNewProject(prev => ({
      ...prev,
      incomes: (prev.incomes || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveIncome = (id: string) => {
    setNewProject(prev => ({
      ...prev,
      incomes: (prev.incomes || []).filter(item => item.id !== id)
    }));
  };

  // Expense Handlers
  const handleAddExpense = () => {
    const newItem: CashFlowItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: 'Civil Works',
      description: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      gstType: 'INC',
      status: 'projected',
      link: ''
    };
    setNewProject(prev => ({
      ...prev,
      expenses: [...(prev.expenses || []), newItem]
    }));
  };

  const handleUpdateExpense = (id: string, updates: Partial<CashFlowItem>) => {
    setNewProject(prev => ({
      ...prev,
      expenses: (prev.expenses || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveExpense = (id: string) => {
    setNewProject(prev => ({
      ...prev,
      expenses: (prev.expenses || []).filter(item => item.id !== id)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative border border-slate-200 animate-in fade-in zoom-in duration-200">
        {isGenerating && (
          <div className="absolute inset-0 bg-white/90 z-30 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300 rounded-3xl">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 border border-indigo-100 relative">
              <Wand2 className="w-10 h-10 text-indigo-600 animate-bounce" />
              <div className="absolute inset-0 rounded-3xl ring-4 ring-indigo-500/20 animate-ping" />
            </div>
            <p className="text-slate-900 font-black text-xl mb-2">Gemini is Strategizing...</p>
            <p className="text-slate-500 text-sm font-medium">Constructing a dependency map and detailed subtask hierarchy for your project.</p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <h3 className="text-2xl font-black text-slate-900">Start New Project</h3>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project Identity</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 font-bold placeholder-slate-300 transition-all"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g. Skyline Towers Phase 1"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Company</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={newProject.company} onChange={(e) => setNewProject({ ...newProject, company: e.target.value })}>
                <option value="">Select...</option>
                {(settings.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={newProject.type} onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}>
                <option value="">Select...</option>
                {(settings.projectTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Folder / Workspace</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={newProject.folder} onChange={(e) => setNewProject({ ...newProject, folder: e.target.value })}>
                <option value="">None (Ungrouped)</option>
                {(settings.folders || ['Residential', 'Commercial', 'Civil & Land', 'Completed']).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Copy size={12}/> Clone From Existing Project (Optional)</label>
              <select 
                className="w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-indigo-900 font-bold shadow-sm transition-all" 
                value={newProject.cloneFromId} 
                onChange={(e) => {
                  const cId = e.target.value;
                  if (!cId) {
                    setNewProject(prev => ({ ...prev, cloneFromId: '' }));
                    return;
                  }
                  const source = [...activeProjects, ...archivedProjects].find(p => p.id === cId);
                  if (source) {
                    const { incomes, expenses } = migrateLegacyFinancialsToCashFlow(source);
                    setNewProject(prev => ({
                      ...prev,
                      cloneFromId: cId,
                      company: source.company || prev.company,
                      type: source.type || prev.type,
                      folder: source.folder || prev.folder,
                      timeUnit: source.timeUnit || prev.timeUnit,
                      timeBuffer: source.timeBuffer || prev.timeBuffer,
                      cashRequirement: source.cashRequirement || 0,
                      debtRequirement: source.debtRequirement || 0,
                      valueAtCompletion: source.valueAtCompletion || 0,
                      profit: source.profit || 0,
                      incomes: incomes.map(inc => ({ ...inc, id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, gstType: inc.gstType || 'INC' })),
                      expenses: expenses.map(exp => ({ ...exp, id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, gstType: exp.gstType || 'INC' }))
                    }));
                  }
                }}
              >
                <option value="">Do not clone...</option>
                {activeProjects.length > 0 && (
                  <optgroup label="Active Projects">
                    {activeProjects.map(p => <option key={p.id} value={p.id}>{p.displayId} - {p.name}</option>)}
                  </optgroup>
                )}
                {archivedProjects.length > 0 && (
                  <optgroup label="Archived Projects">
                    {archivedProjects.map(p => <option key={p.id} value={p.id}>{p.displayId} - {p.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
                value={newProject.startDate}
                onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estimates Time Unit</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
                value={newProject.timeUnit}
                onChange={(e) => setNewProject({ ...newProject, timeUnit: e.target.value })}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Time Buffer ({newProject.timeUnit})</label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
                value={newProject.timeBuffer || ''}
                onChange={(e) => setNewProject({ ...newProject, timeBuffer: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                <Banknote size={16} /> Financial Overview (in $'000s)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cash Required ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:border-indigo-500"
                    value={newProject.cashRequirement || ''}
                    onChange={(e) => setNewProject({ ...newProject, cashRequirement: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Debt Required ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:border-indigo-500"
                    value={newProject.debtRequirement || ''}
                    onChange={(e) => setNewProject({ ...newProject, debtRequirement: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Value at Comp ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:border-indigo-500"
                    value={newProject.valueAtCompletion || ''}
                    onChange={(e) => setNewProject({ ...newProject, valueAtCompletion: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Profit ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-800 font-bold text-sm outline-none focus:border-emerald-500"
                    value={newProject.profit || ''}
                    onChange={(e) => setNewProject({ ...newProject, profit: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Cash Flow Projections */}
            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Banknote size={14} className="text-emerald-600" /> Cash Flow Projections (Dates & Amounts)
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                  Feeds into Cash Flow Report
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Track projected revenues, milestone deposits, and itemized project expenses with GST options and document links.
              </p>

              {/* Datalists for categories */}
              <datalist id="create-income-categories">
                <option value="Sales" />
                <option value="Progress Payment" />
                <option value="Deposit" />
                <option value="Grant" />
                <option value="Rental" />
                <option value="Equity" />
                <option value="Refund" />
                <option value="Other" />
              </datalist>

              <datalist id="create-expense-categories">
                <option value="Civil Works" />
                <option value="Council Fees" />
                <option value="Materials" />
                <option value="Subcontractor" />
                <option value="Consultant / Engineering" />
                <option value="Legal" />
                <option value="Marketing" />
                <option value="Settlement" />
                <option value="Demolition" />
                <option value="Utilities" />
                <option value="Insurance" />
                <option value="Other" />
              </datalist>

              {/* Cash Flow Filter Tabs and Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setCashFlowTab('milestones')}
                    className={`py-1.5 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      cashFlowTab === 'milestones'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers size={13} className="text-indigo-600" />
                    <span>Milestones (Initial Estimate)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFlowTab('income')}
                    className={`py-1.5 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      cashFlowTab === 'income'
                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownLeft size={13} className="text-emerald-600" />
                    <span>Projected Income ({ (newProject.incomes || []).length })</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFlowTab('expenses')}
                    className={`py-1.5 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      cashFlowTab === 'expenses'
                        ? 'bg-white text-rose-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpRight size={13} className="text-rose-600" />
                    <span>Projected Expenses ({ (newProject.expenses || []).length })</span>
                  </button>
                </div>

                {/* Context-Sensitive Add Buttons */}
                <div className="flex items-center gap-2">
                  {cashFlowTab === 'income' && (
                    <button
                      type="button"
                      onClick={handleAddIncome}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Income</span>
                    </button>
                  )}
                  {cashFlowTab === 'expenses' && (
                    <button
                      type="button"
                      onClick={handleAddExpense}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Expense</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ==================== TAB 1: MILESTONES (INITIAL ESTIMATE) ==================== */}
              {cashFlowTab === 'milestones' && (
                <div className="space-y-4 mb-6 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100">
                  <div className="flex items-start justify-between pb-3 border-b border-indigo-100">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Layers size={17} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-indigo-950 uppercase tracking-wider">Milestone Figures (Initial High-Level Estimate)</span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                            Expected Overall Income & Costs
                          </span>
                        </div>
                        <span className="text-xs text-indigo-800/80 font-medium block mt-0.5">
                          Initial high-level expected overall costs (including holding costs) and revenue. Kept strictly separate from progressive itemized lines.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 1. Milestone Inflow: Anticipated Sale Price */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowDownLeft size={13} className="text-emerald-600" /> Expected Overall Revenue / Inflow
                    </span>
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          Anticipated Sale Price (Completion / Exit)
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">Expected project gross revenue</span>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-black text-emerald-800 uppercase mb-0.5">Amount ($'000s)</label>
                        <input 
                          type="number" 
                          className="w-full bg-emerald-50/40 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-emerald-950 font-bold outline-none focus:border-emerald-600"
                          value={newProject.salePrice ?? ''}
                          onChange={(e) => setNewProject({ ...newProject, salePrice: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 1500 ($1.5M)"
                        />
                        {newProject.salePrice !== undefined && newProject.salePrice > 0 && (
                          <span className="text-[9px] text-emerald-700 font-medium">+${(newProject.salePrice * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-black text-emerald-800 uppercase mb-0.5">Estimated Date / Settlement</label>
                        <input 
                          type="date" 
                          className="w-full bg-emerald-50/40 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-emerald-600"
                          value={newProject.salePriceDate || ''}
                          onChange={(e) => setNewProject({ ...newProject, salePriceDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Milestone Outflows: Key Expected Milestone Costs */}
                  <div className="space-y-2.5 pt-2 border-t border-indigo-100">
                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpRight size={13} className="text-rose-600" /> Expected Overall Milestone Costs & Outflows
                    </span>

                    {/* 1. Initial Deposit */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-4">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> Initial Deposit
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Upfront project deposit</span>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Amount ($'000s)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.initialDeposit ?? ''}
                          onChange={(e) => setNewProject({ ...newProject, initialDeposit: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 50 ($50k)"
                        />
                        {newProject.initialDeposit !== undefined && newProject.initialDeposit > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(newProject.initialDeposit * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.initialDepositDate || ''}
                          onChange={(e) => setNewProject({ ...newProject, initialDepositDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 2. Final Deposit */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-4">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> Final Deposit
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Second milestone deposit</span>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Amount ($'000s)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.finalDeposit ?? ''}
                          onChange={(e) => setNewProject({ ...newProject, finalDeposit: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 100 ($100k)"
                        />
                        {newProject.finalDeposit !== undefined && newProject.finalDeposit > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(newProject.finalDeposit * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.finalDepositDate || ''}
                          onChange={(e) => setNewProject({ ...newProject, finalDepositDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 3. Settlement Figure */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-4">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> Settlement Figure
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Settlement payment</span>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Amount ($'000s)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.settlementFigure ?? ''}
                          onChange={(e) => setNewProject({ ...newProject, settlementFigure: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 750 ($750k)"
                        />
                        {newProject.settlementFigure !== undefined && newProject.settlementFigure > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(newProject.settlementFigure * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.settlementDate || ''}
                          onChange={(e) => setNewProject({ ...newProject, settlementDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 4. Soft Cost */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-4">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> Soft Cost
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Consultants, permits, legal</span>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Amount ($'000s)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.softCost ?? ''}
                          onChange={(e) => setNewProject({ ...newProject, softCost: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 120 ($120k)"
                        />
                        {newProject.softCost !== undefined && newProject.softCost > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(newProject.softCost * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={newProject.softCostDate || ''}
                          onChange={(e) => setNewProject({ ...newProject, softCostDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 5. Holding Cost */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        <div className="sm:col-span-4">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-600 shrink-0" /> Holding Cost
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Interest, rates, land tax & maintenance</span>
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Amount ($'000s)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                            value={newProject.holdingCost ?? ''}
                            onChange={(e) => setNewProject({ ...newProject, holdingCost: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 35 ($35k)"
                          />
                          {newProject.holdingCost !== undefined && newProject.holdingCost > 0 && (
                            <span className="text-[9px] text-rose-600 font-medium">-${(newProject.holdingCost * 1000).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date / Period</label>
                          <input 
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                            value={newProject.holdingCostDate || ''}
                            onChange={(e) => setNewProject({ ...newProject, holdingCostDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Holding Cost Notes (Optional)</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
                          value={newProject.holdingCostNotes || ''}
                          onChange={(e) => setNewProject({ ...newProject, holdingCostNotes: e.target.value })}
                          placeholder="e.g. Construction loan interest + quarterly council rates"
                        />
                      </div>
                    </div>

                    {/* 6. Build Cost */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        <div className="sm:col-span-4">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Hammer size={13} className="text-amber-600 shrink-0" /> Build Cost
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Construction & contract hard cost</span>
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Amount ($'000s)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                            value={newProject.buildCost ?? ''}
                            onChange={(e) => setNewProject({ ...newProject, buildCost: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 850 ($850k)"
                          />
                          {newProject.buildCost !== undefined && newProject.buildCost > 0 && (
                            <span className="text-[9px] text-rose-600 font-medium">-${(newProject.buildCost * 1000).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date / Milestone</label>
                          <input 
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                            value={newProject.buildCostDate || ''}
                            onChange={(e) => setNewProject({ ...newProject, buildCostDate: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Builder Name and Build Cost Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-100">
                        <div className="sm:col-span-5">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Builder / Contractor Name</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                            value={newProject.builderName || ''}
                            onChange={(e) => setNewProject({ ...newProject, builderName: e.target.value })}
                            placeholder="e.g. Apex Master Builders"
                          />
                        </div>
                        <div className="sm:col-span-7">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Build Scope / Contract Notes (Optional)</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
                            value={newProject.buildCostNotes || ''}
                            onChange={(e) => setNewProject({ ...newProject, buildCostNotes: e.target.value })}
                            placeholder="e.g. Fixed-price contract, progressive draws"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Estimate Subtotal Banner */}
                  {(() => {
                    const msInflow = (newProject.salePrice || 0);
                    const msOutflow = (newProject.initialDeposit || 0) + 
                      (newProject.finalDeposit || 0) + 
                      (newProject.settlementFigure || 0) + 
                      (newProject.softCost || 0) + 
                      (newProject.holdingCost || 0) + 
                      (newProject.buildCost || 0);
                    const msNet = msInflow - msOutflow;

                    return (
                      <div className="p-3 bg-indigo-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div>
                            <span className="text-indigo-200 block text-[9px] uppercase font-bold tracking-wider">Milestone Revenue</span>
                            <span className="text-emerald-300 font-black text-sm">${msInflow.toLocaleString()}k</span>
                          </div>
                          <div>
                            <span className="text-indigo-200 block text-[9px] uppercase font-bold tracking-wider">Milestone Costs (incl. Holding)</span>
                            <span className="text-rose-300 font-black text-sm">${msOutflow.toLocaleString()}k</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-indigo-200 block text-[9px] uppercase font-bold tracking-wider">Expected Net Milestone Return</span>
                          <span className={`font-black text-base ${msNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {msNet >= 0 ? '+' : '-'}${Math.abs(msNet).toLocaleString()}k
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ==================== TAB 2: PROJECTED INCOME ==================== */}
              {cashFlowTab === 'income' && (
                <div className="space-y-3 mb-6 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft size={16} className="text-emerald-600" />
                      <div>
                        <span className="text-xs font-black text-emerald-950 uppercase tracking-wider block">Projected Income & Progressive Receipts</span>
                        <span className="text-[10px] text-emerald-700 font-medium">Customer progress claims, grants, and itemized customer receipts (separate from milestone figures)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddIncome}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Income</span>
                    </button>
                  </div>

                  {/* Unified Incomes List */}
                  {(newProject.incomes || []).length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {(newProject.incomes || []).map((item, idx) => (
                        <div 
                          key={item.id || idx} 
                          className="bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl p-3 shadow-xs space-y-2 transition-all"
                        >
                          {/* Row 1: Category, Description, Trash */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-4">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Category</label>
                              <input 
                                list="create-income-categories"
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-emerald-500"
                                value={item.category || ''}
                                onChange={(e) => handleUpdateIncome(item.id, { category: e.target.value })}
                                placeholder="e.g. Sales, Grant"
                              />
                            </div>
                            <div className="sm:col-span-7">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Description</label>
                              <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium outline-none focus:border-emerald-500"
                                value={item.description || ''}
                                onChange={(e) => handleUpdateIncome(item.id, { description: e.target.value })}
                                placeholder="e.g. Stage 1 Settlement, Milestone 2 Payment"
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveIncome(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove Income"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Date, Amount ($), GST option, Status, Link */}
                          <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center pt-1 border-t border-slate-100">
                            <div className="col-span-1 sm:col-span-3">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Date</label>
                              <input 
                                type="date" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold outline-none focus:border-emerald-500"
                                value={item.date || ''}
                                onChange={(e) => handleUpdateIncome(item.id, { date: e.target.value })}
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-3">
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Amount ($)</label>
                                {item.amount > 0 && (
                                  <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                                    {(item.amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k
                                  </span>
                                )}
                              </div>
                              <input 
                                type="number" 
                                className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs text-emerald-900 font-bold outline-none focus:border-emerald-500"
                                value={item.amount === 0 ? '' : item.amount}
                                onChange={(e) => handleUpdateIncome(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">GST</label>
                              <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500 cursor-pointer"
                                value={item.gstType || 'INC'}
                                onChange={(e) => handleUpdateIncome(item.id, { gstType: e.target.value as 'INC' | 'EX' })}
                              >
                                <option value="INC">INC</option>
                                <option value="EX">EX</option>
                              </select>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Status</label>
                              <button
                                type="button"
                                onClick={() => handleUpdateIncome(item.id, { status: (item.status === 'paid' ? 'projected' : 'paid') })}
                                className={`w-full px-2 py-1 rounded-lg text-xs font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                                  item.status === 'paid'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                }`}
                                title="Click to toggle status between Projected and Paid"
                              >
                                {item.status === 'paid' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Paid</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <span>Projected</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="col-span-2 sm:col-span-3 flex items-center gap-1">
                              <div className="flex-1">
                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Link (Doc/URL)</label>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-500"
                                    value={item.link || ''}
                                    onChange={(e) => handleUpdateIncome(item.id, { link: e.target.value })}
                                    placeholder="https://..."
                                  />
                                  {item.link && (
                                    <a 
                                      href={item.link.startsWith('http') ? item.link : `https://${item.link}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                                      title="Open link"
                                    >
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white/70 border border-dashed border-emerald-200 rounded-xl text-center">
                      <p className="text-xs text-slate-500">No progressive income entries configured yet. Click <button type="button" onClick={handleAddIncome} className="text-emerald-700 font-bold hover:underline">+ Add Income</button> to add progressive claims, invoices, or customer receipts.</p>
                    </div>
                  )}

                  {/* Income Tab Summary Banner */}
                  {(() => {
                    const totalInc = (newProject.incomes || []).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
                    const paidInc = (newProject.incomes || []).filter(i => i.status === 'paid').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
                    const projectedInc = totalInc - paidInc;

                    return (
                      <div className="p-3 bg-emerald-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div>
                            <span className="text-emerald-200 block text-[9px] uppercase font-bold tracking-wider">Total Projected Income</span>
                            <span className="text-white font-black text-sm">${(totalInc / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                          <div>
                            <span className="text-emerald-200 block text-[9px] uppercase font-bold tracking-wider">Received / Paid</span>
                            <span className="text-emerald-300 font-black text-sm">${(paidInc / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                          <div>
                            <span className="text-emerald-200 block text-[9px] uppercase font-bold tracking-wider">Remaining Projected</span>
                            <span className="text-emerald-100 font-black text-sm">${(projectedInc / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-200 block text-[9px] uppercase font-bold tracking-wider">Line Items</span>
                          <span className="font-bold text-white">{(newProject.incomes || []).length} items</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ==================== TAB 3: PROJECTED EXPENSES ==================== */}
              {cashFlowTab === 'expenses' && (
                <div className="space-y-3 mb-6 p-4 bg-rose-50/30 rounded-2xl border border-rose-100">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight size={16} className="text-rose-600" />
                      <div>
                        <span className="text-xs font-black text-rose-950 uppercase tracking-wider block">Projected Expenses & Invoices</span>
                        <span className="text-[10px] text-rose-700 font-medium">Subcontractors, materials, engineering, permits & progressive invoices (separate from milestone figures)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddExpense}
                      className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Expense</span>
                    </button>
                  </div>

                  {/* Custom Expenses List */}
                  {(newProject.expenses || []).length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">Itemized Project Expenses</span>
                      {(newProject.expenses || []).map((item, idx) => (
                        <div 
                          key={item.id || idx} 
                          className="bg-white border border-rose-100 hover:border-rose-300 rounded-xl p-3 shadow-xs space-y-2 transition-all"
                        >
                          {/* Row 1: Category, Description, Trash */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-4">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Category</label>
                              <input 
                                list="create-expense-categories"
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-rose-500"
                                value={item.category || ''}
                                onChange={(e) => handleUpdateExpense(item.id, { category: e.target.value })}
                                placeholder="e.g. Civil Works, Materials"
                              />
                            </div>
                            <div className="sm:col-span-7">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Description</label>
                              <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium outline-none focus:border-rose-500"
                                value={item.description || ''}
                                onChange={(e) => handleUpdateExpense(item.id, { description: e.target.value })}
                                placeholder="e.g. Earthmoving & Trenching invoice"
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveExpense(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove Expense"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Date, Amount ($), GST option, Status, Link */}
                          <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center pt-1 border-t border-slate-100">
                            <div className="col-span-1 sm:col-span-3">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Date</label>
                              <input 
                                type="date" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold outline-none focus:border-rose-500"
                                value={item.date || ''}
                                onChange={(e) => handleUpdateExpense(item.id, { date: e.target.value })}
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-3">
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Amount ($)</label>
                                {item.amount > 0 && (
                                  <span className="text-[8px] font-bold text-rose-700 bg-rose-50 px-1 rounded">
                                    {(item.amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k
                                  </span>
                                )}
                              </div>
                              <input 
                                type="number" 
                                className="w-full bg-white border border-rose-200 rounded-lg px-2 py-1 text-xs text-rose-900 font-bold outline-none focus:border-rose-500"
                                value={item.amount === 0 ? '' : item.amount}
                                onChange={(e) => handleUpdateExpense(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">GST</label>
                              <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-xs text-slate-800 font-bold outline-none focus:border-rose-500 cursor-pointer"
                                value={item.gstType || 'INC'}
                                onChange={(e) => handleUpdateExpense(item.id, { gstType: e.target.value as 'INC' | 'EX' })}
                              >
                                <option value="INC">INC</option>
                                <option value="EX">EX</option>
                              </select>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Status</label>
                              <button
                                type="button"
                                onClick={() => handleUpdateExpense(item.id, { status: (item.status === 'paid' ? 'projected' : 'paid') })}
                                className={`w-full px-2 py-1 rounded-lg text-xs font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                                  item.status === 'paid'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                }`}
                                title="Click to toggle status between Projected and Paid"
                              >
                                {item.status === 'paid' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Paid</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <span>Projected</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="col-span-2 sm:col-span-3 flex items-center gap-1">
                              <div className="flex-1">
                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Link (Doc/URL)</label>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-rose-500"
                                    value={item.link || ''}
                                    onChange={(e) => handleUpdateExpense(item.id, { link: e.target.value })}
                                    placeholder="https://..."
                                  />
                                  {item.link && (
                                    <a 
                                      href={item.link.startsWith('http') ? item.link : `https://${item.link}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                                      title="Open link"
                                    >
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white/70 border border-dashed border-rose-200 rounded-xl text-center">
                      <p className="text-xs text-slate-500">No progressive expense entries configured yet. Click <button type="button" onClick={handleAddExpense} className="text-rose-700 font-bold hover:underline">+ Add Expense</button> to add progressive contractor invoices or materials.</p>
                    </div>
                  )}

                  {/* Expense Tab Summary Banner */}
                  {(() => {
                    const totalExp = (newProject.expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
                    const paidExp = (newProject.expenses || []).filter(e => e.status === 'paid').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
                    const projectedExp = totalExp - paidExp;

                    return (
                      <div className="p-3 bg-rose-950 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div>
                            <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Total Projected Expenses</span>
                            <span className="text-white font-black text-sm">${(totalExp / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                          <div>
                            <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Paid Outflows</span>
                            <span className="text-rose-300 font-black text-sm">${(paidExp / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                          <div>
                            <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Remaining Projected</span>
                            <span className="text-rose-100 font-black text-sm">${(projectedExp / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Line Items</span>
                          <span className="font-bold text-white">{(newProject.expenses || []).length} items</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Persistent Side-by-Side Financial Summary (Distinct, NOT Additional) */}
              {(() => {
                const milestoneOutflowK = (newProject.initialDeposit || 0) + 
                  (newProject.finalDeposit || 0) + 
                  (newProject.settlementFigure || 0) + 
                  (newProject.softCost || 0) + 
                  (newProject.holdingCost || 0) + 
                  (newProject.buildCost || 0);
                const milestoneInflowK = (newProject.salePrice || 0);
                const milestoneNetK = milestoneInflowK - milestoneOutflowK;
                
                const customInflow = (newProject.incomes || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
                const customOutflow = (newProject.expenses || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

                const paidInflow = (newProject.incomes || []).filter(i => i.status === 'paid').reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
                const paidOutflow = (newProject.expenses || []).filter(e => e.status === 'paid').reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

                const customNet = customInflow - customOutflow;

                return (
                  <div className="mt-4 p-4 bg-slate-100/90 rounded-2xl space-y-3 text-xs border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Banknote size={14} className="text-indigo-600" /> Financial Projections Overview
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        Separate Estimates & Tracking (Not Added Together)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Box 1: Milestone High-Level Forecast */}
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-indigo-50">
                          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                            <Layers size={13} className="text-indigo-600" /> Milestones (Initial Estimate)
                          </span>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">High-Level Budget</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Inflow</span>
                            <span className="font-black text-emerald-700 text-xs">${milestoneInflowK.toLocaleString()}k</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Costs (incl. Hold)</span>
                            <span className="font-black text-rose-700 text-xs">${milestoneOutflowK.toLocaleString()}k</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Expected Net</span>
                            <span className={`font-black text-xs ${milestoneNetK >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {milestoneNetK >= 0 ? '+' : '-'}${Math.abs(milestoneNetK).toLocaleString()}k
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Progressive Detailed Actuals & Projections */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-emerald-50">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                            <Banknote size={13} className="text-emerald-600" /> Progressive Incomes & Expenses
                          </span>
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Detailed Ongoing</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Inflow</span>
                            <span className="font-black text-emerald-700 text-xs">${(customInflow / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                            <span className="text-[8px] text-slate-400 block">${(paidInflow / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k paid</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Outflow</span>
                            <span className="font-black text-rose-700 text-xs">${(customOutflow / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                            <span className="text-[8px] text-slate-400 block">${(paidOutflow / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k paid</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Current Net</span>
                            <span className={`font-black text-xs ${customNet >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {customNet >= 0 ? '+' : '-'}${Math.abs(customNet / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {archivedProjects.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <label className="block text-xs font-black text-amber-600 uppercase tracking-widest mb-2">Reinstate Archived Project</label>
              <select 
                className="w-full bg-white border-2 border-amber-100 rounded-xl px-4 py-2 text-slate-900 font-bold outline-none focus:border-amber-500"
                onChange={(e) => {
                  if (e.target.value) {
                    onReinstate(e.target.value);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select a project to reinstate...</option>
                {archivedProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Pinned / Sticky Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 rounded-b-3xl shrink-0">
          <button 
            onClick={onClose} 
            className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-6 py-3.5 rounded-2xl border border-slate-200 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2.5">
            {!newProject.cloneFromId ? (
              <>
                <button 
                  onClick={() => onCreate(newProject, false)} 
                  disabled={!newProject.name}
                  className="bg-white border-2 border-indigo-200 hover:border-indigo-600 text-indigo-700 font-bold px-5 py-3.5 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Create Blank
                </button>
                <button 
                  onClick={() => onCreate(newProject, true)} 
                  disabled={!newProject.name}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Wand2 size={18} /> AI Generate
                </button>
              </>
            ) : (
              <button 
                onClick={() => onCreate(newProject, false)} 
                disabled={!newProject.name}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Copy size={18} /> Clone Project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};