import React from 'react';
import { Card, Badge } from './Card.jsx';
import { Clock, FileText, Zap } from 'lucide-react';

function SmallRow({label, value, badge}){
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="flex items-center gap-2">
        {value && <div className="text-sm text-gray-800">{value}</div>}
        {badge && <Badge label={badge} color="green" />}
      </div>
    </div>
  );
}

export default function RightSidebar({ recent = [] }){
  return (
    <aside className="w-80 shrink-0 px-4 py-4 space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">Investigation Context</h4>
          <a className="text-xs text-blue-600">View all</a>
        </div>
        <div className="mt-3 space-y-2">
          <SmallRow label="Investigation" value="New Investigation" badge="Draft" />
          <SmallRow label="Agent" value="Auto-route agent" badge="Active" />
          <SmallRow label="Sources" value="No sources selected" />
          <div className="flex justify-end">
            <button className="text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">+ Add</button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">Recent Investigations</h4>
          <a className="text-xs text-blue-600">View all</a>
        </div>
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          {recent.length === 0 ? (
            <div className="text-xs text-gray-400">No recent investigations</div>
          ) : recent.map(r => (
            <div key={r.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-gray-400" />
                <div>{r.title}</div>
              </div>
              <div className="text-xs text-gray-400">{r.when}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">System Status</h4>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-600">All systems operational</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <a className="text-xs text-blue-600">View status</a>
          </div>
        </div>
      </Card>
    </aside>
  );
}
