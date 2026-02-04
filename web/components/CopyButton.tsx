"use client";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyButtonProps {
    text: string;
    label?: string;
    showToast?: boolean;
    toastMessage?: string;
    className?: string;
}

export default function CopyButton({ 
    text, 
    label,
    showToast = true,
    toastMessage = "Copied to clipboard!",
    className = ""
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!text) {
            toast.error("Nothing to copy");
            return;
        }
        
        try {
            // Modern clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand("copy");
                textArea.remove();
            }
            setCopied(true);
            if (showToast) {
                toast.success(toastMessage);
            }
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Copy failed:", error);
            toast.error("Failed to copy to clipboard");
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors inline-flex items-center gap-2 ${className}`}
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
        >
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            {label && <span className="text-sm">{label}</span>}
        </button>
    );
}
