#!/bin/bash
mkdir -p src/web/css/3rdparty
mkdir -p src/web/fonts/3rdparty
mkdir -p src/web/js/3rdparty

# Print commands to stdout
set -x

# Copy bootstrap/dist to 3rdparty directories
cp node_modules/bootstrap/dist/css/* src/web/css/3rdparty
cp node_modules/bootstrap/dist/fonts/* src/web/fonts/3rdparty
cp node_modules/bootstrap/dist/js/* src/web/js/3rdparty

# jquery
cp node_modules/jquery/dist/* src/web/js/3rdparty
