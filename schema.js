import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  firstName: String,
  lastName: String,
  email: String,
  phone:String,
});


// Doctor Schema
const doctorSchema = new mongoose.Schema({
  doctorName: String,
  hospitalName: String,
  specialization: String,
  date: String,
  morning: Number,
  afternoon: Number
});


// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  doctorId: mongoose.Schema.Types.ObjectId,
  patientId: mongoose.Schema.Types.ObjectId,
  date: Date,
  appointmentTime: String,
  status: String
});

const bedsSchema = new mongoose.Schema({
  hospital: { type: String, required: true },
  ward: { type: String, required: true },
  totalBeds: { type: Number, required: true },
  availableBeds: { type: Number, required: true }
});

// Export all models
export { userSchema, doctorSchema, appointmentSchema, bedsSchema };