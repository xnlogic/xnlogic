#!/bin/bash
#
# Serves our assets up via http:// on port TCP_PORT

TCP_PORT=3031
START_DIR=$PWD

if [ ! -d "$START_DIR/script" ]; then
  echo "Please start from the project root with:"
  echo "  ./script/server.sh"
  exit 1
fi


mkdir -p tmp

script/duster -w assets/templates assets/javascripts/templates.js &> tmp/duster.js.log &
echo "duster.js started"
echo "CTRL+C to quit at anytime..."
echo -n

bundle exec rackup -P tmp/rack.pid -p $TCP_PORT &> tmp/sprockets.log &

tail -f tmp/sprockets.log tmp/duster.js.log

