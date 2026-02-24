import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import { Toaster } from 'react-hot-toast';

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
    <html lang="en">
      <body className={`${inter.className} min-h-screen transition-colors duration-300 overflow-hidden`}>
        <Providers>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0B0F1A',
                color: '#fff',
                border: '1px solid #1E293B',
                fontSize: '12px',
                fontWeight: 'bold',
                letterSpacing: '0.05em'
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#0B0F1A' }
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#0B0F1A' }
              }
            }}
          />
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
