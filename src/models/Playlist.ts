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
    tracks: mongoose.Types.Array<any>;
    followers: mongoose.Types.DocumentArray<IUser>;

    thumbnail: () => IThumbnail;
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

export interface IThumbnail {
    sizes: {
        [size: number]: string[];
    }
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
        type: [Object],
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

schema.method("thumbnail", function(): IThumbnail {
    const thumbnail: IThumbnail = { 
        sizes: { } 
    };

    for (const size of [64, 300, 640])
        thumbnail.sizes[size] = this.tracks.map(track => {
            const image = track.album.images.find(
                (image: any) => image.width == size);

            return image.url;
        })
            .slice(0, 4);

    return thumbnail;
});

schema.set("toJSON", {
    transform: (_, ret) => {
        delete ret.__v;
    }
});

const Playlist = model<IPlaylist, PlaylistModel>("Playlist", schema);

export default Playlist;
