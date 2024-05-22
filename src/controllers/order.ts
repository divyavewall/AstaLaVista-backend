import { TryCatch } from "../middleware/error.js";
import { Order } from "../models/order.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Request } from "express";
import { invalidateCache, reduceStock } from "../utils/feature.js";
import ErrorHandler from "../utils/utility-class.js";
import { nodeCache } from "../app.js";

export const myOrders = TryCatch(async(req, res, next) => {
    const { id: user } = req.query
    let orders = [];
    const key = `my-orders-${user}`
    if(nodeCache.has(key)){
        orders = JSON.parse(nodeCache.get(key) as string)
    }else{
        orders = await Order.find({user});
        nodeCache.set(key, JSON.stringify(orders));
    }

    return res.status(200).json({
        success: true,
        orders
    })
})

export const allOrders = TryCatch(async(req, res, next) => {
    const key = "all-orders"
    let orders = [];
    if(nodeCache.has(key)){
        orders = JSON.parse(nodeCache.get(key) as string);
    }else{
        orders = await Order.find().populate("user", "name");
        nodeCache.set(key, JSON.stringify(orders));
    }
    
    return res.status(200).json({
        success: true,
        orders
    })
})

export const getSingleOrder = TryCatch(async(req, res, next) => {
    const { id }= req.params;
    const key = `order-${id}`
    let order;
    if(nodeCache.has(key)){
        order = JSON.parse(nodeCache.get(key) as string);
    }else{
        order = await Order.findById(id).populate("user", "name");
        if(!order){
            return next(new ErrorHandler("Order Not Found", 400))
        }
        nodeCache.set(key, JSON.stringify(order));
    }
    
    return res.status(200).json({
        success: true,
        order
    })
})

export const newOrder = TryCatch(async(req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
        shippingInfo, 
        orderItems, 
        user, 
        subtotal, 
        tax, 
        shippingCharges, 
        discount, 
        total
    } = req.body;

    if(!shippingInfo || !orderItems || !user || !subtotal || !tax || !total){
        return next(new ErrorHandler("Please Enter All fields", 400))
    }

    const order = await Order.create({
        shippingInfo, 
        orderItems,
        user,
        subtotal,
        tax,
        shippingCharges,
        discount,
        total
    });
    // order create -> stock rduce
    await reduceStock(orderItems);
    //invalidates cache
    invalidateCache({ 
        product: true, 
        order: true, 
        admin: true,
        userId: user,
        productId: order.orderItems.map(i => String(i.productId))
    });
    return res.status(201).json({
        success: true,
        message: "Order Placed Successfully"
    });
});

export const processOrder = TryCatch(async(req, res, next)=>{
    const { id } = req.params;

    const order = await Order.findById(id);
    if(!order){
        return next(new ErrorHandler("Order Not Found", 400));
    }
    switch(order.status){
        case "Processing":
            order.status = "Shipped";
            break;
        case "Shipped":
            order.status = "Delivered";
            break;
        default:
            order.status = "Delivered";
            break;
    }

    invalidateCache({
        product: false,
        order: true,
        admin: true,
        userId: order.user,
        orderId: String(order._id),
      });

    await order.save();
    return res.status(200).json({
        success: true,
        message: "Order Processed Successfully"
    })
})

export const deleteOrder = TryCatch(async (req, res, next) => {
    const { id } = req.params;
  
    const order = await Order.findById(id);
    if (!order) return next(new ErrorHandler("Order Not Found", 404));
  
    await order.deleteOne();
  
    invalidateCache({
      product: false,
      order: true,
      admin: true,
      userId: order.user,
      orderId: String(order._id),
    });
  
    return res.status(200).json({
      success: true,
      message: "Order Deleted Successfully",
    });
  });