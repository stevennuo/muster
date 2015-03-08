#!/bin/bash


#$1 is source directory (absolute path)
#-profile:v baseline level 3.0 ,this is for the compatibility with all devices 
#Command line example:
#./android2.sh  ${myFile}/input 

cd "$1"
CORE="$(dirname "$1")"
mkdir "$CORE/mobile"

for file in `ls $1`;
do
    if [ ${file: -4} == ".mov" ] || [ ${file: -4} == ".mp4" ];
    then
        /home/master/bin/ffmpeg -y -i ${1}/${file}  -pix_fmt yuv420p -c:v libx264 -crf 23 -profile:v baseline -level 3.0 -r 25 -s 800*450 -benchmark -threads 0 -strict -2 -preset veryslow -c:a libfdk_aac -ar 44100 -b:a 96k "$CORE/Aoutput$file" 
        mv "$CORE/Aoutput$file" $CORE/mobile/$file
	if [ ${file: -4} == ".mov" ]
	then
		mv $CORE/mobile/${file} $CORE/mobile/${file/.mov}.mp4
	fi

    fi
done

