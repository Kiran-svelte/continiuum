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
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            if (showToast) {
                toast.success(toastMessage);
            }
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
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
