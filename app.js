const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const paypal = require("paypal-rest-sdk");
const cookieParser = require('cookie-parser')
const session = require('express-session')
const storage = require('node-sessionstorage');

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

paypal.configure({
    mode: "sandbox",
    client_id: process.env.clientId,
    client_secret: process.env.secretId,
});

mongoose.connect("mongodb://localhost:27017/hmsDB", {useNewUrlParser: true});

const customerSchema = {name: String, email: String, password: String, orderDetails: [{roomNo: Number, price: Number, checkIn: Date, checkOut: Date, dateOfBook: Date}]};
const Customer = mongoose.model("Customer", customerSchema);

const roomSchema = {roomNo: Number, capacity: Number, price: Number, rating: Number, orderDetails: [{customerId: String, checkIn: Date, checkOut: Date}]};
const Room = mongoose.model("room", roomSchema);

app.get('/', (req, res) => {
    req.session.count=0;
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
        Customer.findOne( {email: cEmail}, function (err, found) {
            if (!err) {
                if (!found) {
                    const customer = new Customer({ name: cName, email: cEmail, password: cPassword, orderDetails: [] });
                    customer.save();
                    req.session.message = {
                        type: 'success',
                        intro: 'Registration Successful! ',
                        message: 'Go to Log in to book rooms.'
                    }
                    res.redirect('/signup');
                } 
                
                else {
                    req.session.message = {
                        type: 'dark',
                        intro: 'Email already taken! ',
                        message: 'Please Log in.'
                    }
                    //console.log("Email already taken, plz login")
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
                                req.session.userName = cEmail;
                                req.session.name = found.name;
                                //console.log(req.session);
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
    const uname=req.session.userName;
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
    req.session.capacity = capacity;
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
        req.session.checkIn= d1;    
        req.session.checkOut= d2;
        var result = []

        Room.find({'capacity': capacity}, 'roomNo price rating capacity orderDetails', function (err, searchResult) {
            if (err)
                return handleError(err);
            else {
                //console.log(searchResult);
                for (var i = 0; i < searchResult.length; i++) {
                    var count = 0;
                    for (var j = 0; j < searchResult[i].orderDetails.length; j++) 
                        if (((d1 < searchResult[i].orderDetails[j].checkIn.toISOString() && d2 < searchResult[i].orderDetails[j].checkIn.toISOString()) || (d1 > searchResult[i].orderDetails[j].checkOut.toISOString() && d2 > searchResult[i].orderDetails[j].checkOut.toISOString()))) {count += 1;}
                    
                    if (count === searchResult[i].orderDetails.length)
                        result.push({roomNo: searchResult[i].roomNo, price: searchResult[i].price, rating: searchResult[i].rating, capacity: searchResult[i].capacity});
                    }}
                    req.session.searchResult = result;
                    res.redirect('/search');
        })
    }
})

app.get('/search', (req, res) => {
    var def =req.session.searchResult;
    res.render('search', {result: def});
})

app.post('/search', (req, res)=>{
    const roomNum = req.body.roomNo;
    req.session.roomNo = roomNum;
    res.redirect('/bill');
})

app.get('/bill', (req, res)=>{
    const un=req.session.userName;
    const rn=req.session.roomNo;
    var amt=0;
    for (var i=0; i<req.session.searchResult.length; i++)
    {
            if (req.session.searchResult[i].roomNo === parseInt(req.session.roomNo))
            {
                
                amt=req.session.searchResult[i].price;
            }
    }
    req.session.amount=amt;
    console.log(req.session);
    res.render('bill', {name: req.session.name, uName: req.session.userName, rn: req.session.roomNo, guestCount: req.session.capacity, price: amt, cin: new Date(req.session.checkIn), cout: new Date(req.session.checkOut)});
})

app.get('/success', (req, res) => {
    var orderD = {customerId: req.session.userName, checkIn: new Date(req.session.checkIn), checkOut: new Date(req.session.checkOut)};

    Room.updateOne( {roomNo: req.session.roomNo}, {$push: {orderDetails: orderD}}, function (err, found) {
        if (err) {
            console.log("error occured in room");
        } else {
            console.log("success for rooms");
        }
    })

    var custD = {roomNo: req.session.roomNo, price: req.session.amount, checkIn: new Date(req.session.checkIn), checkOut: new Date(req.session.checkOut), dateOfBook: new Date()};

    Customer.updateOne( {email: req.session.userName}, {$push: {orderDetails: custD}}, function (err, found) {
        if (err) {
            console.log("error occured in customer");
        } else {
            console.log("success for customer");
        }
    })

    res.render('success');
})

app.get('/failure', (req, res) => {
    res.render('failure');
})

app.post("/pay", (req, res) => {
    let txtprice = req.session.amount.toString();


    const create_payment_json = {
        intent: "sale",
        payer: {
            payment_method: "paypal",
        },
        redirect_urls: {
            return_url: "http://localhost:3000/success",
            cancel_url: "http://localhost:3000/cancel",
        },
        transactions: [{
            item_list: {
                items: [{
                    name: "Red Sox Hat",
                    sku: "001",
                    price: txtprice,
                    currency: "USD",
                    quantity: 1,
                }, ],
            },
            amount: {
                currency: "USD",
                total: txtprice,
            },
            description: "",
        }, ],
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === "approval_url") {
                    res.redirect(payment.links[i].href);
                }
            }
        }
    });
});

app.get("/success", (req, res) => {
    let txtprice = req.session.amount.toString();

    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
        payer_id: payerId,
        transactions: [{
            amount: {
                currency: "USD",
                total: txtprice,
            },
        }, ],
    };

    paypal.payment.execute(paymentId, execute_payment_json, function (
        error,
        payment
    ) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            res.redirect("/success");
        }
    });
});

app.get('/orders', (req, res)=> {
    var bookDetails= [];
    console.log(req.session);
    Customer.findOne({email: req.session.userName}, 'name orderDetails', function (err, found) {
        if (!err)
        {
            if (found)
            {
                console.log(found);
                for (var i=found.orderDetails.length-1; i>=0; i--)
                {
                    bookDetails.push({name: found.name, roomNo: found.orderDetails[i].roomNo, price: found.orderDetails[i].price, checkIn: found.orderDetails[i].checkIn.toISOString(), checkOut: found.orderDetails[i].checkOut.toISOString(), dateOfBook: found.orderDetails[i].dateOfBook.toISOString()});
                }
                console.log(bookDetails);
                res.render('orders', {abc: bookDetails});     
            }
        }
    });
    
})

app.get("/cancel", (req, res) => res.redirect("/failure"));

app.listen(process.env.PORT || 3000);