
'use server';

import { format, addMinutes, differenceInMinutes, parse, set, addDays, isSameDay, isToday, startOfDay } from 'date-fns';
import * as cheerio from 'cheerio';
import type { Browser as PuppeteerBrowser } from 'puppeteer';
import type { Browser as PuppeteerCoreBrowser } from 'puppeteer-core';

export interface PrayerTime {
  name: string;
  time: string;
  dateTime: Date;
}

export interface PrayerTimesData {
  date: string;
  hijriDate?: string;
  times: { name: string; time: string }[];
  nextPrayer: {
    name: string;
    time: string;
    dateTime: Date;
    timeUntil: string;
  } | null;
  currentPrayer: {
    name: string;
    time: string;
  } | null;
  error?: string;
  isStaleData?: boolean;
}

const MAWAQIT_URL = "https://mawaqit.net/en/friedenmoschee-erlangen";

function parseScrapedDate(dateText: string): Date | null {
  const cleanedDateText = dateText.replace(/[.,]/g, ''); // Remove dots and commas
  const dateFormats = [
    'EEEE d MMM yyyy',     // "Sunday 1 Jun 2025"
    'EEEE MMMM d yyyy',   // "Sunday June 1 2025"
    'd MMM yyyy',           // "1 Jun 2025"
    'd MMMM yyyy',           // "1 June 2025"
    'd/M/yyyy',             // "1/6/2025"
    'yyyy-MM-dd'            // "2025-06-01"
  ];

  for (const formatStr of dateFormats) {
    try {
      // Try parsing with the original text first
      let parsed = parse(dateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) {
        return parsed;
      }
      // Try parsing with the cleaned text
      parsed = parse(cleanedDateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (e) {
      // Continue to next format
    }
  }
  
  console.warn(`Failed to parse date with any known format: "${dateText}" (cleaned: "${cleanedDateText}")`);
  return null;
}

function parsePrayerTime(timeStr: string, baseDate: Date): Date | null {
  if (!timeStr) {
    console.warn("parsePrayerTime: Received empty or null time string.");
    return null;
  }
  if (!(baseDate instanceof Date) || isNaN(baseDate.getTime())) {
    console.warn("parsePrayerTime: Received invalid baseDate: " + String(baseDate) + ". Cannot parse time \"" + String(timeStr) + "\".");
    return null;
  }

  const timePart = timeStr.trim();

  if (!timePart || !timePart.includes(':')) {
    console.warn("parsePrayerTime: Invalid time string format (missing ':' or empty timePart): \"" + String(timeStr) + "\"");
    return null;
  }

  const [hoursStr, minutesStr] = timePart.split(':');

  if (!hoursStr || minutesStr === undefined) {
    console.warn("parsePrayerTime: Invalid time components for: \"" + String(timeStr) + "\" (hoursStr: " + String(hoursStr) + ", minutesStr: " + String(minutesStr) + ")");
    return null;
  }

  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn("parsePrayerTime: Failed to parse hour/minute numbers for: " + String(timeStr) + " (parsed hours=" + hours + ", parsed minutes=" + minutes + ")");
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn("parsePrayerTime: Hour/minute out of range for 24h format: " + String(timeStr) + " (hours=" + hours + ", minutes=" + minutes + ")");
    return null;
  }

  try {
    return set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 });
  } catch (e: any) {
    console.error("parsePrayerTime: Error calling 'set' for baseDate: " + String(baseDate) + ", hours: " + hours + ", minutes: " + minutes, e);
    return null;
  }
}

function createErrorFallbackData(errorMessage: string, serverTimeNowForFallback: Date): PrayerTimesData {
  let displayDate = "Error loading date";
  let validFallbackDate = serverTimeNowForFallback;

  if (!(validFallbackDate instanceof Date) || isNaN(validFallbackDate.getTime())) {
      console.error("CRITICAL: Invalid date provided to createErrorFallbackData. Using new Date().");
      validFallbackDate = new Date();
  }

  try {
    displayDate = format(validFallbackDate, 'EEEE, d. MMM yyyy');
  } catch (e) {
    console.error("Error formatting date in createErrorFallbackData:", e);
    displayDate = "Date Unavailable (Formatting Error)";
  }

  const fallbackTimesRawInfo = [
    { name: 'Fajr', timeStr: '03:30' }, { name: 'Sunrise', timeStr: '05:30' },
    { name: 'Dhuhr', timeStr: '13:15' }, { name: 'Asr', timeStr: '17:30' },
    { name: 'Maghrib', timeStr: '21:15' }, { name: 'Isha', timeStr: '22:45' },
  ];
  const fallbackDisplayTimes: { name: string; time: string }[] = [];
  fallbackTimesRawInfo.forEach(ft => {
    const dt = parsePrayerTime(ft.timeStr, validFallbackDate);
    if (dt) {
      fallbackDisplayTimes.push({ name: ft.name, time: format(dt, 'HH:mm') });
    } else {
      fallbackDisplayTimes.push({ name: ft.name, time: 'N/A' });
    }
  });

  return {
    date: `Error: ${displayDate}`,
    hijriDate: undefined,
    times: fallbackDisplayTimes,
    nextPrayer: null,
    currentPrayer: null,
    error: errorMessage,
    isStaleData: false,
  };
}

