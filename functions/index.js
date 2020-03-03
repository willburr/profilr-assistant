const admin = require("firebase-admin");
const functions = require('firebase-functions');
const {dialogflow, SignIn} = require('actions-on-google');
const app = dialogflow({
  debug: true,
  clientId: functions.config().profilr.id
});

admin.initializeApp(functions.config().firebase);
const auth = admin.auth();

let db = admin.firestore();

app.intent('Welcome Intent', (conv) => {
  conv.ask(new SignIn('In order to save your Profile'))
});

app.intent('Get Signin', async (conv, params, signin) => {
  if (signin.status !== 'OK') {
    conv.close(`Let's try again next time.`);
    return;
  }
  const {email} = conv.user;
  if (!conv.data.uid && email) {
    try {
      conv.data.uid = (await auth.getUserByEmail(email)).uid;
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        throw e;
      }
      // If the user is not found, create a new Firebase auth user
      // using the email obtained from the Google Assistant
      conv.data.uid = (await auth.createUser({email})).uid;
    }
  }
  conv.ask(`Hi ${conv.user.profile.payload.name}! What are you up to?`);
});

app.intent('Add Activity', async (conv, {activity_name}) => {
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (activity.exists) {
    conv.ask(`${activity_name} is already an activity in your Profile`);
    return
  }
  await activityRef.set({
    total_seconds: 0,
    start_time: null
  });
  conv.ask(`Successfully added a new activity called: ${activity_name}`);
});

app.intent('List Activities', async (conv) => {
  const activities = await db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').get();
  conv.ask(`Your profiled activities are: ${activities.docs.map(doc => doc.id)}`);
});

app.intent('Start Activity', async (conv, {activity_name}) => {
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (!activity.exists) {
    conv.ask(`${activity_name} is not an activity in your Profile`);
    return
  }
  await activityRef.set({
    start_time: Date.now()
  }, {merge: true});
  conv.ask(`Started profiling activity: ${activity_name}`);
});

app.intent('Stop Activity', async (conv, {activity_name}) => {
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (!activity.exists) {
    conv.ask(`${activity_name} is not an activity in your Profile`);
    return
  }
  const startTime = activity.data().start_time;
  const totalSeconds = activity.data().total_seconds;
  if (startTime === null) {
    conv.ask(`You have not started ${activity_name} yet.`);
    return;
  }
  const sessionSeconds = Math.floor((Date.now() - startTime) /1000);
  const seconds = totalSeconds + sessionSeconds;
  await activityRef.set({
    start_time: null,
    total_seconds: seconds
  }, {merge: true});
  conv.ask(`You spent ${secondsToTimePhrase(sessionSeconds)} ${activity_name}`);
});

app.intent('How Long Have I Spent', async (conv, {activity_name}) => {
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (!activity.exists) {
    conv.ask(`${activity_name} is not an activity in your Profile`);
    return
  }
  const seconds = activity.data().total_seconds;
  conv.ask(`You have spent a total of ${secondsToTimePhrase(seconds)} ${activity_name}`);
});

const secondsToTimePhrase = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  let phrase = "";
  if (minutes !== 0) {
    const plural = minutes === 1 ? '' : 's';
    phrase += `${minutes} minute${plural} and `;
  }
  phrase += `${remainderSeconds} seconds`;
  return phrase;
};



exports.profilrFulfillment = functions.https.onRequest(app);