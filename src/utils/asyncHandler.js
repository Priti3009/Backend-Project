const asyncHandler = (requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=> next(err))
    }
}

export {asyncHandler}



/*  Another way of doing this
const asyncHandler=(fn)=>()=>{
    try{
        await fn(requestAnimationFrame,res,next)

    }
    catch(err){
        res.status(err.code || 500).json({
            success :false,
            message:err.message
        })

    }
}
    */