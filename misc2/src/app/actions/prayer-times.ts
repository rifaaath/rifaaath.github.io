
'use server';

import { format, addMinutes, differenceInMinutes, parse, set, addDays } from 'date-fns';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// chromium.setGraphicsMode = false; // Removed for @sparticuz/chromium v119 compatibility

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
}

const MAWAQIT_URL = "https://mawaqit.net/en/friedenmoschee-erlangen";

function parsePrayerTime(timeStr: string, baseDate: Date): Date | null {
  if (!timeStr) {
    console.warn("parsePrayerTime: Received empty or null time string.");
    return null;
  }
  if (!(baseDate instanceof Date) || isNaN(baseDate.getTime())) {
    console.warn("parsePrayerTime: Received invalid baseDate: " + String(baseDate) + ". Cannot parse time \"" + String(timeStr) + "\".");
    return null;
  }

  const [timePart, modifier] = timeStr.split(' ');

  if (!timePart || !timePart.includes(':')) {
    console.warn("parsePrayerTime: Invalid time string format (missing ':' or empty timePart): \"" + String(timeStr) + "\"");
    return null;
  }

  const [hoursStr, minutesStr] = timePart.split(':');

  if (!hoursStr || minutesStr === undefined) {
    console.warn("parsePrayerTime: Invalid time components for: \"" + String(timeStr) + "\" (hoursStr: " + String(hoursStr) + ", minutesStr: " + String(minutesStr) + ")");
    return null;
  }

  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`parsePrayerTime: Failed to parse hour/minute numbers for: "${timeStr}" (parsed hours=${hours}, parsed minutes=${minutes})`);
    return null;
  }

  if (!modifier) { 
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn(`parsePrayerTime: Hour/minute out of range for 24h format: "${timeStr}" (hours=${hours}, minutes=${minutes})`);
      return null;
    }
  } else { 
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      console.warn(`parsePrayerTime: Hour/minute out of range for 12h format: "${timeStr}"`);
      return null;
    }
    if (modifier.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    }
    if (modifier.toUpperCase() === 'AM' && hours === 12) { 
      hours = 0;
    }
  }
  try {
    return set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 });
  } catch (e: any) {
    console.error(`parsePrayerTime: Error calling 'set' for baseDate: ${baseDate}, hours: ${hours}, minutes: ${minutes}`, e);
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
    displayDate = format(validFallbackDate, 'EEEE, MMMM d, yyyy');
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
  };
}

