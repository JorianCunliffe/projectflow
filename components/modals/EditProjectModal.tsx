import React, { useState } from 'react';
import { Settings, Banknote, RefreshCw, User, Briefcase, ChevronDown, ChevronUp, Flame, Star, Hammer, Plus, Trash2, ExternalLink, ArrowDownLeft, ArrowUpRight, Check, Link as LinkIcon, Layers, Clock } from 'lucide-react';
import { Project, AppSettings, CashFlowItem } from '../../types';

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: Project) => void;
  onBulkOperation: (projectId: string, operation: { type: 'replace_name' | 'assign_role', oldName?: string, newName: string, role?: string }) => void;
  settings: AppSettings;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ 
  project, isOpen, onClose, onSave, settings, onBulkOperation 
}) => {
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [showBulkOps, setShowBulkOps] = useState(false);
  const [cashFlowTab, setCashFlowTab] = useState<'milestones' | 'income' | 'expenses'>('milestones');
  
  // Bulk Op Local State
  const [replaceOldName, setReplaceOldName] = useState('');
  const [replaceNewName, setReplaceNewName] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [assignNewName, setAssignNewName] = useState('');

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
    setEditedProject(prev => ({
      ...prev,
      incomes: [...(prev.incomes || []), newItem]
    }));
  };

  const handleUpdateIncome = (id: string, updates: Partial<CashFlowItem>) => {
    setEditedProject(prev => ({
      ...prev,
      incomes: (prev.incomes || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveIncome = (id: string) => {
    setEditedProject(prev => ({
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
    setEditedProject(prev => ({
      ...prev,
      expenses: [...(prev.expenses || []), newItem]
    }));
  };

  const handleUpdateExpense = (id: string, updates: Partial<CashFlowItem>) => {
    setEditedProject(prev => ({
      ...prev,
      expenses: (prev.expenses || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveExpense = (id: string) => {
    setEditedProject(prev => ({
      ...prev,
      expenses: (prev.expenses || []).filter(item => item.id !== id)
    }));
  };

  if (!isOpen) return null;

  const unstaffedRoles = project.milestones.flatMap(m => m.subtasks).filter(t => t.role && !t.assignedTo);
  const unstaffedRoleCounts = unstaffedRoles.reduce((acc, t) => {
    if (t.role) acc[t.role] = (acc[t.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const hasUnstaffedRoles = Object.keys(unstaffedRoleCounts).length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="p-8 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="text-slate-400" /> Edit Project Settings
          </h3>
          {project.displayId && (
            <span className="bg-slate-100 text-slate-500 text-xs font-black px-3 py-1 rounded-lg border border-slate-200 tracking-tighter">
              {project.displayId}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 font-bold placeholder-slate-300 transition-all"
              value={editedProject.name}
              onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Company</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={editedProject.company} onChange={(e) => setEditedProject({ ...editedProject, company: e.target.value })}>
              <option value="">Select...</option>
              {(settings.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={editedProject.type} onChange={(e) => setEditedProject({ ...editedProject, type: e.target.value })}>
              <option value="">Select...</option>
              {(settings.projectTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Folder / Workspace</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={editedProject.folder || ''} onChange={(e) => setEditedProject({ ...editedProject, folder: e.target.value || undefined })}>
              <option value="">None (Ungrouped)</option>
              {(settings.folders || ['Residential', 'Commercial', 'Civil & Land', 'Completed']).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
              value={new Date(editedProject.startDate).toISOString().split('T')[0]}
              onChange={(e) => setEditedProject({ ...editedProject, startDate: new Date(e.target.value).getTime() })}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estimates Time Unit</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
              value={editedProject.timeUnit || 'days'}
              onChange={(e) => setEditedProject({ ...editedProject, timeUnit: e.target.value as any })}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Time Buffer ({editedProject.timeUnit || 'days'})</label>
            <input 
              type="number" 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
              value={editedProject.timeBuffer || ''}
              onChange={(e) => setEditedProject({ ...editedProject, timeBuffer: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="col-span-2 flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Project Flags</label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isUrgent"
                  className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  checked={editedProject.isUrgent || false}
                  onChange={(e) => setEditedProject({ ...editedProject, isUrgent: e.target.checked })}
                />
                <label htmlFor="isUrgent" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-1">
                  Urgent <Flame size={14} className="text-orange-500" />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isImportant"
                  className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  checked={editedProject.isImportant || false}
                  onChange={(e) => setEditedProject({ ...editedProject, isImportant: e.target.checked })}
                />
                <label htmlFor="isImportant" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-1">
                  Important <Star size={14} className="text-amber-500" />
                </label>
              </div>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-100">
            <input 
              type="checkbox" 
              id="isArchived"
              className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              checked={editedProject.isArchived || false}
              onChange={(e) => setEditedProject({ ...editedProject, isArchived: e.target.checked })}
            />
            <label htmlFor="isArchived" className="text-sm font-bold text-amber-900 cursor-pointer">
              Archive this project (removes from active view)
            </label>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                <Banknote size={16} /> Financial Overview (in $'000s)
              </div>
              <p className="text-xs text-slate-500 mb-3">Overall project financing and return metrics.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cash Required ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:border-indigo-500 shadow-sm"
                    value={editedProject.cashRequirement || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, cashRequirement: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  {!!editedProject.cashRequirement && (
                    <span className="text-[10px] text-slate-400 font-medium">${(editedProject.cashRequirement * 1000).toLocaleString()}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Debt Required ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:border-indigo-500 shadow-sm"
                    value={editedProject.debtRequirement || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, debtRequirement: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  {!!editedProject.debtRequirement && (
                    <span className="text-[10px] text-slate-400 font-medium">${(editedProject.debtRequirement * 1000).toLocaleString()}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Value at Comp ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:border-indigo-500 shadow-sm"
                    value={editedProject.valueAtCompletion || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, valueAtCompletion: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  {!!editedProject.valueAtCompletion && (
                    <span className="text-[10px] text-slate-400 font-medium">${(editedProject.valueAtCompletion * 1000).toLocaleString()}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Profit ($'000s)</label>
                  <input 
                    type="number" 
                    className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-800 font-bold text-sm outline-none focus:border-emerald-500 shadow-sm"
                    value={editedProject.profit || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, profit: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  {!!editedProject.profit && (
                    <span className="text-[10px] text-emerald-600 font-medium">${(editedProject.profit * 1000).toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cash Flow Milestone Projections */}
            <div className="pt-4 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Banknote size={15} className="text-emerald-600" /> Cash Flow Projections (Dates & Amounts)
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                  Feeds into Cash Flow Report
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Track projected revenues, milestone deposits, and itemized project expenses with GST options and document links.
              </p>

              {/* Datalists for categories */}
              <datalist id="income-categories">
                <option value="Sales" />
                <option value="Progress Payment" />
                <option value="Deposit" />
                <option value="Grant" />
                <option value="Rental" />
                <option value="Equity" />
                <option value="Refund" />
                <option value="Other" />
              </datalist>

              <datalist id="expense-categories">
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
                    <span>Projected Income ({ (editedProject.incomes || []).length })</span>
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
                    <span>Projected Expenses ({ (editedProject.expenses || []).length })</span>
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
                          value={editedProject.salePrice ?? ''}
                          onChange={(e) => setEditedProject({ ...editedProject, salePrice: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 1500 ($1.5M)"
                        />
                        {editedProject.salePrice !== undefined && editedProject.salePrice > 0 && (
                          <span className="text-[9px] text-emerald-700 font-medium">+${(editedProject.salePrice * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-black text-emerald-800 uppercase mb-0.5">Estimated Date / Settlement</label>
                        <input 
                          type="date" 
                          className="w-full bg-emerald-50/40 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-emerald-600"
                          value={editedProject.salePriceDate || ''}
                          onChange={(e) => setEditedProject({ ...editedProject, salePriceDate: e.target.value })}
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
                          value={editedProject.initialDeposit ?? ''}
                          onChange={(e) => setEditedProject({ ...editedProject, initialDeposit: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 50 ($50k)"
                        />
                        {editedProject.initialDeposit !== undefined && editedProject.initialDeposit > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(editedProject.initialDeposit * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={editedProject.initialDepositDate || ''}
                          onChange={(e) => setEditedProject({ ...editedProject, initialDepositDate: e.target.value })}
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
                          value={editedProject.finalDeposit ?? ''}
                          onChange={(e) => setEditedProject({ ...editedProject, finalDeposit: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 100 ($100k)"
                        />
                        {editedProject.finalDeposit !== undefined && editedProject.finalDeposit > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(editedProject.finalDeposit * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={editedProject.finalDepositDate || ''}
                          onChange={(e) => setEditedProject({ ...editedProject, finalDepositDate: e.target.value })}
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
                          value={editedProject.settlementFigure ?? ''}
                          onChange={(e) => setEditedProject({ ...editedProject, settlementFigure: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 750 ($750k)"
                        />
                        {editedProject.settlementFigure !== undefined && editedProject.settlementFigure > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(editedProject.settlementFigure * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={editedProject.settlementDate || ''}
                          onChange={(e) => setEditedProject({ ...editedProject, settlementDate: e.target.value })}
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
                          value={editedProject.softCost ?? ''}
                          onChange={(e) => setEditedProject({ ...editedProject, softCost: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 120 ($120k)"
                        />
                        {editedProject.softCost !== undefined && editedProject.softCost > 0 && (
                          <span className="text-[9px] text-rose-600 font-medium">-${(editedProject.softCost * 1000).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                          value={editedProject.softCostDate || ''}
                          onChange={(e) => setEditedProject({ ...editedProject, softCostDate: e.target.value })}
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
                            value={editedProject.holdingCost ?? ''}
                            onChange={(e) => setEditedProject({ ...editedProject, holdingCost: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 35 ($35k)"
                          />
                          {editedProject.holdingCost !== undefined && editedProject.holdingCost > 0 && (
                            <span className="text-[9px] text-rose-600 font-medium">-${(editedProject.holdingCost * 1000).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date / Period</label>
                          <input 
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                            value={editedProject.holdingCostDate || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, holdingCostDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Holding Cost Notes (Optional)</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
                          value={editedProject.holdingCostNotes || ''}
                          onChange={(e) => setEditedProject({ ...editedProject, holdingCostNotes: e.target.value })}
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
                            value={editedProject.buildCost ?? ''}
                            onChange={(e) => setEditedProject({ ...editedProject, buildCost: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 850 ($850k)"
                          />
                          {editedProject.buildCost !== undefined && editedProject.buildCost > 0 && (
                            <span className="text-[9px] text-rose-600 font-medium">-${(editedProject.buildCost * 1000).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Estimated Date / Milestone</label>
                          <input 
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500"
                            value={editedProject.buildCostDate || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, buildCostDate: e.target.value })}
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
                            value={editedProject.builderName || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, builderName: e.target.value })}
                            placeholder="e.g. Apex Master Builders"
                          />
                        </div>
                        <div className="sm:col-span-7">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Build Scope / Contract Notes (Optional)</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
                            value={editedProject.buildCostNotes || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, buildCostNotes: e.target.value })}
                            placeholder="e.g. Fixed-price contract, progressive draws"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Estimate Subtotal Banner */}
                  {(() => {
                    const msInflow = (editedProject.salePrice || 0);
                    const msOutflow = (editedProject.initialDeposit || 0) + 
                      (editedProject.finalDeposit || 0) + 
                      (editedProject.settlementFigure || 0) + 
                      (editedProject.softCost || 0) + 
                      (editedProject.holdingCost || 0) + 
                      (editedProject.buildCost || 0);
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

                  {/* Custom Incomes List */}
                  {(editedProject.incomes || []).length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Itemized Additional Incomes</span>
                      {(editedProject.incomes || []).map((item, idx) => (
                        <div 
                          key={item.id || idx} 
                          className="bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl p-3 shadow-xs space-y-2 transition-all"
                        >
                          {/* Row 1: Category, Description, Trash */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-4">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Category</label>
                              <input 
                                list="income-categories"
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-emerald-500"
                                value={item.category || ''}
                                onChange={(e) => handleUpdateIncome(item.id, { category: e.target.value })}
                                placeholder="e.g. Sales, Grant, Progress Claim"
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
                    const totalInc = (editedProject.incomes || []).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
                    const paidInc = (editedProject.incomes || []).filter(i => i.status === 'paid').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
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
                          <span className="font-bold text-white">{(editedProject.incomes || []).length} items</span>
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
                  {(editedProject.expenses || []).length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {(editedProject.expenses || []).map((item, idx) => (
                        <div 
                          key={item.id || idx} 
                          className="bg-white border border-rose-100 hover:border-rose-300 rounded-xl p-3 shadow-xs space-y-2 transition-all"
                        >
                          {/* Row 1: Category, Description, Trash */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-4">
                              <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Category</label>
                              <input 
                                list="expense-categories"
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
                    <div className="p-4 bg-white/70 border border-dashed border-rose-200 rounded-xl text-center">
                      <p className="text-xs text-slate-500">No progressive expense entries configured yet. Click <button type="button" onClick={handleAddExpense} className="text-rose-700 font-bold hover:underline">+ Add Expense</button> to add contractor invoices, material bills, or consultant fees.</p>
                    </div>
                  )}

                  {/* Expense Tab Summary Banner */}
                  {(() => {
                    const totalExp = (editedProject.expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
                    const paidExp = (editedProject.expenses || []).filter(e => e.status === 'paid').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
                    const projectedExp = totalExp - paidExp;

                    return (
                      <div className="p-3 bg-rose-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div>
                            <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Total Projected Expenses</span>
                            <span className="text-white font-black text-sm">${(totalExp / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                          <div>
                            <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Actual Paid</span>
                            <span className="text-rose-300 font-black text-sm">${(paidExp / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                          <div>
                            <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Remaining Projected</span>
                            <span className="text-rose-100 font-black text-sm">${(projectedExp / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-200 block text-[9px] uppercase font-bold tracking-wider">Line Items</span>
                          <span className="font-bold text-white">{(editedProject.expenses || []).length} items</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Persistent Side-by-Side Financial Summary (Distinct, NOT Additional) */}
              {(() => {
                const milestoneOutflowK = (editedProject.initialDeposit || 0) + 
                  (editedProject.finalDeposit || 0) + 
                  (editedProject.settlementFigure || 0) + 
                  (editedProject.softCost || 0) + 
                  (editedProject.holdingCost || 0) + 
                  (editedProject.buildCost || 0);
                const milestoneInflowK = (editedProject.salePrice || 0);
                const milestoneNetK = milestoneInflowK - milestoneOutflowK;
                
                const customInflow = (editedProject.incomes || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
                const customOutflow = (editedProject.expenses || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

                const paidInflow = (editedProject.incomes || []).filter(i => i.status === 'paid').reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
                const paidOutflow = (editedProject.expenses || []).filter(e => e.status === 'paid').reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

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

        {/* Bulk Operations Section */}
        <div className="bg-slate-50 rounded-2xl border border-slate-100 mb-8 overflow-hidden">
          <button 
            onClick={() => setShowBulkOps(!showBulkOps)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
          >
            <div className={`flex items-center gap-2 font-bold text-sm uppercase tracking-wider ${hasUnstaffedRoles ? 'text-amber-600' : 'text-indigo-600'}`}>
              <RefreshCw size={16} /> Bulk Operations {hasUnstaffedRoles && <span className="bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 rounded-full ml-2">Unstaffed Roles</span>}
            </div>
            {showBulkOps ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          
          {showBulkOps && (
            <div className="p-4 border-t border-slate-200 bg-white space-y-6 animate-in slide-in-from-top-2 duration-200">
              {hasUnstaffedRoles && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="text-xs font-black text-amber-800 uppercase mb-2 flex items-center gap-2">
                    <User size={14} className="text-amber-500" /> Unstaffed Roles Tracking
                  </h4>
                  <p className="text-[10px] text-amber-700 mb-3">The following roles are defined in tasks but currently have no person assigned:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(unstaffedRoleCounts).map(([r, count]) => (
                      <div key={r} onClick={() => setAssignRole(r)} className="bg-white border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors" title={`Click to select ${r} for bulk assignment`}>
                        {r} <span className="bg-amber-200 text-amber-900 rounded-full px-1.5 py-0.5 text-[9px] ml-1">{String(count)} task{Number(count) > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Op 1: Replace Name */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                  <User size={14} className="text-indigo-500" /> Replace Assignee Name
                </h4>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Current</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      value={replaceOldName}
                      onChange={(e) => setReplaceOldName(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {settings.people.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Replace With</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      value={replaceNewName}
                      onChange={(e) => setReplaceNewName(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {settings.people.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <button 
                    disabled={!replaceOldName || !replaceNewName}
                    onClick={() => {
                      onBulkOperation(project.id, { type: 'replace_name', oldName: replaceOldName, newName: replaceNewName });
                      setReplaceOldName('');
                      setReplaceNewName('');
                      alert('Assignees replaced successfully.');
                    }}
                    className="bg-indigo-600 text-white font-bold p-1.5 px-3 rounded-lg text-[10px] hover:bg-indigo-700 disabled:opacity-50"
                  >
                    RUN
                  </button>
                </div>
              </div>

              {/* Op 2: Assign Name to Role */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                  <Briefcase size={14} className="text-indigo-500" /> Assign Name to Role
                </h4>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Target Role</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      value={assignRole}
                      onChange={(e) => setAssignRole(e.target.value)}
                    >
                      <option value="">Select role...</option>
                      {settings.roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Assign Person</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      value={assignNewName}
                      onChange={(e) => setAssignNewName(e.target.value)}
                    >
                      <option value="">Select person...</option>
                      {settings.people.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <button 
                    disabled={!assignRole || !assignNewName}
                    onClick={() => {
                      onBulkOperation(project.id, { type: 'assign_role', role: assignRole, newName: assignNewName });
                      setAssignRole('');
                      setAssignNewName('');
                      alert('Role assignments updated.');
                    }}
                    className="bg-indigo-600 text-white font-bold p-1.5 px-3 rounded-lg text-[10px] hover:bg-indigo-700 disabled:opacity-50"
                  >
                    RUN
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-2 italic">Assigns the selected person to ALL tasks in this project that have the selected Role.</p>
              </div>
            </div>
          )}
        </div>
        
        </div>
        <div className="p-6 border-t border-slate-100 bg-white rounded-b-3xl shrink-0">
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-2xl transition-all active:scale-95 shadow-sm">Cancel</button>
            <button 
              onClick={() => onSave(editedProject)} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};