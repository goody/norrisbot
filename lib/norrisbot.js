'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var request = require('request');
var Bot = require('slackbots');

/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "norrisbot")
 *      dbPath : the path to access the database (will default to "data/norrisbot.db")
 *
 * @param {object} settings
 * @constructor
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 */
var NorrisBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'norrisbot';

    this.user = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(NorrisBot, Bot);

/**
 * Run the bot
 * @public
 */
NorrisBot.prototype.run = function () {
    NorrisBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
NorrisBot.prototype._onStart = function () {
    this._loadBotUser();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
NorrisBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromNorrisBot(message) &&
        this._isMentioningChuckNorris(message)
    ) {
        this._replyWithRandomJoke(message);
    }
};

/**
 * Replyes to a message with a random Joke
 * @param {object} originalMessage
 * @private
 */
NorrisBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    var totalJokes = 0;
    //get total number of jokes
    request('http://api.icndb.com/jokes/count', function (err, response, body){
        // handle possible request errors by stopping the whole process
        if (err || response.statusCode !== 200) {
            console.log(body, err, response.statusCode);

            return err || response.statusCode;
        }
        try {
            totalJokes = JSON.parse(body).value;
            var randomJoke = Math.floor(Math.random() * (totalJokes - 1) + 1);
            request('http://api.icndb.com/jokes/' + randomJoke + '?escape=javascript', function (err, response, body) {
                // handle possible request errors by stopping the whole process
                if (err || response.statusCode !== 200) {
                    console.log(randomJoke, err, response.statusCode);

                    return err || response.statusCode;
                }
                // invalid ids generates an invalid JSON response (basically an HTML output), so we can
                // check for it by detecting JSON parse errors and skip the id by calling the callback completion
                // function for the current iteration
                var result = null;
                try {
                    result = JSON.parse(body).value;
                    var channel = self._getChannelById(originalMessage.channel);
                    self.postMessageToChannel(channel.name, result.joke, { as_user: true });
                } catch (ex) {
                    console.log(ex);
                    return ex;
                }
            });
        } catch (ex) {
            console.log(ex);
            return ex;
        }
    });
    

};

/**
 * Loads the user object representing the bot
 * @private
 */
NorrisBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

/**
 * Sends a welcome message in the channel
 * @private
 */
NorrisBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Chuck Norris` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};

/**
 * Util function to check if a given real time message is mentioning Chuck Norris or the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isMentioningChuckNorris = function (message) {
    return message.text.toLowerCase().indexOf('chuck norris') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Util function to check if a given real time message has ben sent by the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isFromNorrisBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
NorrisBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = NorrisBot;
