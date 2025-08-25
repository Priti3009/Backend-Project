const asyncHandler = (requestHandler)=>{           //Wrapper for async functions
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=> next(err))                //If error occurs,it automatically calls next(err) → handled by central error middleware.
    }
}

export {asyncHandler}



/*  Another way of doing this
const asyncHandler=(fn)=>()=>{
    try{
        await fn(req,res,next)

    }
    catch(err){
        res.status(err.code || 500).json({
            success :false,
            message:err.message
        })

    }
}
    */