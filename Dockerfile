FROM node:4-onbuild

EXPOSE 3000

ADD package.json package.json  
RUN npm install  
ADD . . 

RUN npm run prod-build
RUN node src/app.js

