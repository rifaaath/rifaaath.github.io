import { PlaceHolderImages } from "@/lib/placeholder-images";
import { notFound } from "next/navigation";
import Image from 'next/image';

const posts: Record<string, { title: string; imageId: string; content: React.ReactNode }> = {
    'reflections-on-community': {
        title: 'Reflections on Community',
        imageId: 'blog-post-1',
        content: (
            <>
                <p className="lead">In an era of digital connection, what does it truly mean to be part of a community? For us at MHG Erlangen, it's about more than just shared space; it's about shared values, mutual support, and growing together in faith.</p>
                <p>Building a community is an active, ongoing process. It requires intention, effort, and a commitment from every member to contribute to a culture of inclusivity and respect. Here are some thoughts on the pillars of a strong, faith-based community:</p>
                
                <h3>Shared Worship and Spirituality</h3>
                <p>The heart of our community is our shared faith. Coming together for prayer, halaqa, and spiritual reminders strengthens our collective bond and reminds us of our ultimate purpose. It creates a rhythm for our community life that is grounded in something greater than ourselves.</p>
                
                <h3>Support and Service</h3>
                <p>A true community shows up for one another. This can mean:</p>
                <ul>
                    <li>Helping a fellow student with a difficult course.</li>
                    <li>Providing a listening ear during stressful times.</li>
                    <li>Organizing meals for those who are sick or overwhelmed.</li>
                    <li>Serving the wider campus community through volunteer efforts.</li>
                </ul>
                <p>These acts of service build deep, lasting connections and embody the prophetic teachings of compassion and mutual care.</p>
                
                <blockquote>"The believer's shade on the Day of Resurrection will be his charity." - Al-Tirmidhi</blockquote>
                
                <p>Ultimately, a community is a living entity. It thrives when its members are engaged, supportive, and committed to a shared vision. At MHG Erlangen, we strive to be that home away from home—a place of nourishment for the soul, mind, and heart.</p>
            </>
        )
    },
    'balancing-studies-and-faith': {
        title: 'Balancing Studies and Faith',
        imageId: 'blog-post-2',
        content: (
            <>
                <p className="lead">The life of a student is a delicate balancing act. Juggling lectures, assignments, exams, and a social life is challenging enough. Adding the crucial element of nurturing one's faith can seem daunting. How can we excel in our studies without letting our spiritual life falter?</p>
                
                <h3>Time Management with a Purpose</h3>
                <p>Effective time management is key. But instead of just scheduling study blocks, integrate your faith into your schedule. This means:</p>
                <ul>
                    <li><strong>Prioritizing Prayer:</strong> Plan your study sessions around the five daily prayers. Use prayer times as built-in breaks to refresh your mind and spirit.</li>
                    <li><strong>Morning and Evening Adhkar:</strong> Start and end your day with remembrance of Allah. This sets a positive tone and brings barakah (blessing) to your time.</li>
                    <li><strong>Weekly Commitments:</strong> Dedicate a small, consistent block of time each week for a halaqa or a Quran study session. Consistency is more important than quantity.</li>
                </ul>
                
                <h3>The Concept of 'Ihsan' in a Academic Context</h3>
                <p>The concept of <em>Ihsan</em> (excellence) is central to Islam. It means doing everything as if you see Allah, and though you do not see Him, He sees you. Apply this to your studies. Strive for excellence not just for a grade, but as an act of worship. Seeking knowledge is highly encouraged in Islam, and pursuing it with sincerity and dedication is a rewardable act.</p>
                
                <blockquote>Seeking knowledge is an obligation upon every Muslim. - Ibn Majah</blockquote>

                <p>When you frame your education as a means to better serve your community and please your Creator, it transforms from a stressful obligation into a meaningful journey. Find a study group with like-minded individuals who can remind you of your goals, both academic and spiritual.</p>
            </>
        )
    }
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }
  return {
    title: `${post.title} - MHG Erlangen Blog`,
  };
}


export default function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = posts[params.slug];

    if (!post) {
        notFound();
    }

    const postImage = PlaceHolderImages.find(img => img.id === post.imageId);

    return (
        <article>
            <header className="relative h-[40vh] md:h-[50vh] w-full">
                {postImage && (
                    <Image
                        src={postImage.imageUrl}
                        alt={post.title}
                        fill
                        priority
                        className="object-cover"
                        data-ai-hint={postImage.imageHint}
                    />
                )}
                 <div className="absolute inset-0 bg-black/50" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="max-w-4xl px-4 text-center">
                        <h1 className="font-headline text-4xl md:text-6xl font-bold text-white">
                           {post.title}
                        </h1>
                    </div>
                </div>
            </header>

            <div className="container mx-auto max-w-3xl px-4 py-12">
                 <div className="prose prose-lg dark:prose-invert max-w-none 
                    prose-p:font-body prose-p:leading-relaxed prose-p:text-muted-foreground
                    prose-headings:font-headline prose-headings:text-foreground
                    prose-blockquote:border-primary prose-blockquote:text-muted-foreground
                    prose-li:text-muted-foreground
                    prose-a:text-primary hover:prose-a:text-primary/80
                    prose-strong:text-foreground">
                    {post.content}
                </div>
            </div>
        </article>
    );
}
