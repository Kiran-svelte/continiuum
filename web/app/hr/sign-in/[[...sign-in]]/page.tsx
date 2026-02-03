import { redirect } from "next/navigation";

export default function HRSignInPage() {
    redirect("/sign-in?redirect=/onboarding?intent=hr");
}
