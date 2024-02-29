import mongoose, { 
    Schema,
    model
} from "mongoose";

export interface IUser {
    _id: Schema.Types.ObjectId;
    email: string;
    username: string;
    hash: string;
    artists: mongoose.Types.Array<string>;
    genres: mongoose.Types.Array<string>;
}

const schema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,

        required: true
    },
    hash: { 
        type: String,

        required: true 
    },
    artists: {
        type: [String],
        default: [],
        required: true
    },
    genres: {
        type: [String],
        default: [],
        required: true
    }
});

schema.set("toJSON", {
    transform: (_, ret) => {
      delete ret.__v;
      
      delete ret.hash;
    }
});

const User = model<IUser>("User", schema);

export default User;
