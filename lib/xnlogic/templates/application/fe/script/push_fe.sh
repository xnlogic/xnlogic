#!/bin/bash
#
# Build your assets and push them to fe-server to be served up.

START_DIR=$PWD
PKG_DIR=$START_DIR/pkg
RUN_DIR=/home/vagrant/xn.dev

if [ ! -d "$START_DIR/script" ]; then
  echo "Please start $0 from the project root with:"
  echo "  ./script/push_fe.sh"
  exit 1
fi

./script/build.sh

echo "Flushing fe-server cache ..."
(cd $RUN_DIR/fe/fe-server &&
  rm -rf tmp/cache &&
  rm -rf public/assets/* )

echo "Copying views/layouts to fe-server..."
(cd $RUN_DIR/fe/fe-server &&
  cp -r $START_DIR/views/layouts/* app/views/layouts/)

echo "Copying all assets fe-server/public/assets ..."
(cd $RUN_DIR/fe/fe-server &&
  mkdir -p public/assets &&
  cp -r $PKG_DIR/* public/assets/)

echo "Complete."

