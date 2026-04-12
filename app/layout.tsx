import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Better CRM',
  description: 'Clinic workspace for patient registration, test selection, and printable lab reports.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className="bg-surface-container-lowest text-on-surface min-h-screen selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}