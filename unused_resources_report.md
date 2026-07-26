# Project Cleanup and Unused Resources Report

A comprehensive static analysis of the codebase has been completed to identify unused pages, obsolete controller functions, redundant routes, and unused package dependencies. Below is the detailed breakdown of the findings.

---

## 1. Unused Views (EJS & HTML Pages)

These files exist under the `views/` directory but are either never rendered/served by Express or have been replaced by newer versions.

| File Path | Description / Context |
| :--- | :--- |
| [404.html](file:///c:/Users/Hi/Desktop/TimeEdge/views/404.html) | **Never Served.** There is no route or middleware in [app.js](file:///c:/Users/Hi/Desktop/TimeEdge/app.js) to catch unmatched routes and serve/render this page. Express defaults to sending `"Cannot GET ..."` text instead. |
| [admin/productdetail.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/admin/productdetail.ejs) | **Legacy / Dead.** The entire file is commented out using `<!-- ... -->`. Its content is actually about **Order Details**, not product details, and it is never referenced or rendered. |
| [user/change-password-otp.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/user/change-password-otp.ejs) | **Obsolete.** Part of the old password-reset flow. Only referenced by `changePasswordValid` in [profileController.js](file:///c:/Users/Hi/Desktop/TimeEdge/controller/user/profileController.js), which itself is unused. |
| [user/change-password.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/user/change-password.ejs) | **Obsolete.** Replaced by [newchangepassword.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/user/newchangepassword.ejs). Only referenced by the unused `changePasswordValid` controller function. |
| [user/ordercancel.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/user/ordercancel.ejs) | **Unused.** The active order cancellation endpoint (`POST /orders/:itemId/cancel-item`) returns a JSON response: `res.status(200).json({ success: true, ... })` rather than rendering an EJS page. |
| [user/profile.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/user/profile.ejs) | **Legacy.** This is a skeleton shell with sidebar navigation but has no content in the `.main-content` div. Active profile routes directly render dedicated sub-views like `userprofile.ejs`, `useraddress.ejs`, `userwallet.ejs` etc. |
| [user/wallet.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/user/wallet.ejs) | **Obsolete.** Replaced by [userwallet.ejs](file:///c:/Users/Hi/Desktop/TimeEdge/views/user/userwallet.ejs), which integrates the wallet transaction table directly into the standard profile dashboard sidebar. |

---

## 2. Unused Controller Functions

The following functions are defined and exported in the controller files but are not bound to any active routes in [userRouter.js](file:///c:/Users/Hi/Desktop/TimeEdge/router/userRouter.js) or [adminRouter.js](file:///c:/Users/Hi/Desktop/TimeEdge/router/adminRouter.js).

### User Controllers
- **`loadshop`** in [productController.js](file:///c:/Users/Hi/Desktop/TimeEdge/controller/user/productController.js):
  Replaced by the newer **`shopProducts`** function, which adds support for advanced filtering (price, category, brand), keyword search, sorting, and pagination.
- **`changePasswordValid`** in [profileController.js](file:///c:/Users/Hi/Desktop/TimeEdge/controller/user/profileController.js):
  Part of the older password-change logic. Unreferenced by any route.
- **`verifychangePasswordOtp`** in [profileController.js](file:///c:/Users/Hi/Desktop/TimeEdge/controller/user/profileController.js):
  Part of the older password OTP validation logic. Unreferenced by any route.

### Admin Controllers
- **`editproduct`** in [productController.js](file:///c:/Users/Hi/Desktop/TimeEdge/controller/admin/productController.js):
  An older update function which contains an image-loop bug (`i < req.files` instead of `i < req.files.length`). Replaced by the newer **`updateproduct`** function.

---

## 3. Redundant / Shadowed Routes

In [adminRouter.js](file:///c:/Users/Hi/Desktop/TimeEdge/router/adminRouter.js#L34-L35), we have a duplicate route declaration:

```javascript
34: router.post("/editProduct/:id",adminAuth,upload.array("images",4),productController.updateproduct);
35: router.post("/editProduct/:id",adminAuth,upload.array("images",4),productController.editproduct);
```

> [!WARNING]
> Because Express route resolution matches routes sequentially and ends execution on the first handler that sends a response, `productController.updateproduct` (line 34) shadows `productController.editproduct` (line 35). The route on line 35 is dead and never reached.

---

## 4. Unused NPM Dependencies (`package.json`)

The following packages are declared in the `dependencies` block of [package.json](file:///c:/Users/Hi/Desktop/TimeEdge/package.json) but are never imported via `require()` anywhere in the codebase:

- **`express-ejs-layouts`**: Unreferenced. The application structures layouts directly inside each template.
- **`nocache`**: Caching prevention is handled manually in [app.js](file:///c:/Users/Hi/Desktop/TimeEdge/app.js) via custom headers middleware, making this package redundant.
- **`jspdf-autotable`**: Unused. PDF generation (such as sales reports) is handled via `pdfkit`.
- **`sharp`**: Unused. No image resizing or processing operations utilize this package in the current code (uploads are handled purely via `multer` disk storage).

> [!NOTE]
> `ejs` is listed as unused by static import checkers because it is not explicitly imported via `require()`. However, EJS is required by Express internally as the view engine (`app.set("view engine", "ejs")`), so it must **not** be removed.

---

## 5. ⚠️ Critical Bug Discovered (Missing View)

During the analysis, a potential server crash risk was identified:

In [productController.js (Admin)](file:///c:/Users/Hi/Desktop/TimeEdge/controller/admin/productController.js#L124-L132):
```javascript
    } catch (error) {
        console.error('Product Add Error:', error);
        
        return res.status(500).render('error', {
            message: "Error while adding product",
            error: error.message
        });
    }
```

> [!IMPORTANT]
> If an error occurs during adding a product, Express attempts to render a view named `'error'`. However, **no `error.ejs` or `error.html` template exists** in the views directory. If this catch block is triggered, Express will throw a `Failed to lookup view "error"` error and crash or display a generic stack trace to the user.
