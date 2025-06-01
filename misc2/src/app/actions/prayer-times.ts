
'use server';

import { format, addMinutes, differenceInMinutes, parse, set, addDays } from 'date-fns';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';


export interface PrayerTime {
  name: string;
  time: string; // Display time (e.g., 01:15 PM or 13:15)
  dateTime: Date; // Full Date object for comparisons
}

export interface PrayerTimesData {
  date: string;
  hijriDate?: string;
  times: { name: string; time: string }[];
  nextPrayer: {
    name: string;
    time: string; // Display time (e.g., 01:15 PM or 13:15)
    dateTime: Date; // Full Date object for the next prayer
    timeUntil: string; // Initial duration string (e.g., "1h 30m")
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
    console.warn(`parsePrayerTime: Received empty or null time string.`);
    return null;
  }
  if (!(baseDate instanceof Date) || isNaN(baseDate.getTime())) {
    console.warn(`parsePrayerTime: Received invalid baseDate: ${baseDate}. Cannot parse time "${timeStr}".`);
    return null;
  }

  const [timePart, modifier] = timeStr.split(' ');

  if (!timePart || !timePart.includes(':')) {
    console.warn(`parsePrayerTime: Invalid time string format (missing ':' or empty timePart): "${timeStr}"`);
    return null;
  }

  const [hoursStr, minutesStr] = timePart.split(':');

