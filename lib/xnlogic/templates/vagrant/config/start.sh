#!/bin/bash
export XN_LOG_DIR=$HOME/xn.dev/tmp

silent() { if [[ $debug ]] ; then "$@"; else "$@" &>/dev/null; fi; }

# Check for jruby 1.7, don't force it.
if [[ `ruby -v` == jruby\ 1.7* ]]; then
  echo "Using `ruby -v`"
else
  echo "Unsupported Ruby version: (`ruby -v | cut -c 1-35`)"
  echo "Please try again with jruby-1.7.x"
fi
echo '{"note":"Suppressing Torquebox logs."}' | json -i | cat

cd $HOME/xn.dev

mkdir -p $XN_LOG_DIR
cd $XN_LOG_DIR
touch xn.js.log xnlogic.json development.log ${XN_CLIENT}-assets.log
cd -

cd fe/xn.js
sudo npm install
cake serve &> $XN_LOG_DIR/xn.js.log &
echo "xn.js started"
cd -

ASSETS_DIR=$HOME/$XN_CLIENT/assets
if [ -d $ASSETS_DIR ]; then
  ASSETS_PORT=3031
  cd $ASSETS_DIR
  script/duster -w assets/templates assets/javascripts/templates.js &> $XN_LOG_DIR/duster.js.log &
  bundle exec rackup -p $ASSETS_PORT &> $XN_LOG_DIR/${XN_CLIENT}-assets.log &
  cd -
fi

START_APPS=$HOME/$XN_CLIENT/apps/apps.start.sh
if [ -x $START_APPS ]; then
  cd $HOME/$XN_CLIENT/apps
  $START_APPS &
  cd -
fi

cd $HOME/xn.dev
tail -n 0 -f fe/fe-server/log/development.log $XN_LOG_DIR/xn.js.log $XN_LOG_DIR/${XN_CLIENT}-assets.log &
tail -n 0 -f $XN_LOG_DIR/server.log | grep -E "Deployed|Starting deployment|TOPLEVEL_BINDING" &
tail -n 0 -f $XN_LOG_DIR/xnlogic.json | while read line; do echo "$line" | json -i; done &

warn_sigint() {
  echo "Please wait for shutdown to complete cleanly. (Press Ctrl-C again to force)"
}

# Terminate all processes
terminator() {
  trap 'warn_sigint' SIGINT
  echo "Shutting down support processes..."
  jobs -p | xargs kill -s SIGTERM
  echo "Shutting down jboss..."
  silent $JBOSS_HOME/bin/jboss-cli.sh --connect :shutdown
}
trap 'terminator' SIGINT

export RELOAD=true
echo "starting torquebox"
lsof -i :8080 -sTCP:listen | grep . || torquebox run &> /dev/null  &
echo "Hit Ctrl+C to terminate"
# Using cat to keep processes live
cat
