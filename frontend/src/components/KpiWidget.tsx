import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Zap, ShieldCheck, Cpu } from 'lucide-react';

export interface KpiCardData {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  category?: string;
}

interface KpiWidgetProps {
  data: KpiCardData | KpiCardData[];
}

export const KpiWidget: React.FC<KpiWidgetProps> = ({ data }) => {
  const cards: KpiCardData[] = Array.isArray(data) ? data : [data];

  if (!cards || cards.length === 0) return null;

  const getCategoryIcon = (cat?: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('power') || c.includes('energy') || c.includes('electric')) return <Zap className="w-4 h-4 text-emerald-600" />;
    if (c.includes('safety') || c.includes('reliability')) return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    if (c.includes('efficiency') || c.includes('cpu') || c.includes('performance')) return <Cpu className="w-4 h-4 text-emerald-600" />;
    return <Activity className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div className="my-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
      {cards.map((card, idx) => {
        const isPositive = card.isPositive !== false;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 truncate">{card.title}</span>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 flex-shrink-0">
                {getCategoryIcon(card.category || card.title)}
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{card.value}</h3>
              
              <div className="flex items-center justify-between mt-1 text-xs">
                {card.change && (
                  <span className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded-md ${
                    isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 mr-1 flex-shrink-0" />}
                    {card.change}
                  </span>
                )}

                {card.subtitle && (
                  <span className="text-[11px] text-slate-400 font-medium truncate">{card.subtitle}</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
