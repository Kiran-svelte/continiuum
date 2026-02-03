import { redirect } from "next/navigation";

export default function EmployeeSignUpPage() {
    redirect("/sign-up?redirect=/onboarding?intent=employee");
}
