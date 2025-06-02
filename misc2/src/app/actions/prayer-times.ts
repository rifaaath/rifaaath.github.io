
'use server';

import { set, addDays, isSameDay, isToday, startOfDay, differenceInMinutes, addMinutes, parse as dateFnsParse, format } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'; // Explicit named imports
import * as cheerio from 'cheerio';
import type { Browser as PuppeteerBrowser } from 'puppeteer';
import type { Browser as PuppeteerCoreBrowser } from 'puppeteer-core';

const berlinTimeZone = 'Europe/Berlin';

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
  const cleanedDateText = dateText.replace(/[.,]/g, '');
  // Try parsing just "d MMM yyyy" or "d MMMM yyyy" first, more robust to weekday name changes/localization
  const dayMonthYearFormats = ['d MMM yyyy', 'd MMMM yyyy'];
  for (const formatStr of dayMonthYearFormats) {
    try {
        const dateOnlyText = cleanedDateText.split(' ').slice(1).join(' '); // Attempt to extract "1 Jun 2025" from "Sunday 1 Jun 2025"
        if (dateOnlyText) {
            let parsed = dateFnsParse(dateOnlyText, formatStr, new Date());
            if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
        }
        // Fallback to parsing the whole string if the above fails or dateOnlyText is empty
        let parsed = dateFnsParse(cleanedDateText, formatStr, new Date());
        if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
    } catch (e) { /* continue */ }
  }

  const specificFormats = ['EEEE d MMM yyyy', 'EEEE MMMM d yyyy'];
  for (const formatStr of specificFormats) {
    try {
      let parsed = dateFnsParse(dateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;

      parsed = dateFnsParse(cleanedDateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
    } catch (e) { /* continue */ }
  }

  const generalFormats = [
    'd/M/yyyy', 'yyyy-MM-dd', 'MMMM d, yyyy', 'MMM d, yyyy'
  ];
  for (const formatStr of generalFormats) {
     try {
      let parsed = dateFnsParse(dateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
      parsed = dateFnsParse(cleanedDateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
    } catch (e) { /* continue */ }
  }

  console.warn(`Failed to parse date with any known format: "${dateText}" (cleaned: "${cleanedDateText}")`);
  return null;
}


function parsePrayerTime(timeStr: string, baseDateBerlinMidnight: Date): Date | null {
  if (!timeStr) {
    console.warn("parsePrayerTime: Received empty or null time string.");
    return null;
  }
  if (!(baseDateBerlinMidnight instanceof Date) || isNaN(baseDateBerlinMidnight.getTime())) {
    console.warn("parsePrayerTime: Received invalid baseDate: " + String(baseDateBerlinMidnight) + ". Cannot parse time \"" + String(timeStr) + "\".");
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
    // baseDateBerlinMidnight is already a Date object representing 00:00:00 in Berlin for the target day.
    // Setting hours/minutes on it directly yields a Date object representing that prayer time in Berlin.
    return set(baseDateBerlinMidnight, { hours, minutes, seconds: 0, milliseconds: 0 });
  } catch (e: any) {
    console.error("parsePrayerTime: Error calling 'set' for baseDate: " + String(baseDateBerlinMidnight) + ", hours: " + hours + ", minutes: " + minutes, e);
    return null;
  }
}

function createErrorFallbackData(errorMessage: string, serverTimeInBerlinForFallback: Date): PrayerTimesData {
  let displayDate = "Error loading date";
  let validFallbackDateBerlin = serverTimeInBerlinForFallback;

  if (!(validFallbackDateBerlin instanceof Date) || isNaN(validFallbackDateBerlin.getTime())) {
      console.error("CRITICAL: Invalid date provided to createErrorFallbackData. Using new Date() in Berlin TZ.");
      validFallbackDateBerlin = toZonedTime(new Date(), berlinTimeZone); // Ensure it's Berlin zoned
  }

  try {
    displayDate = formatInTimeZone(validFallbackDateBerlin, berlinTimeZone, 'EEEE, d. MMM yyyy');
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
  
  // validFallbackDateBerlin is already a Date object representing a moment in Berlin time.
  // startOfDay will give 00:00:00 of that day in Berlin.
  const fallbackBaseDate = startOfDay(validFallbackDateBerlin);


  fallbackTimesRawInfo.forEach(ft => {
    const dt = parsePrayerTime(ft.timeStr, fallbackBaseDate);
    if (dt) {
      fallbackDisplayTimes.push({ name: ft.name, time: formatInTimeZone(dt, berlinTimeZone, 'HH:mm') });
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
    isStaleData: false, // Fallback data is synthetic, not "stale" from a source
  };
}

function calculatePrayerStatus(
  rawPrayerTimes: PrayerTime[],
  serverTimeInBerlin: Date, 
  dateForPrayerTimesBerlin: Date // This is dateToParseTimesFor (Berlin midnight of the day for which times are parsed)
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

  // Check for yesterday's Isha if current time is after midnight but before today's Fajr
  if (todayFajr && serverTimeInBerlin < todayFajr.dateTime) {
    const ishaDataForToday = salatPrayers.find(p => p.name === 'Isha');
    if (ishaDataForToday) {
        // Construct yesterday's Isha time using today's Isha time but on the previous day
        const yesterdayIshaDateTime = addDays(ishaDataForToday.dateTime, -1); 
        // Isha from yesterday is current if serverTimeInBerlin is after it and before today's Fajr
        if (serverTimeInBerlin >= yesterdayIshaDateTime) { // serverTimeInBerlin < todayFajr.dateTime is already checked
            currentPrayerInfo = {
                name: 'Isha', // It's "yesterday's" Isha
                time: formatInTimeZone(yesterdayIshaDateTime, berlinTimeZone, 'HH:mm')
            };
        }
    }
  }


  // If current prayer is not yet determined (e.g., not yesterday's Isha), check today's prayers
  if (!currentPrayerInfo) {
    for (let i = 0; i < salatPrayers.length; i++) {
      const prayer = salatPrayers[i];
      let endCurrentPrayerTime: Date;

      if (prayer.name === 'Isha') {
        // Isha ends at Fajr of the next day
        let tomorrowFajrDateTime: Date;
        const fajrDataForTomorrow = salatPrayers.find(p => p.name === 'Fajr'); // Fajr data from the current list
        if (fajrDataForTomorrow) {
           // Use today's Fajr time, but for the next day relative to dateForPrayerTimesBerlin
           tomorrowFajrDateTime = addDays(fajrDataForTomorrow.dateTime, 1);
        } else {
           // Fallback if Fajr data is missing (should be rare with Mawaqit)
           // Create a synthetic Fajr for the day after dateForPrayerTimesBerlin
           const dayAfterPrayerDate = addDays(dateForPrayerTimesBerlin, 1);
           // This results in a Date object representing 03:30 on dayAfterPrayerDate, in Berlin time
           tomorrowFajrDateTime = set(dayAfterPrayerDate, { hours: 3, minutes: 30, seconds: 0, milliseconds: 0 });
           console.warn(`calculatePrayerStatus: Fallback for Isha end time (no Fajr data for dateForPrayerTimesBerlin). Using synthetic Fajr for ${formatInTimeZone(tomorrowFajrDateTime, berlinTimeZone, 'yyyy-MM-dd HH:mm')}`);
        }
        endCurrentPrayerTime = tomorrowFajrDateTime;
      } else {
        // For other prayers, they end when the next prayer begins
        const nextPrayerInList = salatPrayers[i + 1];
        if (nextPrayerInList) {
          endCurrentPrayerTime = nextPrayerInList.dateTime;
        } else {
          // Should not happen if Isha is the last prayer listed.
          // If Asr is last and Maghrib isn't listed, this is a fallback.
           endCurrentPrayerTime = addMinutes(prayer.dateTime, 90); // Arbitrary 90 mins
           console.warn(`calculatePrayerStatus: Last prayer ${prayer.name} is not Isha, and no next prayer found. Setting arbitrary end time.`);
        }
      }

      if (serverTimeInBerlin >= prayer.dateTime && serverTimeInBerlin < endCurrentPrayerTime) {
        currentPrayerInfo = { name: prayer.name, time: prayer.time };
        break; // Current prayer found
      }
    }
  }

  // Determine next prayer
  for (const prayer of salatPrayers) {
    if (serverTimeInBerlin < prayer.dateTime) {
      const diffMinutes = differenceInMinutes(prayer.dateTime, serverTimeInBerlin);
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
      break; // Next prayer found
    }
  }

  // If no next prayer found for today (i.e., after Isha), next prayer is Fajr of tomorrow
  if (!nextPrayerInfo && todayFajr) { // todayFajr here refers to Fajr of dateForPrayerTimesBerlin
    const tomorrowFajrDateTime = addDays(todayFajr.dateTime, 1);
    // This check is important: ensure serverTimeInBerlin is actually *before* this tomorrowFajrDateTime
    // (e.g. serverTimeInBerlin is 23:00 on day X, tomorrowFajr is 03:30 on day X+1)
    if (serverTimeInBerlin < tomorrowFajrDateTime) { 
        const diffMinutes = differenceInMinutes(tomorrowFajrDateTime, serverTimeInBerlin);
        const hoursUntil = Math.floor(diffMinutes / 60);
        const minutesUntil = diffMinutes % 60;
        let timeUntilStr = '';
        if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
        timeUntilStr += `${minutesUntil}m`;

        nextPrayerInfo = {
          name: todayFajr.name, // Name is Fajr
          time: todayFajr.time, // Time is Fajr's time
          dateTime: tomorrowFajrDateTime, // DateTime is for tomorrow
          timeUntil: `${timeUntilStr.trim()} (tomorrow)`,
        };
    }
  }
  return { nextPrayer: nextPrayerInfo, currentPrayer: currentPrayerInfo };
}


export async function getPrayerTimes(): Promise<PrayerTimesData> {
  const initialUTCDate = new Date();
  console.log(`[prayer-times.ts] Function start. Raw UTC from new Date(): ${initialUTCDate.toISOString()}`);

  const serverTimeNowInBerlin = toZonedTime(initialUTCDate, berlinTimeZone);
  console.log("getPrayerTimes called at effective Berlin time:", formatInTimeZone(serverTimeNowInBerlin, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX'));

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
      return createErrorFallbackData("Puppeteer configuration error in production.", serverTimeNowInBerlin);
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
      if (browser) await browser.close(); // ensure browser is closed on error
      return createErrorFallbackData(`Puppeteer navigation failed: ${gotoError.message}`, serverTimeNowInBerlin);
    }
    console.log("Navigation successful. Current URL:", page.url());

    try {
      await page.waitForSelector('div.prayers .time div', { timeout: 15000 });
      console.log("Main prayer time selector found.");
    } catch (selectorError) {
      console.warn("waitForSelector for prayer times timed out. Page content might be incomplete or structure changed.");
      // Not returning, attempt to get content anyway
    }
    
    try {
        await page.waitForSelector('#gregorianDate', { timeout: 25000, visible: true }); // Increased timeout slightly
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

    // serverTodayBerlinMidnight represents 00:00:00 on the current day in Berlin.
    // Its underlying UTC timestamp is correct for that Berlin midnight.
    const serverTodayBerlinMidnight = startOfDay(toZonedTime(initialUTCDate, berlinTimeZone)); 

    let dateToParseTimesFor: Date; // This will be a Date object representing 00:00:00 in Berlin for the target day.
    let isStaleData = false;

    const scrapedDateText = $('#gregorianDate').text().trim();
    console.log("Scraped Gregorian date text from page:", `"${scrapedDateText}"`);

    if (scrapedDateText) {
      const parsedScrapedDateRaw = parseScrapedDate(scrapedDateText); // This is parsed as server-local first

      if (parsedScrapedDateRaw) {
        // Convert the parsed date (which might be server-local) to Berlin time, then get start of day in Berlin.
        const scrapedDateBerlinMidnight = startOfDay(toZonedTime(parsedScrapedDateRaw, berlinTimeZone));
        console.log("Successfully parsed scraped date as Berlin midnight (UTC):", scrapedDateBerlinMidnight.toISOString(), `(Berlin: ${formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX')})`);

        if (isSameDay(scrapedDateBerlinMidnight, serverTodayBerlinMidnight)) { // isSameDay compares the day, month, year components correctly for these Berlin-midnight dates
          console.log("Scraped date is current. Using scraped date for display and calculations.");
          dateToParseTimesFor = scrapedDateBerlinMidnight;
          displayGregorianDate = formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy');
        } else {
          console.warn(`Stale data detected! Scraped date "${formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')}" is not today (${formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')}). Using current server time but marking as stale.`);
          dateToParseTimesFor = serverTodayBerlinMidnight;
          const formattedScraped = formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'd. MMM');
          displayGregorianDate = `${formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')} (Data for ${formattedScraped})`;
          isStaleData = true;
        }
      } else {
        console.warn(`Failed to parse scraped date string "${scrapedDateText}". Falling back to current server time for parsing.`);
        dateToParseTimesFor = serverTodayBerlinMidnight;
        displayGregorianDate = `${formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')} (Scraped Date Invalid)`;
      }
    } else {
      console.warn("No date text found using selector '#gregorianDate'. Using current server time for parsing.");
      dateToParseTimesFor = serverTodayBerlinMidnight;
      displayGregorianDate = formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy');
    }
    console.log("Effective date for prayer time calculations (dateToParseTimesFor, Berlin midnight UTC):", dateToParseTimesFor.toISOString(), `(Berlin: ${formatInTimeZone(dateToParseTimesFor, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX')})`);

    hijriDateDisplay = $('#hijriDate').first().text().trim() || undefined;

    $('div.prayers > div').each((_i, el) => {
      const name = $(el).find('.name').text().trim();
      const timeString = $(el).find('.time > div').first().text().trim();

      if (name && timeString) {
        // dateToParseTimesFor is already Berlin midnight for the correct day.
        const prayerDateTime = parsePrayerTime(timeString, dateToParseTimesFor);
        if (prayerDateTime) {
          rawPrayerTimes.push({
            name,
            time: timeString, // Keep original string for display consistency
            dateTime: prayerDateTime, // This Date object represents the prayer time in Berlin
          });
          console.log(`Parsed prayer: ${name} at ${timeString} (UTC: ${prayerDateTime.toISOString()}) for date ${formatInTimeZone(dateToParseTimesFor, berlinTimeZone, 'yyyy-MM-dd')}`);
        } else {
          console.warn(`Failed to parse prayer time for ${name}: ${timeString} with base date ${formatInTimeZone(dateToParseTimesFor, berlinTimeZone, 'yyyy-MM-dd')}`);
        }
      }
    });

    if (rawPrayerTimes.length === 0) {
      console.warn('No prayer times were successfully parsed. Page structure might have changed.');
      console.log('Prayer section HTML:', $('div.prayers').html());
      return createErrorFallbackData("Failed to find prayer times on the page. Selectors may be outdated.", serverTimeNowInBerlin);
    }

    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    // Pass dateToParseTimesFor (Berlin midnight of the prayer day) to calculatePrayerStatus
    const { nextPrayer: nextPrayerInfo, currentPrayer: currentPrayerInfo } = calculatePrayerStatus(rawPrayerTimes, serverTimeNowInBerlin, dateToParseTimesFor);

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
    // Ensure serverTimeNowInBerlin is used if available, otherwise re-zone a new Date.
    const errorFallbackTime = serverTimeNowInBerlin instanceof Date && !isNaN(serverTimeNowInBerlin.getTime()) ? serverTimeNowInBerlin : toZonedTime(new Date(), berlinTimeZone);
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, errorFallbackTime);
  } finally {
    if (browser) {
      console.log("Closing Puppeteer browser/connection in finally block.");
      await browser.close();
    }
  }
}
