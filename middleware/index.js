const Book = require('../models/book')
const User = require('../models/user')

const middlewareObj = {}

middlewareObj.isLoggedIn = (req,res,next)=>{
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error","You need to be logged in to do that")
    res.redirect('/login')
}

middlewareObj.checkOwner = (req,res,next)=>{
    if(req.isAuthenticated()){
        Book.findById(req.params.id, (err,found)=>{
            if(err){
                req.flash("error","Book not found")
                res.redirect('back')
            }
            else{
                if(found.owner.id.equals(req.user._id)|| req.user.isAdmin){
                    next();
                }
                else {
                    req.flash("error","You don't have permission to do that")
                    res.redirect("back")
                }
            }     
        })
    } else{
        req.flash("error", "You need to be logged in to do that")
        res.redirect('back')
    }
}

module.exports = middlewareObj
