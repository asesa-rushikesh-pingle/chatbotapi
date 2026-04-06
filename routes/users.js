var express = require('express');
var router = express.Router();
const { User } = require("../models");
const multer  = require('multer')
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const Razorpay = require("razorpay");
const axios = require("axios");


 const key_id = "rzp_test_SZJs8LheVmP8lm";
    const key_secret = "sUV0Ln2hRvLhVP6JtVOQXupw";

const razorpay = new Razorpay({
  key_id: key_id,
  key_secret: key_secret,
  
});
const WEBHOOK_SECRET = "mySuperSecret123@razorpay";

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

// update users files and sitemap url 
router.post('/update-user-files/:id', upload.single('uploaded_file'), async (req, res) => {
  try {

    
    const userId = req.params.id;
    const { sitemapUrl } = req.body;

    // 🔍 Find user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.json({
        status: false,
        message: "User not found"
      });
    }

    // 📄 Handle file (pdfUrl)
    let pdfUrl = user.pdfUrl;
    if (req?.file?.filename) {
      pdfUrl = req.file.filename;
    }

    // ✏️ Update only required fields
    await user.update({
      sitemapUrl: sitemapUrl ?? user.sitemapUrl,
      pdfUrl: pdfUrl
    });

    return res.json({
      status: true,
      message: "User files updated successfully",
      user
    });

  } catch (error) {
    return res.json({
      status: false,
      message: "Error while updating user files",
      error: error.message
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

// create subscription api 
// ✅ Create subscription
router.post("/create-subscription", async (req, res) => {

  const { plan_id, user_id } = req.body;

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan_id, // 👈 your plan id
      customer_notify: 1,
      total_count: 100, // months (or billing cycles)
      notes: {
        user_id: user_id.toString(), // ✅ store user id
      },
    });

    if(subscription){
      res.json({
        status : true,
        message : 'Subscription created successfully',
        subscription : subscription
      })
    }else{
      res.json({
        status : false,
        message : 'Subscription failed',
       
      })
    }

  
  } catch (err) {
    console.log(err);
    res.json({
        status : false,
        message : 'Subscription failed',
        err : err
       
      })
  }
});

router.post("/get-invoices", async (req, res) => {
  const { subscription_id } = req.body;

  try {
   

  

    const response = await axios.get(
      `https://api.razorpay.com/v1/invoices`,
      {
        params: { subscription_id },
        auth: {
          username: key_id,
          password: key_secret,
        },
      }
    );

    return res.json({
      status: true,
      data: response.data,
    });

  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch invoices",
      error: err.response?.data || err.message,
    });
  }
});




// webhook functions 

async function handleSubscriptionCharged(payload) {
  try {
    const subscription = payload.subscription.entity;

    const userId = subscription.notes?.user_id;

    if (!userId) {
      console.log("❌ No user_id found in notes");
      return;
    }

    // ✅ Update user subscription status
    await User.update(
      { subscription_status: subscription?.status || 'NA',
        subscription_id: subscription?.id || 'NA'
       },
      { where: { id: userId } }
    );

    console.log("✅ User subscription activated:", userId);

  } catch (err) {
    console.log("❌ Error in handleSubscriptionCharged:", err);
  }
}


// webhook 
router.post("/webhook", (req, res) => {
  try {
    // 🔐 Verify signature
    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.log("❌ Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    // ✅ Webhook verified
    const event = req.body.event;
    const payload = req.body.payload;

    console.log("📩 Event:", event);

    // 🎯 Handle events
    switch (event) {
      case "subscription.charged":
        // handleSubscriptionCharged(payload);
        handleSubscriptionCharged(payload);
       
        break;
      case "subscription.activated":
        handleSubscriptionCharged(payload);
        break;
      case "subscription.paused":
        // handleSubscriptionCharged(payload);
        handleSubscriptionCharged(payload);
        break;

          case "subscription.resumed":
        // handleSubscriptionCharged(payload);
        handleSubscriptionCharged(payload);
        break;
        
         case "subscription.completed":
        // handleSubscriptionCharged(payload);
        handleSubscriptionCharged(payload);
        break;

      case "payment.failed":
        // handlePaymentFailed(payload);
        handleSubscriptionCharged(payload);
        break;

      case "subscription.cancelled":
        // handleSubscriptionCancelled(payload);
        handleSubscriptionCharged(payload);
        break;

      default:
        console.log("⚠️ Unhandled event:", event);
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.log("Webhook Error:", err);
    res.status(500).send("Server error");
  }
});



module.exports = router;
