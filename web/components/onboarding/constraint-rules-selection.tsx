"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    Info,
    AlertTriangle,
    Gauge,
    Calculator,
    Users,
    CalendarX,
    Clock,
    Binary,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { DEFAULT_CONSTRAINT_RULES, RULE_CATEGORIES } from "@/lib/constraint-rules-config";

// Icons mapping
const categoryIcons: Record<string, React.ElementType> = {
    limits: Gauge,
    balance: Calculator,
    coverage: Users,
    blackout: CalendarX,
    notice: Clock,
    calculation: Binary,
    eligibility: Shield,
    documentation: FileText,
    escalation: AlertTriangle,
};

const categoryColors: Record<string, string> = {
    limits: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    balance: "bg-green-500/10 text-green-500 border-green-500/20",
    coverage: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    blackout: "bg-red-500/10 text-red-500 border-red-500/20",
    notice: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    calculation: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    eligibility: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    documentation: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    escalation: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

interface ConstraintRulesSelectionProps {
    selectedRules: Record<string, boolean>;
    onRulesChange: (rules: Record<string, boolean>) => void;
}

export function ConstraintRulesSelection({
    selectedRules,
    onRulesChange,
}: ConstraintRulesSelectionProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["limits", "balance"]));

    // Group rules by category
    const rulesByCategory = Object.entries(DEFAULT_CONSTRAINT_RULES).reduce(
        (acc, [ruleId, rule]) => {
            const category = rule.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({ ruleId, ...rule });
            return acc;
        },
        {} as Record<string, Array<{ ruleId: string } & typeof DEFAULT_CONSTRAINT_RULES[keyof typeof DEFAULT_CONSTRAINT_RULES]>>
    );

    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const toggleRule = (ruleId: string) => {
        onRulesChange({
            ...selectedRules,
            [ruleId]: !selectedRules[ruleId],
        });
    };

    const toggleAllInCategory = (category: string, enabled: boolean) => {
        const categoryRules = rulesByCategory[category] || [];
        const updates = categoryRules.reduce(
            (acc, rule) => {
                acc[rule.ruleId] = enabled;
                return acc;
            },
            {} as Record<string, boolean>
        );
        onRulesChange({ ...selectedRules, ...updates });
    };

    const enableAll = () => {
        const allEnabled = Object.keys(DEFAULT_CONSTRAINT_RULES).reduce(
            (acc, ruleId) => {
                acc[ruleId] = true;
                return acc;
            },
            {} as Record<string, boolean>
        );
        onRulesChange(allEnabled);
    };

    const disableAll = () => {
        const allDisabled = Object.keys(DEFAULT_CONSTRAINT_RULES).reduce(
            (acc, ruleId) => {
                acc[ruleId] = false;
                return acc;
            },
            {} as Record<string, boolean>
        );
        onRulesChange(allDisabled);
    };

    const enabledCount = Object.values(selectedRules).filter(Boolean).length;
    const totalCount = Object.keys(DEFAULT_CONSTRAINT_RULES).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Select Constraint Rules</h3>
                <p className="text-muted-foreground text-sm">
                    Choose which leave policy rules to enforce for your company.
                    You can change these later in Settings.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {enabledCount} of {totalCount} rules enabled
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={enableAll}>
                        <Check className="h-4 w-4 mr-1" />
                        Enable All
                    </Button>
                    <Button variant="outline" size="sm" onClick={disableAll}>
                        <X className="h-4 w-4 mr-1" />
                        Disable All
                    </Button>
                </div>
            </div>

            {/* Rules by Category */}
            <div className="space-y-3">
                {Object.entries(RULE_CATEGORIES).map(([categoryKey, category]) => {
                    const rules = rulesByCategory[categoryKey] || [];
                    if (rules.length === 0) return null;

                    const Icon = categoryIcons[categoryKey] || Shield;
                    const colorClass = categoryColors[categoryKey] || "bg-gray-500/10 text-gray-500";
                    const enabledInCategory = rules.filter((r) => selectedRules[r.ruleId]).length;
                    const isExpanded = expandedCategories.has(categoryKey);

                    return (
                        <Collapsible
                            key={categoryKey}
                            open={isExpanded}
                            onOpenChange={() => toggleCategory(categoryKey)}
                        >
                            <Card className={cn("transition-all", isExpanded && "ring-1 ring-primary/20")}>
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg", colorClass)}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{category.name}</CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {enabledInCategory} of {rules.length} enabled
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={enabledInCategory > 0 ? "default" : "secondary"}>
                                                    {enabledInCategory}/{rules.length}
                                                </Badge>
                                                {isExpanded ? (
                                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent className="pt-0 pb-4">
                                        {/* Category Quick Toggle */}
                                        <div className="flex justify-end gap-2 mb-3 pb-3 border-b">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAllInCategory(categoryKey, true);
                                                }}
                                            >
                                                Enable All
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAllInCategory(categoryKey, false);
                                                }}
                                            >
                                                Disable All
                                            </Button>
                                        </div>

                                        {/* Rules List */}
                                        <div className="space-y-3">
                                            {rules.map((rule) => (
                                                <motion.div
                                                    key={rule.ruleId}
                                                    initial={false}
                                                    animate={{
                                                        opacity: selectedRules[rule.ruleId] ? 1 : 0.7,
                                                    }}
                                                    className={cn(
                                                        "flex items-start justify-between p-3 rounded-lg border transition-all",
                                                        selectedRules[rule.ruleId]
                                                            ? "bg-primary/5 border-primary/20"
                                                            : "bg-muted/30 border-transparent"
                                                    )}
                                                >
                                                    <div className="flex-1 mr-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm">{rule.name}</span>
                                                            {rule.is_blocking && (
                                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                                    Blocking
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {rule.description}
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={selectedRules[rule.ruleId] ?? true}
                                                        onCheckedChange={() => toggleRule(rule.ruleId)}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>
                    );
                })}
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">About Constraint Rules</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li><strong>Blocking</strong> rules prevent leave requests from being submitted</li>
                        <li><strong>Non-blocking</strong> rules show warnings but allow submission</li>
                        <li>Rules can be customized in detail after onboarding</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ConstraintRulesSelection;
