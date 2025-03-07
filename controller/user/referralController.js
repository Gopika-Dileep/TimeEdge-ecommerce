const User = require("../../models/userSchema");
const crypto = require('crypto');

const getReferAndEarnPage = async (req, res) => {
    try {
      const userId = req.session.user;
      
      if (!userId) {
        return res.redirect('/login');
      }
      
      const user = await User.findById({_id: userId});
      
      if (!user) {
        return res.redirect('/login');
      }
      
  
      if (!user.referralCode) {
        user.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        await user.save();
      }
      
     
      const referralCount = await User.countDocuments({ referredBy: user.referralCode });
      
      res.render('refer', {
        path: '/refer',
        user,
        referralCode: user.referralCode,
        referralCount
      });
      
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  const applyReferralCode = async (req, res) => {
    try {
      console.log("fghjkjhgfds")
      const userId = req.session.user;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Please login first' });
      }
      
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ success: false, message: 'Please provide a referral code' });
      }
      
      const user = await User.findById({_id: userId});
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      if (user.referredBy) {
        return res.status(400).json({ success: false, message: 'You have already applied a referral code' });
      }
      
      if (user.referralCode === code) {
        return res.status(400).json({ success: false, message: 'Cannot use your own referral code' });
      }
      
      const referrer = await User.findOne({ referralCode: code });
      
      if (!referrer) {
        return res.status(404).json({ success: false, message: 'Invalid referral code' });
      }
      
      user.referredBy = code;
      await user.save();
      
      return res.status(200).json({ success: true, message: 'Referral code applied successfully' });
      
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports = {
    getReferAndEarnPage,
    applyReferralCode
  };