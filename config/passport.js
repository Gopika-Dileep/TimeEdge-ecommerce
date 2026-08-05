
const passport = require("passport");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const User = require("../models/userSchema");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      passReqToCallback   : true
    },
    async (req,accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
          }
          return done(null, user);
        } else {
          const email = profile.emails && profile.emails[0] && profile.emails[0].value;
          if (email) {
            let existingUser = await User.findOne({ email: email });
            if (existingUser) {
              existingUser.googleId = profile.id;
              existingUser.isVerified = true;
              if (!existingUser.name) {
                existingUser.name = profile.displayName;
              }
              await existingUser.save();
              return done(null, existingUser);
            }
          }
          user = new User({
            name: profile.displayName,
            email: email,
            googleId: profile.id,
            isVerified: true,
          });
          await user.save();
          return done(null, user);
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

module.exports = passport;
