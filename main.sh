#!/bin/bash

node scriptgen2.js | tee poem.txt
cat poem.txt | ./creepy.sh
./makevid.sh