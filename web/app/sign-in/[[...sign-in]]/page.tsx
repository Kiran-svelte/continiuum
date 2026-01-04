import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 max-w-md w-full flex flex-col items-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 mb-8">
                    Company.AI
                </h1>
                <SignIn
                    appearance={{
                        elements: {
                            formButtonPrimary: "bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 transition-opacity",
                            card: "bg-transparent shadow-none",
                            headerTitle: "text-white",
                            headerSubtitle: "text-slate-400",
                            socialButtonsBlockButton: "bg-slate-800 border-white/10 text-white hover:bg-slate-700",
                            formFieldLabel: "text-slate-300",
                            formFieldInput: "bg-slate-900/50 border-white/10 text-white",
                            footerActionLink: "text-pink-500 hover:text-pink-400"
                        }
                    }}
                />
            </div>
        </div>
    );
}
