import express from "express";
import { deleteProduct, getAdminProducts, getAllCategories, getAllProducts, getLatestProducts, getSingleProduct, newProduct, updateProduct } from "../controllers/product.js";
import { adminOnly } from "../middleware/auth.js";
import { singleUpload } from "../middleware/multer.js";


const app = express.Router();

//ROUTE -> /api/v1/product/new
app.post("/new",adminOnly, singleUpload, newProduct);

//ROUTE => /api/v1/product/latest
app.get("/latest", getLatestProducts)

app.get("/all", getAllProducts)

//Route => /api/v1/product/categories
app.get("/categories", getAllCategories)

//Route => /api/v1/product/admin-products
app.get("/admin-products", adminOnly, getAdminProducts)

app.route("/:id")
.get(getSingleProduct)
.put(singleUpload, updateProduct)
.delete(adminOnly, deleteProduct)

export default app;
