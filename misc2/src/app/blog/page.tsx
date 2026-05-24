'use client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useLang } from '@/context/language-context';

const content = {
  en: {
    title: 'Our Blog',
    subtitle: 'Reflections, stories, and updates from the MHG Erlangen community. Coming soon!',
    samplePosts: 'Sample Posts',
    readMore: 'Read More',
  },
  de: {
    title: 'Unser Blog',
    subtitle: 'Reflexionen, Geschichten und Neuigkeiten aus der MHG Erlangen Community. Demnächst!',
    samplePosts: 'Beispielbeiträge',
    readMore: 'Weiterlesen',
  },
  ar: {
    title: 'مدونتنا',
    subtitle: 'تأملات وقصص وتحديثات من مجتمع MHG Erlangen. قريبا!',
    samplePosts: 'مشاركات نموذجية',
    readMore: 'اقرأ المزيد',
  },
};

const samplePosts = [
    {
        slug: 'reflections-on-community',
        title: 'Reflections on Community',
        excerpt: 'Exploring what it means to build a strong, faith-based community in a modern world.',
        imageId: 'blog-post-1'
    },
    {
        slug: 'balancing-studies-and-faith',
        title: 'Balancing Studies and Faith',
        excerpt: 'Tips and thoughts on how to excel academically while nurturing your spiritual life.',
        imageId: 'blog-post-2'
    }
]

export default function BlogPage() {
  const { lang } = useLang();
  const pageContent = content[lang];

  return (
    <div className="container mx-auto px-4 py-16" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground">
          {pageContent.title}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          {pageContent.subtitle}
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-headline font-semibold mb-8 text-center">{pageContent.samplePosts}</h2>
         <div className="grid gap-8">
            {samplePosts.map((post) => {
                const postImage = PlaceHolderImages.find(img => img.id === post.imageId)
                return (
                    <Link href={`/blog/${post.slug}`} key={post.slug}>
                        <Card className="group flex flex-col md:flex-row overflow-hidden transition-all duration-300 hover:shadow-xl hover:bg-secondary bg-card/50">
                             {postImage && (
                                <div className="md:w-1/3 aspect-video md:aspect-auto relative">
                                    <Image 
                                        src={postImage.imageUrl} 
                                        alt={post.title} 
                                        fill
                                        className="object-cover"
                                        data-ai-hint={postImage.imageHint}
                                    />
                                </div>
                            )}
                            <div className="flex-1">
                                <CardHeader>
                                    <CardTitle className="font-headline text-2xl group-hover:text-primary transition-colors">{post.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>{post.excerpt}</CardDescription>
                                    <div className="flex items-center mt-4 text-primary font-semibold text-sm">
                                        {pageContent.readMore} <ArrowRight className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    </Link>
                )
            })}
        </div>
      </div>
    </div>
  );
}
