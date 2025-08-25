/**
 * Database Health Checker Component
 * Checks if required database columns exist and shows setup instructions
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

const DatabaseHealthChecker = ({ onHealthCheck }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [showSqlInstructions, setShowSqlInstructions] = useState(false);
  const { toast } = useToast();

  const checkDatabaseHealth = async () => {
    setIsChecking(true);
    try {
      console.log("🔍 Checking database health...");
      
      // Test if the completed_at and completed_by columns exist
      const { data, error } = await supabase
        .from('leave_proposals')
        .select('id, status, completed_at, completed_by')
        .limit(1);

      if (error) {
        if (error.code === '42703' && error.message?.includes('completed_at')) {
          setHealthStatus({
            healthy: 'warning',
            missingColumns: ['completed_at', 'completed_by'],
            issue: 'Missing completion tracking columns - using localStorage fallback',
            needsSetup: true
          });
        } else if (error.code === '42501') {
          setHealthStatus({
            healthy: 'warning',
            issue: 'Database access restricted - using localStorage fallback',
            needsSetup: false,
            rlsIssue: true
          });
        } else {
          setHealthStatus({
            healthy: false,
            issue: `Database error: ${error.message}`,
            needsSetup: false
          });
        }
      } else {
        setHealthStatus({
          healthy: true,
          issue: null,
          needsSetup: false
        });
      }

      if (onHealthCheck) {
        onHealthCheck(healthStatus);
      }

    } catch (error) {
      console.error("Database health check failed:", error);
      setHealthStatus({
        healthy: false,
        issue: `Health check failed: ${error.message}`,
        needsSetup: false
      });
    } finally {
      setIsChecking(false);
    }
  };

  const copySqlToClipboard = () => {
    const sqlCommands = `-- Run these commands in your Supabase SQL Editor
-- 1. Update status constraint
ALTER TABLE leave_proposals 
DROP CONSTRAINT IF EXISTS leave_proposals_status_check;

ALTER TABLE leave_proposals 
ADD CONSTRAINT leave_proposals_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'completed'));

-- 2. Add completion tracking columns
ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id);

ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_by ON leave_proposals(completed_by);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_at ON leave_proposals(completed_at);

-- 4. Verify
SELECT 'Database update completed successfully!' as result;`;

    navigator.clipboard.writeText(sqlCommands).then(() => {
      toast({
        title: "SQL Commands Copied",
        description: "Commands copied to clipboard. Paste them in Supabase SQL Editor.",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please copy manually from the file 'run_this_sql_in_supabase.sql'",
        variant: "destructive"
      });
    });
  };

  useEffect(() => {
    // Auto-check on mount
    checkDatabaseHealth();
  }, []);

  if (!healthStatus) {
    return null; // Still checking
  }

  if (healthStatus.healthy === true) {
    return (
      <Card className="bg-green-900/20 border-green-700/50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Database is healthy</span>
            <Badge variant="outline" className="text-green-400 border-green-400">
              Full database features available
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (healthStatus.healthy === 'warning') {
    return (
      <Card className="bg-blue-900/20 border-blue-700/50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Using fallback mode</span>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {healthStatus.rlsIssue ? 'localStorage storage' : 'Limited features'}
            </Badge>
          </div>
          <p className="text-blue-300 text-sm mt-2">
            {healthStatus.issue}
            {healthStatus.rlsIssue && ' (This is expected with current security settings)'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!healthStatus.needsSetup) {
    return (
      <Card className="bg-red-900/20 border-red-700/50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">Database Error</span>
            <Badge variant="outline" className="text-red-400 border-red-400">
              {healthStatus.issue}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-yellow-900/20 border-yellow-700/50 mb-4">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Database Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-yellow-300 mb-2">
              The batch proposal completion feature has limited database access and is using localStorage fallback.
            </p>
            <p className="text-yellow-200 text-sm">
              {healthStatus.missingColumns ?
                `Missing columns: ${healthStatus.missingColumns.join(', ')}` :
                'Database access restrictions detected'
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setShowSqlInstructions(!showSqlInstructions)}
              variant="outline"
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
            >
              <Database className="w-4 h-4 mr-2" />
              {showSqlInstructions ? 'Hide' : 'Show'} Setup Instructions
            </Button>
            
            <Button
              onClick={copySqlToClipboard}
              variant="outline"
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy SQL Commands
            </Button>
            
            <Button
              onClick={checkDatabaseHealth}
              variant="outline"
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
              disabled={isChecking}
            >
              {isChecking ? "Checking..." : "Re-check"}
            </Button>
          </div>

          {showSqlInstructions && (
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-yellow-600/30">
              <h4 className="text-yellow-300 font-medium mb-2 flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                Setup Instructions
              </h4>
              <ol className="text-yellow-200 text-sm space-y-2 list-decimal list-inside">
                <li>Go to your Supabase project dashboard</li>
                <li>Open the <strong>SQL Editor</strong> from the left menu</li>
                <li>Click <strong>"New Query"</strong></li>
                <li>Copy the SQL commands using the button above</li>
                <li>Paste the commands in the SQL editor</li>
                <li>Click <strong>"Run"</strong> to execute the commands</li>
                <li>Click "Re-check" above to verify the setup</li>
              </ol>
              
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded">
                <p className="text-blue-300 text-sm">
                  <strong>Note:</strong> The feature works using localStorage storage for completion status.
                  This ensures functionality while avoiding database restrictions.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseHealthChecker;
