/**
 * 🎨 THEME TOGGLE COMPONENT
 * 
 * Beautiful animated theme toggle button with three states:
 * - Light mode (sun icon)
 * - Dark mode (moon icon)
 * - System mode (computer icon)
 */

"use client";

import { useTheme } from '@/lib/theme/theme-provider';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Theme } from '@/lib/theme/theme-config';

interface ThemeToggleProps {
  /** Show as dropdown or simple toggle */
  variant?: 'toggle' | 'dropdown';
  /** Size of the toggle */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function ThemeToggle({
  variant = 'dropdown',
  size = 'md',
  className,
  showLabel = false,
  ariaLabel = 'Toggle theme',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, mounted } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          'rounded-lg bg-white/5 dark:bg-white/5 light:bg-gray-100',
          className
        )} 
      />
    );
  }

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[2];
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  if (variant === 'toggle') {
    return (
      <motion.button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={cn(
          sizeClasses[size],
          'relative flex items-center justify-center rounded-xl',
          'bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10',
          'light:bg-gray-100 light:hover:bg-gray-200',
          'border border-white/10 dark:border-white/10 light:border-gray-200',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={ariaLabel}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={resolvedTheme}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.2 }}
          >
            <CurrentIcon className={cn(iconSizes[size], 'text-current')} />
          </motion.div>
        </AnimatePresence>
      </motion.button>
    );
  }

  // Dropdown variant
  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2',
          'bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10',
          'light:bg-gray-100 light:hover:bg-gray-200',
          'border border-white/10 dark:border-white/10 light:border-gray-200',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <CurrentIcon className={iconSizes[size]} />
        {showLabel && (
          <span className="text-sm font-medium">
            {currentOption.label}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute right-0 top-full mt-2 z-50',
              'min-w-[160px] rounded-xl overflow-hidden',
              'bg-white/10 dark:bg-[#0f0f19] light:bg-white',
              'backdrop-blur-xl',
              'border border-white/10 dark:border-white/10 light:border-gray-200',
              'shadow-xl'
            )}
            role="listbox"
            aria-label="Theme options"
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              
              return (
                <motion.button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3',
                    'transition-colors duration-150',
                    isSelected
                      ? 'bg-primary/20 text-primary'
                      : 'hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-100'
                  )}
                  whileHover={{ x: 4 }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm font-medium">
                    {option.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-4 h-4 text-primary" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Full theme selector for settings pages
 */
export function ThemeSelector({ className }: { className?: string }) {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = theme === option.value;
        
        return (
          <motion.button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl',
              'border transition-all duration-200',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-white/10 dark:border-white/10 light:border-gray-200 hover:border-primary/50 hover:bg-white/5'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className={cn('w-6 h-6', isSelected && 'text-primary')} />
            <span className="text-sm font-medium">{option.label}</span>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2"
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
