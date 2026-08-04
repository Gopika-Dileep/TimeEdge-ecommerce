const STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

const MESSAGES = {
    SERVER_ERROR: "An unexpected database or server error occurred. Please try again later.",
    INTERNAL_SERVER_ERROR: "Internal Server Error occurred. Please contact system support.",
    UNAUTHORIZED: "Unauthorized access. Please log in to your account.",
    NOT_FOUND: "The requested resource could not be found.",
    
    // Admin General Messages
    ADMIN: {
        LOAD_LOGIN_ERROR: "Unable to load the administrator login page.",
        EMAIL_PASSWORD_REQUIRED: "Email and password are required fields.",
        INVALID_ADMIN_CREDENTIALS: "The email entered is incorrect, or you do not have administrator privileges.",
        INCORRECT_PASSWORD: "The password entered is incorrect.",
        LOGIN_ERROR: "An error occurred during administrator login.",
        DASHBOARD_LOAD_ERROR: "Could not retrieve dashboard statistics.",
        USERS_LOAD_ERROR: "Failed to load the list of registered users.",
        INVALID_USER_ID: "The provided User ID is invalid or empty.",
        USER_BLOCKED_SUCCESS: "The user account has been successfully blocked.",
        USER_BLOCK_ERROR: "An error occurred while attempting to block this user account.",
        USER_UNBLOCKED_SUCCESS: "The user account has been successfully unblocked.",
        USER_UNBLOCK_ERROR: "An error occurred while attempting to unblock this user account.",
        CATEGORY_LOAD_ERROR: "Unable to retrieve the list of product categories.",
        CATEGORY_EXISTS: "A category with this name is already registered.",
        CATEGORY_ADD_SUCCESS: "Product category added successfully.",
        CATEGORY_ADD_ERROR: "Could not save the new product category.",
        CATEGORY_EDIT_LOAD_ERROR: "Failed to load the category editor page.",
        CATEGORY_NOT_FOUND: "The requested category could not be located.",
        CATEGORY_UPDATE_SUCCESS: "Category details updated successfully.",
        CATEGORY_EDIT_ERROR: "An unexpected error occurred while modifying category details.",
        BRAND_LOAD_ERROR: "Failed to retrieve the product brand directory.",
        BRAND_EXISTS: "A brand with this name is already registered.",
        BRAND_ADD_ERROR: "Could not save the brand registration details.",
        BRAND_LIST_ERROR: "Failed to list the brand.",
        BRAND_UNLIST_ERROR: "Failed to unlist the brand.",
        ORDERS_LOAD_ERROR: "Unable to retrieve order history details.",
        ORDER_NOT_FOUND: "The requested order could not be found.",
        ORDER_DETAILS_ERROR: "Could not retrieve details for this order.",
        ITEM_NOT_FOUND: "The requested item within the order could not be located.",
        ITEM_NOT_IN_RETURN_STATUS: "Only items with an active 'Return request' status can be processed.",
        ORDER_UPDATE_ERROR: "Failed to update order status.",
        RETURN_DAYS_EXCEEDED: "You cannot return an item after 10 days of delivery.",
        PRODUCT_NOT_FOUND: "The requested product details could not be found.",
        RETURN_APPROVE_ERROR: "Failed to approve return request.",
        RETURN_APPROVE_SUCCESS: "Return request approved successfully.",
        RETURN_DECLINE_ERROR: "Failed to decline return request.",
        RETURN_DECLINE_SUCCESS: "Return request declined successfully.",
        LOGOUT_ERROR: "An error occurred while terminating your session.",
        CANCEL_REASON_REQUIRED: "Cancellation reason is required.",
        CATEGORY_NAME_REQUIRED: "Category name is required and cannot be empty.",
        CATEGORY_DESC_REQUIRED: "Category description is required and cannot be empty.",
        CATEGORY_NAME_INVALID: "Category name must only contain alphanumeric characters and spaces.",
        CATEGORY_NAME_LENGTH: "Category name must be between 3 and 30 characters long.",
        CATEGORY_DESC_LENGTH: "Category description must be between 5 and 150 characters long."
    },
    
    // User Auth Messages
    USER_AUTH: {
        LOGIN_PAGE_ERROR: "Unable to load the login page. Please try again.",
        GENERIC_ERROR: "An error occurred during authentication processing.",
        SIGNUP_PAGE_ERROR: "Unable to load the signup registration page.",
        INVALID_USERNAME: "Username must be at least 3 characters in length.",
        INVALID_EMAIL: "Please enter a valid email address.",
        INVALID_PHONE: "Please enter a valid mobile phone number.",
        WEAK_PASSWORD: "Password must include uppercase, lowercase, numbers, and special characters.",
        DUPLICATE_EMAIL: "An account with this email address already exists.",
        EMAIL_SEND_FAILED: "The system failed to send the verification email. Please check your address.",
        CREATE_USER_ERROR: "An error occurred while creating your user account.",
        OTP_PAGE_ERROR: "Unable to load the OTP verification page.",
        USER_NOT_FOUND: "Your user account could not be found.",
        OTP_EXPIRED: "The verification OTP has expired. Please request a new one.",
        OTP_INVALID: "The verification OTP entered is incorrect.",
        VERIFY_SUCCESS: "OTP verification was successful. Account created.",
        OTP_VERIFY_ERROR: "An error occurred while verifying the OTP.",
        OTP_RESEND_WAIT: (waitSecs) => `Please wait ${waitSecs} seconds before requesting another OTP.`,
        OTP_SEND_FAILED: "Failed to send the OTP code. Please request a resend.",
        OTP_SEND_SUCCESS: "Verification OTP code has been sent successfully.",
        OTP_SEND_ERROR: "Could not deliver the verification OTP code.",
        UNVERIFIED_EMAIL: "Please verify your email address before attempting to log in.",
        USER_BLOCKED: "Your account has been temporarily blocked by the administrator.",
        INCORRECT_PASSWORD: "The password entered is incorrect.",
        HOME_PAGE_ERROR: "An error occurred while loading the main landing page."
    },
    
    // User Wishlist Messages
    USER_WISHLIST: {
        EMPTY: "Your wishlist is currently empty.",
        PRODUCT_NOT_FOUND: "The requested product could not be found.",
        ADDED: "Product has been successfully added to your wishlist.",
        REMOVED: "Product has been successfully removed from your wishlist.",
        NOT_FOUND: "Your wishlist could not be located in the database."
    },
    
    // User Cart Messages
    USER_CART: {
        MAX_QTY: "Maximum quantity limit per product reached.",
        EXCEEDS_STOCK: "The requested quantity exceeds the current stock limit.",
        PRODUCT_NOT_FOUND: "Product could not be located.",
        CART_NOT_FOUND: "Your shopping cart could not be found.",
        EMPTY: "Your cart is empty.",
        ITEM_REMOVED: "Item has been successfully removed from your cart.",
        ITEM_NOT_FOUND: "The specified item could not be found in your cart.",
        OUT_OF_STOCK: "The selected product is currently out of stock.",
        QTY_INCREMENTED: "Cart item quantity has been incremented.",
        MIN_QTY_REACHED: "You have reached the minimum required quantity for this product.",
        QTY_EXCEEDED: "The requested quantity exceeds limits.",
        QTY_DECREMENTED: "Cart item quantity has been decremented.",
        USER_ID_REQUIRED: "User identifier is required to access the cart.",
        ADDED_TO_CART: "Product has been successfully added to your cart."
    },
    
    // User Order Messages
    USER_ORDER: {
        CART_EMPTY: "Your cart is empty. Cannot place an order.",
        OUT_OF_STOCK: "Some products in your cart are currently out of stock.",
        SUCCESS: "Order placed successfully.",
        FAILED: "Failed to place the order.",
        NOT_FOUND: "Order details could not be found.",
        CANCEL_SUCCESS: "Order canceled successfully.",
        CANCEL_ERROR: "An error occurred while canceling the order.",
        RETURN_REQUESTED: "Return request submitted successfully.",
        PRODUCT_OUT_OF_STOCK: (prodName) => `${prodName} is out of stock. Please remove it from your cart.`,
        COD_LIMIT_EXCEEDED: "Cash on Delivery is not available for orders above ₹2,000. Please select an online payment option.",
        PRODUCT_NOT_FOUND: "The requested product could not be located in this order.",
        RETURN_DELIVERED_ONLY: "Only items that have been successfully delivered can be returned.",
        RETURN_SUCCESS: "Order item return request has been submitted successfully.",
        NO_DELIVERED_ITEMS: "There are no delivered items in this order to return.",
        INVOICE_ERROR: "An error occurred while generating the PDF invoice."
    },
    
    // User Profile Messages
    USER_PROFILE: {
        SESSION_EXPIRED: "Session expired. Please restart the process again.",
        EMAIL_UPDATED: "Email updated successfully!",
        INVALID_OTP: "Invalid OTP code. Please try again.",
        PASSWORD_MISMATCH: "Current password does not match.",
        CONFIRM_PASSWORD_MISMATCH: "Confirm password does not match.",
        EMAIL_SEND_ERROR: "Error while sending verification mail.",
        OTP_MISMATCH: "OTP code entered does not match.",
        OTP_RESENT: "Verification OTP has been resent successfully.",
        OTP_SEND_ERROR: "Failed to send verification OTP code.",
        PASSWORDS_DO_NOT_MATCH: "New passwords entered do not match.",
        ADDRESS_ADDED: "Address added successfully.",
        ADDRESS_UPDATED: "Address updated successfully.",
        ADDRESS_DELETED: "Address deleted successfully.",
        INSUFFICIENT_FUNDS: "Insufficient wallet balance.",
        EMAIL_REQUIRED: "Please enter a valid email address.",
        SAME_EMAIL: "The email address entered is already your current address.",
        EMAIL_TAKEN: "This email address is already registered to another account.",
        OTP_SENT_NEW: "Verification OTP has been sent to your new email address.",
        EMAIL_SENT: "A password reset code has been sent to your registered email address."
    },

    // Admin Coupon Messages
    ADMIN_COUPON: {
        COUPON_ALPHANUMERIC: "Coupon code must contain alphanumeric characters only (letters and numbers)",
        EXPIRY_PAST: "Expiry date cannot be in the past",
        USAGE_LIMIT_MIN: "Usage limit must be at least 1",
        DISCOUNT_LIMIT: "Discount amount must be less than the minimum purchase amount",
        DUPLICATE_COUPON: "A coupon with this code already exists",
        NOT_FOUND: "The specified coupon could not be found",
        UPDATE_SUCCESS: "Coupon details updated successfully",
        DISCOUNT_MIN: "Discount amount must be greater than 0",
        MIN_PURCHASE_LIMIT: "Minimum purchase amount must be at least 0"
    },
    
    // User Coupon Messages
    USER_COUPON: {
        ENTER_CODE: "Please enter a coupon code",
        INVALID_CODE: "Invalid coupon code. Please check for spelling mistakes",
        ALREADY_USED: "You have already applied this coupon to a previous order",
        LIMIT_EXCEEDED: "This coupon has reached its maximum usage limit",
        EXPIRED: "This coupon is no longer valid as its expiry date has passed",
        MIN_PURCHASE: (minPrice) => `Minimum purchase of ₹${minPrice} is required to use this coupon`
    },
    
    // Admin Product Messages
    ADMIN_PRODUCT: {
        LOAD_ERROR: "Could not retrieve the product directory from the database.",
        LOAD_ADD_PRODUCT_ERROR: "Unable to load the add product interface page.",
        PRODUCT_EXISTS: "A product with this name already exists in the database.",
        PRODUCT_EXISTS_OTHER: "Product name is already taken by another product. Please choose a different name.",
        INVALID_CATEGORY: "The selected category name is invalid or does not exist.",
        ADD_PRODUCT_ERROR: "An error occurred while attempting to save the new product details.",
        PRODUCT_NOT_FOUND: "The requested product could not be located.",
        IMAGE_NOT_FOUND: "The selected image is not associated with this product.",
        IMAGE_DELETE_SUCCESS: "Product image has been deleted successfully.",
        IMAGE_DELETE_FAILED: "The system was unable to delete the physical image file from storage.",
        INVALID_PERCENT: "Product offer percentage must be a valid number between 0 and 99"
    },
    
    // User Referral Messages
    USER_REFERRAL: {
        LOGIN_REQUIRED: "Please log in to your account first",
        PROVIDE_CODE: "Please enter a valid referral code",
        USER_NOT_FOUND: "Your user account could not be found",
        ALREADY_APPLIED: "You have already applied a referral code to your account",
        TIME_EXCEEDED: "Referral codes can only be applied within the first 3 days after registration",
        OWN_CODE: "You cannot use your own referral code",
        INVALID_CODE: "The referral code entered is invalid or does not exist",
        MUTUAL_NOT_ALLOWED: "Mutual referrals are not allowed (this friend was referred by you)",
        SUCCESS_APPLY: "Referral code applied successfully. Bonus has been credited."
    }
};

module.exports = {
    STATUS_CODES,
    MESSAGES
};
