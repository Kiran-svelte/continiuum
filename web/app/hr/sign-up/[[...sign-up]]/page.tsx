import { redirect } from "next/navigation";

export default function HRSignUpPage() {
    redirect("/sign-up?redirect=/onboarding?intent=hr");
}
