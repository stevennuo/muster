/**
 * Created by 3er on 1/5/15.
 */

// Since Node 0.8, .existsSync() moved from path to fs:
var path = require('path');
var fs = require('fs');
var walk = require('walk');
var config = require('./config/oped');
var PRIVATE = require('./config/private');
var async = require('async');
var _existsSync = fs.existsSync || path.existsSync;
var ffmpeg = require('fluent-ffmpeg')
var _ = require('underscore');
var moment = require('moment');
var formidable = require('formidable');
var chokidar = require('chokidar');
var checklist = require('./checkVideoUrl').checklist;
var replace = require('./checkVideoUrl').replace;
// qiniu
var qiniu = require('qiniu')
qiniu.conf.ACCESS_KEY = PRIVATE.qiniu.access_key
qiniu.conf.SECRET_KEY = PRIVATE.qiniu.secret_key

var compress = require('./compress');

var generateURL = function (ver, key) {
    var deadline = Math.floor(Date.now() / 1000) + ver.expiration;
    var link = encodeURI('http://' + ver.domain + '/' + key + '?e=' + deadline);
    var token = qiniu.conf.ACCESS_KEY + ':' +
        qiniu.util.base64ToUrlSafe(qiniu.util.hmacSha1(link, qiniu.conf.SECRET_KEY));
    return link +
        '&token=' + token;
}

var generateInfoURL = function (ver, key) {
    var deadline = Math.floor(Date.now() / 1000) + ver.expiration;
    var link = encodeURI('http://' + ver.domain + '/' + key + '?avinfo&e=' + deadline);
    var token = qiniu.conf.ACCESS_KEY + ':' +
        qiniu.util.base64ToUrlSafe(qiniu.util.hmacSha1(link, qiniu.conf.SECRET_KEY));
    return link +
        '&token=' + token;
}

var generateCompressScripts = function (path, oped) {
    var cmd = compress.generate(path, oped);
    // console.log(cmd);
    return cmd;
}
var deleteAsync = function (key, cb) {
    var rmQiniu = function (reso, key, next) {
        var client = new qiniu.rs.Client();
        client.remove(PRIVATE.qiniu[reso].bucket, key, function (err) {
            if (err) {
                next(err)
            }
            else {
                //console.log('a')
                next()
            }
        });
    };

    var rmLocal = function (reso, key, next) {
        var filePath = config.dir.rsync + reso + '/' + key;
        fs.unlink(filePath, function (err) {
            if (err) {
                next(err);
            }
            else {
                // console.log('b')
                next();
            }
        });
    };
    async.parallel([
            function (next) {
                rmQiniu('origin', key, next)
            }, function (next) {
                rmQiniu('high', key, next)
            }, function (next) {
                rmQiniu('medium', key, next)
            }, function (next) {
                rmQiniu('low', key, next)
            }, function (next) {
                rmQiniu('mobile',key,next)
            },
            function (next) {
                rmLocal('originNew', key, next)
            }, function (next) {
                rmLocal('highNew', key, next)
            }, function (next) {
                rmLocal('mediumNew', key, next)
            }, function (next) {
                rmLocal('lowNew', key, next)
            },function(next){
                rmLocal('mobileNew',key,next)
            }
        ], cb
    );


}

var deleteList = [];


