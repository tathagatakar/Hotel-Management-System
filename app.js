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
                        message: 'Now you can Log in to book rooms.'
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

    if (cEmail == '' || cPassword == '') {
        req.session.message = {
            type: 'danger',
            intro: 'Empty Credentials! ',
            message: 'Please insert the required details.'
        }
        res.redirect('/login');
    } else {
        Customer.findOne({
            email: cEmail
        }, function (err, found) {
            if (!err) {
                if (found) {
                    if (cPassword === found.password) {
                        req.session.message = {
                            type: 'success',
                            intro: 'Succesfully logged in! ',
                            message: 'Enjoy.'
                        }
                        res.redirect('/book');
                    } else {
                        req.session.message = {
                            type: 'warning',
                            intro: 'You entered Wrong Password! ',
                            message: 'Enter again.'
                        }
                        res.redirect('/login');
                    }

                } else {
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

    Room.find({}, function (err, roomDetails) {
        if (err) {
            return handleError(err);
        } else {
            res.render('book', {
                roomDetails: roomDetails
            });
        }
    });

});

app.post('/book', (req, res) => {
    const capacity = req.body.quantity;
    const date1 = req.body.checkInDate.toString();
    const date2 = req.body.checkOutDate.toString();
    const d1 = new Date(date1).toISOString();
    const d2 = new Date(date2).toISOString();
    var result = []

    Room.find({'capacity': capacity}, 'roomNo price rating capacity orderDetails', function (err, searchResult) {
        if (err)
            return handleError(err);
        else {
            for (var i = 0; i < searchResult.length; i++) {
                var count = 0;
                for (var j = 0; j < searchResult[i].orderDetails.length; j++) 
                    if (!((d1 < searchResult[i].orderDetails[j].checkIn.toISOString() && d2 < searchResult[i].orderDetails[j].checkIn.toISOString()) || (d1 > searchResult[i].orderDetails[j].checkOut.toISOString() && d2 > searchResult[i].orderDetails[j].checkOut.toISOString()))) count += 1;
                
                if (count != 0)
                    result.push({roomNo: searchResult[i].roomNo, price: searchResult[i].price, rating: searchResult[i].rating, capacity: searchResult[i].capacity});
                }}
    console.log(result);
    res.render('search', {result: result});
    })
})

app.get('/search', (req, res) => {
    var def = []
    res.render('search', {result: def});
})

app.listen(process.env.PORT || 3000);