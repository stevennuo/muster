/**
 * Created by sl on 15/3/14.
 */
require('config/dataSchema');
var mongoose = require('mongoose');
var _ = require('underscore');
var request = require('request');
var Video = mongoose.model('Video');
var wrongNum = 0;
console.log('==================\n');
console.log('检查video链接的有效性\n');
console.log('==================\n');
exports.Video.find({}, function(err, videos){
    var videoLength = videos.length;
    console.log('共需检查' + videoLength + '个视频链接的有效性');
    var position = 0;
    var judgeLink = function(position){
        request.head(videos[position].url, function(err, response, body){
            if(!err){
                if(response.statusCode === 200){}
                //console.log('第' + position + '个视频连接有效');
                else {
                    ++wrongNum;
                    console.log('视频ID:' + videos[position]._id + '链接有问题\n' + videos[position].url);
                }
            } else {
                //console.log(err);
            }
            if(++position < videoLength){
                judgeLink(position);
            } else {
                console.log('done');
                return('共有' + wrongNum + '个视频的链接有问题');
                process.exit();
            }
        })
    };
    videoLength > 0 ? judgeLink(position) : process.exit();
});