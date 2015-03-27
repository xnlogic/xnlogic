#!/bin/bash
#
# Builds all assets statically to PKG_DIR

START_DIR=$PWD
PKG_DIR=pkg
DUST_TEMPLATES=assets/templates
COMPILED_TEMPLATES=assets/javascripts/templates.js

if [ ! -d "$START_DIR/script" ]; then
  echo "Please start from the project root with:"
  echo "  ./script/build.sh"
  exit 1
fi

rm -rf $PKG_DIR/*

#######################################
# Build the dust templates:
echo "Building dust templates from $DUST_TEMPLATES to $COMPILED_TEMPLATES"
script/duster $DUST_TEMPLATES $COMPILED_TEMPLATES


#######################################
# repackage everything in ./pkg
echo "Running rake build..."
bundle exec rake build


#######################################
# Rename application in JavaScript
# NOTE: LightMesh is already good ;)
# echo "Ensuring application name is LightMesh in JavaScript"
# sed -i '' -e 's/LightMesh CMDB/LightMesh/g' $PKG_DIR/app.js
# sed -i '' -e 's/Lightmesh CMDB/LightMesh/g' $PKG_DIR/app.js
# sed -i '' -e 's/LightMesh/LightMesh/g' $PKG_DIR/app.js


#######################################
# Copying images
cp assets/images/* $PKG_DIR/


#######################################
# Copying fonts
cp assets/fonts/* $PKG_DIR/


