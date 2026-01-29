export type OnboardingIntent = "hr" | "employee";

export interface OnboardingEmployeeLike {
    role?: string | null;
    org_id?: string | null;
    onboarding_status?: string | null;
    approval_status?: string | null;
}

export function shouldRedirectToEmployeePending(params: {
    employee: OnboardingEmployeeLike;
    intent?: string | null;
}): boolean {
    const { employee, intent } = params;

    const role = (employee.role || "").toLowerCase();
    const onboardingStatus = (employee.onboarding_status || "").toLowerCase();
    const approvalStatus = (employee.approval_status || "").toLowerCase();

    const hasOrg = !!employee.org_id;

    // If the user explicitly came in as HR (e.g. /onboarding?intent=hr), never
    // route them into employee pending flows.
    if ((intent || "").toLowerCase() === "hr") return false;

    // HR/Admin should never go to the employee pending page.
    if (role === "hr" || role === "admin") return false;

    // Employee-like roles can be pending approval.
    const isPending = onboardingStatus === "pending_approval" || approvalStatus === "pending";

    return hasOrg && isPending;
}
