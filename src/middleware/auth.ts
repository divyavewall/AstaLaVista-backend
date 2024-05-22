import { User } from "../models/user.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";

//middleware to make sure only admin is allowed
export const adminOnly = TryCatch(async (req, res, next) => {

    const {id} = req.query;

    if(!id) return next(new ErrorHandler("Unauthorized: User not authenticated", 401));

    const user = await User.findById(id);
    if(!user){
        return next(new ErrorHandler("Invalid ID. Please check your credentials.", 401));
    }

    if(user.role !== "admin"){
        return next(new ErrorHandler("Access Forbidden",403));
    }

    next();
});