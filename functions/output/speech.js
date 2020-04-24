const {secondsToTimePhrase} = require('../utils');

class Speaker {

  randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Welcome

  reasonForSignIn() {
    return `In order to save your profile`;
  }

  welcome(name) {
    return `Hi ${name}. ${this.randomElement([
      `What are you up to?`,
      `What would you like to do now?`
    ])}`;
  }

  // Add Activity

  activityAlreadyExists(activityName) {
    return this.randomElement([
      `${activityName} is already an activity.`,
      `You have already created ${activityName}.`
    ]);
  }

  activityAdded(activityName) {
    return this.randomElement([
      `Successfully added a new activity called ${activityName}.`,
      `I have added the new activity ${activityName}.`,
      `${activityName} has been added.`,
      `Consider it added.`
    ]);
  }

  activityDoesNotExist(activityName) {
    return this.randomElement([
      `${activityName} is not an activity in your profile.`,
      `I do not know about the activity ${activityName}.`
    ]);
  }

  checkRemoveActivity(activityName) {
    return this.randomElement([
      `Are you sure you wish to remove ${activityName} from your profiled activities?`,
      `About to remove ${activityName} from your list of activities. Are you sure?`
    ]);
  }

  removedActivity(activityName) {
    return this.randomElement([
      `Successfully removed ${activityName} from your activities.`,
      `I have removed ${activityName} as an activity.`,
      `Consider it removed.`
    ]);
  }

  cancelAction() {
    return this.randomElement([
      `Ok. Let me know how else I can help.`,
      `Okay. Is there anything I can do instead?`,
    ]);
  }

  listActivities(activities) {
    if (activities.length === 0) {
      return `You have no profiled activities. If you would like to add an activity, let me know!`
    } else if (activities.length === 1) {
      return this.randomElement([
        `You have one profiled activity which is ${activities[0].name}.`,
        `${activities[0].name} is the only activity in your profile.`
      ])
    }
    const length = activities.length;
    const activitiesTerm = `${activities.slice(0, length - 1).map(a => a.name)} and ${activities[length - 1].name}`;
    return this.randomElement([
      `The activities in your profile are ${activitiesTerm}.`,
      `Your activities are ${activitiesTerm}.`
    ]);
  }

  noActivityInProgress() {
    return `${this.randomElement([
      `You have no activity in progress.`,
      `No activities are currently in progress.`
    ])} Let me know if you'd like to start one.`;
  }

  activityInProgress(activityName) {
    return this.randomElement([
      `You are currently ${activityName}.`,
      `You should currently be ${activityName}.`
    ]);
  }

  fullProfile(activityTimes) {
    const length = activityTimes.length;
    const profileTerms = activityTimes.map(a => `${secondsToTimePhrase(a.seconds)} ${a.name}`);
    if (length === 0) {
      return `There is no activity in your profile.`
    } else if (length === 1) {
      return `You have spent ${profileTerms}.`
    }
    const profile = `${profileTerms.slice(0, length - 1)} and ${profileTerms[length - 1]}`;
    return this.randomElement([
      `You have spent ${profile}.`,
      `Your profile is as follows, you spent ${profile}.`
    ]);
  }

  otherActivityInProgress(activityName) {
    return this.randomElement([
      `A different activity ${activityName}, is currently in progress.`,
      `${activityName} is currently in progress.`
    ]);
  }

  startedActivity(activityName) {
    return this.randomElement([
      `Started profiling activity: ${activityName}.`,
      `You are now ${activityName}. Get going.`
    ]);
  }

  promptToAddActivity(activityName) {
    return this.randomElement([
      `${activityName} is not an activity in your Profile. Would you like me to add it?`,
      `${activityName} is not currently an activity. Should I add it?`
    ]);
  }

  activityNotInProgress(activityName) {
    return this.randomElement([
      `${activityName} is not currently in progress.`,
      `That activity is not in progress.`
    ]);
  }

  activitySessionDuration(activityName, seconds) {
    const timePhrase = secondsToTimePhrase(seconds);
    return this.randomElement([
      `You spent ${timePhrase} ${activityName}`,
      `That session lasted ${timePhrase}`
    ]);
  }

  activityTotalDuration(activityName, seconds) {
    const timePhrase = secondsToTimePhrase(seconds);
    return `You have spent a total of ${timePhrase} ${activityName}`;
  }
}

module.exports = {Speaker};