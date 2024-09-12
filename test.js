const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const passport = require('passport')
const ejs = require('ejs')
const session = require('express-session')
const passportLocalMongoose = require('passport-local-mongoose')
const multer = require('multer')
const nodemailer = require('nodemailer')
const Mailgen = require('mailgen')
const app = express()
const { userSchema, doctorSchema,  appointmentSchema ,bedsSchema} = require('./schema');
const port = 3000



app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())
app.use(
  session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false
  })
)
app.use(passport.initialize())
app.use(passport.session())
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

// Redirecting to home page
app.get('/', (req, res) => {
  res.render('home.ejs')
})

app.get('/signIn', (req, res) => {
  res.render('register.ejs')
})
app.get('/logIn', (req, res) => {
  res.render('login.ejs')
})

mongoose
  .connect('mongodb://localhost:27017/hospitalDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch(err => {
    console.log('Error connecting to MongoDB:', err)
  })

userSchema.plugin(passportLocalMongoose)

const user = new mongoose.model('user', userSchema)
const doctor = new mongoose.model('doctors', doctorSchema)
const appointment = new mongoose.model('appointments',  appointmentSchema)
const Bed=new mongoose.model("bed",bedsSchema)

passport.use(user.createStrategy())
passport.serializeUser(user.serializeUser())
passport.deserializeUser(user.deserializeUser())

app.post('/register', async (req, res) => {
    const newUser = new user({
    username: req.body.username,
    password: req.body.password,
    role: req.body.role,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone
  })

  try {
    await newUser.save()
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
            <p>Your App Team</p>`
        }
    await transporter.sendMail(message)
    console.log('Email sent successfully')
    res.render('admin.ejs')
  } catch (err) {
    console.log(err)
    res.status(500).send('Error occurred while registering the user.')
  }
})

app.get('/check', async (req, res) => {
  try {
    const collection = await doctor.find()
    console.log(collection)
    res.render('doctors.ejs', { doctorsList: collection })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post('/login', async (req, res) => {
    const username = req.body.username
    const pwd = req.body.password

  // Setup nodemailer transporter (assuming Gmail)
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
            <p>Your App Team</p>`
        }
    try {
    // Send email
    await transporter.sendMail(message)
    console.log('Email sent successfully')

    // Find user in the database
    const u = await user.findOne({ username: username })
    if (u) {
    const result = req.body.password === u.password
    if (result) {
        res.render('admin.ejs')
    } else {
        res.status(400).json({ error: "Password doesn't match" })
    }
    } else {
    res.status(400).json({ error: "User doesn't match" })
    }
} catch (err) {
    // Log any error in sending the email
    console.error('Error sending email:', err)
    res.status(500).json({ error: 'Failed to send email or login error' })
}
})

app.post('/bookAppointmentM', async (req, res) => {
if (req.isAuthenticated()) {
    const patientId = req.user._id
    const { doctorId } = req.body
    try {
    const apt = new appointment({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        patientId: patientId,
        appointmentTime: '10:00AM-01:00PM',
        status: 'Scheduled'
    })
        await apt.save()
        const collection = await doctor.find()
        res.render('doctors.ejs', { doctorsList: collection })
    } catch (error) {
    console.log(error)
    res.status(500).send('Error booking appointment')
    }
    }
})

app.post('/bedsBook',async(req,res)=>
{
  const hospitalName=req.hospitalName
  const ward=req.ward
  const totalBeds=req.totalBeds
  const availableBeds=req.availableBeds
  const beds=new Bed(
    {
      hospital:hospitalName,
      ward:ward,
      totalBeds:totalBeds,
      availableBeds:req.availableBeds
    }
  )
  await beds.save();
})


app.post('/bookAppointmentA', async (req, res) => {
    if (req.isAuthenticated()) {
    const patientId = req.user._id
    const { doctorId } = req.body
    try {
        const apt = new appointment({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        patientId: patientId,
        appointmentTime: '02:00PM-06:00PM',
        status: 'Scheduled'
    })
    await apt.save()
    const collection = await doctor.find()
    res.render('doctors.ejs', { doctorsList: collection })
    } catch (error) {
    console.log(error)
    res.status(500).send('Error booking appointment')
    }
    }
})

app.listen(port, () => {
    console.log('Port running at ' + port)
})