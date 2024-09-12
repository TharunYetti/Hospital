import express from "express"
import bodyParser from "body-parser"
import mongoose from "mongoose"
import passport from "passport"
import session from "express-session"
import nodemailer from "nodemailer"
import Mailgen from "mailgen"
import path from "path"
import passportLocalMongoose from "passport-local-mongoose"
import { userSchema, doctorSchema, appointmentSchema, bedsSchema } from './schema.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
const port = 3000

app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("./public"))
app.use(session({
    secret:"Our little secret.",
    resave:false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//redirecting to home page
app.get("/",(req,res)=>{
    res.render("home.ejs")
})

app.get("/signIn",(req,res)=>{
    res.render("register.ejs")
})
app.get("/logIn",(req,res)=>{
    res.render("login.ejs")
})

mongoose.connect("mongodb://localhost:27017/hospitalDB")
.then(()=>{
    console.log("Connected to MongoDB");
}).catch(err=>{
    console.log("Error connecting to MongoDB:",err);
})
//mongoose.set("useCreateIndex",true);
userSchema.plugin(passportLocalMongoose); //does salting & hasing along with session

const user = new mongoose.model("user",userSchema);
const doctor = new mongoose.model("doctors",doctorSchema);
const appointment = new mongoose.model("appointments",appointmentSchema);
const Bed=new mongoose.model("bed",bedsSchema)

passport.use(user.createStrategy());
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

let config = {
    service: 'gmail',
    auth: {
      user: 'nitturuthanisha@gmail.com',
      pass: 'omdw ucuh utrj nftv ' // Use environment variables to store sensitive data
    }
  }
  let transporter = nodemailer.createTransport(config)
  let MailGenerator = new Mailgen({
    theme: 'default',
    product: {
      name: 'Ninja crew',
      link: 'https://mailgen.js/'
    }
  })

async function sendAppointmentMail(patientId,date,time){
    const user1 = await user.findOne({_id:patientId});

    let tomorrow = new Date();
    tomorrow.setDate(date);
    let day = String(tomorrow.getDate()).padStart(2, '0'); // Ensure two digits
    let month = String(tomorrow.getMonth() + 1).padStart(2, '0'); // +1 is because Months are 0-based
    let year = tomorrow.getFullYear();

    let formattedDate = `${day}-${month}-${year}`;// Outputs: '09-09-2024'
    try {
        let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'nitturuthanisha@gmail.com', // Replace with your email
          pass: 'mqnc ipnl fini jrsw ' // Replace with your app-specific password or OAuth token
        }
        })
        let message = {
        from: 'nitturuthanisha@gmail.com', // Sender address
        to: user1.email, // Recipient
        subject: 'Successfully Booked Your Appointment',
        html: `<h1>Thank you for booking!</h1>
                <p>Dear ${user1.username},</p>
                <p>Congratulations! You have successfully booked the appointment.</p>
                <p>Your Appointment Details:</p>
                <ul>
                    <li>Date: ${formattedDate}</li>
                    <li>Time: ${time}</li>
                </ul>
                <p>Be on time and get well soon</p>
                <p>Best regards,</p>
                <p>Hybrid Hospital</p>`
            }
        await transporter.sendMail(message)
        console.log('Email sent successfully')
      } catch (err) {
        console.log(err)
      }
}

//redirecting to login page
app.post("/register",async (req,res)=>{
    user.register({username:req.body.username,
        role: req.body.role,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone
    }, req.body.password,function(err,user){
        if(err){
            console.log(err,"while registering");
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res, async function(){
                try {
                    let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                      user: 'nitturuthanisha@gmail.com', // Replace with your email
                      pass: 'mqnc ipnl fini jrsw ' // Replace with your app-specific password or OAuth token
                    }
                    })
                    let message = {
                    from: 'nitturuthanisha@gmail.com', // Sender address
                    to: req.body.email, // Recipient
                    subject: 'Sign in confirmation',
                    html: `<h1>Welcome to Your App!</h1>
                            <p>Dear ${req.body.username},</p>
                            <p>Congratulations! You have successfully signed in.</p>
                            <p>Your account details:</p>
                            <ul>
                                <li>Email: ${req.body.email}</li>
                                <li>Username: ${req.body.username}</li>
                            </ul>
                            <p>You can now log in and start exploring our features.</p>
                            <p>Best regards,</p>
                            <p>Hybrid Hospital</p>`
                        }
                    await transporter.sendMail(message)
                    console.log('Email sent successfully')
                    res.render('admin.ejs')
                  } catch (err) {
                    console.log(err)
                    res.status(500).send('Error occurred while registering the user.')
                  }
            });
        }
    });
})

