import mongoose, { 
    Schema,
    FilterQuery,
    Model,
    model,
    HydratedDocument,
    Query
} from "mongoose";

import { IUser } from "./User";

type _Query<T> = Query<
    HydratedDocument<T>[],

    HydratedDocument<T>
>;

export interface IPlaylist {
    _id: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
    title: string;
    description?: string;
    public: boolean;
    tags: mongoose.Types.Array<string>;
    tracks: mongoose.Types.Array<Schema.Types.Mixed>;
    followers: mongoose.Types.DocumentArray<IUser>;
}

export interface IPlaylistPreview {
    _id: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
    title: string;
    public: boolean;
    tags: mongoose.Types.Array<string>;
    totalTracks: number;
    totalFollowers: number;
}

export interface PlaylistModel extends Model<IPlaylist> {
    getPreviews(filter: FilterQuery<IPlaylist>): _Query<IPlaylistPreview>;
}

const schema = new Schema<IPlaylist, PlaylistModel>({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        match: /^[\w\-.,!?: ]{3,30}$/,
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

            match: /^[a-z0\- ]{3,18}$/
        }],
        default: [],
        required: true
    },
    tracks: {
        type: [Schema.Types.Mixed],
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

schema.static("getPreviews", 
    function (filter: FilterQuery<IPlaylist>): _Query<IPlaylistPreview> {
        return this.find(filter, {
            _id: 1,
            owner: 1,
            title: 1,
            public: 1,
            tags: 1,
            totalTracks: { $size: "$tracks" },
            totalFollowers: { $size: "$followers" }
        });
    }
);

schema.set("toJSON", {
    transform: (_, ret) => {
        delete ret.__v;
    }
});

const Playlist = model<IPlaylist, PlaylistModel>("Playlist", schema);

export default Playlist;