async function fetchPrayerTimesWithHTTP(): Promise<string> {
  try {
    const response = await fetch(MAWAQIT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', // Updated User-Agent
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error: any) {
    throw new Error(`HTTP fetch failed: ${error.message}`);
  }
}

export async function getPrayerTimes(): Promise<PrayerTimesData> {
  const serverTimeNow = new Date(); 
  let browser;

  try {
    let rawPrayerTimes: PrayerTime[] = [];
    let displayGregorianDate: string;
    let hijriDateDisplay: string | undefined;
    let dateToParseTimesFor: Date = serverTimeNow;
    let htmlContent: string;

    try {
      htmlContent = await fetchPrayerTimesWithHTTP();

    } catch (httpError: any) {
      console.log("HTTP fetch failed, attempting Puppeteer fallback. Error:", httpError.message);
      
      let executablePath: string | undefined;

      try {
        executablePath = await chromium.executablePath();
        console.log("Chromium executablePath (attempt 1):", executablePath);
      } catch (e: any) {
        console.error("Error getting chromium.executablePath:", e.message);
        executablePath = undefined;
      }
      
      if (!executablePath && process.env.PUPPETEER_EXECUTABLE_PATH) {
        executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log("Using PUPPETEER_EXECUTABLE_PATH:", executablePath);
      }

      const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          headless: true, 
      };

      if (executablePath) {
          launchOptions.executablePath = executablePath;
      } else {
          console.warn("No executablePath found for Puppeteer. Puppeteer-core will attempt to find a system browser or use other means.");
          // If executablePath is undefined here, puppeteer-core will handle it
          // (e.g., by checking env vars or system installations)
          // We don't return error here, let puppeteer.launch try.
      }
      
      console.log("Attempting to launch Puppeteer with options:", launchOptions);
      try {
        browser = await puppeteer.launch(launchOptions);
      } catch (launchError: any) {
        console.error("Puppeteer launch failed:", launchError.message);
        return createErrorFallbackData(`Puppeteer launch failed: ${launchError.message}`, serverTimeNow);
      }
      console.log("Puppeteer launched successfully.");
      
      const page = await browser.newPage({ ignoreHTTPSErrors: true });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 720 });
      
      console.log("Navigating to Mawaqit URL with Puppeteer...");
      try {
        await page.goto(MAWAQIT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (gotoError: any) {
        console.error("Puppeteer page.goto failed:", gotoError.message);
        return createErrorFallbackData(`Puppeteer navigation failed: ${gotoError.message}`, serverTimeNow);
      }
      console.log("Navigation successful.");
      
      try {
        await page.waitForSelector('div.prayers .time div', { timeout: 15000 });
      } catch (selectorError) {
        console.warn("waitForSelector for prayer times timed out. Page content might be incomplete or structure changed.");
        const contentCheck = await page.content();
        if (!contentCheck.includes("prayer")) { 
            console.error("Essential prayer content not found on the page via Puppeteer after timeout.");
            throw new Error("Essential prayer content not found on the page via Puppeteer.");
        }
      }
      
      htmlContent = await page.content();
      console.log("HTML content fetched via Puppeteer.");
    }


    const $ = cheerio.load(htmlContent);

    const scrapedDateText = $('span.mosque-date').first().text().trim();
    if (scrapedDateText) {
      displayGregorianDate = scrapedDateText; 
      try {
        const parsedDateAttempt = parse(scrapedDateText, 'EEEE, MMMM d, yyyy', new Date());
        if (parsedDateAttempt instanceof Date && !isNaN(parsedDateAttempt.getTime())) {
          dateToParseTimesFor = parsedDateAttempt;
        } else {
          console.warn(`Scraped date string "${scrapedDateText}" was invalid. Falling back to current server time for parsing prayer times.`);
          dateToParseTimesFor = new Date(serverTimeNow); 
          displayGregorianDate = `(Scraped Date Invalid: ${scrapedDateText}) ${format(serverTimeNow, 'EEEE, MMMM d, yyyy')}`;
        }
      } catch (e: any) {
          console.warn(`Exception while parsing scraped date string "${scrapedDateText}": ${e.message}. Falling back to current server time.`);
          dateToParseTimesFor = new Date(serverTimeNow);
          displayGregorianDate = `(Scraped Date Exception) ${format(serverTimeNow, 'EEEE, MMMM d, yyyy')}`;
      }
    } else {
      console.warn("No date text found on scraped page. Using current server time for display and parsing prayer times.");
      dateToParseTimesFor = new Date(serverTimeNow); 
      displayGregorianDate = format(serverTimeNow, 'EEEE, MMMM d, yyyy');
    }

    hijriDateDisplay = $('span.mosque-hijri').first().text().trim() || undefined;

    $('div.prayers > div').each((_i, el) => {
      const name = $(el).find('.name').text().trim();
      const timeString = $(el).find('.time > div').first().text().trim(); 

      if (name && timeString) {
        if (!(dateToParseTimesFor instanceof Date) || isNaN(dateToParseTimesFor.getTime())) {
           console.warn("dateToParseTimesFor was invalid before parsing prayer time. Resetting to serverTimeNow.");
           dateToParseTimesFor = new Date(serverTimeNow); 
        }
        const prayerDateTime = parsePrayerTime(timeString, dateToParseTimesFor);
        if (prayerDateTime) {
          rawPrayerTimes.push({
            name,
            time: format(prayerDateTime, 'HH:mm'), 
            dateTime: prayerDateTime,
          });
        }
      }
    });

    if (rawPrayerTimes.length === 0) {
      console.warn('No prayer times were successfully parsed. Page structure might have changed or no times listed.');
    }


    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    let nextPrayerInfo: PrayerTimesData['nextPrayer'] = null;
    let currentPrayerInfo: PrayerTimesData['currentPrayer'] = null;

    if (!(serverTimeNow instanceof Date) || isNaN(serverTimeNow.getTime())) {
        console.error("Critical: serverTimeNow is invalid. This should not happen.");
        return createErrorFallbackData("Internal error with server's current time.", new Date()); // Fallback to new Date() as a last resort
    }

    for (let i = 0; i < rawPrayerTimes.length; i++) {
      const prayer = rawPrayerTimes[i];
      if (!prayer || !(prayer.dateTime instanceof Date) || isNaN(prayer.dateTime.getTime())) {
        console.warn("Skipping invalid prayer object or dateTime in prayer list:", prayer);
        continue;
      }

      if (prayer.name !== 'Sunrise') { 
        let nextSalatDateTime: Date | null = null;
        for (let j = i + 1; j < rawPrayerTimes.length; j++) {
            if (rawPrayerTimes[j].name !== 'Sunrise' && rawPrayerTimes[j].dateTime instanceof Date && !isNaN(rawPrayerTimes[j].dateTime.getTime())) {
                nextSalatDateTime = rawPrayerTimes[j].dateTime;
                break;
            }
        }
        // Set a reasonable end time for the current prayer if it's the last one, e.g., 2.5 hours (150 minutes)
        const endCurrentPrayerTime = nextSalatDateTime || addMinutes(prayer.dateTime, 150); 

        if (serverTimeNow >= prayer.dateTime && serverTimeNow < endCurrentPrayerTime) {
          currentPrayerInfo = { name: prayer.name, time: prayer.time };
        }
      }

      if (serverTimeNow < prayer.dateTime && !nextPrayerInfo) { 
        const diffMinutes = differenceInMinutes(prayer.dateTime, serverTimeNow);
        if (diffMinutes >= 0) { // Ensure the prayer is in the future
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
        }
      }
    }

    if (!nextPrayerInfo && rawPrayerTimes.length > 0) {
      const fajrPrayerToday = rawPrayerTimes.find(p => p.name === 'Fajr' && p.dateTime instanceof Date && !isNaN(p.dateTime.getTime()));
      if (fajrPrayerToday && fajrPrayerToday.dateTime) {
        // Determine if Fajr for calculation is today's or tomorrow's
        const fajrForCalculation = serverTimeNow > fajrPrayerToday.dateTime ? addDays(fajrPrayerToday.dateTime, 1) : fajrPrayerToday.dateTime;
        
        const diffMinutes = differenceInMinutes(fajrForCalculation, serverTimeNow);

        if (diffMinutes >= 0) { // Ensure it's a future time
          const hoursUntil = Math.floor(diffMinutes / 60);
          const minutesUntil = diffMinutes % 60;
          let timeUntilStr = '';
          if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
          timeUntilStr += `${minutesUntil}m`;
          
          let label = "";
          if (fajrForCalculation.getDate() !== serverTimeNow.getDate()) {
            label = " (tomorrow)";
          }

          nextPrayerInfo = {
            name: fajrPrayerToday.name, 
            time: fajrPrayerToday.time, 
            dateTime: fajrForCalculation, 
            timeUntil: `${timeUntilStr.trim()}${label}`,
          };
        }
      }
    }

    return {
      date: displayGregorianDate,
      hijriDate: hijriDateDisplay,
      times: displayTimes,
      nextPrayer: nextPrayerInfo,
      currentPrayer: currentPrayerInfo,
    };

  } catch (unexpectedError: any) {
    console.error("An unexpected server error occurred in getPrayerTimes:", unexpectedError);
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, new Date());
  } finally {
    if (browser) {
      console.log("Closing Puppeteer browser.");
      await browser.close();
    }
  }
}