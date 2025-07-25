class ApiError extends Error{  //Error class is provided by nodejs
    constructor(
        statusCode,
        message="Something went erong",
        errors=[],
        stack=""
    ){
        super(message)
        this.statusCode=statusCode
        this.data=null          
        this.message=message
        this.success=false
        this.errors=errors

        if(stack){
            this.stack=stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }

}