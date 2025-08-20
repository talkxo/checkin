import './globals.css';
import 'bulma/css/bulma.min.css';
import React from 'react';
import { Source_Sans_3 } from 'next/font/google';

const sourceSans3 = Source_Sans_3({ subsets: ['latin'] });

export const metadata = { title: 'TalkXO Check-in' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sourceSans3.className}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className="has-background-light">{children}</body>
    </html>
  );
}


