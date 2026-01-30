"use client";

/**
 * 🛡️ CONTINUUM DATA PRIVACY SETTINGS
 * 
 * GDPR-compliant data management:
 * - Data export (Article 20)
 * - Data deletion (Article 17)
 * - Consent management
 * - Data portability
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  FileJson, 
  FileText,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { requestDataExport, requestDataDeletion } from '@/lib/enterprise/server-actions';

interface DataPrivacySettingsProps {
  userId: string;
  userName?: string;
}

export function DataPrivacySettings({ userId, userName }: DataPrivacySettingsProps) {
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'confirm' | 'loading' | 'success' | 'error'>('idle');
  const [exportData, setExportData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleExport = async (format: 'json' | 'csv') => {
    setExportStatus('loading');
    setError('');
    
    try {
      const result = await requestDataExport(format);
      
      if (result.success && result.data) {
        setExportData(result.data);
        
        // Create downloadable file
        const blob = format === 'json' 
          ? new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
          : new Blob([convertToCSV(result.data)], { type: 'text/csv' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-data-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 3000);
      } else {
        setError(result.error || 'Failed to export data');
        setExportStatus('error');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setExportStatus('error');
    }
  };

  const handleDeleteRequest = async () => {
    if (deleteStatus === 'idle') {
      setDeleteStatus('confirm');
      return;
    }

    if (deleteStatus === 'confirm') {
      setDeleteStatus('loading');
      setError('');

      try {
        const result = await requestDataDeletion();
        
        if (result.success) {
          setDeleteStatus('success');
        } else {
          setError(result.error || 'Failed to process deletion request');
          setDeleteStatus('error');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        setDeleteStatus('error');
      }
    }
  };

  const cancelDelete = () => {
    setDeleteStatus('idle');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Privacy & Rights
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your personal data in accordance with GDPR
          </p>
        </div>
      </div>

      {/* Data Export Section */}
      <motion.div 
        className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              Download Your Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Export all your personal data including profile information, leave requests, 
              attendance records, and activity logs.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleExport('json')}
                disabled={exportStatus === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {exportStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileJson className="w-4 h-4" />
                )}
                Export as JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportStatus === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {exportStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Export as CSV
              </button>
            </div>

            {exportStatus === 'success' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 mt-3 text-sm text-green-600 dark:text-green-400"
              >
                <CheckCircle className="w-4 h-4" />
                Data exported successfully!
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Data Deletion Section */}
      <motion.div 
        className="p-5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              Delete Your Account & Data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {deleteStatus === 'idle' && (
              <button
                onClick={handleDeleteRequest}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Request Account Deletion
              </button>
            )}

            {deleteStatus === 'confirm' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg"
              >
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Are you sure?</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  This will permanently delete all your data including:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside mb-4 space-y-1">
                  <li>Your profile and personal information</li>
                  <li>All leave requests and history</li>
                  <li>Attendance records</li>
                  <li>Activity logs</li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteRequest}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Yes, Delete My Data
                  </button>
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {deleteStatus === 'loading' && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing deletion request...
              </div>
            )}

            {deleteStatus === 'success' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-green-600 dark:text-green-400"
              >
                <CheckCircle className="w-4 h-4" />
                Deletion request submitted. You will be signed out shortly.
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-2"
        >
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </motion.div>
      )}
    </div>
  );
}

// Helper to convert data to CSV
function convertToCSV(data: any): string {
  const lines: string[] = [];
  
  // Profile section
  if (data.profile) {
    lines.push('=== PROFILE ===');
    lines.push(Object.keys(data.profile).join(','));
    lines.push(Object.values(data.profile).map(v => `"${v}"`).join(','));
    lines.push('');
  }
  
  // Leave requests
  if (data.leaveRequests?.length) {
    lines.push('=== LEAVE REQUESTS ===');
    lines.push(Object.keys(data.leaveRequests[0]).join(','));
    data.leaveRequests.forEach((row: any) => {
      lines.push(Object.values(row).map(v => `"${v}"`).join(','));
    });
    lines.push('');
  }
  
  // Attendance
  if (data.attendance?.length) {
    lines.push('=== ATTENDANCE ===');
    lines.push(Object.keys(data.attendance[0]).join(','));
    data.attendance.forEach((row: any) => {
      lines.push(Object.values(row).map(v => `"${v}"`).join(','));
    });
  }
  
  return lines.join('\n');
}

export default DataPrivacySettings;
