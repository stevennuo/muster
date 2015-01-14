/**
 * Created by 3er on 1/9/15.
 */

var qs = require('querystring');
var path = require('path');
var fs = require('fs');
var PRIVATE = require('./config/private')

var AND = ' && ';
var FFMPEG = ' FFREPORT="file=\''+ PRIVATE.dir.log + 'ffmpeg-$(date +%Y%m%s).log\'" ' + PRIVATE.dir.ffmpeg + 'ffmpeg ';

//前面有可能跟路径不能带空格
var h = function (d) {
    return {
        dir: d,
        origin: d + '/h.mp4 ',
        compo: d + '/h.list ',
        output: d + '/outputh.mp4 ',
        target: 'high/'
    }
};

var m = function (d) {
    return {
        dir: d,
        origin: d + '/m.mp4 ',
        compo: d + '/m.list ',
        output: d + '/outputm.mp4 ',
        target: 'medium/'
    }
};

var l = function (d) {
    return {
        dir: d,
        origin: d + '/l.mp4 ',
        compo: d + '/l.list ',
        output: d + '/outputl.mp4 ',
        target: 'low/'
    }
};

var LOOP = function (A, f, param1, param2) {
    var ret = new String();
    for (var i = 0; i < A.length; i++) {
        ret = ret + f(A[i], param1, param2) + AND;
    }
    return ret;
};

video = {
    ULTRAFAST: 'ultrafast',
    VERYSLOW: 'veryslow',
    param: function (w, h, sw, sh, crf) {
        return '-vf setsar=sar=' + sw + '/' + sh + ',setdar=dar=16/9,scale=' + w + 'x' + h
            + ' -crf ' + crf +' -pix_fmt yuv420p -c:v libx264 -r 25 -benchmark -threads 0 -preset ' + video.VERYSLOW;
    }
};

audio = {
    param: function (a, b, vbr) {
        //TODO: vba need compilation
        return ' -c:a libfdk_aac -ar ' + a + ' -b:a ' + b + 'k ';
    }
};

origin = {
    ver: function (F, w, h, sw, sh, crf, a, b, vbr) {
        return  video.param(w, h, sw, sh, crf) + audio.param(a, b, vbr) + F.origin;
    },
    generate: function (H, M, L) {
        return this.ver(H, 1280, 720, 1, 1, 18, 48000, 128)
            + this.ver(M, 854, 480, 1280, 1281, 23, 44100, 96)
            + this.ver(L, 480, 270, 1, 1, 25, 22050, 64) + AND;
    }
};

bash = {
    cp: function (src, dest) {
        return ' cp ' + src + ' ' + dest + ' ';
    },
    mv: function (src, dest) {
        return ' mv ' + src + ' ' + dest + ' ';
    },
    rmDir: function (dir) {
        return ' rm -rf ' + dir + ' ';
    },
    cpO2O: function (F) {
        return ' cp ' + F.origin + F.output;
    },
    mvO2T: function (F, target, fileName) {
        return ' mv ' + F.output + '"' + target + F.target + fileName + '"';
    }
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

concat = {
    concat: function (F, oped) {
        return FFMPEG + '-y -f concat -i ' + F.compo + ' -c copy -metadata comment="'
            + oped.metadata() + '" -movflags +faststart ' + F.output;
    },

    cmd: function (A, oped) {
        return LOOP(A, this.concat, oped);
    }
};

ffmpeg = {
    input: function (path) {
        return FFMPEG + '-y -i "' + path + '" ';
    },
    streamCopy: function(F, oped) {
        return FFMPEG + '-y -i ' + F.origin + ' -c copy -metadata comment="'
            + oped.metadata() + '" -movflags +faststart ' + F.output;
    }
};

command = {

    addOped: function (A, oe) {
        if (oe.op_name == 'null' && oe.ed_name == 'null') {
            return LOOP(A, ffmpeg.streamCopy, oe);
        }
        else {
            return concat.cmd(A, oe);
        }
    },

    mv: function (A, target, fileName) {
        // origin h
        var ret = bash.cp(A[0].output, '"'+target + 'origin/' + fileName+'"') + AND;
        // high/medium/low
        ret = ret + LOOP(A, bash.mvO2T, target, fileName);
        return ret;
    },

    all: function (p, oe) {
        var dir = path.dirname(p);
        var fileName = path.basename(p);
        var H = h(dir), M = m(dir), L = l(dir);
        var A = [H, M, L];


        // output: h.mp4 m.mp4 l.mp4

        var ret = ffmpeg.input(p) + origin.generate(H, M, L);
        // output: outputh.mp4 outputm.mp4 outputl.mp4
        ret = ret + this.addOped(A, oe);
        // output: rsync 4 folders
        ret = ret + this.mv(A, PRIVATE.dir.rsync, fileName);
        // rm
        ret = ret + bash.rmDir(dir) + '\n';
        return ret;
    }
};

var file = {
    content: function (opedDir, inputDir, oe, v) {
        var f;
        var VMP4 = v + '.mp4\n';
        if (oe.op_name != 'null')
            f = 'file ' + opedDir + oe.op_name + VMP4;
        else
            f = ''

        f = f + 'file ' + inputDir + VMP4;

        if (oe.ed_name != 'null')
            f = f + 'file ' + opedDir + oe.ed_name + VMP4;
        else
            f = f;
        return f;
    },

    write: function (inputPath, opedDir, oped) {
        var inputDir = path.dirname(inputPath) + '/';
        fs.writeFileSync(inputDir + 'h.list', this.content(opedDir, inputDir, oped, 'h'));
        fs.writeFileSync(inputDir + 'm.list', this.content(opedDir, inputDir, oped, 'm'));
        fs.writeFileSync(inputDir + 'l.list', this.content(opedDir, inputDir, oped, 'l'));
    }
};

exports.generate = function (filePath, oe) {
//    oe.op_name = 'null'
//    oe.ed_name = 'null'
    var cmd = command.all(filePath, oe);
    if (oe.op_name != 'null' || oe.ed_name != 'null') {
        file.write(filePath, PRIVATE.dir.oped, oe);
    }
    fs.writeFileSync(path.dirname(filePath) + '/' + 'command', cmd);
    return cmd;
};

