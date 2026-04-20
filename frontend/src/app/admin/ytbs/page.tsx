"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function YtbsRedirectPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/admin/ytbs/query');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-xs font-black text-slate-500 uppercase tracking-widest">
                YTBS Paneline Yönlendiriliyorsunuz...
            </div>
        </div>
    );
}
