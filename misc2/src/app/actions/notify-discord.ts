
'use server';

import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';
import { formatInTimeZone } from 'date-fns-tz';

// Rate limiter: Allow 2 requests per 10-minute window.
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(2, '10 m'),
  analytics: true,
  prefix: 'sos_ratelimit',
});

export async function sendSosNotification(): Promise<{ success: boolean; message: string }> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL is not set in environment variables.');
    return { success: false, message: 'Server configuration error.' };
  }
  
  // Only apply rate limiting if Vercel KV environment variables are set.
  const isRateLimiterConfigured = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (isRateLimiterConfigured) {
    // Use IP address for rate limiting
    const ip = (await headers()).get('x-forwarded-for') ?? '127.0.0.1';
    const { success: isWithinRateLimit, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!isWithinRateLimit) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000 / 60);
      return { success: false, message: `Rate limit exceeded. Please try again in about ${retryAfter} minutes.` };
    }
  } else {
    // Log a warning in production if KV is not configured, but don't block the request.
    if (process.env.NODE_ENV === 'production') {
      console.warn('Vercel KV for rate limiting is not configured. Skipping rate limit check.');
    }
  }


  try {
    const berlinTimeZone = 'Europe/Berlin';
    const now = new Date();
    const formattedDateTime = formatInTimeZone(now, berlinTimeZone, 'dd/MM/yyyy HH:mm:ss');
    const messageContent = `🚨 Urgent assistance needed at the prayer room! ${formattedDateTime}`;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: messageContent,
        username: 'FAU Prayer Room Bot',
      }),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed with status: ${res.status}`);
      return { success: false, message: 'Failed to send notification.' };
    }

    return { success: true, message: 'Notification sent successfully!' };
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
