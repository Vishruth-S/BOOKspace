const express = require('express')
const router = express.Router()
const Book = require('../models/book')
const middlewareObj = require('../middleware/index.js')
const path = require('path')
const rp = require('request-promise')

var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter}).single('image')

var cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'dpt7fy6g5', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


router.get('/books',(req,res)=>{
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Book.find({$or: [{name: regex,}, {author: regex}]}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allbooks) {
            Book.countDocuments({$or: [{name: regex,}, {author: regex}]}).exec(function (err, count) {
                if (err) {
                    req.flash("error",err)
                    res.redirect("back");
                } else {
                    if(allbooks.length < 1) {
                        noMatch = "No books match that query, please try again.";
                        req.flash("error","Sorry, The book you searched for is not availabe :(")
                        return res.redirect('/books')
                    }
                    // req.flash("success","Search results for"+req.query.search)
                    res.render("index", {
                        books: allbooks,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all books from DB
        Book.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allbooks) {
            Book.countDocuments().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("index", {
                        books: allbooks,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
})


router.get('/books/new',middlewareObj.isLoggedIn,(req,res)=>{
    res.render('new')
})

router.post('/books',middlewareObj.isLoggedIn,upload,(req,res)=>{
    // console.log("POST1")
    // console.log(req.file.path)
    cloudinary.uploader.upload(req.file.path, function(error, result) {
        // add cloudinary url for the image to the book object under image property
        // console.log("post2")
        req.body.image = result.secure_url;
        req.body.imageId = result.public_id;
        req.body.owner = {
            id: req.user._id,
            username: req.user.username,
            phone: req.user.phone
        }
        let location = req.body.location
        rp(`https://api.mapbox.com/geocoding/v5/mapbox.places/${location}.json?access_token=${process.env.GEOCODER}`)
        .then(resp=>JSON.parse(resp))
        .then(result=>{
            const [longitude,latitude] = result.features[0].center;
            newbook = {
                name: req.body.name,
                image: req.body.image,
                author: req.body.author,
                description: req.body.description,
                location: location,
                longitude: longitude,
                latitude: latitude,
                owner: req.body.owner,
                price: req.body.price,
                imageId: req.body.imageId,
            }
            Book.create(newbook, function(err, book) {
                if (err) {
                req.flash('error', err.message);
                return res.redirect('back');
                }
                req.flash("success","Success! Your book is now for sale")
                res.redirect('/books/' + book.id);
    
            });
        });
    });
})

router.get('/books/:id/', (req,res)=>{
    Book.findById(req.params.id, (err,found)=>{
        if(err)
            console.log(err)
        else
            res.render('show',{book: found})
    })
})

router.get('/books/:id/edit',middlewareObj.checkOwner,(req,res)=>{
    Book.findById(req.params.id, (err,found)=>{
        if(err){
			req.flash('error','Book not found');
            return res.redirect('back');
        }
        res.render("edit", {book: found})  
    })
})

router.put('/books/:id',middlewareObj.checkOwner,upload,(req,res)=>{  
    Book.findById(req.params.id, async (err,book)=>{
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            if(req.file) {
                try {   
                    await cloudinary.uploader.destroy(book.imageId) 
                    let result = await cloudinary.uploader.upload(req.file.path)
                    book.imageId = result.public_id
                    book.image  = result.secure_url
                } catch(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            const location = req.body.book.location;
            rp(`https://api.mapbox.com/geocoding/v5/mapbox.places/${location}.json?access_token=${process.env.GEOCODER}`)
            .then(resp=>JSON.parse(resp))
		    .then(result=>{
                const [longitude,latitude] = result.features[0].center;
                req.body.book.longitude = longitude;
                req.body.book.latitude = latitude;
                book.name = req.body.book.name
                book.description = req.body.book.description
                book.author = req.body.book.author
                book.location = req.body.book.location
                book.price = req.body.book.price
                book.longitude = longitude;
                book.latitude = latitude;
                book.imageId = book.imageId;
                book.save();
                req.flash("success","Successfully Updated!");
                // res.redirect("/books/" + book._id);
            })
        }   
        setTimeout(function () {
            // after 2 seconds
            res.redirect("/books/" + book._id);
         }, 3000)
        
    })
})
// Book.findByIdAndUpdate(req.params.id, req.body.book, (err,updated)=>{
//     if(err) {
//         req.flash("error", err.message);
//         res.redirect("back");
//     }
//     else {
//         req.flash("success","Successfully Updated!");
//         res.redirect("/books/" + updated._id);
//     }   
// })

// router.delete('/books/:id',middlewareObj.checkOwner,(req,res)=>{
//     Book.findByIdAndRemove(req.params.id, err=>{
//         if(err)
//             console.log(err)
//         else
//             res.redirect('/books')
//     })
// })

router.delete('/books/:id',middlewareObj.checkOwner,(req,res)=>{
    Book.findById(req.params.id, async (err,book)=>{
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        }  
        try {
            await cloudinary.uploader.destroy(book.imageId) 
            book.remove()
            req.flash("success","Book deleted successfully")
            setTimeout(function () {
                // after 2 seconds
                res.redirect("/books");
             }, 3000)

        } catch (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
    })
})

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router