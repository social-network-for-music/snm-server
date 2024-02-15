import mongoose, { Schema } from "mongoose";

import { IUser } from "./User";

mongoose.connect(process.env.MONGODB_URI || 
    "mongodb://127.0.0.1:27017/snm");

export interface IPlaylist {
    _id: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
    title: string;
    description?: string;
    public: boolean;
    tags: mongoose.Types.Array<string>;
    tracks: mongoose.Types.Array<string>;
    followers: mongoose.Types.DocumentArray<IUser>;
}

const schema = new Schema<IPlaylist>({
    owner: {
        type: Schema.Types.ObjectId,
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
    public: {
        type: Boolean,

        required: true
    },
    tags: {
        type: [{
            type: String,

            match: /^[a-zA-Z_]{3,12}$/
        }],
        default: [],
        required: true
    },
    tracks: {
        type: [String],
        default: [],
        required: true
    },
    followers: {
        type: [{
            type: Schema.Types.ObjectId,

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
