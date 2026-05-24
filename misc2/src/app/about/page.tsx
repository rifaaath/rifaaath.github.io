'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Handshake, Heart, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/context/language-context';

const content = {
  en: {
    title: 'About MHG Erlangen',
    subtitle: 'Fostering a vibrant community rooted in faith, knowledge, and service.',
    missionTitle: 'Our Mission',
    missionText:
      'MHG Erlangen is dedicated to creating a supportive and enriching environment for Muslim students. We aim to foster spiritual growth, academic excellence, and community engagement through a variety of programs and events that are both meaningful and enjoyable.',
    valuesTitle: 'Our Values',
    values: [
      {
        icon: Lightbulb,
        title: 'Knowledge',
        text: 'Promoting both Islamic and secular learning as a cornerstone of personal and community development.',
      },
      {
        icon: Handshake,
        title: 'Community',
        text: 'Building strong bonds of brotherhood and sisterhood in an inclusive and welcoming atmosphere.',
      },
      {
        icon: Heart,
        title: 'Service',
        text: 'Instilling a spirit of service and contribution to both the campus and the wider community.',
      },
    ],
  },
  de: {
    title: 'Über MHG Erlangen',
    subtitle: 'Förderung einer lebendigen Gemeinschaft, die in Glaube, Wissen und Dienst verwurzelt ist.',
    missionTitle: 'Unsere Mission',
    missionText:
      'Die MHG Erlangen setzt sich dafür ein, ein unterstützendes und bereicherndes Umfeld für muslimische Studierende zu schaffen. Unser Ziel ist es, spirituelles Wachstum, akademische Exzellenz und gesellschaftliches Engagement durch eine Vielzahl von sinnvollen und unterhaltsamen Programmen und Veranstaltungen zu fördern.',
    valuesTitle: 'Unsere Werte',
    values: [
      {
        icon: Lightbulb,
        title: 'Wissen',
        text: 'Förderung des islamischen und säkularen Lernens als Eckpfeiler der persönlichen und gemeinschaftlichen Entwicklung.',
      },
      {
        icon: Handshake,
        title: 'Gemeinschaft',
        text: 'Aufbau starker brüderlicher und schwesterlicher Bindungen in einer inklusiven und einladenden Atmosphäre.',
      },
      {
        icon: Heart,
        title: 'Dienst',
        text: 'Einen Geist des Dienstes und des Beitrags sowohl für den Campus als auch für die breitere Gemeinschaft zu vermitteln.',
      },
    ],
  },
  ar: {
    title: 'عن MHG Erlangen',
    subtitle: 'تنمية مجتمع نابض بالحياة متجذر في الإيمان والمعرفة والخدمة.',
    missionTitle: 'مهمتنا',
    missionText:
      'يكرس MHG Erlangen جهوده لخلق بيئة داعمة ومثرية للطلاب المسلمين. نهدف إلى تعزيز النمو الروحي والتفوق الأكاديمي والمشاركة المجتمعية من خلال مجموعة متنوعة من البرامج والفعاليات الهادفة والممتعة.',
    valuesTitle: 'قيمنا',
    values: [
      {
        icon: Lightbulb,
        title: 'المعرفة',
        text: 'تعزيز التعلم الإسلامي والعلماني كحجر زاوية في تنمية الفرد والمجتمع.',
      },
      {
        icon: Handshake,
        title: 'المجتمع',
        text: 'بناء روابط قوية من الأخوة والأخوة في جو شامل ومرحب.',
      },
      {
        icon: Heart,
        title: 'الخدمة',
        text: 'غرس روح الخدمة والمساهمة في الحرم الجامعي والمجتمع الأوسع.',
      },
    ],
  },
};

export default function AboutPage() {
  const { lang } = useLang();
  const pageContent = content[lang];
  const missionImage = PlaceHolderImages.find((img) => img.id === 'about-mission');

  return (
    <div className="container mx-auto px-4 py-16">
      <header className="text-center mb-16" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground">
          {pageContent.title}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {pageContent.subtitle}
        </p>
      </header>

      {/* Mission Section */}
      <section className="mb-24" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <h2 className="font-headline text-3xl font-semibold mb-4">{pageContent.missionTitle}</h2>
            <p className="text-muted-foreground leading-relaxed">{pageContent.missionText}</p>
          </div>
          <div className="order-1 md:order-2">
            {missionImage && (
              <Image
                src={missionImage.imageUrl}
                alt={missionImage.description}
                width={600}
                height={400}
                className="rounded-lg shadow-lg object-cover w-full h-auto"
                data-ai-hint={missionImage.imageHint}
              />
            )}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="mb-24" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl font-bold">{pageContent.valuesTitle}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pageContent.values.map((value) => (
            <Card key={value.title} className="text-center bg-card/50">
              <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                  <value.icon className="h-8 w-8" />
                </div>
                <CardTitle className="font-headline text-2xl">{value.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{value.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
