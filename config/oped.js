/**
 * Created by sl on 15/3/10.
 */

exports.dir = {
    upload: "/home/master/upload/",
    oped: "/home/master/oped/",
    rsync: "/home/master/rsync/",
    ffmpeg: "/home/master/bin/",
    log: "/home/master/log/",
    origin: "/home/master/rsync/originNew/",
    high: "/home/master/rsync/highNew/",
    medium: "/home/master/rsync/mediumNew/",
    low: "/home/master/rsync/lowNew/",
    mobile: "/home/master/rsync/mobileNew/"
}
exports.watermark = {
    watermark: '/home/master/oped/watermark.png'
}

exports.opeds = {

    // TODO: 从文件中读
    // duration为毫秒
    ops: [
        {
            name: '基础片头',
            ab: 'opbasic',
            duration: 4590
        },
        {
            name: '特训/讲题片头',
            ab: 'opadv',
            duration: 6190
        },
        {
            name: '拓展片头',
            ab: 'opext',
            duration: 6740
        },
        {
            name: '无片头',
            ab: 'null',
            duration: 0
        },
        {
            name: '老基础片头',
            ab: 'opoldbasic',
            duration: 4850
        }
    ],
    eds: [
        {
            name: '代数片尾',
            eds: [
                {
                    name: '代数片尾',
                    ab: 'edalg',
                    duration: 26750
                }
            ]
        },
        {
            name: '几何片尾',
            ab: 'edgeo',
            duration: 34750
        },
        {
            name: '拓展片尾',
            eds: [
                {
                    name: '杀·飞·桑尼',
                    ab: 'edextganma',
                    duration: 29880
                },
                {
                    name: '组长',
                    ab: 'edextzuzhang',
                    duration: 29880
                },
                {
                    name: '杰克酥',
                    ab: 'edextxiaojie',
                    duration: 29880
                },
                {
                    name: '稀粥',
                    ab: 'edextlinfeng',
                    duration: 29880
                },
                {
                    name: '虾酱',
                    ab: 'edextyifan',
                    duration: 29880
                },
                {
                    name: '薯条',
                    ab: 'edexthaotian',
                    duration: 29880
                }
            ]
        },
        {
            name: '无片尾',
            ab: 'null',
            duration: 0
        }
    ]
};