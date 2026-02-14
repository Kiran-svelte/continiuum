'use client';

import { useState, useEffect } from 'react';
import { getEmployeeProfile, updateEmployeeProfile } from "@/app/actions/employee-profile";
import { User, Mail, Briefcase, Building2, Calendar, BadgeCheck, Hash, Edit2, Save, X, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState({
        full_name: '',
        phone: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const res = await getEmployeeProfile();
            if (res.success && res.profile) {
                setProfile(res.profile);
                setEditData({
                    full_name: res.profile.name || '',
                    phone: res.profile.phone || '',
                    emergency_contact_name: res.profile.emergency_contact_name || '',
                    emergency_contact_phone: res.profile.emergency_contact_phone || '',
                });
            } else {
                setError(res.error || 'Failed to load profile');
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
            setError('An unexpected error occurred');
        }
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const res = await updateEmployeeProfile(editData);
            if (res.success) {
                toast.success('Profile updated successfully');
                setEditing(false);
                await loadProfile();
            } else {
                toast.error(res.error || 'Failed to update profile');
            }
        } catch (err) {
            toast.error('Error updating profile');
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
                <p className="text-red-400 text-lg">{error || 'Failed to load profile.'}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                    <p className="text-slate-400">View and manage your personal information.</p>
                </div>
                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
                    >
                        <Edit2 size={16} /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setEditing(false)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors text-sm"
                        >
                            <X size={16} /> Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ID Card */}
                <div className="md:col-span-1">
                    <div className="glass-panel p-6 text-center h-full relative overflow-hidden">
                        <div className="w-28 h-28 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full mx-auto mb-4 border-4 border-slate-700/50 flex items-center justify-center shadow-xl">
                            <span className="text-4xl font-bold text-white">
                                {profile.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U'}
                            </span>
                        </div>

                        {editing ? (
                            <input
                                type="text"
                                value={editData.full_name}
                                onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full text-center bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-lg font-bold mb-2 focus:outline-none focus:border-cyan-500"
                            />
                        ) : (
                            <h2 className="text-xl font-bold text-white mb-1">{profile.name}</h2>
                        )}
                        <p className="text-cyan-400 font-medium mb-4">{profile.position || 'Employee'}</p>

                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                            <Hash className="w-3 h-3" />
                            ID: <span className="font-mono text-white">{profile.emp_id}</span>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="glass-panel p-8">
                        <h3 className="text-lg font-semibold text-white mb-6 border-b border-white/5 pb-4">Employment Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <DetailItem icon={Mail} label="Email Address" value={profile.email} />
                            <DetailItem icon={Building2} label="Company" value={profile.company} />
                            <DetailItem icon={Briefcase} label="Department" value={profile.department || 'Not Set'} />
                            <DetailItem icon={Calendar} label="Date Joined" value={profile.join_date ? new Date(profile.join_date).toLocaleDateString() : 'Not Set'} />
                            <DetailItem icon={User} label="Reporting Manager" value={profile.manager || 'Not Assigned'} />
                            <DetailItem icon={BadgeCheck} label="Status" value={profile.status || 'Active'} color="text-emerald-400" />
                        </div>
                    </div>

                    {/* Contact Info - Editable */}
                    <div className="glass-panel p-8">
                        <h3 className="text-lg font-semibold text-white mb-6 border-b border-white/5 pb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            {editing ? (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold uppercase text-slate-500 mb-2 block">Phone</label>
                                        <input
                                            type="tel"
                                            value={editData.phone}
                                            onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="Enter phone number"
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase text-slate-500 mb-2 block">Emergency Contact Name</label>
                                        <input
                                            type="text"
                                            value={editData.emergency_contact_name}
                                            onChange={(e) => setEditData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                                            placeholder="Enter emergency contact name"
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase text-slate-500 mb-2 block">Emergency Contact Phone</label>
                                        <input
                                            type="tel"
                                            value={editData.emergency_contact_phone}
                                            onChange={(e) => setEditData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                                            placeholder="Enter emergency contact phone"
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <DetailItem icon={Phone} label="Phone" value={profile.phone || 'Not Set'} />
                                    <DetailItem icon={User} label="Emergency Contact" value={profile.emergency_contact_name || 'Not Set'} />
                                    <DetailItem icon={Phone} label="Emergency Phone" value={profile.emergency_contact_phone || 'Not Set'} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailItem({ icon: Icon, label, value, color = "text-white" }: any) {
    return (
        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
            <div className="p-2.5 rounded-lg bg-slate-800/80 text-slate-400 ring-1 ring-white/5">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-1 tracking-wider">{label}</p>
                <p className={`font-medium ${color}`}>{value}</p>
            </div>
        </div>
    );
}
