import './globals.css';
import React from 'react';
import { Providers } from './providers';
import { Source_Sans_3 } from 'next/font/google';

// Load Source Sans Pro
const sourceSansPro = Source_Sans_3({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700', '900'],
  variable: '--font-source-sans-pro',
  display: 'swap',
});

export const metadata = { title: 'INSYDE - Attendance Management' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sourceSansPro.variable}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className={sourceSansPro.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}


