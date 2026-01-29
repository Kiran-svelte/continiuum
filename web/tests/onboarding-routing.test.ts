import test from "node:test";
import assert from "node:assert/strict";

import { shouldRedirectToEmployeePending } from "@/lib/onboarding/routing";

test("HR intent never redirects to employee pending", () => {
    const should = shouldRedirectToEmployeePending({
        employee: {
            role: "employee",
            org_id: "org_123",
            onboarding_status: "pending_approval",
            approval_status: "pending",
        },
        intent: "hr",
    });

    assert.equal(should, false);
});

test("HR role never redirects to employee pending", () => {
    const should = shouldRedirectToEmployeePending({
        employee: {
            role: "hr",
            org_id: "org_123",
            onboarding_status: "pending_approval",
            approval_status: "pending",
        },
        intent: "employee",
    });

    assert.equal(should, false);
});

test("Employee pending approval with org redirects", () => {
    const should = shouldRedirectToEmployeePending({
        employee: {
            role: "employee",
            org_id: "org_123",
            onboarding_status: "pending_approval",
            approval_status: "pending",
        },
        intent: "employee",
    });

    assert.equal(should, true);
});
