import React, { useState, useEffect, useRef } from 'react';
import { Milestone } from '../types';
import { MilestonePieChart } from './PieChart';
import { Plus, ChevronRight, ChevronLeft, User, Edit2, Wand2, Clock, CalendarCheck, Trash2, ExternalLink, Link as LinkIcon, Move } from 'lucide-react';
import { getStatusBorderColor } from '../constants';

interface MilestoneNodeProps {
  milestone: Milestone;
  showSubtasks: boolean;
  onAddSubtask: (milestoneId: string) => void;
  onAddSequence: (milestoneId: string) => void;
  onAddPrevious: (milestoneId: string) => void;
  onAddParallel: (milestoneId: string) => void;
  onEditSubtask: (milestoneId: string, subtaskIndex: number) => void;
  onUpdateName: (milestoneId: string, newName: string) => void;
  onUpdateDuration: (milestoneId: string, days: number) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onMove: (id: string, x: number, y: number, withSubtree: boolean) => void;
  onBrainstorm: (milestoneId: string) => void;
  onHover: (milestoneId: string | null) => void;
  
  // Linking props
  onStartLinking: (milestoneId: string) => void;
  onCompleteLinking: (milestoneId: string) => void;
  isLinkingMode: boolean;
  isSource: boolean;

  targetDate?: Date;
  dateFormat: 'DD/MM/YY' | 'MM/DD/YY';
  onClick: () => void;
}

