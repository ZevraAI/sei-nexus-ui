import React from 'react';
import { Btn } from './Card.jsx';
import { ChevronDown, User, Settings, Sparkles } from 'lucide-react';

export default function TopHeader({ title = '', subtitle = '', actions }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-3">
          <Btn variant="primary" size="md">+ New Chat <ChevronDown size={14} /></Btn>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <div className="inline-flex items-center gap-3 px-3 py-1 rounded-lg bg-gray-50 border border-gray-100">
          <Sparkles size={14} className="text-gray-500" />
          <select className="text-sm bg-transparent outline-none border-none">
            <option>Auto-route agent</option>
          </select>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-700">SS</div>
      </div>
    </div>
  );
}
