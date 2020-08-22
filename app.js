require('dotenv').config()

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const methodOverride = require('method-override')

const Book = require('./models/book')
const User = require('./models/user')

const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local')

const bookRoutes = require("./routes/books")
const indexRoutes = require('./routes/index')

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

const Database_url = "mongodb+srv://dbUserVS:mongoduservs005@vscluster0-vfwe5.mongodb.net/test?retryWrites=true&w=majority"
mongoose.connect(Database_url, {

}).then(()=>{
    console.log("connected to DB");
}).catch(err=>{
    console.log("Error",err.message)
})

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))
app.set('view engine',"ejs")
app.use(methodOverride("_method"))

app.use(require('express-session')({
    secret: "This a secret message okay",
    resave: false,
    saveUninitialized: false,
}))

app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req,res,next)=>{
    res.locals.currentUser = req.user
    app.locals.moment = require('moment');
    res.locals.errormessage = req.flash("error")
    res.locals.successmessage = req.flash("success")
    next()
})

app.use(indexRoutes)
app.use(bookRoutes)

const port = process.env.PORT || 1008
app.listen(port, ()=>{
    console.log("Server running at http://localhost:1008")
})