export const MilestoneNode: React.FC<MilestoneNodeProps> = ({
  milestone,
  showSubtasks,
  onAddSubtask,
  onAddSequence,
  onAddPrevious,
  onAddParallel,
  onEditSubtask,
  onUpdateName,
  onUpdateDuration,
  onDeleteMilestone,
  onMove,
  onBrainstorm,
  onHover,
  onStartLinking,
  onCompleteLinking,
  isLinkingMode,
  isSource,
  targetDate,
  dateFormat,
  onClick
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(milestone.name);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: milestone.x || 0, y: milestone.y || 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartNode = useRef({ x: 0, y: 0 });

  // Sync prop position changes when not dragging (e.g. auto layout update)
  useEffect(() => {
    if (!isDragging) {
      setCurrentPos({ x: milestone.x || 0, y: milestone.y || 0 });
    }
  }, [milestone.x, milestone.y, isDragging]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const formatDate = (date: Date | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return dateFormat === 'DD/MM/YY' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (tempName.trim() && tempName !== milestone.name) {
      onUpdateName(milestone.id, tempName);
    } else {
      setTempName(milestone.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempName(milestone.name);
    }
  };

  const handleBrainstorm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsThinking(true);
    await onBrainstorm(milestone.id);
    setIsThinking(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLinkingMode || e.button !== 0 || isEditing) return;
    
    e.stopPropagation(); // Prevent canvas panning
    
    setIsDragging(true);
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartNode.current = { x: currentPos.x, y: currentPos.y };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartMouse.current.x;
      const dy = e.clientY - dragStartMouse.current.y;
      setCurrentPos({
        x: dragStartNode.current.x + dx,
        y: dragStartNode.current.y + dy
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      const dx = e.clientX - dragStartMouse.current.x;
      const dy = e.clientY - dragStartMouse.current.y;
      
      // If moved more than a few pixels, consider it a drag operation
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        onMove(milestone.id, dragStartNode.current.x + dx, dragStartNode.current.y + dy, e.shiftKey);
      } else {
        // Otherwise treat as click (reset position to snap back if needed, though usually same)
        setCurrentPos({ x: milestone.x || 0, y: milestone.y || 0 });
        if (!isLinkingMode) onClick();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, milestone.id, onMove, isLinkingMode, onClick, milestone.x, milestone.y]);

  const handleClick = (e: React.MouseEvent) => {
    if (isLinkingMode) {
      e.stopPropagation();
      if (!isSource) {
        onCompleteLinking(milestone.id);
      }
    }
    // Normal click is handled via mouseUp to distinguish from drag
  };

  const subtasks = milestone.subtasks || [];
  const isComplete = subtasks.length > 0 && subtasks.every(s => s.status === 'Complete');

  return (
    <div 
      className={`absolute flex flex-col items-center group z-10 transition-opacity ${isLinkingMode && !isSource ? 'opacity-90 hover:opacity-100' : ''}`}
      style={{ left: currentPos.x, top: currentPos.y, transform: 'translate(-50%, -50%)', cursor: isDragging ? 'grabbing' : 'auto' }}
      onMouseEnter={() => onHover(milestone.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="mb-2 h-7 flex flex-col items-center justify-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="text-sm font-semibold text-slate-900 bg-white border border-indigo-300 rounded px-2 py-0.5 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="flex items-center gap-1.5 cursor-pointer hover:bg-white hover:shadow-sm px-2 py-0.5 rounded-full transition-all group/name"
          >
            <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
              {milestone.name}
            </span>
            <Edit2 size={10} className="text-slate-400 opacity-0 group-hover/name:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
      
      {/* Wrapper for Circle and Buttons */}
      <div className="relative z-50 group/circle">
        
        {/* The Circle - Draggable Target */}
        <div 
          className={`rounded-full bg-white shadow-xl ring-2 transition-all duration-300 active:scale-95 
            ${isThinking ? 'ring-indigo-400 animate-pulse' : ''}
            ${isLinkingMode && isSource ? 'ring-4 ring-indigo-500 scale-110' : ''}
            ${isLinkingMode && !isSource ? 'ring-slate-100 hover:ring-indigo-400 hover:scale-110' : 'ring-slate-100 group-hover:ring-indigo-300 group-hover:scale-110'}
            ${isDragging ? 'cursor-grabbing scale-105 shadow-2xl ring-indigo-400' : 'cursor-grab'}
          `}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        >
          <MilestonePieChart subtasks={subtasks} size={100} />
          
          {/* Drag Handle Indicator on Hover */}
          {!isLinkingMode && !isDragging && (
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-colors pointer-events-none">
               <Move size={20} className="text-white opacity-0 group-hover:opacity-50" />
            </div>
          )}

          {/* Visual indicator for valid drop target during linking */}
          {isLinkingMode && !isSource && (
            <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Floating Tooltip for Timeline */}
        {!isLinkingMode && !isDragging && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/circle:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none flex flex-col items-center shadow-lg">
            <div className="flex items-center gap-1">
              <Clock size={10} className="text-indigo-400" />
              <span>Target: {formatDate(targetDate)}</span>
            </div>
            {isComplete && milestone.completedAt && (
              <div className="flex items-center gap-1 mt-1 text-emerald-400">
                <CalendarCheck size={10} />
                <span>Actual: {formatDate(milestone.completedAt)}</span>
              </div>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
          </div>
        )}

        {/* Quick Actions Panel - Hide during linking mode and dragging */}
        {!isLinkingMode && !isDragging && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 pl-3 flex flex-col gap-1.5 opacity-0 group-hover/circle:opacity-100 transition-all transform group-hover/circle:translate-x-1 duration-300 z-50">
            <button 
              onClick={handleBrainstorm}
              disabled={isThinking}
              className="p-2 bg-gradient-to-tr from-amber-400 to-amber-500 text-white rounded-full shadow-lg hover:from-amber-500 hover:to-amber-600 active:scale-90 transition-all border border-amber-300/50"
              title="AI Brainstorm Subtasks"
            >
              <Wand2 size={14} className={`pointer-events-none ${isThinking ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddPrevious(milestone.id); }}
              className="p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all border border-blue-500"
              title="Previous Step"
            >
              <ChevronLeft size={14} className="pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddSequence(milestone.id); }}
              className="p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all border border-blue-500"
              title="Next Step"
            >
              <ChevronRight size={14} className="pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddParallel(milestone.id); }}
              className="p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-90 transition-all border border-indigo-500"
              title="Parallel Step"
            >
              <Plus size={14} className="pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { 
                  e.stopPropagation();
                  onStartLinking(milestone.id); 
              }}
              className="p-2 bg-violet-600 text-white rounded-full shadow-lg hover:bg-violet-700 active:scale-90 transition-all border border-violet-500"
              title="Link to Another Milestone"
            >
              <LinkIcon size={14} className="pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onDeleteMilestone(milestone.id); 
              }}
              className="p-2 bg-red-100 text-red-600 rounded-full shadow-lg hover:bg-red-200 active:scale-90 transition-all border border-red-200"
              title="Delete Milestone"
            >
              <Trash2 size={14} className="pointer-events-none" />
            </button>
          </div>
        )}
      </div>

      {showSubtasks && !isLinkingMode && !isDragging && (
        <div className="mt-4 w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-50 pb-1.5 px-1 mb-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Tasks ({subtasks.length})
            </div>
            <div className="flex items-center gap-1">
               <input 
                type="number" 
                className="w-8 bg-slate-100 rounded text-[9px] font-bold text-slate-600 text-center outline-none focus:ring-1 focus:ring-indigo-500"
                value={milestone.estimatedDuration || 0}
                onChange={(e) => onUpdateDuration(milestone.id, parseInt(e.target.value) || 0)}
                onClick={(e) => e.stopPropagation()}
                title="Estimated Days"
              />
              <span className="text-[9px] font-bold text-slate-400">DAYS</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            {subtasks.map((task, idx) => (
              <div 
                key={task.id} 
                onClick={(e) => { e.stopPropagation(); onEditSubtask(milestone.id, idx); }}
                className="text-xs p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:shadow-sm cursor-pointer flex items-center justify-between group/task transition-all"
              >
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate text-slate-800">{task.name}</span>
                    {task.link && (
                      <a 
                        href={task.link.startsWith('http') ? task.link : `https://${task.link}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-2 p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                        title="Open Resource Link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <User size={9} /> {task.assignedTo || 'Unassigned'}
                  </span>
                  {task.status === 'Complete' && task.completedAt && (
                    <span className="text-[8px] text-emerald-600 font-medium">Done {formatDate(task.completedAt)}</span>
                  )}
                </div>
                <div 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-white" 
                  style={{ backgroundColor: getStatusBorderColor(task.status) }} 
                />
              </div>
            ))}
            <button 
              onClick={(e) => { e.stopPropagation(); onAddSubtask(milestone.id); }}
              className="mt-1 w-full py-1.5 border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-400 font-bold hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1"
            >
              <Plus size={10} /> NEW TASK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};