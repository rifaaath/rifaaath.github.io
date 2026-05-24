
'use client';

export function VideoBackground() {
  // A high-quality, looping, and royalty-free video is essential for good performance and aesthetics.
  // This is a placeholder; you can replace it with any direct video link.
  const videoUrl = 'https://firebasestorage.googleapis.com/v0/b/genkit-422806.appspot.com/o/makkah.mp4?alt=media&token=c1933a59-3d71-464a-a436-e137b77054f4';

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        key={videoUrl}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-black/70" />
    </div>
  );
}
