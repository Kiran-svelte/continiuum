"use client";

/**
 * 🛡️ CONTINUUM GDPR CONSENT BANNER
 * 
 * Enterprise-grade consent management UI:
 * - Cookie consent
 * - Data processing preferences
 * - Granular consent controls
 * - GDPR compliant
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Cookie, Settings, Check, X } from 'lucide-react';
import { recordUserConsent } from '@/lib/enterprise/server-actions';

interface ConsentBannerProps {
  userId?: string;
  onConsentChange?: (consents: ConsentState) => void;
}

interface ConsentState {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  performance: boolean;
}

const CONSENT_STORAGE_KEY = 'continuum_consent_preferences';

export function ConsentBanner({ userId, onConsentChange }: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consents, setConsents] = useState<ConsentState>({
    functional: true, // Always required
    analytics: false,
    marketing: false,
    performance: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Check if consent has been given before
  useEffect(() => {
    const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!storedConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(storedConsent);
        setConsents(parsed);
      } catch {
        setIsVisible(true);
      }
    }
  }, []);

  const handleAcceptAll = async () => {
    const allConsents: ConsentState = {
      functional: true,
      analytics: true,
      marketing: true,
      performance: true,
    };
    await saveConsents(allConsents);
  };

  const handleRejectNonEssential = async () => {
    const essentialOnly: ConsentState = {
      functional: true,
      analytics: false,
      marketing: false,
      performance: false,
    };
    await saveConsents(essentialOnly);
  };

  const handleSavePreferences = async () => {
    await saveConsents(consents);
  };

  const saveConsents = async (consentState: ConsentState) => {
    setIsSaving(true);
    try {
      // Save to local storage
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentState));

      // If user is logged in, save to server
      if (userId) {
        await Promise.all([
          recordUserConsent('analytics', consentState.analytics),
          recordUserConsent('marketing', consentState.marketing),
          recordUserConsent('performance', consentState.performance),
          recordUserConsent('functional', consentState.functional),
        ]);
      }

      setConsents(consentState);
      onConsentChange?.(consentState);
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to save consent preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleConsent = (key: keyof ConsentState) => {
    if (key === 'functional') return; // Can't disable functional cookies
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Main Banner */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Privacy & Cookie Preferences
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  We use cookies to enhance your experience, analyze traffic, and personalize content.
                  You can customize your preferences below or accept all cookies.
                </p>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    onClick={handleAcceptAll}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleRejectNonEssential}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Customize
                  </button>
                </div>

                {/* Detailed Settings */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4"
                    >
                      <div className="space-y-3">
                        {/* Functional (Required) */}
                        <ConsentOption
                          icon={<Cookie className="w-4 h-4" />}
                          title="Essential Cookies"
                          description="Required for the website to function. Cannot be disabled."
                          checked={true}
                          disabled={true}
                          onChange={() => {}}
                        />

                        {/* Analytics */}
                        <ConsentOption
                          icon={<Cookie className="w-4 h-4" />}
                          title="Analytics Cookies"
                          description="Help us understand how visitors interact with our website."
                          checked={consents.analytics}
                          onChange={() => toggleConsent('analytics')}
                        />

                        {/* Performance */}
                        <ConsentOption
                          icon={<Cookie className="w-4 h-4" />}
                          title="Performance Cookies"
                          description="Used to improve website speed and functionality."
                          checked={consents.performance}
                          onChange={() => toggleConsent('performance')}
                        />

                        {/* Marketing */}
                        <ConsentOption
                          icon={<Cookie className="w-4 h-4" />}
                          title="Marketing Cookies"
                          description="Used to deliver personalized advertisements."
                          checked={consents.marketing}
                          onChange={() => toggleConsent('marketing')}
                        />
                      </div>

                      <button
                        onClick={handleSavePreferences}
                        disabled={isSaving}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsVisible(false)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface ConsentOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function ConsentOption({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: ConsentOptionProps) {
  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        disabled
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed'
          : checked
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
      }`}
    >
      <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${
            checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          <div
            className={`w-4 h-4 mt-1 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5 ml-0' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
    </label>
  );
}

export default ConsentBanner;
