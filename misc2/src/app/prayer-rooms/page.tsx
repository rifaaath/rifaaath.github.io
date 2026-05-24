'use client';
import { useLang } from '@/context/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const content = {
  en: {
    title: 'Prayer & Quiet Rooms',
    subtitle: 'Find a quiet space for prayer and reflection on campus and around the city.',
    locations: [
      {
        name: 'Kapelle, Universitätsklinikum',
        address: 'Krankenhausstraße 12, Ground Floor, Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2576.950499653801!2d11.00282067711468!3d49.59779907142491!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f8b8a5e5e5e5%3A0x8e5e5e5e5e5e5e5e!2sKrankenhausstra%C3%9Fe%2012%2C%2091054%20Erlangen!5e0!3m2!1sen!2sde!4v1684343810123!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'Raum der Stille, Uniklinikum',
        address: 'Bettenhaus Chirurgie, Östliche Stadtmauerstraße 27, Ground Floor, Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2576.852528151246!2d11.008321077114757!3d49.59972377142512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f8b8e3a0a3b9%3A0x6b4f7e5b0b2e0d3c!2s%C3%96stliche%20Stadtmauerstra%C3%9Fe%2027%2C%2091054%20Erlangen!5e0!3m2!1sen!2sde!4v1684344012345!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'FAU WISO Nürnberg',
        address: 'Room LG 3.125, Lange Gasse 20, 90403 Nürnberg',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2581.425946955364!2d11.080183177111244!3d49.4503798713998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479f57a9e8f00001%3A0x9483344414899c6!2sLange%20Gasse%2020%2C%2090403%20N%C3%BCrnberg!5e0!3m2!1sen!2sde!4v1684344154321!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'Technische Fakultät (Unofficial)',
        address: 'Room 01.132-1, Erwin-Rommel-Straße 60, 91058 Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2578.470559648944!2d11.026779377113545!3d49.57018787141973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f73d4b6a8a79%3A0xad5f75c2509c379!2sErwin-Rommel-Stra%C3%9Fe%2060%2C%2091058%20Erlangen!5e0!3m2!1sen!2sde!4v1684344234567!5m2!1sen!2sde',
        notes: 'This prayer room is not officially designated but is available for use.',
        isUnofficial: true,
      },
    ],
  },
  de: {
    title: 'Gebets- & Ruheräume',
    subtitle: 'Finden Sie einen ruhigen Ort für Gebet und Besinnung auf dem Campus und in der Stadt.',
    locations: [
      {
        name: 'Kapelle, Universitätsklinikum',
        address: 'Krankenhausstraße 12, EG, Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2576.950499653801!2d11.00282067711468!3d49.59779907142491!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f8b8a5e5e5e5%3A0x8e5e5e5e5e5e5e5e!2sKrankenhausstra%C3%9Fe%2012%2C%2091054%20Erlangen!5e0!3m2!1sen!2sde!4v1684343810123!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'Raum der Stille, Uniklinikum',
        address: 'Bettenhaus Chirurgie, Östliche Stadtmauerstraße 27, EG, Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2576.852528151246!2d11.008321077114757!3d49.59972377142512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f8b8e3a0a3b9%3A0x6b4f7e5b0b2e0d3c!2s%C3%96stliche%20Stadtmauerstra%C3%9Fe%2027%2C%2091054%20Erlangen!5e0!3m2!1sen!2sde!4v1684344012345!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'FAU WISO Nürnberg',
        address: 'Raum LG 3.125, Lange Gasse 20, 90403 Nürnberg',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2581.425946955364!2d11.080183177111244!3d49.4503798713998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479f57a9e8f00001%3A0x9483344414899c6!2sLange%20Gasse%2020%2C%2090403%20N%C3%BCrnberg!5e0!3m2!1sen!2sde!4v1684344154321!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'Technische Fakultät (Inoffiziell)',
        address: 'Raum 01.132-1, Erwin-Rommel-Straße 60, 91058 Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2578.470559648944!2d11.026779377113545!3d49.57018787141973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f73d4b6a8a79%3A0xad5f75c2509c379!2sErwin-Rommel-Stra%C3%9Fe%2060%2C%2091058%20Erlangen!5e0!3m2!1sen!2sde!4v1684344234567!5m2!1sen!2sde',
        notes: 'Dieser Gebetsraum ist nicht offiziell ausgewiesen, steht aber zur Verfügung.',
        isUnofficial: true,
      },
    ],
  },
  ar: {
    title: 'غرف الصلاة والهدوء',
    subtitle: 'ابحث عن مكان هادئ للصلاة والتأمل في الحرم الجامعي وحول المدينة.',
    locations: [
      {
        name: 'كنيسة المستشفى الجامعي',
        address: 'Krankenhausstraße 12, الطابق الأرضي, Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2576.950499653801!2d11.00282067711468!3d49.59779907142491!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f8b8a5e5e5e5%3A0x8e5e5e5e5e5e5e5e!2sKrankenhausstra%C3%9Fe%2012%2C%2091054%20Erlangen!5e0!3m2!1sen!2sde!4v1684343810123!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'غرفة الهدوء، المستشفى الجامعي',
        address: 'Bettenhaus Chirurgie, Östliche Stadtmauerstraße 27, الطابق الأرضي, Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2576.852528151246!2d11.008321077114757!3d49.59972377142512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f8b8e3a0a3b9%3A0x6b4f7e5b0b2e0d3c!2s%C3%96stliche%20Stadtmauerstra%C3%9Fe%2027%2C%2091054%20Erlangen!5e0!3m2!1sen!2sde!4v1684344012345!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'FAU WISO Nürnberg',
        address: 'غرفة LG 3.125, Lange Gasse 20, 90403 Nürnberg',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2581.425946955364!2d11.080183177111244!3d49.4503798713998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479f57a9e8f00001%3A0x9483344414899c6!2sLange%20Gasse%2020%2C%2090403%20N%C3%BCrnberg!5e0!3m2!1sen!2sde!4v1684344154321!5m2!1sen!2sde',
        notes: '',
        isUnofficial: false,
      },
      {
        name: 'الكلية التقنية (غير رسمي)',
        address: 'غرفة 01.132-1, Erwin-Rommel-Straße 60, 91058 Erlangen',
        mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2578.470559648944!2d11.026779377113545!3d49.57018787141973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a1f73d4b6a8a79%3A0xad5f75c2509c379!2sErwin-Rommel-Stra%C3%9Fe%2060%2C%2091058%20Erlangen!5e0!3m2!1sen!2sde!4v1684344234567!5m2!1sen!2sde',
        notes: 'غرفة الصلاة هذه غير مخصصة رسميًا ولكنها متاحة للاستخدام.',
        isUnofficial: true,
      },
    ],
  },
};

export default function PrayerRoomsPage() {
  const { lang } = useLang();
  const pageContent = content[lang];
  const sortedLocations = pageContent.locations.sort((a, b) => (a.isUnofficial === b.isUnofficial) ? 0 : a.isUnofficial ? 1 : -1);


  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground">
            {pageContent.title}
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
            {pageContent.subtitle}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {sortedLocations.map((location, index) => (
            <Card key={index} className={cn("overflow-hidden bg-card/50", { 'bg-card/20': location.isUnofficial })}>
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center">
                  <MapPin className="mr-3 h-6 w-6 text-primary" />
                  {location.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{location.address}</p>
                {location.notes && (
                  <p className="text-sm text-amber-700 dark:text-amber-500 font-medium">
                    {location.notes}
                  </p>
                )}
                <div className="aspect-video w-full rounded-md overflow-hidden border">
                  <iframe
                    src={location.mapSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map of ${location.name}`}
                  ></iframe>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
