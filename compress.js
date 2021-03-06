/**
 * Created by sl on 3/10/15.
 */

var qs = require('querystring');
var path = require('path');
var fs = require('fs');
var config = require('./config/oped')

var FFMPEG = ' FFREPORT="file=\'' + config.dir.log + 'ffmpeg-$(date +%Y%m%s).log\'" ' + config.dir.ffmpeg + 'ffmpeg ';


var generateCmd = function (filePath, oped) {
    var tv, ta, ifoped;
    var dir = path.dirname(filePath);
    var fileName = path.basename(filePath);
    var op = config.dir.oped + oped.op_name + '.mp4';
    var ed = config.dir.oped + oped.ed_name + '.mp4';
    if (oped.op_name != 'null' || oped.ed_name != 'null') {
        tv = '[tv]';
        ta = '[ta]';
        if (oped.op_name == 'null') {
            ifoped = 'movie=' + ed + ':s=dv+da[edv][eda];'
            + '[tempv][0:a][edv][eda]concat=n=2:v=1:a=1[tv][ta];'
        } else if (oped.ed_name == 'null') {
            ifoped = 'movie=' + op + ':s=dv+da[opv][opa];'
            + '[opv][opa][tempv][0:a]concat=n=2:v=1:a=1[tv][ta];'
        } else {
            ifoped = 'movie=' + op + ':s=dv+da[opv][opa];'
            + 'movie=' + ed + ':s=dv+da[edv][eda];'
            + '[opv][opa][tempv][0:a][edv][eda]concat=n=3:v=1:a=1[tv][ta];'
        }
    } else {
        ifoped = '';
        tv = '[tempv]';
        ta = '[0:a]';
    }


    var ret = FFMPEG + '-y -i "' + filePath + '"'
        + ' -vf setsar=sar=1/1,setdar=dar=16/9'
        + ' -crf 0 -pix_fmt yuv420p -c:v libx264 -r 25 -s 1280*720 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 48000  -b:a 128k "outputOri.mp4"'
        + ' &&'
        + FFMPEG + '-y -i "outputOri.mp4"'
        + ' -filter_complex "movie=' + config.watermark.watermark + '[watermark];'
        + '[0:v][watermark]overlay=main_w-overlay_w-30:main_h-overlay_h-20[tempv];'
        + ifoped
        + tv + 'split=4 [tv1][tv2][tv3][tv4];'
        + ta + 'asplit=4 [ta1][ta2][ta3][ta4]"'
        + ' -map "[tv1]" -map "[ta1]"  -crf 18 -pix_fmt yuv420p -c:v libx264 -r 25 -s 1280*720 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 48000  -b:a 128k -metadata comment="' + oped.metadata() + '" -movflags +faststart  "outputH.mp4"'
        + ' -map "[tv2]" -map "[ta2]"  -crf 23 -pix_fmt yuv420p -c:v libx264 -r 25 -s 854*480 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 44100 -b:a 96k -metadata comment="' + oped.metadata() + '" -movflags +faststart "outputM.mp4"'
        + ' -map "[tv3]" -map "[ta3]"  -crf 25 -pix_fmt yuv420p -c:v libx264 -profile:v baseline -level 3.0 -r 25 -s 480*270 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 22050 -b:a 64k -metadata comment="' + oped.metadata() + '" -movflags +faststart "outputL.mp4"'
        + ' -map "[tv4]" -map "[ta4]" -crf 23 -pix_fmt yuv420p -c:v libx264 -profile:v baseline -level 3.0 -r 25 -s 800*450 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 44100 -b:a 96k -metadata comment="' + oped.metadata() + '" -movflags +faststart "outputMo.mp4"'
        + ' &&'
        + FFMPEG + '-y -i "outputOri.mp4"'
        + ' -filter_complex "movie=' + config.watermark.watermark + '[watermark];'
        + ' [0:v][watermark]overlay=main_w-overlay_w-30:main_h-overlay_h-20[tempv];'
        + ' movie=' + config.dir.mktop + ':s=dv+da[opv][opa];'
        + ' movie=' + config.dir.mkted + ':s=dv+da[edv][eda];'
        + ' [opv][opa][tempv][0:a][edv][eda]concat=n=3:v=1:a=1[tv][ta];'
        + ' [tv]split=4 [tv1][tv2][tv3];'
        + ' [ta]asplit=4 [ta1][ta2][ta3]"'
        + ' -map "[tv1]" -map "[ta1]"  -crf 18 -pix_fmt yuv420p -c:v libx264 -r 25 -s 1280*720 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 48000  -b:a 128k -metadata comment="' + oped.metadata() + '" -movflags +faststart  "mktoutputH.mp4"'
        + ' -map "[tv2]" -map "[ta2]"  -crf 23 -pix_fmt yuv420p -c:v libx264 -r 25 -s 854*480 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 44100 -b:a 96k -metadata comment="' + oped.metadata() + '" -movflags +faststart "mktoutputM.mp4"'
        + ' -map "[tv3]" -map "[ta3]"  -crf 25 -pix_fmt yuv420p -c:v libx264 -profile:v baseline -level 3.0 -r 25 -s 480*270 -benchmark -threads 0 -preset veryslow '
        + ' -c:a libfdk_aac -ar 22050 -b:a 64k -metadata comment="' + oped.metadata() + '" -movflags +faststart "mktoutputL.mp4"'
        + ' && mv outputOri.mp4 '+ config.dir.origin + fileName
        + ' && mv outputH.mp4 ' + config.dir.high + fileName
        + ' && mv outputM.mp4 ' + config.dir.medium + fileName
        + ' && mv outputL.mp4 ' + config.dir.low + fileName
        + ' && mv outputMo.mp4 ' + config.dir.mobile + fileName
        + ' && mv mktoutputH.mp4 ' + config.dir.mkthigh + fileName
        + ' && mv mktoutputM.mp4 ' + config.dir.mktmedium + fileName
        + ' && mv mktoutputL.mp4 ' + config.dir.mktlow + fileName
        + ' && rm -rf ' + dir;
    return ret;
};
var oped = function () {
    this.op_name = '';
    this.op_duration = 0;
    this.ed_name = '';
    this.ed_duration = 0;
};
oped.prototype.metadata = function () {
    return qs.stringify(this);
};
exports.oped = oped;


exports.generate = function (filePath, oe) {
//    oe.op_name = 'null'
//    oe.ed_name = 'null'
    var cmd = generateCmd(filePath, oe);
    fs.writeFileSync(path.dirname(filePath) + '/' + 'command', cmd);
    return cmd;
};
