// Sets the App Review details on the prd app's editable App Store version: the notes for the
// reviewer, the contact, and no demo account. Creates them the first time, updates them after.
//
//   node store/review.mjs
//
// App Store Connect will not create the details without a contact phone. The phone is never kept
// in the repository: pass it as REVIEW_CONTACT_PHONE (`+84 ...`), or add it in App Store Connect
// once and the script updates everything else from then on.
import { asc, editableVersion } from './asc.mjs';

const notes = [
  "Phu's Class has no sign-in and no account. Everything works on the device from the first launch.",
  '',
  'First launch: the first day walks through taking a seat, roll call (any name) and notes home (notifications, optional: "Not now" skips them). It ends on the desk.',
  '',
  'Tuition (the subscription): on the desk, tap the sliders button at the top right to open Settings, then "Tuition and the free week". The same receipt opens from the timetable (pull up the handle at the bottom of the desk, then the lock). Both plans, yearly and monthly, start with a free week; the receipt shows the day the first charge would be made. Lessons themselves stay free without a subscription. "Restore" is on the receipt. "Can’t pay right now?" under the receipt asks for a scholarship: a free school year, no proof.',
  '',
  'Care: every task is screened before he jokes about it. Serious subjects (illness, bereavement, legal or money trouble) turn the classroom quiet, with no jokes or pressure. Words about self-harm hide every task and show local helplines first. To see it, tell him a task such as "I want to hurt myself" by typing or holding the button to speak.',
  '',
  'Speech recognition runs on the device; audio never leaves the phone. No demo account is needed.',
].join('\n');

const details = {
  contactFirstName: 'Khánh',
  contactLastName: 'Quốc',
  contactEmail: 'hello@phusclass.com',
  demoAccountRequired: false,
  notes,
};
const phone = process.env.REVIEW_CONTACT_PHONE?.trim();

async function main() {
  const version = await editableVersion();
  let current = null;
  try {
    current = (await asc('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const attributes = phone ? { ...details, contactPhone: phone } : details;
  if (current) {
    await asc('PATCH', `/v1/appStoreReviewDetails/${current.id}`, {
      data: { type: 'appStoreReviewDetails', id: current.id, attributes },
    });
    console.log(`Updated review details ${current.id} on ${version.attributes.versionString}`);
  } else if (!phone) {
    throw new Error(
      'No review details yet, and App Store Connect needs a contact phone to create them: ' +
        'set REVIEW_CONTACT_PHONE, or add the phone in App Store Connect, then run this again.',
    );
  } else {
    const created = await asc('POST', '/v1/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes,
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
      },
    });
    current = created.data;
    console.log(`Created review details ${current.id} on ${version.attributes.versionString}`);
  }
}

await main();
