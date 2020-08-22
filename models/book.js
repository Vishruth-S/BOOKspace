const mongoose = require('mongoose')

let bookSchema = new mongoose.Schema({
    name: String,
    author: String,
    description: String,
    image: String,
    imageId: String,
    location:String,
    longitude:Number,
    latitude:Number,
    price: Number,
    location: String,
    createdAt: {type: Date, default: Date.now},
    owner: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        username: String,
        phone: Number,
    },
})

module.exports = mongoose.model("Book",bookSchema)

// Book.create (
//     {
//         name: "Engineering Maths",
//         author: "Anton Bivens",
//         image: "https://images.unsplash.com/photo-1471115853179-bb1d604434e0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60",
//         description: "The math book for genius minds",
//     },
//     (err, book)=>{
//         if(err)
//             console.log("Error "+err)
//         else    
//             console.log("New book created: "+book)
//     })

