import { Request, Response, NextFunction } from "express";
import { TryCatch } from "../middleware/error.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { nodeCache } from "../app.js";
import { invalidateCache } from "../utils/feature.js";

// invalidates on new, update or delete product and on new order too
export const getLatestProducts = TryCatch(async (req, res, next) => {
    const key = "latest-products";
    let products;

    if (nodeCache.has(key)) {
        products = JSON.parse(nodeCache.get(key) as string)
    } else {
        products = await Product.find({}).sort({ createdAt: -1 }).limit(5)
        nodeCache.set(key, JSON.stringify(products));
    }

    return res.status(200).json({
        success: true,
        products
    })
})

// invalidates on new, update or delete product and on new order too
export const getAllCategories = TryCatch(async (req, res, next) => {
    const key = "categories";
    let categories;

    if(nodeCache.has(key)){
        categories = JSON.parse(nodeCache.get(key) as string);
    }else{
        categories = await Product.distinct("category");
        nodeCache.set(key, JSON.stringify(categories));
    }

    return res.status(200).json({
        success: true,
        categories
    })
});

// invalidates on new, update or delete product and on new order too
export const getAdminProducts = TryCatch(async (req, res, next) => {
    const key = "all-products"
    let products;

    if(nodeCache.has(key)){
        products = JSON.parse(nodeCache.get(key) as string);
    }else{
        products = await Product.find({});
        nodeCache.set(key, JSON.stringify(products))
    }
    return res.status(200).json({
        success: true,
        products
    })
});

// invalidates on new, update or delete product and on new order too
export const getSingleProduct = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const key = `product-${id}`
    let product;
    if(nodeCache.has(key)){
        product = JSON.parse(nodeCache.get(key) as string)
    }else{
        product = await Product.findById(id)
        if(!product) return next(new ErrorHandler("Product Not Found", 404))
        nodeCache.set(key, JSON.stringify(product))
    }
    

    return res.status(200).json({
        success: true,
        product
    })
});

export const newProduct = TryCatch(async (req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
    const { name, price, stock, category } = req.body;
    const photo = req.file;

    if (!photo) return next(new ErrorHandler("Please add Photo", 400));
    if (!name || !price || !stock || !category) {
        rm(photo.path, () => {
            console.log("Deleted");
        });
        return next(new ErrorHandler("Please add all field", 400));
    }

    await Product.create({
        name,
        price,
        stock,
        category: category.toLowerCase(),
        photo: photo.path
    })

    await invalidateCache({ product: true, admin: true});
    return res.status(201).json({
        success: true,
        message: "Product created Successfully"
    })
})

export const updateProduct = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const { name, price, stock, category } = req.body;
    const photo = req.file;

    const product = await Product.findById(id);

    if (!product) return next(new ErrorHandler("Invalid Product ID", 400));
    if (photo) {
        rm(product.photo!, () => {
            console.log("Old Photo Deleted");
        });
        product.photo = photo.path;
    }

    if (name) product.name = name;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (category) product.category = category;

    await product.save();

    invalidateCache({ product: true, productId: String(product._id), admin: true});
    return res.status(200).json({
        success: true,
        message: "Product Updated Successfully",
    })
});


export const deleteProduct = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) return next(new ErrorHandler("Product Not Found", 400));

    rm(product.photo!, () => {
        console.log("Product Photo Deleted")
    });

    await product.deleteOne();

    invalidateCache({ product: true, productId: String(product._id), admin: true});
    return res.status(200).json({
        success: true,
        message: "Product Deleted Successfully",
    })
});


export const getAllProducts = TryCatch(async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, sort, category, price } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;

    const baseQuery: BaseQuery = {};
    if (search) {
        baseQuery.name = {
            $regex: search,
            $options: "i"
        }
    }

    if (price) {
        baseQuery.price = {
            $lte: Number(price)
        }
    }

    if (category) {
        baseQuery.category = category
    }


    const productsPromise = Product.find(baseQuery).sort(
        sort && { price: sort === "asc" ? 1 : -1 })
        .limit(limit).skip(skip);

    const filteredOnlyProductPromise = Product.find(baseQuery);

    const [products, filteredOnlyProduct] = await Promise.all([
        productsPromise,
        filteredOnlyProductPromise
    ]);

    const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

    return res.status(200).json({
        success: true,
        products,
        totalPage
    })
});