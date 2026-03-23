export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI,
  zoom: {
    apiKey: process.env.ZOOM_API_KEY,
    apiSecret: process.env.ZOOM_API_SECRET,
  },
  google: {
    apiKey: process.env.GOOGLE_CALENDAR_API_KEY,
  },
});