app.get("/check", async (req,res)=>{
    if(req.isAuthenticated()){
        try{
            const collection = await doctor.find();
            //console.log(collection);
            res.render("doctors.ejs",{doctorsList : collection });
        }catch(error){
            res.status(500).json({ message: error.message });
        }
    }else{
        res.redirect("/login");
    }
})

app.post("/login",async (req,res)=>{
    const username = req.body.username
    const pwd = req.body.password
    console.log(`${username},${pwd}`);
    const user1 = await user.findOne({username:username});
    console.log(user1);
    req.login(user1,function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.render("admin.ejs");
            })
        }
    })
})

//for morning appointments
app.post("/bookAppointmentM",async (req,res)=>{
    if(req.isAuthenticated()){
        const patientId = req.user._id;
        const { doctorId } = req.body;  // Doctor ID comes from the form
        console.log(doctorId,patientId);
        try{
            const apt = new appointment({
                doctorId: new mongoose.Types.ObjectId(doctorId),
                patientId: patientId,
                appointmentTime: "10:00AM-01:00PM",
                status: "Scheduled"
            })
            await apt.save();
            //sending mail for appointment confirmation
            sendAppointmentMail(patientId,new Date().getDate()+1,"10:00AM-01:00PM");
            try{
                const collection = await doctor.find();
                //console.log(collection);
                res.render("doctors.ejs",{doctorsList : collection });
            }catch(error){
                res.status(500).json({ message: error.message });
            }
        }catch(error){
            console.log(error);
            res.status(500).send('Error booking appointment');
        }
    }
});

//for afternoon appointments
app.post("/bookAppointmentA",async (req,res)=>{
    if(req.isAuthenticated()){
        const patientId = req.user._id;
        const { doctorId } = req.body;  // Doctor ID comes from the form
        console.log(doctorId,patientId);
        try{
            const apt = new appointment({
                doctorId: new mongoose.Types.ObjectId(doctorId),
                patientId: patientId,
                date: new Date().getDate()+1,
                appointmentTime: "02:00PM-06:00PM",
                status: "Scheduled"
            })
            await apt.save();
            //sending mail for appointment confirmation
            sendAppointmentMail(patientId,new Date().getDate()+1,"02:00PM-06:00PM");

            try{
                const collection = await doctor.find();
                //console.log(collection);
                res.render("doctors.ejs",{doctorsList : collection });
            }catch(error){
                res.status(500).json({ message: error.message });
            }
        }catch(error){
            console.log(error);
            res.status(500).send('Error booking appointment');
        }
    }
});

//for beds availabilty
app.post('/bedsBook',async(req,res)=>{
    const { hospitalName, ward, totalBeds, availableBeds } = req.body;
    try{
        const beds=new Bed({
            hospital:hospitalName,
            ward:ward,
            totalBeds:totalBeds,
            availableBeds:availableBeds
        })
        await beds.save();
        console.log("saved beds info");
        res.json({ success: true, message: 'Details added successfully' });
    } catch (error) {
        console.error('Error saving beds:', error);
        res.status(500).json({ success: false, message: 'Failed to add details' });
    }
})
app.get("/beds",async (req,res)=>{
    if(req.isAuthenticated()){
        const bedsInfo = await Bed.find();
        res.render("beds.ejs",{collection:bedsInfo});
    }else{
        res.render("home.ejs");
    }
});
// Update route (POST request)
app.post('/updateBeds', async (req, res) => {
    try {
        const { hospitalName, ward, availableBeds } = req.body;
        console.log({ hospitalName, ward, availableBeds });

        // Find the document based on hospital name and ward and update the availableBeds
        const result = await Bed.updateOne(
            { hospital: hospitalName, ward: ward },  // Filter to find the document
            { $set: { availableBeds: availableBeds } } // Update the availableBeds field
        );

        if (result.modifiedCount > 0) {
            res.json({ success: true, message: 'Beds updated successfully' });
        } else {
            res.json({ success: false, message: 'No records updated' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

//for patient profile page
app.get("/profile", async(req,res)=>{
    if(req.isAuthenticated()){
        const entry = await user.findOne({_id: req.user._id});
        console.log(entry);
        res.render("profile.ejs",{user:entry});
    }else{
        res.redirect("/login");
    }
});

//port info
app.listen(port,()=>{
    console.log("Service running at port "+port)
})