import React from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';

export interface ChartDataPayload {
  title?: string;
  type?: 'bar' | 'line' | 'pie' | 'column';
  xAxisKey?: string;
  dataKeys?: string[];
  data: Record<string, any>[];
  colors?: string[];
}

interface InteractiveChartWidgetProps {
  payload: ChartDataPayload;
}

const DEFAULT_COLORS = [
  '#059669', // Emerald 600
  '#2563eb', // Blue 600
  '#d97706', // Amber 600
  '#9333ea', // Purple 600
  '#dc2626', // Red 600
  '#0284c7', // Sky 600
];

export const InteractiveChartWidget: React.FC<InteractiveChartWidgetProps> = ({ payload }) => {
  if (!payload || !payload.data || !Array.isArray(payload.data) || payload.data.length === 0) {
    return null;
  }

  const chartType = (payload.type || 'bar').toLowerCase();
  const title = payload.title || 'Data Analytics Chart';
  const keys = payload.data.length > 0 ? Object.keys(payload.data[0]) : [];
  const xAxisKey = payload.xAxisKey || keys[0] || 'name';
  const dataKeys = payload.dataKeys || keys.filter((k) => k !== xAxisKey);
  const colors = payload.colors && payload.colors.length > 0 ? payload.colors : DEFAULT_COLORS;

  const renderChart = () => {
    if (chartType === 'pie') {
      const valueKey = dataKeys[0] || keys[1] || 'value';
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={payload.data}
              dataKey={valueKey}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={45}
              paddingAngle={4}
              label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {payload.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={payload.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
            {dataKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[idx % colors.length]}
                strokeWidth={3}
                dot={{ r: 4, fill: colors[idx % colors.length] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Default: Bar Chart
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={payload.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          {dataKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[idx % colors.length]}
              radius={[6, 6, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const getChartIcon = () => {
    if (chartType === 'pie') return <PieIcon className="w-4 h-4 text-emerald-600" />;
    if (chartType === 'line') return <LineIcon className="w-4 h-4 text-emerald-600" />;
    return <BarChart3 className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div className="my-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
          {getChartIcon()}
        </div>
        <h4 className="text-xs font-bold text-slate-800 tracking-tight">{title}</h4>
      </div>

      <div className="w-full h-64">
        {renderChart()}
      </div>
    </div>
  );
};