function calculatePrayerStatus(
  rawPrayerTimes: PrayerTime[],
  serverTimeNow: Date,
  dateForPrayerTimes: Date // The date rawPrayerTimes are for (e.g., today or a stale date if scraper got old data)
): {
  nextPrayer: PrayerTimesData['nextPrayer'];
  currentPrayer: PrayerTimesData['currentPrayer'];
} {
  let nextPrayerInfo: PrayerTimesData['nextPrayer'] = null;
  let currentPrayerInfo: PrayerTimesData['currentPrayer'] = null;

  const salatPrayers = rawPrayerTimes
    .filter(p => p.name !== 'Sunrise' && p.dateTime instanceof Date && !isNaN(p.dateTime.getTime()))
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  if (salatPrayers.length === 0) {
    console.warn("calculatePrayerStatus: No valid salat prayers to process.");
    return { nextPrayer: null, currentPrayer: null };
  }

  const todayFajr = salatPrayers.find(p => p.name === 'Fajr');
  const todayIsha = salatPrayers.find(p => p.name === 'Isha');

  // 1. Check if yesterday's Isha is current (time is past midnight but before today's Fajr)
  if (todayFajr && serverTimeNow < todayFajr.dateTime) {
    // To check yesterday's Isha, we need today's Isha time to apply to yesterday's date
    if (todayIsha) {
      // yesterdayIshaDateTime is todayIsha's time but on the day before dateForPrayerTimes
      const yesterdayIshaDateTime = addDays(todayIsha.dateTime, -1);

      if (serverTimeNow >= yesterdayIshaDateTime) {
        currentPrayerInfo = {
          name: 'Isha',
          time: format(yesterdayIshaDateTime, 'HH:mm') // Display time for yesterday's Isha
        };
      }
    }
  }

  // 2. If current prayer not found yet, check today's prayers
  if (!currentPrayerInfo) {
    for (let i = 0; i < salatPrayers.length; i++) {
      const prayer = salatPrayers[i];
      let endCurrentPrayerTime: Date;

      if (prayer.name === 'Isha') {
        // Today's Isha lasts until tomorrow's Fajr
        if (todayFajr) {
          // Construct tomorrow's Fajr dateTime using today's Fajr time components
          endCurrentPrayerTime = addDays(todayFajr.dateTime, 1);
        } else {
          // Fallback if today's Fajr is not found (should not happen with good data)
          // Make Isha last until early morning next day as a rough estimate
          endCurrentPrayerTime = set(addDays(prayer.dateTime, 1), { hours: 3, minutes: 30, seconds: 0, milliseconds: 0 });
        }
      } else {
        // For other prayers, they last until the next prayer in the list starts
        const nextPrayerInList = salatPrayers[i + 1];
        if (nextPrayerInList) {
          endCurrentPrayerTime = nextPrayerInList.dateTime;
        } else {
          // This prayer is the last in the list, and it's not Isha (Isha case handled above).
          // This implies incomplete data (e.g., Maghrib is listed but Isha is missing).
          // Fallback to a default duration.
          endCurrentPrayerTime = addMinutes(prayer.dateTime, 90); // e.g., Maghrib lasts 90 mins if Isha is missing
        }
      }

      if (serverTimeNow >= prayer.dateTime && serverTimeNow < endCurrentPrayerTime) {
        currentPrayerInfo = { name: prayer.name, time: prayer.time };
        break; // Found current prayer
      }
    }
  }

  // 3. Determine Next Prayer
  // Iterate through today's prayers (salatPrayers are for dateForPrayerTimes)
  // Find the first one that is after serverTimeNow.
  for (const prayer of salatPrayers) {
    if (serverTimeNow < prayer.dateTime) {
      const diffMinutes = differenceInMinutes(prayer.dateTime, serverTimeNow);
      const hoursUntil = Math.floor(diffMinutes / 60);
      const minutesUntil = diffMinutes % 60;
      let timeUntilStr = '';
      if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
      timeUntilStr += `${minutesUntil}m`;

      nextPrayerInfo = {
        name: prayer.name,
        time: prayer.time,
        dateTime: prayer.dateTime,
        timeUntil: timeUntilStr.trim(),
      };
      break; // Found the immediate next prayer for today
    }
  }

  // If no next prayer found in today's list (i.e., serverTimeNow is after today's Isha),
  // then the next prayer is tomorrow's Fajr.
  if (!nextPrayerInfo && todayFajr) {
    const tomorrowFajrDateTime = addDays(todayFajr.dateTime, 1);
    
    // Ensure serverTimeNow is actually before this tomorrowFajrDateTime
    if (serverTimeNow < tomorrowFajrDateTime) {
        const diffMinutes = differenceInMinutes(tomorrowFajrDateTime, serverTimeNow);
        const hoursUntil = Math.floor(diffMinutes / 60);
        const minutesUntil = diffMinutes % 60;
        let timeUntilStr = '';
        if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
        timeUntilStr += `${minutesUntil}m`;

        nextPrayerInfo = {
          name: todayFajr.name, // Fajr
          time: todayFajr.time, // Fajr time
          dateTime: tomorrowFajrDateTime,
          timeUntil: `${timeUntilStr.trim()} (tomorrow)`,
        };
    }
  }
  
  return { nextPrayer: nextPrayerInfo, currentPrayer: currentPrayerInfo };
}


