const express = require("express")
const session = require("express-session")
const app = express()
const path = require("path")
const dotenv = require("dotenv");
const passport = require('./config/passport');
const userRouter = require("./router/userRouter")
const adminRouter = require("./router/adminRouter")

const dbconnect = require("./config/db")
dotenv.config()
dbconnect()

const PORT = process.env.PORT

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}))

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Expires', '0');
    res.setHeader('Pragma', 'no-cache');
    next();
});
 
app.use(passport.initialize());
app.use(passport.session())


app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname, "public")));
            

app.use(async (req, res, next) => {
    try {
        if (req.session && req.session.user) {
            const Cart = require('./models/cartSchema');
            const cart = await Cart.findOne({ user: req.session.user });
            res.locals.cartCount = cart ? cart.items.length : 0;
        } else {
            res.locals.cartCount = 0;
        }
    } catch (err) {
        console.error("Error setting cartCount middleware:", err);
        res.locals.cartCount = 0;
    }
    next();
});

app.use("/",userRouter)
app.use("/admin",adminRouter)


app.get('/check-auth', (req, res) => {
    res.json({ isLoggedIn: !!req.session.user });
});

app.listen(PORT,()=>{
    console.log(`server is running ${PORT}` );
})