"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/lib/supabase/hooks";
import { WelcomeAnimation } from "@/components/onboarding/welcome-animation";
import { formatDisplayName } from "@/lib/utils";
import { TutorialGuide } from "@/components/onboarding/tutorial-guide";
import { checkFeatureAccess } from "@/app/actions/onboarding";

export default function EmployeeWelcomePage() {
    const router = useRouter();
    const { user } = useSupabaseUser();
    const [phase, setPhase] = useState<"welcome" | "tutorial" | "done">("welcome");
    const [accessData, setAccessData] = useState<any>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const check = async () => {
            const access = await checkFeatureAccess();
            setAccessData(access);
            
            // If welcome already shown, skip to tutorial
            const forceTutorial = searchParams?.get("tutorial") === "1";
            if (forceTutorial) {
                setPhase("tutorial");
                return;
            }
            if (!access.showWelcome && access.showTutorial) {
                setPhase("tutorial");
            } else if (!access.showWelcome && !access.showTutorial) {
                // Already completed everything
                router.push("/employee/dashboard");
            }
        };
        check();
    }, [router, searchParams]);

    const handleWelcomeComplete = () => {
        if (accessData?.showTutorial) {
            setPhase("tutorial");
        } else {
            router.push("/employee/dashboard");
        }
    };

    const handleTutorialComplete = () => {
        router.push("/employee/dashboard");
    };

    const userName = formatDisplayName(user?.user_metadata?.full_name || user?.email, "there");

    return (
        <>
            {phase === "welcome" && (
                <WelcomeAnimation 
                    userName={userName} 
                    onComplete={handleWelcomeComplete}
                />
            )}
            {phase === "tutorial" && (
                <TutorialGuide 
                    role="employee" 
                    onComplete={handleTutorialComplete}
                />
            )}
        </>
    );
}
