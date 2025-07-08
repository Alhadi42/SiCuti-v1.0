import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DeferredLeaveInputDialog from './DeferredLeaveInputDialog.jsx';

const LeaveHistoryFilters = ({
  searchTerm,
  onSearchTermChange,
  selectedYear,
  onSelectedYearChange,
  years,
  onRefresh,
  isLoading
}) => {
  const [isInputDeferredOpen, setIsInputDeferredOpen] = useState(false);

  return (
    <>
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id="search-employee"
                name="search-employee"
                placeholder="Cari berdasarkan nama atau NIP..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400"
              />
            </div>
            
            <select
              id="year-select"
              name="year-select"
              value={selectedYear}
              onChange={(e) => onSelectedYearChange(e.target.value)}
              className="w-full lg:w-32 h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map((year) => (
                <option key={year} value={year} className="bg-slate-700 text-white">
                  {year}
                </option>
              ))}
            </select>

            <Button 
              variant="outline" 
              onClick={() => setIsInputDeferredOpen(true)} 
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700" 
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Input Data Penangguhan
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeferredLeaveInputDialog
        isOpen={isInputDeferredOpen}
        onOpenChange={setIsInputDeferredOpen}
        onSuccess={onRefresh}
      />
    </>
  );
};

export default LeaveHistoryFilters;
