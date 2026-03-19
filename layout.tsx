import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Pokemon Card Investing Dashboard',
  description: 'Live deployable dashboard for scanner, portfolio, grading tracker, and eBay listings.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#09090b', color: '#fff', fontFamily: 'Inter, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
