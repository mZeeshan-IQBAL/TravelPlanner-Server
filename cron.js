const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Trip = require('./models/Trip');
const User = require('./models/User');

function init(app) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    console.warn('Notifications disabled: missing SMTP configuration');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // Run every day at 08:00 server time
  cron.schedule('0 8 * * *', async () => {
    try {
      const daysAhead = parseInt(process.env.NOTIFY_DAYS_AHEAD || '2', 10);
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + daysAhead);

      const trips = await Trip.find({ 'plannedDates.startDate': { $gte: from, $lte: to } }).select('title plannedDates user');
      for (const trip of trips) {
        const user = await User.findById(trip.user).select('email username');
        if (!user?.email) continue;
        const start = new Date(trip.plannedDates.startDate);
        const msg = {
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: `Upcoming trip: ${trip.title}`,
          text: `Hi ${user.username || ''},\n\nYour trip "${trip.title}" starts on ${start.toDateString()}.\nHave a great journey!\n\n— Travel Planner`,
        };
        await transporter.sendMail(msg);
      }
      console.log(`Notifications sent for ${trips.length} upcoming trip(s).`);
    } catch (e) {
      console.error('Notification job error:', e);
    }
  });
}

module.exports = { init };