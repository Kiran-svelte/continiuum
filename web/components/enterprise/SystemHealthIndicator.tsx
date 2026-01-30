"use client";

/**
 * 🏥 CONTINUUM SYSTEM HEALTH INDICATOR
 * 
 * Real-time system health display:
 * - Database status
 * - AI Engine status
 * - Email service status
 * - Overall health score
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Database, 
  Brain, 
  Mail, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw 
} from 'lucide-react';
import { getSystemHealth } from '@/lib/enterprise/server-actions';

interface HealthStatus {
  database: boolean;
  aiEngine: boolean;
  emailService: boolean;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

interface SystemHealthIndicatorProps {
  compact?: boolean;
  showRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function SystemHealthIndicator({ 
  compact = false, 
  showRefresh = true,
  refreshInterval = 60000 // 1 minute default
}: SystemHealthIndicatorProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const result = await getSystemHealth();
      setHealth(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      setHealth({
        database: false,
        aiEngine: false,
        emailService: false,
        overall: 'unhealthy'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchHealth, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getStatusIcon = (status: boolean) => {
    if (status) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getOverallIcon = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getOverallColor = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'degraded':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          health ? getOverallColor(health.overall) : 'bg-gray-100 dark:bg-gray-800'
        }`}
      >
        {isLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
        ) : (
          health && getOverallIcon(health.overall)
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">
          {isLoading ? 'Checking...' : health?.overall || 'Unknown'}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">System Health</h3>
            {lastUpdated && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        {showRefresh && (
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            aria-label="Refresh health status"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Overall Status */}
      {health && (
        <div className={`mb-4 p-3 rounded-lg border ${getOverallColor(health.overall)}`}>
          <div className="flex items-center gap-2">
            {getOverallIcon(health.overall)}
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              System {health.overall}
            </span>
          </div>
        </div>
      )}

      {/* Individual Services */}
      <div className="space-y-3">
        <ServiceStatus
          icon={<Database className="w-4 h-4" />}
          name="Database"
          status={health?.database ?? false}
          isLoading={isLoading}
        />
        <ServiceStatus
          icon={<Brain className="w-4 h-4" />}
          name="AI Engine"
          status={health?.aiEngine ?? false}
          isLoading={isLoading}
        />
        <ServiceStatus
          icon={<Mail className="w-4 h-4" />}
          name="Email Service"
          status={health?.emailService ?? false}
          isLoading={isLoading}
        />
      </div>
    </motion.div>
  );
}

interface ServiceStatusProps {
  icon: React.ReactNode;
  name: string;
  status: boolean;
  isLoading: boolean;
}

function ServiceStatus({ icon, name, status, isLoading }: ServiceStatusProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
        {icon}
        <span className="text-sm">{name}</span>
      </div>
      {isLoading ? (
        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
      ) : (
        <div className="flex items-center gap-1.5">
          {status ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">Online</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 dark:text-red-400">Offline</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SystemHealthIndicator;
