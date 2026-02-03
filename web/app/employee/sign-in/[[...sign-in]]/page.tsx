import { redirect } from "next/navigation";

export default function EmployeeSignInPage() {
    redirect("/sign-in?redirect=/onboarding?intent=employee");
}
