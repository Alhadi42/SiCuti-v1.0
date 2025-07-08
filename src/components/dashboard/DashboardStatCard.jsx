import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const DashboardStatCard = ({ title, value, icon: Icon, color, subValue, isLoading, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 card-hover h-full">
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            {isLoading ? (
              <div className="h-8 w-24 bg-slate-700 animate-pulse rounded-md mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
            )}
          </div>
          {Icon && (
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        {subValue && !isLoading && <p className="text-slate-500 text-xs mt-2">{subValue}</p>}
      </CardContent>
    </Card>
  </motion.div>
);

export default DashboardStatCard;