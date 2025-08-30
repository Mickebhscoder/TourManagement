// seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

// Correct imports with proper file names
import User from "./lib/db/schema/user.js";
import FlightItinerary from "./lib/db/schema/flightItineraries.js";
import Hotel from "./lib/db/schema/hotels.js";

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/golobe";

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully.");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

async function seedFlights() {
  // Example flight data
  const flight = new FlightItinerary({
    flightCode: "GL123",
    date: new Date(),
    carrierInCharge: "AirlineExample",
    departureAirportId: "AirportA",
    arrivalAirportId: "AirportB",
    segmentIds: [], // Add segment ObjectIds if you have segments
    totalDurationMinutes: 120,
    baggageAllowance: {},
    status: "scheduled",
    expireAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  });

  await flight.save();
  console.log("Flight seeded:", flight.flightCode);
  return flight;
}

async function seedHotels() {
  const hotel = new Hotel({
    slug: "hotel-example",
    name: "Golobe Hotel Example",
    description: "A sample hotel for seeding.",
    category: "Luxury",
    parkingIncluded: true,
    totalRooms: 50,
    rooms: [], // Add room ObjectIds if you have rooms
    amenities: ["WiFi", "Pool", "Breakfast"],
    features: ["Ocean View"],
    images: [],
    status: "Opened",
    policies: {
      checkIn: "14:00",
      checkOut: "12:00",
      cancellationPolicy: { cancellable: true, cancellableUntil: { unit: "days", value: 1 } },
      refundPolicy: { refundable: true, refundFee: 0 },
      childrenPolicy: { allowed: true, freeStayUnderAge: 5 },
      petPolicy: { allowed: false, petFee: null },
      smokingPolicy: { allowed: false, designatedAreasOnly: true },
      paymentPolicy: { creditCards: true, cash: true },
    },
  });

  await hotel.save();
  console.log("Hotel seeded:", hotel.name);
  return hotel;
}

async function seedUsers(flight, hotel) {
  const user = new User({
    firstName: "John",
    lastName: "Doe",
    email: "johndoe@example.com",
    emails: [{ email: "johndoe@example.com", primary: true }],
    profileImage: "https://via.placeholder.com/150",
    phoneNumbers: [{ number: "1234567890", dialCode: "+1", primary: true }],
    flights: {
      bookings: [flight._id],
      bookmarked: [{ flightId: flight._id, searchState: {} }],
      passengerDetails: [],
      searchHistory: [],
    },
    hotels: {
      bookings: [hotel._id],
      bookmarked: [hotel._id],
      searchHistory: [],
    },
    rewardPoints: { totalPoints: 100 },
  });

  await user.save();
  console.log("User seeded:", user.firstName, user.lastName);
  return user;
}

async function seedAll() {
  await connectDB();

  // Optional: clear previous data
  await User.deleteMany({});
  await FlightItinerary.deleteMany({});
  await Hotel.deleteMany({});

  const flight = await seedFlights();
  const hotel = await seedHotels();
  await seedUsers(flight, hotel);

  console.log("Seeding completed!");
  mongoose.disconnect();
}

seedAll().catch((err) => {
  console.error("Seeding error:", err);
  mongoose.disconnect();
});
