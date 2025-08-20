import './globals.css';
import React from 'react';

export const metadata = { title: 'TalkXO Check-in' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className="bg-gray-50 min-h-screen font-sans">{children}</body>
    </html>
  );
}