  if (!hoursStr || minutesStr === undefined) {
    console.warn(`parsePrayerTime: Invalid time components for: "${timeStr}" (hoursStr: ${hoursStr}, minutesStr: ${minutesStr})`);
    return null;
  }

  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`parsePrayerTime: Failed to parse hour/minute numbers for: "${timeStr}" (parsed hours=${hours}, parsed minutes=${minutes})`);
    return null;
  }

  // Mawaqit uses 24-hour format primarily from scraping
  if (!modifier) { // 24-hour format
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn(`parsePrayerTime: Hour/minute out of range for 24h format: "${timeStr}" (hours=${hours}, minutes=${minutes})`);
      return null;
    }
  } else { // 12-hour format with AM/PM (mostly for fallback data, or if Mawaqit changes)
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      console.warn(`parsePrayerTime: Hour/minute out of range for 12h format: "${timeStr}"`);
      return null;
    }
    if (modifier.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    }
    if (modifier.toUpperCase() === 'AM' && hours === 12) { // Midnight case e.g. 12:30 AM should be 00:30
      hours = 0;
    }
  }
  try {
    return set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 });
  } catch (e) {
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


export async function getPrayerTimes(): Promise<PrayerTimesData> {
  const serverTimeNow = new Date(); 

  try {
    let rawPrayerTimes: PrayerTime[] = [];
    let displayGregorianDate: string;
    let hijriDateDisplay: string | undefined;
    let dateToParseTimesFor: Date = serverTimeNow; 

    try {
      console.log("Launching Puppeteer...");
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], 
        headless: true 
      });
      const page = await browser.newPage();
      console.log(`Navigating to ${MAWAQIT_URL}...`);
      await page.goto(MAWAQIT_URL, { waitUntil: 'networkidle2', timeout: 30000 }); 
      
      await page.waitForSelector('div.prayers .time div', { timeout: 15000 });
      console.log("Page content should be loaded. Getting HTML...");

      const html = await page.content();
      await browser.close();
      console.log("Browser closed. Parsing HTML with Cheerio...");

      const $ = cheerio.load(html);

      const scrapedDateText = $('span.mosque-date').first().text().trim();
      if (scrapedDateText) {
        displayGregorianDate = scrapedDateText; 
        try {
          const parsedDateAttempt = parse(scrapedDateText, 'EEEE, MMMM d, yyyy', new Date());
          if (parsedDateAttempt instanceof Date && !isNaN(parsedDateAttempt.getTime())) {
            dateToParseTimesFor = parsedDateAttempt;
             console.log("Parsed Mawaqit date successfully:", format(dateToParseTimesFor, 'yyyy-MM-dd'));
          } else {
            console.error(`Failed to parse scraped date: "${scrapedDateText}". Falling back to server's current date for prayer time parsing.`);
            dateToParseTimesFor = new Date(); // Fallback explicitly
            displayGregorianDate = `(Scraped Date Invalid: ${scrapedDateText}) ${format(serverTimeNow, 'EEEE, MMMM d, yyyy')}`;
          }
        } catch (e: any) {
            console.error(`Exception during scraped date parsing for "${scrapedDateText}": ${e.message}. Falling back.`);
            dateToParseTimesFor = new Date(); // Fallback explicitly
            displayGregorianDate = `(Scraped Date Exception) ${format(serverTimeNow, 'EEEE, MMMM d, yyyy')}`;
        }
      } else {
        console.warn("Scraped date string is empty. Falling back to server's current date.");
        dateToParseTimesFor = new Date(); // Fallback explicitly
        displayGregorianDate = format(serverTimeNow, 'EEEE, MMMM d, yyyy');
      }

      hijriDateDisplay = $('span.mosque-hijri').first().text().trim() || undefined;

      $('div.prayers > div').each((_i, el) => {
        const name = $(el).find('.name').text().trim();
        const timeString = $(el).find('.time > div').first().text().trim(); 

        if (name && timeString) {
          if (!(dateToParseTimesFor instanceof Date) || isNaN(dateToParseTimesFor.getTime())) {
             console.error(`CRITICAL: dateToParseTimesFor is invalid before parsing prayer "${name}". Using fresh server time.`);
             dateToParseTimesFor = new Date(); 
          }
          const prayerDateTime = parsePrayerTime(timeString, dateToParseTimesFor);
          if (prayerDateTime) {
            rawPrayerTimes.push({
              name,
              time: format(prayerDateTime, 'HH:mm'), 
              dateTime: prayerDateTime,
            });
          } else {
            console.warn(`Skipping prayer entry (parsePrayerTime returned null): ${name} - ${timeString} on ${format(dateToParseTimesFor, 'yyyy-MM-dd')}`);
          }
        } else {
            if (!name) console.warn("Found prayer element with no name.");
            if (!timeString) console.warn(`Found prayer element ("${name}") with no time string.`);
        }
      });

      if (rawPrayerTimes.length === 0) {
        console.warn('No prayer times were successfully parsed from Mawaqit via Puppeteer. Page structure might have changed or no times listed.');
      } else {
        console.log(`Successfully parsed ${rawPrayerTimes.length} prayer times via Puppeteer.`);
      }

    } catch (fetchParseError: any) {
      console.error("Error during Puppeteer fetching/parsing Mawaqit data:", fetchParseError.message, fetchParseError.stack);
      return createErrorFallbackData(`Failed to load live prayer data: ${fetchParseError.message}. Using fallback.`, serverTimeNow);
    }

    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    let nextPrayerInfo: PrayerTimesData['nextPrayer'] = null;
    let currentPrayerInfo: PrayerTimesData['currentPrayer'] = null;

    if (!(serverTimeNow instanceof Date) || isNaN(serverTimeNow.getTime())) {
        console.error("CRITICAL: serverTimeNow is invalid before calculations. This should not occur.");
        return createErrorFallbackData("Internal error with server's current time.", new Date());
    }

    for (let i = 0; i < rawPrayerTimes.length; i++) {
      const prayer = rawPrayerTimes[i];
      if (!prayer || !(prayer.dateTime instanceof Date) || isNaN(prayer.dateTime.getTime())) {
        console.warn(`Skipping invalid prayer object in current/next calculation: ${JSON.stringify(prayer)}`);
        continue;
      }

      if (prayer.name !== 'Sunrise') { // Sunrise is not a prayer for "current" calculation
        // Determine end of current prayer: either start of next listed prayer (excluding Sunrise) or a default duration (e.g., 2.5 hours)
        let nextSalatDateTime: Date | null = null;
        for (let j = i + 1; j < rawPrayerTimes.length; j++) {
            if (rawPrayerTimes[j].name !== 'Sunrise' && rawPrayerTimes[j].dateTime instanceof Date && !isNaN(rawPrayerTimes[j].dateTime.getTime())) {
                nextSalatDateTime = rawPrayerTimes[j].dateTime;
                break;
            }
        }
        // If no next prayer (e.g., for Isha), assume a reasonable duration like 150 minutes (2.5 hours)
        const endCurrentPrayerTime = nextSalatDateTime || addMinutes(prayer.dateTime, 150); 

        if (serverTimeNow >= prayer.dateTime && serverTimeNow < endCurrentPrayerTime) {
          currentPrayerInfo = { name: prayer.name, time: prayer.time };
        }
      }

      // Determine next prayer (can be Sunrise for 'next')
      if (serverTimeNow < prayer.dateTime && !nextPrayerInfo) {
        const diffMinutes = differenceInMinutes(prayer.dateTime, serverTimeNow);
        if (diffMinutes >= 0) { // Ensure it's actually in the future
            const hoursUntil = Math.floor(diffMinutes / 60);
            const minutesUntil = diffMinutes % 60;
            let timeUntilStr = '';
            if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
            timeUntilStr += `${minutesUntil}m`;

            nextPrayerInfo = {
                name: prayer.name,
                time: prayer.time,
                dateTime: prayer.dateTime, // Store the actual Date object
                timeUntil: timeUntilStr.trim(),
            };
        }
      }
    }

    // Handle case where next prayer is Fajr tomorrow
    if (!nextPrayerInfo && rawPrayerTimes.length > 0) {
      const fajrPrayerToday = rawPrayerTimes.find(p => p.name === 'Fajr' && p.dateTime instanceof Date && !isNaN(p.dateTime.getTime()));
      if (fajrPrayerToday && fajrPrayerToday.dateTime) {
        // Check if current time is after today's Fajr. If so, next Fajr is tomorrow.
        // Also handles if serverTimeNow is past all prayers today.
        const fajrTomorrowDateTime = addDays(fajrPrayerToday.dateTime, 1);
        const diffMinutes = differenceInMinutes(fajrTomorrowDateTime, serverTimeNow);

        if (diffMinutes >= 0) { // Ensure it's actually in the future
          const hoursUntil = Math.floor(diffMinutes / 60);
          const minutesUntil = diffMinutes % 60;
          let timeUntilStr = '';
          if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
          timeUntilStr += `${minutesUntil}m`;

          nextPrayerInfo = {
            name: fajrPrayerToday.name, // Still "Fajr"
            time: fajrPrayerToday.time, // Show today's Fajr time
            dateTime: fajrTomorrowDateTime, // Use tomorrow's actual Date object
            timeUntil: `${timeUntilStr.trim()} (tomorrow)`,
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
    console.error("CRITICAL UNHANDLED ERROR in getPrayerTimes main processing:", unexpectedError.message, unexpectedError.stack);
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, new Date());
  }
}