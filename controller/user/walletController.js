// const Wallet = require('../../models/walletSchema')

// const showWalletHistory = async (req, res) => {
//     try {
//         const wallet = await Wallet.findOne({ userId: req.session.userd });
// console.log(wallet,'wallet')
//         res.render("users/walletHistory", {
//             wallet
//         });
//     } catch (error) {
//         console.error(error);
//         res.render("error", { message: "An error occurred." });
//     }
// };
// module.exports={
//     showWalletHistory
// }