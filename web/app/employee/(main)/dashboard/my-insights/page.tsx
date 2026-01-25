import { EmployeeSmartDashboard } from "@/components/dashboard";

// Force dynamic since we're fetching data that changes frequently
export const dynamic = 'force-dynamic';

export default function MyInsightsPage() {
    return <EmployeeSmartDashboard />;
}
