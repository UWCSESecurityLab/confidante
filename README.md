# Keymail #
Encrypted email for everyone!

## Getting Started ##
- Keymail runs on [node.js](https://nodejs.org). You'll need to install that first.
- Keymail also needs [MongoDB](https://www.mongodb.org/) installed for storing accounts and sessions.
- Clone this repository: `$ git clone git@gitlab.cs.washington.edu:securityprivacylab/keymail.git`
- Run `$ npm install` to download third-party dependencies.
- Run `$ npm run build` to compile frontend assets.
- Run `$ mongod` to start the database service. Leave that terminal window open.
- In another terminal window, run `$ node src/app.js` to run the Keymail server.
- Keymail should be accessible at [http://localhost:3000](http://localhost:3000)

## How to automatically rebuild the app ##
Instead of running `npm run build` and `node src/app.js` every time you make a
a change, you can use some utilities that watch the files for changes, and
automatically recompile the code and restart the server.

First, install the utilities:
- `$ npm install -g nodemon`
- `$ npm install -g watchify`

Now, when you're ready to code, run these commands in separate terminal tabs:
- `$ scripts/watchify.sh`
- `$ nodemon src/app.js`

## Helpful Links ##
- [Design doc](https://docs.google.com/document/d/1RI3u0mPXgB4KFMkguWHM1jwJWKDkNSyGjohBZ2ScaVU/edit)
- [Slack](https://keymail-uw.slack.com/)
- [Trello team page](https://trello.com/keybasemail)