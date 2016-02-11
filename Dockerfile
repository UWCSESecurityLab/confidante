FROM ubuntu

# INSTALL NODE
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_5.x | bash -
RUN apt-get install -y nodejs

# INSTALL MONGO
# Import MongoDB public GPG key AND create a MongoDB list file
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
RUN echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.0.list
# Update apt-get sources AND install MongoDB
RUN apt-get update && apt-get install -y mongodb-org
# Create the MongoDB data directory
RUN mkdir -p /data/db

# INSTALL OUR APP
ADD package.json package.json  
RUN npm install  
ADD . . 

RUN npm run build


EXPOSE 3000

# RUNTIME

CMD mongod & node src/app.js

