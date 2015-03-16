/**
 * Created by sl on 15/3/14.
 */
require('./config/dataSchema');
var mongoose = require('mongoose');
var _ = require('underscore');
var request = require('request');
var Video = mongoose.model('Video');
var wrongNum = 0;
exports.checklist = function (next) {
    var list = [], videoList = [], i, j, k, l, x, y, problems, choices, videoLength, location, key;

    Video.find({}, function (err, videos) {
        for (k = 0; k < videos.length; k++) {
            videoList.push({
                id: videos[k]._id,
                url: videos[k].url,
                key: ['url']
            });
            problems = videos[k].problems;
            if (problems && problems.length != 0) {
                for (i = 0; i < problems.length; i++) {
                    choices = problems[i].choices;
                    //console.log(choices)
                    if (choices && choices.length != 0) {
                        for (j = 0; j < choices.length; j++) {
                            if (choices[j].jumpVideo && choices[j].jumpVideo.videoUrl) {
                                // console.log('problems['+ i + '].choices['+j+'].jumpVideo.videoUrl')
                                videoList.push({
                                    id: videos[k]._id,
                                    url: choices[j].jumpVideo.videoUrl,
                                    key: [i, j, 'jumpVideo']

                                })

                            }
                            if (choices[j].backVideo && choices[j].backVideo.videoUrl) {
                                videoList.push({
                                    id: videos[k]._id,
                                    url: choices[j].backVideo.videoUrl,
                                    key: [i, j, 'backVideo']

                                })

                            }


                        }
                    }
                }
            }
        }
        //console.log(videoList)
        videoLength = videoList.length;

        /*   l=0;
         var digui = function() {
         Video.findById({_id: videoList[l].id}, function (err, vid) {

         key = videoList[l].key;
         //console.log(videoList[l].key)
         //console.log(l)
         if(key.length==1){
         if(vid[key[0]].indexOf('7u2j9y')>0){
         vid[key[0]] = vid[key[0]].replace('7u2j9y','7xaw4c');
         //console.log(vid.problems[0].choices[1].jumpVideo);
         vid.save(console.log)

         //console.log(_id);
         */
        /*Video.({_id : _id}, vid,function(err,data){
         console.log(err)
         });*/
        /*
         }
         }else if(key.length ==3){
         x = vid.problems[key[0]].choices[key[1]][key[2]].videoUrl
         if(x.indexOf('7u2j9y')>0){
         vid.problems[key[0]].choices[key[1]][key[2]].videoUrl = x.replace('7u2j9y','7xaw4c');
         console.log(vid.problems[0].choices[1].jumpVideo);
         vid.save(console.log)

         //console.log(_id);
         */
        /*Video.({_id : _id}, vid,function(err,data){
         console.log(err)
         });*/
        /*
         }
         }
         if(++l<videoLength){
         digui()
         }else {
         console.log('done');
         }
         })
         }
         digui()
         */


        var position = 0;
        var judgeLink = function (position) {
            request.head(videoList[position].url, function (err, response, body) {
                if (!err) {
                    if (response.statusCode === 200) {
                    }
                    //console.log('第' + position + '个视频连接有效');
                    else {
                        ++wrongNum;
                        console.log(videoList[position].url);
                        if (videoList[position].key.length > 1) {
                            location = "分支视频：第" + i + "个问题的第" + j + "个选项的" + videoList[position].key[2];
                        } else if (videoList[position].key.length == 1) {
                            location = "主视频：章节看url";
                        }

                        list.push({
                            id: videoList[position].id,
                            url: videoList[position].url,
                            key: videoList[position].key,
                            location: location
                        });
                    }
                } else {
                    next(err);
                }
                if (++position < videoLength) {
                    judgeLink(position);
                } else {
                    console.log("done");
                    next(null, {
                        totalSum: videoLength,
                        badLinkSum: wrongNum,
                        list: list
                    });
                    wrongNum = 0
                    // process.exit();
                }
            })
        };
        judgeLink(position);
        // videoLength > 0 ? judgeLink(position) : process.exit();
    });
};
exports.replace = function (list, next) {
    var id = list.id;
    var key = list.key;
    var replaceUrl = list.replaceUrl;
    Video.findOne({_id: id}, function (err, vid) {
        //console.log(vid)
        if (err) {
            next(1);
        }
        else {

            if (key.length === 3 && replaceUrl) {
                vid.problems[key[0]].choices[key[1]][key[2]].videoUrl = replaceUrl;
                //next(null);
                //console.log('aa')
                vid.save(next);
            } else if (key.length === 1 && replaceUrl) {
                vid[key[0]] = replaceUrl;
                //next(null);
                vid.save(next);
                //console.log('yige')
            } else {
                next(1);
            }
        }
    })
};