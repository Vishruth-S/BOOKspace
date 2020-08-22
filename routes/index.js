
const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require('../models/user')
const Book = require('../models/book')
const middlewareObj = require('../middleware/index.js')
const async = require('async')
const nodemailer = require('nodemailer')
const crypto = require("crypto")

router.get('/',(req,res)=>{
    res.redirect('/books')
})



//======AUTH ROUTES======//
router.get('/register',(req,res)=>{
    res.render('signup')
})

router.post('/register',(req,res)=>{
    let newUser = new User({username: req.body.username, email:req.body.email, phone:req.body.phone})
    if(req.body.adminCode === process.env.ADMIN_KEY) {
        newUser.isAdmin = true
    }
    User.register(newUser, req.body.password, (err,user)=>{
        if(err){
            req.flash("error",err.message)
            res.redirect('back')
        } else{
            passport.authenticate("local")(req,res, ()=>{
                req.flash("success","Welcome to BOOKspace,  "+user.username)
                res.redirect('/books')
            })
        }
    })
})

router.get('/login',(req,res)=>{
    res.render('signup')
})

router.post('/login',passport.authenticate('local',{
    successRedirect: '/books',
    failureRedirect: '/login',
    failureFlash: true
}),(req,res)=>{})

router.get('/logout',(req,res)=>{
    req.logout()
    req.flash("success","Successfully logged out")
    res.redirect('/books')
})

//FORGOT PASSWORD

router.get('/forgot',(req,res)=>{
    res.render('forgot')
})

router.post('/forgot',(req,res,next)=>{
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, (err,buf)=>{
                let token = buf.toString('hex')
                done(err, token)
            })
        },
        function(token, done) {
            User.findOne({email: req.body.email}, (err,user)=>{
                if(!user) {
                    req.flash('error','No account with that email address exists')
                    return res.redirect('/forgot')
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 36000000;  //1 hour

                user.save(err=>{
                    done(err, token, user)
                })
            })
        },
        function(token, user, done) {
            const smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASS
                }
            });
            const mailOptions = {
                to: user.email,
                from: process.env.EMAIL,
                subject: 'Password reset',
                text: "You are recieving this email because you have requested the reset of your password for your BOOKspace account"+
                     "Please click on the following link or paste it into your browser to complete this process" +
                     "  http://" + req.headers.host + '/reset/' + token + '\n' +
                     " Note that the link will only be active for 1hr. Don't share this link with anybody else"+'\n\n'+
                     "If this was not done by you, kindly ignore this message"
            }
            smtpTransport.sendMail(mailOptions, (err)=>{
                // console.log("Mail sent")
                req.flash("success","An email has been sent to "+ user.email +" with further instructions")
                done(err, 'done');
            })
        }   
    ], err=>{
        if(err) return next(err);
        res.redirect('/forgot');
    })
})

router.get('/reset/:token', (req,res)=>{
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }},(err,user)=>{
        if(!user) {
            req.flash('error','Password reset token is invalid or expired')
            return res.redirect('/forgot')
        }
        res.render('reset',{token: req.params.token})
    })
})

function success(user, err) {
    let smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASS
        }
    });
    const mailOptions = {
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Password reset',
        text: "This is a confirmation that your password for your BOOKspace account has been reset"+'\n\n'+
              "If you feel that this was not done by you,please leave a reply to this mail and we'll get back to you asap"
    };
    smtpTransport.sendMail(mailOptions, (err)=>{
        // console.log("mail 2 sent")
        // res.redirect('/campgrounds')
        // req.flash("success","Your password has been reset successfuly")
    })
}

router.post('/reset/:token',(req,res)=>{
    // console.log("POST")
    async.waterfall([
        function(done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }},(err,user)=>{
                if(!user) {
                    req.flash('error',"Password reset token is invalid or expired")
                    return res.redirect('back')
                }
                if(req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, (err)=>{
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(err=>{
                            req.login(user, err=>{
                                success(user, err);
                                req.flash("success","Welcome back "+user.username+", Your password has been reset successfuly")
                                return res.redirect('/books')
                            })
                        })
                    })
                } else {
                    req.flash('error', "Passwords don't match")
                    return res.redirect('back')
                }
            })
        },
    ], err=>{
        res.redirect('/books')
    })
})

//USER PROFILE

router.get('/users/:id',(req,res)=>{
    User.findById(req.params.id, (err,found)=>{
        if(err) {
            req.flash("error",err.message)
            res.redirect('/')
        }
        else {
            Book.find().where('owner.id').equals(found._id).exec((err, books)=>{
                if(err) {
                    req.flash("error",err.message)
                    res.redirect('/')
                }
                else {
                    res.render('users/show', {user: found, books:books})
                }
            })
        }    
    })
})


module.exports = router

