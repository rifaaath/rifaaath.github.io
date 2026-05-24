export type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
};

export const events: Event[] = [
  {
    id: '1',
    title: 'Members General Meeting',
    date: '2025-11-08T18:00:00Z',
    time: '6:00 PM',
    location: 'University Main Hall',
    description: 'Join us for the general meeting to discuss upcoming plans and activities for MHG Erlangen.',
    image: 'event-1',
  },
  {
    id: '2',
    title: 'Workshop: Free Speaking',
    date: '2025-12-13T15:00:00Z',
    time: '3:00 PM - 5:00 PM',
    location: 'Student Hub, Room 5',
    description: 'Enhance your public speaking skills in this interactive workshop. All levels are welcome.',
    image: 'event-2',
  },
  {
    id: '3',
    title: 'Group Sports',
    date: '2025-12-18T17:00:00Z',
    time: '5:00 PM - 7:00 PM',
    location: 'University Sports Center',
    description: 'Join us for an evening of friendly competition and fun. We will be playing various group sports.',
    image: 'event-3',
  },
  {
    id: '4',
    title: 'Lecture',
    date: '2026-01-10T19:00:00Z',
    time: '7:00 PM',
    location: 'Lecture Hall C',
    description: 'An insightful lecture on a topical issue. More details to follow soon.',
    image: 'event-4',
  },
  {
    id: '5',
    title: 'Tea-Time',
    date: '2026-02-05T16:00:00Z',
    time: '4:00 PM',
    location: 'Campus Cafe',
    description: 'A casual get-together to relax and chat over a warm cup of tea. A great way to meet new people.',
    image: 'event-2',
  },
];