export async function getPrayerTimes(): Promise<PrayerTimesData> {
  const serverTimeNow = new Date(); 
  console.log("getPrayerTimes called at server time:", format(serverTimeNow, 'yyyy-MM-dd HH:mm:ss XXX'));
  let browser: PuppeteerBrowser | PuppeteerCoreBrowser | undefined;
  let htmlContent: string;
  const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
  const IS_VERCEL_PRODUCTION = process.env.VERCEL_ENV === 'production';

  try {
    if (BROWSERLESS_TOKEN) {
      console.log("Using Browserless.io for Puppeteer connection.");
      const puppeteerCore = await import('puppeteer-core');
      const browserWSEndpoint = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;
      browser = await puppeteerCore.connect({ browserWSEndpoint });
      console.log("Connected to Browserless.io instance.");
    } else if (!IS_VERCEL_PRODUCTION) {
      console.log("Local development: No Browserless token. Using local Puppeteer.");
      const puppeteer = await import('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ignoreHTTPSErrors: true,
      });
      console.log("Local Puppeteer browser launched.");
    } else {
      console.error("Production environment (Vercel) without BROWSERLESS_TOKEN. Cannot launch Puppeteer.");
      return createErrorFallbackData("Puppeteer configuration error in production.", serverTimeNow);
    }
      
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log("Navigating to Mawaqit URL:", MAWAQIT_URL);
    try {
      await page.goto(MAWAQIT_URL, { waitUntil: 'networkidle0', timeout: 45000 }); 
    } catch (gotoError: any) {
      console.error("Puppeteer page.goto failed:", gotoError.message, gotoError.stack);
      return createErrorFallbackData(`Puppeteer navigation failed: ${gotoError.message}`, serverTimeNow);
    }
    console.log("Navigation successful. Current URL:", page.url());
    
    try {
      await page.waitForSelector('div.prayers .time div', { timeout: 15000 }); 
      console.log("Main prayer time selector found.");
    } catch (selectorError) {
      console.warn("waitForSelector for prayer times timed out. Page content might be incomplete or structure changed.");
    }

    try {
      await page.waitForSelector('#gregorianDate', { timeout: 15000, visible: true });
      console.log("Gregorian date element (#gregorianDate) is visible.");
    } catch (dateSelectorError) {
      console.warn("waitForSelector for #gregorianDate timed out or element not visible. Date might be missing or page structure changed.");
    }
    
    htmlContent = await page.content();
    await page.close();

    const $ = cheerio.load(htmlContent);
    let rawPrayerTimes: PrayerTime[] = [];
    let displayGregorianDate: string;
    let hijriDateDisplay: string | undefined;
    let dateToParseTimesFor: Date = new Date(serverTimeNow); // Initialize with serverTimeNow
    let isStaleData = false;

    const scrapedDateText = $('#gregorianDate').text().trim();
    console.log("Scraped Gregorian date text from page:", `"${scrapedDateText}"`);

    if (scrapedDateText) {
      const parsedScrapedDate = parseScrapedDate(scrapedDateText);

      if (parsedScrapedDate) {
        console.log("Successfully parsed scraped date:", format(parsedScrapedDate, 'yyyy-MM-dd'));
        if (isSameDay(parsedScrapedDate, serverTimeNow) || isToday(parsedScrapedDate)) { // isToday might be redundant if serverTimeNow is truly "now"
          console.log("Scraped date is current. Using scraped date for display and calculations.");
          dateToParseTimesFor = parsedScrapedDate; // Use the date from the page
          displayGregorianDate = format(parsedScrapedDate, 'EEEE, d. MMM yyyy');
        } else {
          console.warn(`Stale data detected! Scraped date "${format(parsedScrapedDate, 'EEEE, d. MMM yyyy')}" is not today (${format(serverTimeNow, 'EEEE, d. MMM yyyy')}). Using current server time but marking as stale.`);
          dateToParseTimesFor = startOfDay(new Date(serverTimeNow)); // Use start of current server day for parsing times
          displayGregorianDate = `${format(serverTimeNow, 'EEEE, d. MMM yyyy')} (Data for ${format(parsedScrapedDate, 'd. MMM')})`;
          isStaleData = true;
        }
      } else {
        console.warn(`Failed to parse scraped date string "${scrapedDateText}". Falling back to current server time for parsing.`);
        dateToParseTimesFor = startOfDay(new Date(serverTimeNow));
        displayGregorianDate = `${format(serverTimeNow, 'EEEE, d. MMM yyyy')} (Scraped Date Invalid)`;
      }
    } else {
      console.warn("No date text found using selector '#gregorianDate'. Using current server time for parsing.");
      dateToParseTimesFor = startOfDay(new Date(serverTimeNow));
      displayGregorianDate = format(serverTimeNow, 'EEEE, d. MMM yyyy');
    }
    console.log("Effective date for prayer time calculations (dateToParseTimesFor):", format(dateToParseTimesFor, 'yyyy-MM-dd'));

    hijriDateDisplay = $('#hijriDate').first().text().trim() || undefined;

    $('div.prayers > div').each((_i, el) => {
      const name = $(el).find('.name').text().trim();
      const timeString = $(el).find('.time > div').first().text().trim(); 

      if (name && timeString) {
        const prayerDateTime = parsePrayerTime(timeString, dateToParseTimesFor); // Always use dateToParseTimesFor
        if (prayerDateTime) {
          rawPrayerTimes.push({
            name,
            time: format(prayerDateTime, 'HH:mm'), 
            dateTime: prayerDateTime,
          });
          console.log(`Parsed prayer: ${name} at ${format(prayerDateTime, 'HH:mm')} for date ${format(dateToParseTimesFor, 'yyyy-MM-dd')}`);
        } else {
          console.warn(`Failed to parse prayer time for ${name}: ${timeString} with base date ${format(dateToParseTimesFor, 'yyyy-MM-dd')}`);
        }
      }
    });

    if (rawPrayerTimes.length === 0) {
      console.warn('No prayer times were successfully parsed. Page structure might have changed.');
      console.log('Prayer section HTML:', $('div.prayers').html());
      return createErrorFallbackData("Failed to find prayer times on the page. Selectors may be outdated.", serverTimeNow);
    }

    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    
    const { nextPrayer: nextPrayerInfo, currentPrayer: currentPrayerInfo } = calculatePrayerStatus(rawPrayerTimes, serverTimeNow, dateToParseTimesFor);
    
    return {
      date: displayGregorianDate,
      hijriDate: hijriDateDisplay,
      times: displayTimes,
      nextPrayer: nextPrayerInfo,
      currentPrayer: currentPrayerInfo,
      isStaleData,
    };

  } catch (unexpectedError: any) {
    console.error("An unexpected server error occurred in getPrayerTimes:", unexpectedError.message, unexpectedError.stack);
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, new Date(serverTimeNow));
  } finally {
    if (browser) {
      console.log("Closing Puppeteer browser/connection in finally block.");
      await browser.close();
    }
  }
}
