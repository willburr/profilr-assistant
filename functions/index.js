const admin = require('firebase-admin');
const functions = require('firebase-functions');
const {dialogflow, SignIn} = require('actions-on-google');
const { sessionSeconds } = require('./utils');
const { Speaker } = require("./output/speech");
const { ActivityRepository } = require("./repositories/activityRepository");
const app = dialogflow({
  debug: true,
  clientId: functions.config().profilr.id
});

admin.initializeApp(functions.config().firebase);
const auth = admin.auth();

const db = admin.firestore();
const speaker = new Speaker();
const activities = new ActivityRepository(db);

app.intent('Welcome Intent', (conv) => {
  conv.ask(new SignIn(speaker.reasonForSignIn()))
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
  conv.ask(speaker.welcome(conv.user.profile.payload.name));
});

app.intent('Add Activity', async (conv, {activity_name}) => {
  const activity = await activities.getByName(conv.data.uid, activity_name);
  if (activity) {
    conv.ask(speaker.activityAlreadyExists(activity_name));
    return
  }
  await activities.add(conv.data.uid, activity_name);
  conv.ask(speaker.activityAdded(activity_name));
});

// Remove Activity

app.intent('Remove Activity', async (conv, {activity_name}) => {
  const activity = await activities.getByName(conv.data.uid, activity_name);
  if (!activity) {
    conv.ask(speaker.activityDoesNotExist(activity_name));
    return;
  }
  // Store information for later
  conv.data.activity = activity;
  conv.ask(speaker.checkRemoveActivity(activity_name));
});

app.intent('Remove Activity - yes', async (conv) => {
  await activities.remove(conv.data.uid, conv.data.activity.id);
  conv.ask(speaker.removedActivity(conv.data.activity.name));
});

app.intent('Remove Activity - no', async (conv) => {
  conv.ask(speaker.cancelAction());
});

app.intent('List Activities', async (conv) => {
  const allActivities = await activities.getAll(conv.data.uid);
  conv.ask(speaker.listActivities(allActivities));
});

app.intent('Current Activity', async (conv) => {
  const activity = await activities.current(conv.data.uid);
  if (!activity) {
    conv.ask(speaker.noActivityInProgress());
    return;
  }
  conv.ask(speaker.activityInProgress(activity));
});

app.intent('Full Profile', async (conv) => {
  const allActivities = activities.getAll(conv.data.uid);
  const activityTimes = [];
  allActivities.forEach(activity => {
    activityTimes.push({name: activity.id, seconds: sessionSeconds(activity) + activity.total_seconds})
  });
  conv.ask(speaker.fullProfile(activityTimes));
});

// Start Activity

app.intent('Start Activity', async (conv, {activity_name}) => {
  // Check if any activity is already started
  const currentActivity = await activities.current(conv.data.uid);
  if (currentActivity){
    conv.ask(speaker.otherActivityInProgress(currentActivity.name));
    return;
  }
  // Get the activity to start
  const activity = await activities.getByName(conv.data.uid, activity_name);

  if (!activity) {
    conv.followup('start_activity_add_activity', {
      activity_name: activity_name
    });
    return;
  }
  await activities.start(conv.data.uid, activity.id);
  conv.ask(speaker.startedActivity(activity_name));
});

app.intent('Start Activity - add Activity', (conv, {activity_name}) => {
  conv.data.activity = {
    name: activity_name
  };
  conv.ask(speaker.promptToAddActivity(activity_name));
});

app.intent('Start Activity - add Activity - yes', async (conv) => {
  const activity = conv.data.activity;
  await activities.add(conv.data.uid, activity.name)
    .then(id => activities.start(conv.data.uid, id, true));
  conv.ask(speaker.startedActivity(activity.name));
});

app.intent('Start Activity - add Activity - no', async (conv) => {
  conv.ask(speaker.cancelAction());
});


app.intent('Stop Activity', async (conv, {activity_name}) => {

  // Check the activity has been started (and no other has been)
  const currentActivity = await activities.current(conv.data.uid);
  if (!currentActivity) {
    conv.ask(speaker.activityNotInProgress(activity_name));
    return;
  } else if (currentActivity !== activity_name){
    conv.ask(speaker.otherActivityInProgress(activity_name));
    return;
  }

  // Get the activity to stop
  const activity = await activities.getByName(conv.data.uid, activity_name);
  if (!activity) {
    conv.ask(speaker.activityDoesNotExist(activity_name));
    return;
  }

  const seconds = sessionSeconds(activity);
  const totalSeconds = activity.total_seconds + seconds;

  // Stop the activity
  await activities.stop(conv.data.uid, activity.id, totalSeconds);

  conv.ask(speaker.activitySessionDuration(activity_name, seconds));
});

app.intent('How Long Have I Spent', async (conv, {activity_name}) => {
  const activity = await activities.getByName(conv.data.uid, activity_name);
  if (!activity) {
    conv.ask(`${activity_name} is not an activity in your Profile`);
    return
  }
  const seconds = activity.total_seconds + sessionSeconds(activity);
  conv.ask(speaker.activityTotalDuration(seconds));
});

exports.profilrFulfillment = functions.https.onRequest(app);