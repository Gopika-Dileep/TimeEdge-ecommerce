const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");
const User = require("../../models/userSchema");
const crypto = require('crypto');

const getReferAndEarnPage = async (req, res) => {
    try {
      const userId = req.session.user;
      
      if (!userId) {
        return res.redirect('/login');
      }
      
      const user = await User.findById({ _id: userId });
      
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
        referralCount,
        appliedCode: user.referredBy
      });
      
    } catch (error) {
      console.error(error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};
  
const applyReferralCode = async (req, res) => {
    try {
      const userId = req.session.user;
      
      if (!userId) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: MESSAGES.USER_REFERRAL.LOGIN_REQUIRED });
      }
      
      const { code } = req.body;
      
      if (!code) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_REFERRAL.PROVIDE_CODE });
      }
      
      const user = await User.findById({ _id: userId });
      
      if (!user) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.USER_REFERRAL.USER_NOT_FOUND });
      }
      
      if (user.referredBy) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_REFERRAL.ALREADY_APPLIED });
      }
      
      const signupDate = new Date(user.createdAt);
      const diffInMs = new Date() - signupDate;
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      if (diffInMs > threeDaysInMs) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_REFERRAL.TIME_EXCEEDED });
      }
      
      if (user.referralCode === code) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_REFERRAL.OWN_CODE });
      }
      
      const referrer = await User.findOne({ referralCode: code });
      
      if (!referrer) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.USER_REFERRAL.INVALID_CODE });
      }

      if (referrer.referredBy === user.referralCode) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_REFERRAL.MUTUAL_NOT_ALLOWED });
      }
      
      user.referredBy = code;
      await user.save();
      
      return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.USER_REFERRAL.SUCCESS_APPLY });
      
    } catch (error) {
      console.error(error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};
  
module.exports = {
    getReferAndEarnPage,
    applyReferralCode
};