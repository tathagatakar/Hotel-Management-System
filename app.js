const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const cookieParser = require('cookie-parser')
const session = require('express-session')
const Razorpay = require('razorpay');

const app = express();
dotenv.config();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static("public"));
app.use(bodyParser.json())
app.use(cookieParser('secret'))
app.use(session({
    cookie: {
        maxAge: null
    }
}))

app.use((req, res, next) => {
    res.locals.message = req.session.message
    delete req.session.message
    next()
})

var instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});

mongoose.connect("mongodb://localhost:27017/hmsDB", {useNewUrlParser: true});

const customerSchema = {name: String, email: String, password: String};
const Customer = mongoose.model("Customer", customerSchema);

const roomSchema = {roomNo: Number, capacity: Number, price: Number, rating: Number, orderDetails: [{ customerId: String, checkIn: Date, checkOut: Date}]};
const Room = mongoose.model("room", roomSchema);

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/signup', (req, res) => {
    res.render('signup');
})

app.post('/signup', (req, res) => {
    const cName = req.body.name;
    const cEmail = req.body.email;
    const cPassword = req.body.password;
    const cConfirm = req.body.confirm;

    if (cName == '' || cEmail == '' || cPassword == '') {
        req.session.message = {
            type: 'danger',
            intro: 'Empty Credentials! ',
            message: 'Please insert the required details.'
        }
        res.redirect('/signup');
    } else if (cPassword != cConfirm) {
        req.session.message = {
            type: 'danger',
            intro: 'Passwords do not match! ',
            message: 'Please make sure to insert the same password.'
        }
        res.redirect('/signup');
    } else {
        Customer.findOne({
            email: cEmail
        }, function (err, found) {
            if (!err) {
                if (!found) {
                    const customer = new Customer({
                        name: cName,
                        email: cEmail,
                        password: cPassword
                    });
                    customer.save();
                    req.session.message = {
                        type: 'success',
                        intro: 'Registration Successful! ',
                        message: 'Go to Log in to book rooms.'
                    }
                    res.redirect('/signup');
                } else {
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

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/login', (req, res) => {
    const cEmail = req.body.email;
    const cPassword = req.body.password;

            if (cEmail == '' || cPassword == '')
            {
                req.session.message = {
                    type: 'danger',
                    intro: 'Empty Credentials! ',
                    message: 'Please insert the required details.'
                }
                res.redirect('/login');
            } 
            
            else
            {
                Customer.findOne({email: cEmail},  function (err, found) {
                    if (!err) 
                    {
                        if (found)
                        {
                            
                            if (cPassword === found.password) {
                                req.session.message = {
                                    type: 'success',
                                    intro: 'Succesfully logged in! ',
                                    message: 'Enjoy.'
                                }
                                res.cookie("userName", cEmail);
                                res.cookie("name", found.name);
                                res.redirect('/book')
                            }
                            else 
                            {
                                req.session.message = {
                                    type: 'warning',
                                    intro: 'You entered Wrong Password! ',
                                    message: 'Enter again.'
                                }
                                res.redirect('/login');
                            }
                        }
                        
                        else
                        {
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

app.get('/book', (req, res) => {
    const uname=req.cookies.userName;
    Room.find({}, function (err, roomDetails) {
        if (err) {
            return handleError(err);
        }
        else {
            res.render('book', { username: uname, roomDetails: roomDetails } );
        }
});
})

app.post('/book', (req, res) => {
    const capacity = req.body.quantity;
    res.cookie('capacity', capacity);
    const date1 = req.body.checkInDate.toString();
    const date2 = req.body.checkOutDate.toString();
    const d1 = new Date(date1).toISOString();
    const d2 = new Date(date2).toISOString();
    const currentDate = new Date().toISOString();

    if (d1 < currentDate || d2 < currentDate)
    {
        req.session.message = {
            type: 'danger',
            intro: 'Wrong Date Credentials! ',
            message: 'Try again.'
        }
        res.redirect('/book');
    }
    else 
    {
        res.cookie("checkIn", d1);
        res.cookie("checkOut", d2);
        var result = []

        Room.find({'capacity': capacity}, 'roomNo price rating capacity orderDetails', function (err, searchResult) {
            if (err)
                return handleError(err);
            else {
                for (var i = 0; i < searchResult.length; i++) {
                    var count = 0;
                    for (var j = 0; j < searchResult[i].orderDetails.length; j++) 
                        if (((d1 < searchResult[i].orderDetails[j].checkIn.toISOString() && d2 < searchResult[i].orderDetails[j].checkIn.toISOString()) || (d1 > searchResult[i].orderDetails[j].checkOut.toISOString() && d2 > searchResult[i].orderDetails[j].checkOut.toISOString()))) count += 1;
                    
                    if (count != 0)
                        result.push({roomNo: searchResult[i].roomNo, price: searchResult[i].price, rating: searchResult[i].rating, capacity: searchResult[i].capacity});
                    }}
                    res.cookie("searchResult", result);
                    res.redirect('/search');
        })
    }

    
})

app.get('/search', (req, res) => {
    var def =req.cookies.searchResult;
    res.render('search', {result: def});
    
})

app.post('/search', (req, res)=>{
    const roomNum = req.body.roomNo;
    res.cookie("roomNo", roomNum);
    //console.log(req.cookies);
    res.redirect('/bill');
})

app.get('/bill', (req, res)=>{
    const un=req.cookies.userName;
    const rn=req.cookies.roomNo;
    const arr=[];
    var amt=0;

    for (var i=0; i<req.cookies.searchResult.length; i++)
    {
        console.log()
            if (req.cookies.searchResult[i].roomNo, parseInt(req.cookies.roomNo))
            {
                
                amt=req.cookies.searchResult[i].price;
            }
    }
    
    res.render('bill', {name: req.cookies.name, uName: req.cookies.userName, rn: req.cookies.roomNo, guestCount: req.cookies.capacity, price: amt, cin: new Date(req.cookies.checkIn), cout: new Date(req.cookies.checkOut), k1: process.env.KEY_ID, k2: process.env.KEY_SECRET});
})

app.post('/create/orderId', (req, res) => {
    //console.log("create orderId request ", req.body);
    var options = {
        amount: req.body.amount,
        currency: "INR",
        receipt: "rcp1"
    };
    instance.orders.create(options, function (err, order) {
        //console.log(order);
        res.send({orderId: order.id});
    });
})

app.post("/api/payment/verify", (req, res) => {
    let body = req.body.response.razorpay_order_id + "|" + req.body.response.razorpay_payment_id;
    var crypto = require("crypto");
    var expectedSignature = crypto.createHmac('sha256', process.env.KEY_SECRET).update(body.toString()).digest('hex');
    console.log("sig received ", req.body.response.razorpay_signature);
    console.log("sig generated ", expectedSignature);
    var response = {
        "signatureIsValid": "false"
    }
    if (expectedSignature === req.body.response.razorpay_signature) response = {
        "signatureIsValid": "true"
    }
    res.send(response);
    //console.log("Kaj sesh kaka!!")
    res.redirect("/");
});

app.listen(process.env.PORT || 3000);