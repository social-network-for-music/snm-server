import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_URI || 
    "mongodb://127.0.0.1:27017/snm");

const schema = new mongoose.Schema({
    email: {
        type: String,
        match: /[^\\.\\s@:](?:[^\\s@:]*[^\\s@:\\.])?@[^\\.\\s@]+(?:\\.[^\\.\\s@]+)*/,
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
        match: /^[a-f0-9]{64}$/,
        required: true 
    }
})

const User = mongoose.model("User", schema);

export default User;