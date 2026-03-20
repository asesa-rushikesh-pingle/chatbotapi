var express = require('express');
var router = express.Router();
const { User } = require("../models");
const multer  = require('multer')
const bcrypt = require('bcrypt');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// register user 
router.post('/register', upload.single('uploaded_file'),async function(req, res, next) {

  try {
    

    const { username, password, role, sitemapUrl } = req.body;
 console.log(req?.file?.filename) 
 let pdfUrl = req?.file?.filename || ''

   const hashedPassword = await bcrypt.hash(password, 10);

     const user = await User.create({
      username,
      password: hashedPassword,
      role,
      pdfUrl,
      sitemapUrl
    });

    if(user){
        res.json({
      status : true ,
      message: "User created",
      user
       });
    }else{
      res.json({
      status : false ,
      message: "Error while User created",
       });
    }

 

    } catch (error) {
      res.json({
      status : false ,
      message: "Error while User created",
      error
       });
  }

});

// admin login
router.post('/admin-login', async function(req, res, next) {
  try {

    const { username, password , socketId} = req.body;

    // check user exists
    const user = await User.findOne({
      where: { username }
    });

    if(user){
      await User.update(
        { socketId: socketId },
        { where: { id: user.id } }
      );
    }

    if (!user) {
      return res.json({
        status: false,
        message: "User not found"
      });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({
        status: false,
        message: "Invalid password"
      });
    }

    res.json({
      status: true,
      message: "Login successful",
      user
    });

  } catch (error) {
    res.json({
      status: false,
      message: "Error while login",
      error
    });
  }
});

// user register / login
router.post('/user-auth', async function(req, res, next) {
  try {

    const { username, password, socketId } = req.body;

    // check user exists
    let user = await User.findOne({
      where: { username }
    });

    if(user){
      await User.update(
        { socketId: socketId },
        { where: { id: user.id } }
      );
    }

    // if user not found → register
    if (!user) {

      const hashedPassword = await bcrypt.hash(password, 10);

      user = await User.create({
        username,
        password: hashedPassword,
        role: 3,
        socketId : socketId
      });

      return res.json({
        status: true,
        message: "User registered successfully",
        user
      });
    }

    // if user exists → login
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({
        status: false,
        message: "Invalid password"
      });
    }

    return res.json({
      status: true,
      message: "Login successful",
      user
    });

  } catch (error) {
    res.json({
      status: false,
      message: "Error in authentication",
      error
    });
  }
});


// get register user list 
router.get('/registered-users-list',async function(req, res, next) {

  try {
    


  

      
       const users = await User.findAll({
          where: {
            role: 2
          }
        });

        res.json({
          success: true,
          data: users
        });

 

    } catch (error) {
      res.json({
      status : false ,
      message: "Error while User created",
      error
       });
  }

});


// get single user details user 
router.post('/get-details',async function(req, res, next) {

  try {
    

    const { id} = req.body;
    console.log('iddd',id)

    const user = await User.findByPk(id);


    if(user){
        res.json({
      status : true ,
      message: "User details found",
      user
       });
    }else{
      res.json({
      status : false ,
      message: "Error while finding user  details",
       });
    }

 

    } catch (error) {
      res.json({
      status : false ,
      message: "Error found",
      error
       });
  }

});


module.exports = router;
