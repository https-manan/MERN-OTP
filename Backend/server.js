const express = require('express');
const app = express();
const dotenv = require('dotenv').config()
const port = process.env.PORT;
const cors = require('cors')
const cookieParser = require('cookie-parser');
const dbconnection = require('./db/dbConnection');
const bcrypt = require('bcrypt'); //Do it while saving the pass in db
const register = require('./routes/registerRoute')



dbconnection();

app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(express.json())
app.use(cors());



//register Route
app.post('api/v1/register',register)




app.listen(port,()=>{
    console.log(`listening on port ${port}`)
})