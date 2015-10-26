#!/bin/bash
pwd
# Remove transpiled JS
rm -rf gen/

# Remove 3rdparty web resources
rm -rf src/web/*/3rdparty
