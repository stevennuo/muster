/**
 * Created by sl on 15/3/14.
 */
/**
 * Created by HYFY on 15/3/9.
 */
//needed data schema init
var mongoose = require('mongoose');
mongoose.connect('mongodb://192.168.3.100/yangcong-math-test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    console.log('database open success');
});
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var LevelSchema = new Schema({
    weight: Number,
    alias: String
});

var TagSchema = new Schema({
    name: String,
    levels: [LevelSchema],
    topic: {type: ObjectId, ref: 'Topic'}
});

mongoose.model('Tag', TagSchema);

//load schema of chapter
var ChapterSchema = new Schema({
    name: String,
    state: {
        type: String,
        enum: ['unpublished', 'published', 'offline', 'prepared'],
        default: 'published'
    },
    icon: String,
    desc: String,
    guideVideo: {type: ObjectId, ref: 'Video'},
    topics: [{type: ObjectId, ref: 'Topic'}],
    disabled: {
        type: Boolean,
        default: false
    }
});
mongoose.model('Chapter', ChapterSchema);

//load schema of topic
var TopicSchema = new Schema({
    name: String,
    icon: String,
    desc: String,
    requirement: {type: Boolean, default: false},
    tasks: [{type: ObjectId, ref: 'Task'}],
    disabled: {
        type: Boolean,
        default: false
    }
});
mongoose.model('Topic', TopicSchema);

//load schema of video
var hyperChoiceSchema = new Schema({
    body: String,
    isCorrect: {
        type: Boolean,
        default: false
    },
    jumpVideo: {
        videoUrl: String,
        videoName: String,
        time: Number
    },
    backVideo: {
        videoUrl: String,
        videoName: String,
        time: Number
    }
});

var hyperProblemSchema = new Schema({
    body: String,
    showTime: Number,
    choices: [hyperChoiceSchema]
});

var VideoSchema = new Schema({
    name: String,
    url: String,
    type: String, //main ? correct? wrong
    problems: [hyperProblemSchema],
    topics: [{
        type: ObjectId,
        ref: 'Topic'
    }],
    tags: [{
        type: ObjectId,
        ref: 'Tag'
    }],
    desc: String,
    finishTime: Number,
    headerTime: Number,
    duration: Number
});

mongoose.model('Video', VideoSchema);

//load schema of task
var TaskSchema = new Schema({
    name: String,
    type: {
        type: String,
        enum: ['elementary', 'advanced', 'challenge'],
        required: true
    },
    seq: Number,
    desc: String,
    bloods: {
        type: Number,
        default: 3
    },
    disabled: {
        type: Boolean,
        default: false
    },
    activities: [{type: ObjectId, ref: 'Activity'}]
});
mongoose.model('Task', TaskSchema);

//load schema of activity
var ActivitySchema = new Schema({
    name: String,
    type: String,
    desc: String,
    problems: [{type: ObjectId, ref: 'Problem'}],
    videos: [{type: ObjectId, ref: 'Video'}],
    tags: [{type: ObjectId, ref: 'Tag'}],
    thumbnail: String,
    disabled: {
        type: Boolean,
        default: false
    }
});

mongoose.model('Activity', ActivitySchema);

//load schema of problem
var ChoiceSchema = new Schema({
    body: {
        type: String,
        required: true
    },
    isCorrect: {
        type: Boolean,
        default: false
    }
});

var ProblemSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['single', 'multi', 'blank']
    },
    body: {
        type: String,
        required: true
    },
    correctAnswer: [String],  //注意：这里是针对填空题只有一个空的时候，有多个正确答案的解析，比如"1/2"和"0.5"都算作正确
    choices: [ChoiceSchema],
    prompt: String,
    expl: String,
    tags: [{type: ObjectId, ref: 'Tag'}],
    video: {type: ObjectId, ref: 'Video'},
    disabled: {
        type: Boolean,
        default: false
    }
});

mongoose.model('Problem', ProblemSchema);
