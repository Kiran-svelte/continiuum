"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WelcomeAnimation } from "@/components/onboarding/welcome-animation";
import { formatDisplayName } from "@/lib/utils";
import { TutorialGuide } from "@/components/onboarding/tutorial-guide";
import { checkFeatureAccess } from "@/app/actions/onboarding";
import type { User } from "@supabase/supabase-js";

export default function HRWelcomePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [phase, setPhase] = useState<"welcome" | "tutorial" | "done">("welcome");
    const [accessData, setAccessData] = useState<any>(null);
    const searchParams = useSearchParams();
    
    // Fetch user on mount
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
    }, []);

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
                router.push("/hr/dashboard");
            }
        };
        check();
    }, [router, searchParams]);

    const handleWelcomeComplete = () => {
        if (accessData?.showTutorial) {
            setPhase("tutorial");
        } else {
            router.push("/hr/dashboard");
        }
    };

    const handleTutorialComplete = () => {
        router.push("/hr/dashboard");
    };

    const userName = formatDisplayName(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email, "there");

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
                    role="hr" 
                    onComplete={handleTutorialComplete}
                />
            )}
        </>
    );
}
