var express = require('express');
var app = express();
const session = require('express-session');
var bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const mySQLStore = require('express-mysql-session')(session);

dotenv.config();
var options = {
    host: process.env.DB_HOST,
    port: process.env.PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}

var sessionStore = new mySQLStore(options);
var sess={
    secret: process.env.SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie:{ 
        sameSite:'none'
    }
}
if(app.get('env')==='production'){
    app.set('trust proxy',1)
    sess.cookie.secure=true
}
app.use(session(sess))

app.use(cors(
    {
        origin: function (origin, callback) {
            return callback(null, true);
        },
        optionsSuccessStatus: 200,
        credentials: true
    }
))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var servicesRoutes = require('./routes/services');
var userRoutes = require('./routes/users');
var transactionRoutes = require('./routes/transactions');
var paymentsRoutes = require('./routes/payments');;
var workerRoutes = require('./routes/workers');

const port = process.env.PORT || 3000;



app.use('/services', servicesRoutes);
app.use('/users', userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/payments', paymentsRoutes);
app.use('/workers', workerRoutes);

app.get('/', (req, res) => {
    if (req.session.pageViews) {
        req.session.pageViews++;
        res.send('you visited this page ' + req.session.pageViews + 'times');

    } else {
        req.session.pageViews = 1;
        res.send("Welcome to this page for the first time!");
    }
})


app.listen(port, () => {
    console.log('server started @ ' + port);
})