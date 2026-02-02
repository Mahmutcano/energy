export default function Settings() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 italic">
                    System <span className="text-slate-500 italic">Settings</span>
                </h1>
                <p className="text-slate-400">Configure global platform parameters and RBAC</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800">
                        <h3 className="font-bold text-lg mb-6 text-slate-200">Protocol Configuration</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Default Port (IEC 104)</label>
                                <input type="number" defaultValue={2404} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Connection Timeout (ms)</label>
                                <input type="number" defaultValue={5000} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center">
                        <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                            <span className="text-3xl font-black text-blue-400 font-mono italic">EE</span>
                        </div>
                        <h3 className="text-xl font-bold text-white italic">Exto Energy Platform</h3>
                        <p className="text-sm text-slate-500 mt-2 italic font-medium tracking-tight">Enterprise Edition v1.4.0</p>
                        <div className="mt-6 flex justify-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400">LICENSE: ACTIVE</span>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">SECURE SSL</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
