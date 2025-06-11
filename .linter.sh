#!/bin/bash
cd /home/kavia/workspace/code-generation/strategic-block-builder-38125-5a479f25/strategic_block_builder
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

