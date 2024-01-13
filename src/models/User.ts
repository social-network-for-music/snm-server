import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_URI || 
    "mongodb://127.0.0.1:27017/snm");

const schema = new mongoose.Schema({
    email: {
        type: String,
        match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        required: true,

        unique: true
    },
    username: {
        type: String,
        match: /^(?=.{3,15}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/,
        required: true
    },
    hash: { 
        type: String,
        match: /^\$2[ayb]\$.{56}$/,
        required: true 
    }
});

schema.set("toJSON", {
    transform: (_, object) => {
      delete object.__v;
      delete object.hash;
    }
});

const User = mongoose.model("User", schema);

export default User;