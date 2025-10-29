#!/bin/bash

CTR=0
TOT=0
PREV='00:00:00,000'
SOX='sox '
>result.srt
while read line ; do
    FNAME1="out${CTR}A.wav"
    FNAME2="out${CTR}B.wav"
    FNAME3="out${CTR}C.wav"
    FNAME4="out${CTR}D.wav"
    FNAME5="out${CTR}X.wav"

    echo $line | pico2wave -w $FNAME1
    sox $FNAME1 $FNAME2 pitch -700
    sox $FNAME1 $FNAME3 pitch 700
    sox -m $FNAME1 $FNAME2 $FNAME4
    sox -m $FNAME3 $FNAME4 $FNAME5

    SECS=`soxi -D out${CTR}X.wav`
    TOT=`echo "scale=3;$SECS+$TOT" | bc`
    SECS_1=`echo $TOT | sed 's/\..*//'`
    MS=`echo "scale=3;${TOT}/1" | bc -l | sed 's/.*\.//'`
    S=`echo "scale=0;(${SECS_1}%60)" | bc`
    MIN=`echo "scale=0;($TOT/60)%60" | bc`
    NEXT=00:`printf "%02d" $MIN`:`printf "%02d" $S`,$MS

    echo $((CTR+1)) >> result.srt
    echo "$PREV --> $NEXT" >> result.srt
    echo $line >> result.srt
    echo >> result.srt

    PREV=$NEXT
    SOX="$SOX $FNAME5 "
    CTR=$((CTR+1))
done

eval "$SOX result.wav"
