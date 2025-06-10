#!/bin/bash
cd /home/kavia/workspace/code-generation/strategic-block-builder-38125-5a479f25/strategic_block_builder
npx eslint
ESLINT_EXIT_CODE=$?
npm run build
BUILD_EXIT_CODE=$?
 if [ $ESLINT_EXIT_CODE -ne 0 ] || [ $BUILD_EXIT_CODE -ne 0 ]; then
   exit 1
fi

