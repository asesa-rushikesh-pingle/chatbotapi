var express = require('express');
var router = express.Router();
const { User,Lead } = require("../models");
const multer  = require('multer')
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const Razorpay = require("razorpay");
const axios = require("axios");
const nodemailer = require('nodemailer');
const db = require("../models");


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

// change password
router.post('/change-password', async function(req, res) {
  try {

    const { username, newPassword } = req.body;



    // 🔍 Find user
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.json({
        status: false,
        message: "User not found"
      });
    }

    // 🔐 Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🔄 Update password
    await user.update({
      password: hashedPassword
    });

    return res.json({
      status: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    return res.json({
      status: false,
      message: "Error while updating password",
      error: error.message
    });
  }
});

// update users files and sitemap url 
router.post('/update-user-files/:id', upload.single('uploaded_file'), async (req, res) => {
  try {

    
    const userId = req.params.id;
    const { sitemapUrl } = req.body;
     const { isActive, greetingMessage,chatPosition, secondaryColor, primaryColor } = req.body;

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
      pdfUrl: pdfUrl,
      isActive : Number(isActive),
      greetingMessage : greetingMessage,chatPosition : chatPosition, secondaryColor : secondaryColor, primaryColor : primaryColor
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


// send mail api 
// Create transporter (use Gmail or SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'scrollosoft@gmail.com',
    pass: 'ktec pgvz qejk cozt' // NOT your real password
  }
});

router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text,html } = req.body;

    const mailOptions = {
      from: 'scrollosoft@gmail.com',
      to,
      subject,
      text,
      html
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error sending email' ,error : error.message});
  }
});


// cretae lead 
router.post("/create-lead", async (req, res) => {

  const { adminId, email } = req.body;

  try {

    // Basic validation
    if (!adminId || !email) {
      return res.json({
        status: false,
        message: "adminId and email are required",
      });
    }

    // Create Lead Moratio entry
    const lead = await db.Lead.create({
      adminId: adminId,
      email: email,
    });

    if (lead) {
      res.json({
        status: true,
        message: "Lead created successfully",
        data: lead,
      });
    } else {
      res.json({
        status: false,
        message: "Lead creation failed",
      });
    }

  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      message: "Lead creation failed",
      error: err.message,
    });
  }

});

// lead listing 
router.post("/get-leads", async (req, res) => {

  const { adminId } = req.body;

  try {

    // Validation
    if (!adminId) {
      return res.json({
        status: false,
        message: "adminId is required",
      });
    }

    // Fetch leads
    const leads = await Lead.findAll({
      where: { adminId: adminId },
      order: [["id", "DESC"]],
    });

    
      res.json({
        status: true,
        message: "Leads fetched successfully",
        data: leads,
      });
   

  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      message: "Failed to fetch leads",
      error: err.message,
    });
  }

});



module.exports = router;
