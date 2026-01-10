
import React from 'react';

// Default mappings for the initial statuses
export const DEFAULT_STATUS_COLORS: Record<string, string> = {
  'Complete': '#dcfce7',
  'Started': '#dbeafe',
  'Held': '#fef9c3',
  'Not Complete': '#f1f5f9',
  'Not started': '#f1f5f9'
};

export const getStatusColor = (status: string) => DEFAULT_STATUS_COLORS[status] || '#f1f5f9';

export const getStatusBorderColor = (status: string) => {
  const borders: Record<string, string> = {
    'Complete': '#22c55e',
    'Started': '#3b82f6',
    'Held': '#eab308',
    'Not Complete': '#94a3b8',
    'Not started': '#94a3b8'
  };
  return borders[status] || '#94a3b8';
};