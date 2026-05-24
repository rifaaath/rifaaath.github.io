'use client';
import { Instagram } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLang } from '@/context/language-context';

const content = {
  en: {
    rights: 'All Rights Reserved.',
  },
  de: {
    rights: 'Alle Rechte vorbehalten.',
  },
  ar: {
    rights: 'كل الحقوق محفوظة.',
  }
};

export function Footer() {
  const { lang } = useLang();
  const pageContent = content[lang];

  return (
    <footer className="bg-background/80 backdrop-blur-sm text-secondary-foreground">
      <div className="container mx-auto py-12 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex items-center mb-6 md:mb-0">
            <Image src="/logo.png" alt="MHG Erlangen Logo" width={40} height={40} />
            <span className="ml-3 font-headline text-xl font-bold">MHG Erlangen</span>
          </div>
          <div className="flex space-x-6">
            <Link href="https://www.instagram.com/mhgerlangen/" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">
              <Instagram className="h-6 w-6" />
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <p>&copy; {new Date().getFullYear()} MHG Erlangen. {pageContent.rights}</p>
        </div>
      </div>
    </footer>
  );
}
