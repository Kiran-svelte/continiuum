import { currentUser } from "@clerk/nextjs/server";
import { getCompanyDetails } from "@/app/actions/hr";
import { Copy, Building2, MapPin, Globe, Users } from "lucide-react";
import CopyButton from "@/components/CopyButton"; // We'll create a small client component for this or inline it

export default async function CompanyProfilePage() {
    const res = await getCompanyDetails();

    if (!res.success || !res.company) {
        return <div className="text-white">Error loading company details.</div>
    }

    const { company } = res;

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold dark:text-white text-slate-900 mb-2">Company Profile</h1>
                <p className="dark:text-slate-400 text-slate-600">Manage your organization's identity and access.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Access Card */}
                <div className="glass-panel p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-all" />

                    <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-6 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-purple-500" />
                        Workspace Authorization
                    </h2>

                    <div className="dark:bg-black/40 bg-slate-100 rounded-xl p-6 dark:border-white/5 border-slate-200 border mb-6">
                        <label className="text-xs font-mono dark:text-slate-500 text-slate-500 uppercase tracking-widest mb-2 block">Company Access Code</label>
                        <div className="flex items-center justify-between gap-4">
                            <code className="text-3xl font-mono text-[#00f2ff] tracking-widest font-bold">
                                {company.code}
                            </code>
                            {/* Client Component for Copy */}
                            <CopyButton text={company.code} />
                        </div>
                    </div>

                    <p className="text-sm dark:text-slate-400 text-slate-600">
                        Share this code with your employees. They will need it to join your workspace during sign-up.
                    </p>
                </div>

                {/* Details Card */}
                <div className="glass-panel p-8">
                    <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-6 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-pink-500" />
                        Organization Details
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Company Name</label>
                            <div className="text-lg dark:text-white text-slate-900 font-semibold">{company.name}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Industry</label>
                                <div className="dark:text-white text-slate-900 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    {company.industry || "Not set"}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Size</label>
                                <div className="dark:text-white text-slate-900 flex items-center gap-2">
                                    <Users className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                                    {company.size || "Unknown"}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Location</label>
                            <div className="dark:text-white text-slate-900 flex items-center gap-2">
                                <MapPin className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                                {company.location || "Remote"}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Website</label>
                            {company.website && company.website !== "N/A" ? (
                                <a 
                                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:underline truncate block"
                                >
                                    {company.website}
                                </a>
                            ) : (
                                <span className="dark:text-slate-500 text-slate-500">Not set</span>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t dark:border-white/10 border-slate-200">
                        <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Administrator Profile
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Full Name</label>
                                <div className="dark:text-white text-slate-900 font-medium">{res.employee?.full_name}</div>
                            </div>
                            <div>
                                <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Email</label>
                                <div className="dark:text-slate-300 text-slate-700">{res.employee?.email}</div>
                            </div>
                            <div>
                                <label className="text-sm dark:text-slate-500 text-slate-500 block mb-1">Role</label>
                                <div className="inline-block px-2 py-1 dark:bg-purple-500/20 bg-purple-100 dark:text-purple-300 text-purple-700 text-xs rounded dark:border-purple-500/30 border-purple-300 border">
                                    {res.employee?.position || "HR Admin"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
