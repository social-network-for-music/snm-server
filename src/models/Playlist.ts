import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_URI || 
    "mongodb://127.0.0.1:27017/snm");

const schema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        match: /^[\w\s\-.,!?:]{3,25}$/,
        required: true
    },
    description: {
        type: String
    },
    tags: {
        type: [{
            type: String,

            match: /^[a-zA-Z_]{3,12}$/
        }],
        default: [],
        required: true
    },
    public: {
        type: Boolean,

        required: true
    },
    tracks: {
        type: [String],
        default: [],
        required: true
    },
    followers: {
        type: [{
            type: mongoose.Schema.ObjectId,

            ref: "User"
        }],
        default: [],
        required: true
    }
});

schema.set("toJSON", {
    transform: (_, object) => {
      delete object.__v;
    }
});

const Playlist = mongoose.model("Playlist", schema);

export default Playlist;