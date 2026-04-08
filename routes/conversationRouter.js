var express = require('express');
const {Conversation,Message,User, sequelize} = require('../models');
const { QueryTypes, where } = require('sequelize');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* create conversation */
router.post('/create', async function(req, res, next) {

      const {message, userId,adminId} = req.body

      if(!message || !userId || !adminId){
          res.json({
            status: false,
            data: 'message is required to start conversation',     
             }); 
      }

    try {
        let conversation =  await Conversation.create({
        status: "pending",
        userId: userId,
        adminId: adminId
        });

        if(conversation){


              let messageObj =  await Message.create({
        text: message,
        status: 'unread',
        messageById: userId,
        conversationId: conversation.id,
        });

            if(message){
            res.json({
            status: true,
            message: 'conversation started successfully',    
            data : {conversation : {...conversation.dataValues, message : messageObj}} 
             }); 
            }else{
                  res.json({
            status: false,
            data: 'getting error while creating message',     
             }); 
            }
            

        }else{
             res.json({
            status: false,
            data: 'getting error while creating conversation',     
             }); 

        }





    } catch (error) {
        console.log(error)
        res.json({
        status: false,
        data: 'getting error in catch block',
        error: error
      }); 
    }
  

 
});

/* create message */
router.post('/send-message', async function(req, res, next) {

      const {message, messageById,conversationId} = req.body

      if(!message || !messageById || !conversationId){
          res.json({
            status: false,
            data: 'message is required to start conversation',     
             }); 
      }

    try {
       
 
           let messageObj =  await Message.create({
        text: message,
        status: 'unread',
        messageById: messageById,
        conversationId: conversationId,
        });

        if(messageObj){

           const conversationObj = await Conversation.findOne({
              where: {
                id : conversationId
              }
            });

            const userIdObj = await User.findOne({
              where : {id : conversationObj.userId}
            })
            let userSocketId = userIdObj.socketId

             const adminIdObj = await User.findOne({
              where : {id : conversationObj.adminId}
            })
            let adminSocketId = adminIdObj.socketId

           const io = req.app.get('io');

           if(messageById == userIdObj.id){
           io.to(adminSocketId).emit("receive_message", 'message received from user');
           }else{
           io.to(userSocketId).emit("receive_message", 'message received from admin');
           }



            res.json({
            status: true,
            message: 'message sent successfully',    
            data :  { message : messageObj},
            userSocketId : userSocketId,
            adminSocketId : adminSocketId,
            userIdObj : userIdObj,
            conversationObj : conversationObj
             }); 
           
            

        }else{
             res.json({
            status: false,
            data: 'getting error while sending message',     
             }); 

        }





    } catch (error) {
        console.log(error)
        res.json({
        status: false,
        data: 'getting error in catch block',
        error: error
      }); 
    }
  

 
});

// get conversation listing api 
router.get('/list', async function(req, res) {

  const { userId, adminId } = req.query;

  try {
  const conversations = await sequelize.query(
    `
    SELECT
      c.*,
      m.id AS messageId,
      m.text AS messageText,
      m.status AS messageStatus,
      m.conversationId,
      m.createdAt AS messageCreatedAt
    FROM Conversations c
    LEFT JOIN Messages m
      ON m.id = (
          SELECT id
          FROM Messages
          WHERE conversationId = c.id
          ORDER BY createdAt DESC
          LIMIT 1
      )
    WHERE
      (c.userId = :userId 
      AND c.adminId = :adminId 
      AND (c.status = 'pending' OR c.status = 'accepted'))
    ORDER BY c.createdAt DESC
    `,
    {
      replacements: { userId, adminId },
      type: QueryTypes.SELECT
    }
  );

    // const conversations = await Conversation.findAll({
    //   where: {
    //     ...(userId && { userId }),
    //     ...(adminId && { adminId })
    //   },
    //   include: [
    //     {
    //       model: Message,
    //       limit: 1,
    //       order: [['createdAt', 'DESC']]
    //     }
    //   ],
    //   order: [['createdAt', 'DESC']]
    // });

    res.json({
      status: true,
      data: conversations
    });

  } catch (error) {

    console.log(error);

    res.json({
      status: false,
      message: "Error fetching conversations",
      error: error.message
    });

  }

});

// get conversation message list 
router.get('/message-list', async function(req, res) {

  const { conversationId } = req.query;

  try {
 const messages = await sequelize.query(
`
SELECT
  m.id AS messageId,
  m.text,
  m.status,
  m.conversationId,
  m.messageById,
  m.createdAt,
  u.username AS senderName,
  c.userId,
  c.adminId,
  c.status AS conversationStatus

FROM Conversations c

LEFT JOIN Messages m
ON c.id = m.conversationId

LEFT JOIN Users u
ON u.id = m.messageById

WHERE
  (m.conversationId = :conversationId)

ORDER BY m.createdAt ASC
`,
{
  replacements: { conversationId },
  type: QueryTypes.SELECT
});

  

    res.json({
      status: true,
      message : 'message list found',
      data: messages
    });

  } catch (error) {

    console.log(error);

    res.json({
      status: false,
      message: "Error fetching messages",
      error: error.message
    });

  }

});

// get conversation listing for admin/site owner 
router.get('/admin-conversation-list', async function(req, res) {

  const { adminId } = req.query;

  try {
  const conversations = await sequelize.query(
    `
    SELECT
      c.*,
       u.username,
      m.id AS messageId,
      m.text AS messageText,
      m.status AS messageStatus,
      m.conversationId,
      m.createdAt AS messageCreatedAt
    FROM Conversations c
    LEFT JOIN Users u 
    ON u.id = c.userId 
    LEFT JOIN Messages m
      ON m.id = (
          SELECT id
          FROM Messages
          WHERE conversationId = c.id
          ORDER BY createdAt DESC
          LIMIT 1
      )
    WHERE
      c.adminId = :adminId
    ORDER BY c.createdAt DESC
    `,
    {
      replacements: { adminId },
      type: QueryTypes.SELECT
    }
  );

    // const conversations = await Conversation.findAll({
    //   where: {
    //     ...(userId && { userId }),
    //     ...(adminId && { adminId })
    //   },
    //   include: [
    //     {
    //       model: Message,
    //       limit: 1,
    //       order: [['createdAt', 'DESC']]
    //     }
    //   ],
    //   order: [['createdAt', 'DESC']]
    // });

    res.json({
      status: true,
      data: conversations
    });

  } catch (error) {

    console.log(error);

    res.json({
      status: false,
      message: "Error fetching conversations",
      error: error.message
    });

  }

});

/* change status of conversation. */
router.post('/chnage-status', async function(req, res, next) {

      const {status,conversationId} = req.body

      if(!status || !conversationId){
          res.json({
            status: false,
            data: 'status and conversationId is required to update conversation',     
             }); 
      }

    try {
        let updatedConversation = await Conversation.update(
        { status: status },
        { where: { id: conversationId } }
        );

        if(updatedConversation){


           updatedConversation
            res.json({
            status: true,
            data: updatedConversation[0] ? 'changed status' : 'changed status',     
             }); 
            

        }else{
             res.json({
            status: false,
            data: 'getting error while updating conversation',     
             }); 

        }





    } catch (error) {
        console.log(error)
        res.json({
        status: false,
        data: 'getting error in catch block',
        error: error
      }); 
    }
  

 
});



module.exports = router;
