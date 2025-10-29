#!/bin/bash

node scriptgen.js | tee poem.txt
cat poem.txt | ./creepy.sh
./makevid.sh