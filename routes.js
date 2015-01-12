/**
 * Created by 3er on 1/5/15.
 */

// Since Node 0.8, .existsSync() moved from path to fs:
var path = require('path');
var fs = require('fs');
var compress = require('./compress')
var _existsSync = fs.existsSync || path.existsSync;

var _ = require('underscore');
var formidable = require('formidable');

var generateURL = function (item, qiniu, origin) {
    var deadline = Math.floor(Date.now() / 1000) + origin.expiration;
    var link = encodeURI('http://' + origin.domain + '/' + item.key + '?e=' + deadline);
    var token = qiniu.conf.ACCESS_KEY + ':' +
        qiniu.util.base64ToUrlSafe(qiniu.util.hmacSha1(link, qiniu.conf.SECRET_KEY));
    return link +
        '&token=' + token;
}

var generateCompressScripts = function (PRIVATE) {
    // TODO:
    var oped = new compress.oped();
    oped.op_name = 'op'
    oped.op_duration = 10;
    oped.ed_name = 'ed';
    oped.ed_duration = 20;
    var cmd =  compress.generate(PRIVATE.dir.upload + '20150101123456/abc.mov',oped);
    console.log(cmd);
    return cmd;
}

module.exports = function (app, qiniu, PRIVATE) {
    // http api
    app.get('/video/opeds', function (req, res) {
//        generateCompressScripts(PRIVATE);
        res.status(200).json(PRIVATE.opeds);
    });

    app.post('/video/upload', function (req, res) {
        var upload = PRIVATE.upload;

        // headers
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Disposition', 'inline; filename="files.json"');

        // init
        var ret = {files: []};
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.keepExtensions = true;

        var command = {};

        // upload
        form.uploadDir = upload.dir;
        form.on('fileBegin',function (name, file) {
            file.name = file.name.replace(/-/g, "_")
            file.path = upload.dir + file.name;
            // Prevent overwriting existing files:
            ret.files.push({name: file.name});
            command.filePath = file.path;
            if (_existsSync(file.path)) {
                ret.files[0].error = '文件已存在，不能覆盖';
                console.log(ret.files[0].error);
            }
        }).on('field',function (name, value) {
                // 生成片头片尾命令
                command[name] = value;
                console.log('extra field - ' + name + ':' + value);
            }).on('file',function (name, file) {
//                console.log(file.path);
                ret.files[0].size = file.size;
            }).on('aborted',function () {
                ret.files.forEach(function (file) {
                    fs.unlink(file);
                });
            }).on('error',function (e) {
                ret.files[0].error = e;
                console.log(e);
            }).on('progress',function (bytesReceived) {
            }).on('end',function () {
                res.status(ret.files[0].error ? 500 : 201).json(ret);

            }).parse(req);
    });

    var datetime = new Date();
    console.log(datetime);

    app.post('/qiniu/origin', function (req, res) {
        var marker = null;
        qiniu.rsf.listPrefix(PRIVATE.origin.bucket, '', marker, 999999, function (err, ret) {
            if (err) {
                res.status(500).send(err);
                throw err;
            } else {
                // process ret.marker & ret.items
//            console.log(ret.marker);
//            console.log(ret.items);

                var retr = _.chain(ret.items)
                    .sortBy(function (item) {
                        return -item.putTime
                    })
                    .each(function (item) {
                        item.link = generateURL(item, qiniu, PRIVATE.origin)
                    })
                    .value();


                res.status(200).send({
                    current: 1,
                    rowCount: -1,
                    rows: retr,
                    total: retr.length
                });
            }
        });
    });

    app.post('/video/compress', function (req, res) {
        // TODO:
        // mock
        var arr = [
            {
                key: "abc.mp4",
                progress: "sync"
            },
            {
                key: "def.mp4",
                progress: "compress"
            }
        ];

        var retr = _.chain(arr)
            .sortBy(function (item) {
                return item.progress;
            })
            .value();

        res.status(200).send({
            current: 1,
            rowCount: -1,
            rows: retr,
            total: 2
        });
    })
}