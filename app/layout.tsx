import './globals.css';
import 'bulma/css/bulma.min.css';
import React from 'react';
export const metadata = { title: 'TalkXO Check-in' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="has-background-light">{children}</body>
    </html>
  );
}


