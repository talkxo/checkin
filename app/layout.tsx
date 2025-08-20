import './globals.css';
import 'bulma/css/bulma.min.css';
import React from 'react';
import { Source_Sans_3 } from 'next/font/google';

const sourceSans = Source_Sans_3({ subsets: ['latin'], display: 'swap' });

export const metadata = { title: 'TalkXO Check-in' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sourceSans.className} has-background-light`}>{children}</body>
    </html>
  );
}


