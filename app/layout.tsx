import './globals.css';
import React from 'react';
import { Providers } from './providers';
import { Source_Sans_3, Playfair_Display } from 'next/font/google';

// Load Source Sans Pro
const sourceSansPro = Source_Sans_3({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700', '900'],
  variable: '--font-source-sans-pro',
  display: 'swap',
});

// Load Playfair Display font
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-playfair-display',
  display: 'swap',
});

export const metadata = { title: 'INSYDE - Attendance Management' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSansPro.variable} ${playfairDisplay.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cal+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={sourceSansPro.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}


