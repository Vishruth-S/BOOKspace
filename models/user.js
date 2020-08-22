const mongoose = require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose')

let UserSchema = new mongoose.Schema({
    username: {type:String, unique: true, required: true},
    password: String,
    email: {type:String, unique: true, required: true},
    phone: {type:Number},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false},
})

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User",UserSchema)