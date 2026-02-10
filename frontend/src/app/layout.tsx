import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "E-SCADA | Energy Monitoring System",
  description: "Next-gen industrial energy monitoring and SCADA platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 overflow-hidden`}>
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8 relative">
            <div className="absolute top-0 right-0 p-8 flex items-center gap-4 pointer-events-none">
              <div className="text-right pointer-events-auto">
                <p className="text-sm font-medium text-slate-200">System Admin</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 pointer-events-auto">
                SA
              </div>
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
