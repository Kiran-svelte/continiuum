"use client";

import { useEffect, useRef, useCallback } from 'react';

/**
 * Screen Reader Live Region Component
 * Provides aria-live announcements for dynamic content changes
 * 
 * Usage:
 * 1. Import the component and hook
 * 2. Add <ScreenReaderAnnouncer /> to your layout
 * 3. Use announce() from useAnnounce() hook to make announcements
 */

// Global announcement queue
let announcementCallback: ((message: string, priority: 'polite' | 'assertive') => void) | null = null;

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (announcementCallback) {
            announcementCallback(message, priority);
        }
    }, []);
    
    return { announce };
}

/**
 * Screen Reader Announcer Component
 * Add this to your root layout
 */
export function ScreenReaderAnnouncer() {
    const politeRef = useRef<HTMLDivElement>(null);
    const assertiveRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        announcementCallback = (message: string, priority: 'polite' | 'assertive') => {
            const element = priority === 'assertive' ? assertiveRef.current : politeRef.current;
            if (element) {
                // Clear and set to trigger announcement
                element.textContent = '';
                // Use requestAnimationFrame to ensure the clear is processed
                requestAnimationFrame(() => {
                    element.textContent = message;
                });
            }
        };
        
        return () => {
            announcementCallback = null;
        };
    }, []);
    
    return (
        <>
            {/* Polite announcements - wait for user to finish current task */}
            <div
                ref={politeRef}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
                style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                }}
            />
            {/* Assertive announcements - interrupt immediately */}
            <div
                ref={assertiveRef}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="sr-only"
                style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                }}
            />
        </>
    );
}

/**
 * Hook for announcing loading states
 */
export function useLoadingAnnouncement() {
    const { announce } = useAnnounce();
    
    const announceLoading = useCallback((action: string) => {
        announce(`${action} loading, please wait.`, 'polite');
    }, [announce]);
    
    const announceComplete = useCallback((action: string, success: boolean = true) => {
        if (success) {
            announce(`${action} complete.`, 'polite');
        } else {
            announce(`${action} failed. Please try again.`, 'assertive');
        }
    }, [announce]);
    
    return { announceLoading, announceComplete };
}

/**
 * Component wrapper that announces loading state changes
 */
interface LoadingAnnouncerProps {
    loading: boolean;
    loadingMessage?: string;
    completeMessage?: string;
    children: React.ReactNode;
}

export function LoadingAnnouncer({ 
    loading, 
    loadingMessage = 'Loading',
    completeMessage = 'Content loaded',
    children 
}: LoadingAnnouncerProps) {
    const { announce } = useAnnounce();
    const previousLoading = useRef(loading);
    
    useEffect(() => {
        if (loading && !previousLoading.current) {
            // Started loading
            announce(`${loadingMessage}, please wait.`, 'polite');
        } else if (!loading && previousLoading.current) {
            // Finished loading
            announce(completeMessage, 'polite');
        }
        previousLoading.current = loading;
    }, [loading, loadingMessage, completeMessage, announce]);
    
    return <>{children}</>;
}

/**
 * Announce form submission results
 */
export function useFormAnnouncement() {
    const { announce } = useAnnounce();
    
    const announceSubmitting = useCallback(() => {
        announce('Form submitting, please wait.', 'polite');
    }, [announce]);
    
    const announceSuccess = useCallback((message: string = 'Form submitted successfully.') => {
        announce(message, 'polite');
    }, [announce]);
    
    const announceError = useCallback((message: string = 'Form submission failed. Please check the errors and try again.') => {
        announce(message, 'assertive');
    }, [announce]);
    
    const announceValidationError = useCallback((fieldCount: number) => {
        announce(`${fieldCount} validation ${fieldCount === 1 ? 'error' : 'errors'} found. Please correct and try again.`, 'assertive');
    }, [announce]);
    
    return { announceSubmitting, announceSuccess, announceError, announceValidationError };
}
