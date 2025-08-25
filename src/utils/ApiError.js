class ApiError extends Error{  //Error class is provided by nodejs (Creates a custom error object)
    constructor(
        statusCode,
        message="Something went erong",
        errors=[],
        stack=""
    ){
        super(message)               // call the parent (Error) constructor
        this.statusCode=statusCode
        this.data=null          
        this.message=message
        this.success=false
        this.errors=errors            // additional error details (like validation errors)

        if(stack){
            this.stack=stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }

}
export {ApiError}