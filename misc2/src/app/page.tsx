'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, Calendar, Users, Target } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { events } from '@/lib/events-data';
import { useLang } from '@/context/language-context';

const content = {
  en: {
    welcome: 'Welcome to MHG Erlangen',
    tagline: 'Your center for community, faith, and growth.',
    upcomingEvents: 'Upcoming Events',
    aboutUs: 'About Us',
    ourMission: 'Our Mission',
    missionText: 'To foster a vibrant Muslim community through spiritual, social, and educational activities.',
    ourCommunity: 'Our Community',
    communityText: 'A diverse and inclusive space where everyone is welcome to learn, share, and grow together.',
    ourEvents: 'Our Events',
    eventsText: 'Engaging events designed to build connections, deepen faith, and serve the wider community.',
    upcomingEventsTitle: 'Upcoming Events',
    upcomingEventsSubtitle: 'Join us for our upcoming activities and gatherings.',
    learnMore: 'Learn More',
    viewAllEvents: 'View All Events',
    getInvolved: 'Get Involved',
    getInvolvedText: "Become a part of our family. Whether you want to volunteer, join a committee, or just stay updated, we'd love to have you.",
    joinMailingList: 'Join Our Mailing List',
    dateLocale: 'en-US',
  },
  de: {
    welcome: 'Willkommen bei MHG Erlangen',
    tagline: 'Dein Zentrum für Gemeinschaft, Glaube und Wachstum.',
    upcomingEvents: 'Nächste Veranstaltungen',
    aboutUs: 'Über uns',
    ourMission: 'Unsere Mission',
    missionText: 'Eine lebendige muslimische Gemeinschaft durch spirituelle, soziale und bildende Aktivitäten zu fördern.',
    ourCommunity: 'Unsere Gemeinschaft',
    communityText: 'Ein vielfältiger und inklusiver Raum, in dem jeder willkommen ist, um gemeinsam zu lernen, zu teilen und zu wachsen.',
    ourEvents: 'Unsere Veranstaltungen',
    eventsText: 'Engagierende Veranstaltungen, die darauf abzielen, Verbindungen aufzubauen, den Glauben zu vertiefen und der breiteren Gemeinschaft zu dienen.',
    upcomingEventsTitle: 'Nächste Veranstaltungen',
    upcomingEventsSubtitle: 'Nehmen Sie an unseren bevorstehenden Aktivitäten und Zusammenkünften teil.',
    learnMore: 'Mehr erfahren',
    viewAllEvents: 'Alle Veranstaltungen anzeigen',
    getInvolved: 'Mach mit',
    getInvolvedText: 'Werde ein Teil unserer Familie. Egal, ob du Freiwilligenarbeit leisten, einem Komitee beitreten oder einfach nur auf dem Laufenden bleiben möchtest, wir würden uns freuen, dich dabei zu haben.',
    joinMailingList: 'Tritt unserer Mailingliste bei',
    dateLocale: 'de-DE',
  },
  ar: {
    welcome: 'مرحباً بكم في MHG Erlangen',
    tagline: 'مركزكم للمجتمع والإيمان والنمو.',
    upcomingEvents: 'الفعاليات القادمة',
    aboutUs: 'من نحن',
    ourMission: 'مهمتنا',
    missionText: 'تعزيز مجتمع مسلم نابض بالحياة من خلال الأنشطة الروحية والاجتماعية والتعليمية.',
    ourCommunity: 'مجتمعنا',
    communityText: 'مساحة متنوعة وشاملة حيث نرحب بالجميع للتعلم والمشاركة والنمو معًا.',
    ourEvents: 'فعالياتنا',
    eventsText: 'فعاليات جذابة مصممة لبناء العلاقات وتعميق الإيمان وخدمة المجتمع الأوسع.',
    upcomingEventsTitle: 'الفعاليات القادمة',
    upcomingEventsSubtitle: 'انضم إلينا في أنشطتنا وتجمعاتنا القادمة.',
    learnMore: 'اعرف المزيد',
    viewAllEvents: 'عرض كل الفعاليات',
    getInvolved: 'شارك معنا',
    getInvolvedText: 'كن جزءًا من عائلتنا. سواء كنت ترغب في التطوع أو الانضمام إلى لجنة أو مجرد البقاء على اطلاع، يسعدنا انضمامك.',
    joinMailingList: 'انضم إلى قائمتنا البريدية',
    dateLocale: 'ar-EG',
  }
};

export default function Home() {
  const { lang } = useLang();
  const pageContent = content[lang];
  const heroImage = PlaceHolderImages.find((img) => img.id === 'home-hero');
  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] w-full">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="relative max-w-4xl px-4 text-foreground drop-shadow-md">
             <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-xl -z-10"/>
             <div className="p-8">
                <h1 className="font-headline text-4xl font-bold md:text-6xl lg:text-7xl">
                {pageContent.welcome}
                </h1>
                <p className="mt-4 max-w-2xl mx-auto font-body text-lg md:text-xl text-primary-foreground">
                {pageContent.tagline}
                </p>
                <div className="mt-8 flex justify-center gap-4">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/events">
                    {pageContent.upcomingEvents} <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                    <Link href="/about">{pageContent.aboutUs}</Link>
                </Button>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Snippet */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="font-headline text-2xl font-semibold">{pageContent.ourMission}</h3>
              <p className="mt-2 text-muted-foreground">
                {pageContent.missionText}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="font-headline text-2xl font-semibold">{pageContent.ourCommunity}</h3>
              <p className="mt-2 text-muted-foreground">
                {pageContent.communityText}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="font-headline text-2xl font-semibold">{pageContent.ourEvents}</h3>
              <p className="mt-2 text-muted-foreground">
                {pageContent.eventsText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="bg-background/80 backdrop-blur-sm py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-headline text-3xl font-bold md:text-4xl">{pageContent.upcomingEventsTitle}</h2>
            <p className="mt-2 text-lg text-muted-foreground">{pageContent.upcomingEventsSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingEvents.map((event) => {
              const eventImage = PlaceHolderImages.find((img) => img.id === event.image);
              return (
                <Card key={event.id} className="flex flex-col overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl bg-card/50">
                  <CardHeader className="p-0">
                    {eventImage && (
                       <div className="aspect-video relative">
                        <Image
                            src={eventImage.imageUrl}
                            alt={event.title}
                            fill
                            className="object-cover"
                            data-ai-hint={eventImage.imageHint}
                        />
                       </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow p-6">
                    <CardTitle className="font-headline text-xl mb-2">{event.title}</CardTitle>
                    <CardDescription className="flex items-center text-muted-foreground mb-4">
                        <Calendar className="mr-2 h-4 w-4" /> {new Date(event.date).toLocaleDateString(pageContent.dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </CardDescription>
                    <p className="flex-grow text-muted-foreground">{event.description.substring(0, 100)}...</p>
                     <Button asChild variant="link" className="self-start px-0 mt-4 text-primary">
                        <Link href="/events">
                            {pageContent.learnMore} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
           <div className="text-center mt-12">
                <Button asChild size="lg" variant="outline">
                    <Link href="/events">{pageContent.viewAllEvents}</Link>
                </Button>
            </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
            <h2 className="font-headline text-3xl font-bold md:text-4xl">{pageContent.getInvolved}</h2>
            <p className="mt-2 mx-auto max-w-2xl text-lg text-muted-foreground">
                {pageContent.getInvolvedText}
            </p>
            <div className="mt-8">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {pageContent.joinMailingList}
                </Button>
            </div>
        </div>
      </section>
    </div>
  );
}
