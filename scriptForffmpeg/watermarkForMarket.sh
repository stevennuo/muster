#!/bin/bash


#$1 is source directory (absolute path), $2 is watermark filename
#$3 is op video filename, $4 is ed video eilename
#Please place watermark, op video, and ed video at the same directory of this shell.

#Command line example:
#./try.sh  ${myFile}/input sy.jpg op.mp4 ed.mp4
#for ${myFile}/input is the absolute path that contains input mp4
#sy.jpg is the watermark file
#op.mp4 is the opening video
#ed.mp4 is the ending video

cd "$1"
CORE="$(dirname "$1")"
#mkdir "$CORE/outH"
#mkdir "$CORE/outM"
#mkdir "$CORE/outL"

for file in `ls $1`;
do
    if [ ${file: -4} == ".mov" ] || [ ${file: -4} == ".mp4" ];
    then
        /home/master/bin/ffmpeg -y -i ${1}/${file} -filter_complex "movie=$CORE/${2}[watermark];
        movie=$CORE/${3}:s=dv+da[opv][opa];
        movie=$CORE/${4}:s=dv+da[edv][eda];
        [0:v][watermark]overlay=main_w-overlay_w-30:main_h-overlay_h-20[temp2];
        [opv][opa][temp2][0:a][edv][eda]concat=n=3:v=1:a=1[tv][ta];
	[tv]split=3 [tv1][tv2][tv3];
	[ta]asplit=3 [ta1][ta2][ta3];
	[tv1]setsar=sar=1280/1281,setdar=dar=16/9[tvv1];
	[tv2]setsar=sar=1/1,setdar=dar=16/9[tvv2];
	[tv3]setsar=sar=1/1,setdar=dar=16/9[tvv3]" \
        -map "[tvv1]" -map "[ta1]" -crf 23 -pix_fmt yuv420p -c:v libx264 -r 25 -s 854*480 -benchmark -threads 0 -strict -2 -preset veryslow -c:a libfdk_aac -ar 44100 -b:a 96k "$CORE/moutput$file" \
	-map "[tvv2]" -map "[ta2]" -crf 25 -pix_fmt yuv420p -c:v libx264 -r 25 -s 480*270 -benchmark -threads 0 -strict -2 -preset veryslow -c:a libfdk_aac -ar 22050 -b:a 64k "$CORE/loutput$file" \
	-map "[tvv3]" -map "[ta3]" -crf 18 -pix_fmt yuv420p -c:v libx264 -r 25 -s 1280*720 -benchmark -threads 0 -strict -2 -preset veryslow -c:a libfdk_aac -ar 48000 -b:a 128k "$CORE/houtput$file"

        mv "$CORE/moutput$file" $CORE/outM/$file
	mv "$CORE/loutput$file" $CORE/outL/$file
	mv "$CORE/houtput$file" $CORE/outH/$file

	if [ ${file: -4} == ".mov" ]
	then
		mv $CORE/outM/${file} $CORE/outM/${file/.mov}.mp4
		mv $CORE/outL/${file} $CORE/outL/${file/.mov}.mp4
		mv $CORE/outH/${file} $CORE/outH/${file/.mov}.mp4
	fi

    fi
done

