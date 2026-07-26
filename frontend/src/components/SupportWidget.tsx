import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Mail, Phone, Globe, Wrench, CheckCircle2 } from 'lucide-react';

export const SupportWidget: React.FC = () => {
  const [supportChoice, setSupportChoice] = useState<'none' | 'yes' | 'no'>('none');

  return (
    <div className="mt-2.5 p-3 sm:p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 text-xs space-y-2.5 max-w-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 text-sky-300 font-semibold">
          <HelpCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>Need more support?</span>
        </div>
        {supportChoice === 'none' && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setSupportChoice('yes')}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setSupportChoice('no')}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all active:scale-95 cursor-pointer"
            >
              No
            </button>
          </div>
        )}
      </div>

      {supportChoice === 'yes' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pt-2.5 border-t border-sky-500/20 space-y-2"
        >
          <p className="text-[11px] font-semibold text-slate-300">
            Available Support Channels:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-sky-500/20 flex items-start space-x-2">
              <Mail className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Email Support</p>
                <p className="text-sky-300 font-mono text-[10px]">support@gevernova.com</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-sky-500/20 flex items-start space-x-2">
              <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Help Desk</p>
                <p className="text-emerald-300 font-mono text-[10px]">+1 (800) 555-VERN</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-sky-500/20 flex items-start space-x-2">
              <Wrench className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Tech Support</p>
                <p className="text-violet-300 font-mono text-[10px]">tech-support@gevernova.com</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-sky-500/20 flex items-start space-x-2">
              <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Help Portal</p>
                <a href="https://www.gevernova.com/support" target="_blank" rel="noreferrer" className="text-cyan-300 underline text-[10px]">
                  gevernova.com/support
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {supportChoice === 'no' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Thank you for your feedback!</span>
        </motion.div>
      )}
    </div>
  );
};
