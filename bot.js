/*eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
'use strict';

const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const Podio = require('podio-js').api;
require('dotenv').config({silent: true});
const rtm = new RtmClient(process.env.botToken);
const podio = new Podio({
  authType: 'app', // or client
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret
});
const bot = require('./helper');
let podioAuthenticated = false;

/* Function with the podio api call to get all items and filter by excat title
 * Note: Also providing a "property" for the filter would allows us to filter
 * by anything other than the title. Something useful for the new get/list.
 * However, this API calls required an excat match although it is not case sensitive.
 * I would say it is only good for getting specific things, not really useful for lists.
 */
const getPodioItem = (name) => {
  const data = {
    'sort_by': 'title',
    'sort_desc': true,
    'filters': {
      title: name
    },
    'limit': 30,
    'offset': 0,
    'remember': false
  }
  // Returns Filtered Item Object
  return podio.request('POST', '/item/app/17912486/filter/', data).then((res) => res.items[0]);
}

/* Main function for retrieving the link to the item.
 * Users must provide the item name. It depends on
 * getPodioItem to find the right item.
 */
function getURL(item_name, channel) {
  return getPodioItem(item_name).then((item) => {
    const msg = bot.getURL(item);
    rtm.sendMessage(msg, channel);
  });

}
/* Main function for retrieving field values
 * when you know the item's excat title, it depends on
 * getPodioItem to find the right item.
 * TODO: Decouple more. Make a function to handle res,
 * what should be the final response?
 */
function getStatus(item_name, field_name, channel) {
  return getPodioItem(item_name).then((item) => {
    let res = bot.filterFields(item.fields, field_name)[0].values[0].value;
    //Returns either a number, string, or whole value.
    res = parseInt(res, 10) || res.text || (typeof res === 'object'? JSON.stringify(res) : res);
    rtm.sendMessage(`Item: ${item_name}, Field: ${field_name}, Value: ${res}`, channel);
  });
}

// Sets status field to value Active or Inactive
//Action: @podio Item's Name set Field's Name Value
function setStatus(item_name, field_name, field_value, channel) {
  return getPodioItem(item_name).then((item) => {
    const options = item.fields[1].config.settings.options;
    const item_id = bot.getItemID(item);
    let fieldID = field_value;
    let data = {};
    if (field_name === 'Category' || field_name === 'category') {
      fieldID = bot.getFieldValueID(options, field_value);
      data = {
        'category': [fieldID]
      };
    }
    data[field_name.toLowerCase()] = fieldID;
    return podio.request('PUT', `/item/${item_id}/value/`, data).then((res) => {
      rtm.sendMessage(`Item: ${item_name}, Field: ${field_name},` + ` Value set to: ${field_value}`, channel);
    });
  });
}

function authenticatePodio(callback, errorCallback) {
  return podio.authenticateWithApp(process.env.appID, process.env.appToken, (err) => {
    errorCallback(err);
    return podio.isAuthenticated().then(() => {
      callback();
    }).catch((err) => {
      errorCallback(err);
    });
  });
}

// The client will emit an RTM.AUTHENTICATED event on successful connection,
// with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name},` + `but not yet connected to a channel.`);
  authenticatePodio(() => {
    podioAuthenticated = true;
  }, (err) => {
    console.log(err);
  });
});

// you need to wait for the client to fully connect before you can send messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
  rtm.sendMessage(`Hello! Just letting you know that I'm here if you need anything.`, 'C46S9UAN5');
});

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  // Looks for '@podio title get status'
  const msg = message.text.split(' ');

  if (podioAuthenticated && msg[0] === '@podio') {
    const channel = message.channel;
    const item = msg[1];
    const action = msg[2];
    const field = msg[3];
    const value = msg[4];
    switch (true) {
      case action === 'get':
        getStatus(item, field, channel).catch((err) => {
          console.log(err);
        });
        break;
      case action === 'set':
        setStatus(item, field, value, channel).catch((err) => {
          console.log(err);
        });
        break;
      case action === 'url':
        getURL(item, channel).catch((err) => {
          console.log(err);
        });
        break;
      case item === 'help':
        rtm.sendMessage(bot.showHelp(), channel);
        break;
      default:
        rtm.sendMessage('Sorry, wrong command', channel);
    }
  } else {
    console.log('podio is not authenticated or message was not for it.');
  }
});

rtm.start();
