import { format, isValid, parse } from 'date-fns';
import {
  type Output,
  ValiError,
  minLength,
  object,
  safeParseAsync,
  string,
  transform,
  url,
} from 'valibot';
import { type Meetup, meetupSchema } from './meetupType';

export function getMeetupIssueBody(meetup: Meetup) {
  const { date, time } = extractDateAndTime(meetup.date);

  return `
### Meetup title

${meetup.title}

### Date

${date}

### Time

${time}

### Street address

${meetup.location}

### Maps link for address

${meetup.locationLink}

### Organizer

${meetup.organizer}

### Organizer link

${meetup.organizerLink}

### Signup link for meetup

${meetup.signupLink}

### Description

${meetup.description}`;
}

export function parseMeetupIssueBody(body: string) {
  const unverifiedMeetupFormValues = {
    title: getValueFromBody(body, 'Meetup title'),
    date: getValueFromBody(body, 'Date'),
    time: getValueFromBody(body, 'Time'),
    location: getValueFromBody(body, 'Street address'),
    locationLink: getValueFromBody(body, 'Maps link for address'),
    organizer: getValueFromBody(body, 'Organizer'),
    organizerLink: getValueFromBody(body, 'Organizer link'),
    signupLink: getValueFromBody(body, 'Signup link for meetup'),
    description: getRestAfterTitle(body, 'Description'),
  };

  return safeParseAsync(
    meetupIssueFormValuesSchema,
    unverifiedMeetupFormValues,
  );
}

export const meetupIssueFormValuesSchema = object({
  title: string([minLength(1)]),
  description: string([minLength(1)]),
  date: transform(string([minLength(1)]), meetupIssueTemplateFormDateSchema),
  time: transform(string([minLength(1)]), meetupIssueTemplateFormTimeSchema),
  location: string([minLength(1)]),
  locationLink: string([url()]),
  organizer: string([minLength(1)]),
  organizerLink: string([url()]),
  signupLink: string([url()]),
});

export type MeetupFormValues = Output<typeof meetupIssueFormValuesSchema>;

export async function meetupIssueFormValuesToMeetup(
  meetupIssueTemplateFormValues: MeetupFormValues,
) {
  const { date, time, ...rest } = meetupIssueTemplateFormValues;

  return safeParseAsync(meetupSchema, {
    ...rest,
    date: new Date(`${date}T${time}:00`).toISOString(),
  });
}

export function meetupIssueTemplateFormDateSchema(input: string) {
  const parsedDate = parse(input, 'yyyy-MM-dd', new Date());

  if (!isValid(parsedDate)) {
    throw new ValiError([
      {
        input,
        message: 'Invalid date (format yyyy-MM-dd)',
        origin: 'value',
        reason: 'string',
        validation: 'date',
      },
    ]);
  }

  return input;
}

export function meetupIssueTemplateFormTimeSchema(input: string) {
  const parsedDate = parse(input, 'HH:mm', new Date());

  if (!isValid(parsedDate)) {
    throw new ValiError([
      {
        input,
        message: 'Invalid time (format HH:mm)',
        origin: 'value',
        reason: 'string',
        validation: 'time',
      },
    ]);
  }

  return input;
}

function extractDateAndTime(date: Date) {
  return {
    date: format(date, 'yyyy-MM-dd'),
    time: format(date, 'HH:mm'),
  };
}

function getValueFromBody(body: string, title: string) {
  const regex = new RegExp(`### ${title}\\s*\\n\\s*([\\s\\S]*?)\\s*\\n\\s*###`);
  const match = body.match(regex);

  if (match) {
    return match[1];
  }

  return null;
}

function getRestAfterTitle(body: string, title: string) {
  const regex = new RegExp(`### ${title}\\s*\\n\\s*([\\s\\S]*)`);
  const match = body.match(regex);

  if (match) {
    return match[1];
  }

  return null;
}
