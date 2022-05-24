const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cookieParser = require('cookie-parser')
const session = require('express-session')

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static("public"));
app.use(bodyParser.json())
app.use(cookieParser('secret'))
app.use(session({cookie: {maxAge: null}}))

app.use((req, res, next)=>{
    res.locals.message = req.session.message
    delete req.session.message
    next()
  })

mongoose.connect("mongodb://localhost:27017/hmsDB", {useNewUrlParser: true});

const customerSchema = {
    name: String,
    email: String,
    password: String
};

const Customer = mongoose.model("Customer", customerSchema);

const roomSchema = {
    roomNo: Number,
    capacity: Number,
    type: String,
    price: Number,
    checkIn: Date,
    checkOut: Date,
    available: Boolean,
    rating: Number
};

const Room = mongoose.model("room", roomSchema);



app.get('/', (req, res)=>{
    res.render('index');
})

app.get('/signup', (req, res)=>{
    res.render('signup');
})

app.post('/signup', (req, res)=>{

    const cName = req.body.name;
    const cEmail = req.body.email;
    const cPassword = req.body.password;
    const cConfirm = req.body.confirm;

    if(cName == '' || cEmail =='' || cPassword==''){
        req.session.message = {
            type: 'danger',
            intro: 'Empty Credentials! ',
            message: 'Please insert the required details.'
          }
        res.redirect('/signup');
    }
    
    else if(cPassword != cConfirm){
        req.session.message = {
          type: 'danger',
          intro: 'Passwords do not match! ',
          message: 'Please make sure to insert the same password.'
        }
        res.redirect('/signup');
    }
    
    else {
        Customer.findOne({email: cEmail}, function(err, found){
            if (!err){
                if (!found){
                    const customer = new Customer({
                        name: cName,
                        email: cEmail,
                        password: cPassword
                    });
                    customer.save();
                    req.session.message = {
                        type: 'success',
                        intro: 'Registration Successful! ',
                        message: 'Now you can Log in to book rooms.'
                      }
                    res.redirect('/signup');
                } 
                
                else{
                    req.session.message = {
                        type: 'dark',
                        intro: 'Email already taken! ',
                        message: 'Please Log in.'
                      }
                    console.log("Email already taken, plz login")
                    res.redirect('/signup');
                }
            }
        })
    }

        

});

app.get('/login', (req, res)=>{
    res.render('login');
})

app.post('/login', (req, res)=>{
    const cEmail = req.body.email;
    const cPassword = req.body.password;

    if(cEmail =='' || cPassword==''){
        req.session.message = {
            type: 'danger',
            intro: 'Empty Credentials! ',
            message: 'Please insert the required details.'
          }
        res.redirect('/login');
    }
    else{
        Customer.findOne({email: cEmail}, function(err, found){
            if (!err){
                if (found){
                    if (cPassword===found.password)
                    {
                        req.session.message = {
                            type: 'success',
                            intro: 'Succesfully logged in! ',
                            message: 'Enjoy.'
                          }
                        res.redirect('/login');
                    }
                    else{
                        req.session.message = {
                            type: 'warning',
                            intro: 'You entered Wrong Password! ',
                            message: 'Enter again.'
                          }
                        res.redirect('/login');
                    }
                    
                } else{
                    req.session.message = {
                        type: 'info',
                        intro: 'You are new user! ',
                        message: 'Please register first.'
                      }
                    res.redirect('/login');
                }
            }
        })
    }  
})


app.get('/book', (req, res)=>{
    
    Room.find({}, function(err, roomDetails){
        if (err){
            return handleError(err);
        } else{
            res.render('book', {capa1:roomDetails[0].capacity, price1:roomDetails[0].price, type1:roomDetails[0].type, rating1:roomDetails[0].rating,
                capa2:roomDetails[1].capacity, price2:roomDetails[1].price, type2:roomDetails[1].type, rating2:roomDetails[1].rating,
                capa3:roomDetails[2].capacity, price3:roomDetails[2].price, type3:roomDetails[2].type, rating3:roomDetails[2].rating,
                capa4:roomDetails[3].capacity, price4:roomDetails[3].price, type4:roomDetails[3].type, rating4:roomDetails[3].rating,
                capa5:roomDetails[4].capacity, price5:roomDetails[4].price, type5:roomDetails[4].type, rating5:roomDetails[4].rating,
                capa6:roomDetails[5].capacity, price6:roomDetails[5].price, type6:roomDetails[5].type, rating6:roomDetails[5].rating,
                capa7:roomDetails[6].capacity, price7:roomDetails[6].price, type7:roomDetails[6].type, rating7:roomDetails[6].rating,
                capa8:roomDetails[7].capacity, price8:roomDetails[7].price, type8:roomDetails[7].type, rating8:roomDetails[7].rating,
                capa9:roomDetails[8].capacity, price9:roomDetails[8].price, type9:roomDetails[8].type, rating9:roomDetails[8].rating,
            });
        }});
    
});

app.post('/book', (req, res)=>{
    const person = req.body.quantity;
    const type = req.body.roomType;
    const date1 = req.body.checkInDate;
    const date2 = req.body.checkOutDate;

    res.redirect('/book');
})





app.listen(process.env.PORT || 3000);