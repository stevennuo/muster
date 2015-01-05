/**
 * Created by 3er on 1/5/15.
 */

var _ = require('underscore');

var generateURL = function (item, qiniu, origin) {
    var deadline = Math.floor(Date.now() / 1000) + origin.expiration;
    var link = 'http://' + origin.domain + '/' + escape(item.key) + '?e=' + deadline;
    var token = qiniu.conf.ACCESS_KEY + ':' +
        qiniu.util.base64ToUrlSafe(qiniu.util.hmacSha1(link, qiniu.conf.SECRET_KEY));
    return link +
        '&token=' + token;
}

module.exports = function (app, qiniu, PRIVATE) {
    // http api
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
    })
}