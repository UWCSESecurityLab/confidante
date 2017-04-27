# Confidante #
Usable encrypted email, powered by Keybase!

This is the repository for Confidante, an open source encrypted email client
which uses [Keybase](https://keybase.io) to make using PGP easier. Here,
we have the code and development instructions.

If you want to try using Confidante, visit our home page at:
[https://confidante.cs.washington.edu](https://confidante.cs.washington.edu)

## Getting Started ##
- Confidante runs on [node.js](https://nodejs.org). You'll need to install that first.
- Clone this repository: `$ git clone git@github.com:UWCSESecurityLab/confidante.git`
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

## How to build the Electron app ##
1. Run `$ npm run build:electron` to build the Electron version of the JavaScript bundles.
2. If you're just running Electron for development, you can run it directly using `$ npm run electron`.
3. Run `$ npm run build:package` to build executables that include Electron and packages all of the code. This only builds it for the platform you're running the script on.
4. Run `$ npm run build:installer-win` to build an installer for Windows. Only works on a Windows machine.

The output packages/installers will be in the `dist/` folder in the root directory.

## How to put a new Electron version on the website ##
SSH into a CSE machine, and upload the package to `/cse/web/research/confidante/`.

The Windows version should be the EXE produced by `npm build:installer-win`,
named `ConfidanteSetup.exe`.

The Mac version should be a zipped up folder, produced by `npm build:package`,
named `Confidante-darwin-x64.zip`.