module.exports = function (app) {
    var testAdd = config.dir.rsync + 'mobileNew/';

    var watcher = chokidar.watch(testAdd, {ignored: /\.DS_Store/, persistent: true});

    //watcher.add(['/1.txt', '2.txt', '3.txt']);
    watcher.on('add', function (path) {
        var testArr = _.map(deleteList, function (item) {
            return testAdd + item;
        });
        var judger = _.find(testArr, function (asis) {
            return asis === path;
        });

        if (judger !== undefined) {
            var delKey = path.replace(/^.*[\/]/, '');
            deleteAsync(delKey, function (err, result) {
                if (err) {
                    console.log(err);
                }
                //reserved console log which indicates the delete process
                console.log('delete success: ' + path);
                var index = deleteList.indexOf(delKey);

                if (index > -1) {
                    deleteList.splice(index, 1);
                }
            });
        }
    });
    app.get('/checklist', function (req, res) {
        checklist(function (err, data) {
            if (err) {res.status(500).json(err);}
            else {
                res.status(200).json(data);
            }
        })

    });
    app.post('/replace', function (req, res) {
        var data = req.body;
        replace(data, function (err) {
            if (err) {
                res.status(500);
                res.end();
            }
            else {
                res.status(200);
                res.end();
            }

        })
    })

    // http api
    app.get('/video/opeds', function (req, res) {
        res.status(200).json(config.opeds);
    });

    app.post('/video/upload', function (req, res) {
        var dir = config.dir;
        // headers
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Disposition', 'inline; filename="files.json"');

        // init
        var ret = {files: []};
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        // 把mov转为mp4
        form.keepExtensions = false;

        var command = new compress.oped();

        // make upload directory
        form.uploadDir = dir.upload + moment().format('YYYYMMDDhhmmss/');

        // TODO: Exception判断
        fs.mkdirSync(form.uploadDir);


        // handle uplaod
        form.on('fileBegin', function (name, file) {
            var filter = new RegExp("[~!@#$^&*()=|{}':;',\\[\\].<>/?]");
            file.name = file.name.replace(/-/g, "_").replace(/\s+/g,'').replace(/\.[^/.]+$/g, '').replace(/\./,'_');
            if(filter.test(file.name)){
                ret.error = '视频名不能包含英文标点、括号（可以用中文输入法的标点，括号等）';
            }
            file.name = file.name + '.mp4';
            //console.log(file.name)
            file.path = form.uploadDir + file.name;

            ret.files.push({name: file.name, path: file.path});
            if (_existsSync(file.path) || _existsSync(config.dir.rsync + 'originNew/' + file.name)) {
                ret.error = '文件已存在，不能覆盖';
                //console.log(ret.error);
            }
        }).on('field', function (name, value) {
            // 生成片头片尾命令
            command[name] = value;
        }).on('file', function (name, file) {
//                console.log(file.path);
            ret.files[0].size = file.size;
        }).on('aborted', function () {
            ret.files.forEach(function (file) {
                fs.unlinkSync(file.path);
            });
            fs.rmdirSync(path.dirname(ret.files[0].path));
            //console.log('删除文件夹')
        }).on('error', function (e) {
            ret.error = e;
            // console.log(e);
        }).on('progress', function (bytesReceived) {
        }).on('end', function () {
            var error = ret.error;
	    if (!error) {
            res.status(201).json(ret);
            if (_existsSync(form.uploadDir)) {
                generateCompressScripts(ret.files[0].path, command)
            }
        }else{
            ret.files.forEach(function (file) {
                fs.unlinkSync(file.path);
            });
            fs.rmdir(path.dirname(ret.files[0].path));
            res.status(500).json(error);
        }
        }).parse(req);
    });


    app.get('/qiniu/link/origin/:key', function (req, res) {
        var l = generateURL(PRIVATE.qiniu['origin'], req.param('key'), qiniu);
        res.redirect(l);
    });

    app.get('/qiniu/info/origin/:key', function (req, res) {
//        console.log(req.param('ver'));
//        console.log(req.param('key'));
        var l = generateInfoURL(PRIVATE.qiniu['high'], req.param('key'), qiniu);
        res.redirect(l);
    });

    app.post('/qiniu/list', function (req, res) {
        var marker = null;
        qiniu.rsf.listPrefix(PRIVATE.qiniu.origin.bucket, '', marker, 999999, function (err, ret) {
            if (err) {
                res.status(500).send(err);
                console.log(err);
            } else {
                // process ret.marker & ret.items
//           console.log(ret.marker);
//          console.log(ret.items);
                async.each(ret.items,function(item,next){
                    var source = config.dir.rsync + 'originNew/'+item.key
                    ffmpeg.ffprobe(source,function(err,metadata){
                        item.duration = metadata.format.duration
                        next()
                    })
                },function(err){
                    var retr = _.chain(ret.items)
                        .sortBy(function (item) {
                            return item.key;
                        })
                        .value();
                    res.status(200).send({
                        current: 1,
                        rowCount: -1,
                        rows: retr,
                        total: retr.length
                    });
                })

            }
        });
    });
    app.delete('/qiniu/list/:key', function (req, res) {
        var key = req.params.key;
        deleteAsync(key, function (err) {

            if (err) console.log(err);
            res.status(200);
            res.end('delete success')

        });


    });

    app.post('/video/compressing/:key', function (req, res) {
        deleteList.push(req.params.key);
        _.uniq(deleteList);
        res.status(201);
        res.end('cancel success');
    });

    app.post('/video/compressing', function (req, res) {
        // mock
        var arr = [];
        var filters = [
            '.DS_Store', 'command','outputOri.mp4','outputH.mp4','outputL.mp4','outputM.mp4','outputMo.mp4','mktoutputH.mp4','mktoutputL.mp4',"mktoutputM.mp4"
        ]

        var options = {
            listeners: {
                names: function (root, nodeNamesArray) {
                    _.chain(nodeNamesArray)
                        .flatten()
                        .difference(filters)
                        .reject(function (item) {
                            return (item.length == 14) && (item.indexOf('201') == 0);
                        })
                        .each(function (item) {
                            arr.push({key: item, progress: "compress"})
                        });
                }, directories: function (root, dirStatsArray, next) {
                    next();
                }, files: function (root, fileStats, next) {
                    next();
                }, errors: function (root, nodeStatsArray, next) {
                    next();
                }
            }
        };

        walker = walk.walkSync(config.dir.upload, options);

//        console.log("all done");

        var retr = arr;
        var tempKeys = _.object(deleteList, ['']);
        var temp = _.filter(retr, function (item) {
            return !(item.key in tempKeys);
        });
//            _.chain(arr)
//            .sortBy(function (item) {
//                return item.progress;
//            })
//            .value();

        res.status(200).send({
            current: 1,
            rowCount: -1,
            rows: temp,
            total: 2
        });
    });
    //var request = require('request');//gai
    app.get('/timelist',function(req, res){
        qiniu.rsf.listPrefix(PRIVATE.qiniu.origin.bucket, '', null, 999999, function (err, ret) {
            if (err) {
                res.status(500).send(err);
                console.log(err);
            } else {
                var timeList='';
                async.each(ret.items,function(item,next){
                    var source = config.dir.rsync + 'originNew/'+item.key
                    //shan
                    ffmpeg.ffprobe(source,function(err,metadata){
                    /*var url = generateInfoURL(PRIVATE.qiniu['high'], item.key, qiniu);
                    request(url,function(err, response , body){
                        var metadata = JSON.parse(body)
                        //删上面3行*/
                        timeList += item.key+','+metadata.format.duration+"\n"
                        next()
                    })
                },function(err){
                     res.set('Content-Type', 'text/csv')
                     res.status(200).send(timeList)
                })
            }
        });
    })
}
