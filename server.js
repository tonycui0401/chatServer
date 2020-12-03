const express = require("express");
const app = express();
const port = 8002;
var server = require("http").Server(app);
const io = require("socket.io")(server);
// const users = require("./configs/users");
const cors = require("cors");
const moment = require('moment');

const {local_endpoint, auth_endpoint, remote_endpoint, local_base} = require('./configs/config');

const fetch = require('node-fetch');




app.use(cors());






var clients = {};
var users = {}
var member = {}
var generateMessage = (from, room) => {
  return {
      from,
      room,
      // user,
      createdDate: moment().valueOf()
  }
};

var generateUserMessage = (from, room, location, type, text) => {
  return {
      from,
      room,
      location:location,
      type,
      text:text,
      createdDate: moment().valueOf()
  }
};



io.on("connection", function(client) {
  client.on("sign-in", e => {
    let user_id = e.user_id;

    io.emit("online", {user_id:user_id});

  



    if (!user_id) return;
    client.user_id = user_id;
    console.log("client user id")
    console.log(client.user_id)
    if (clients[user_id]) {
      clients[user_id].push(client);
    } else {
      clients[user_id] = [client];
    }


    fetch(local_endpoint+'/updateUserChatStatus?id='+client.user_id +'&chatstatus=online'
    , {
      method: 'put',
      headers: { 'Content-Type': 'application/json' },
  })
  .then(res => res.json())
  .then(json => console.log(json));


  });



  client.on('join', (params) => {


    client.join(params.room_id);
  
    users[params.room_id]={}
    member[params.room_id]={}

    if(!users[params.room_id].users){
      users[params.room_id].users=[]
    }

    if(!member[params.room_id].users){
      member[params.room_id].users=[]
    }

    fetch(local_endpoint+'/allChatGroupMembers?room='+params.room_id)
    .then(res => res.json())
    .then(json => {
      
      console.log("check members")
      console.log(json)

     
        users[params.room_id].users=json
        console.log("print me out")
        for (let i in json){
console.log("print me")
        console.log(json[i])
        member[params.room_id].users.push(json[i].member)

      }


      console.log(member[params.room_id].users.includes(params.user_id))

      console.log("end check members")



      if(!member[params.room_id].users.includes(params.user_id)){
    
        let newUser = {
          user_id: params.user_id,
          firstname: params.firstname,
          lastname: params.lastname,
          img: params.img,
          joinDate: moment().valueOf()
      }
  
  
      fetch(local_endpoint+'/createChatGroupMember'
      , {
        method: 'post',
        body:    JSON.stringify({
          room:params.room_id,
          member:params.user_id,
          joindate:moment().valueOf(),
          membertype:'normal'
        }),
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(json => console.log(json));
      
  
  
      users[params.room_id].users.push(newUser)
    
      
    
  
      }
  
      client.emit('newMessage', generateMessage(params.user_id, params.room_id));
    
      client.broadcast.to(params.room_id).emit('newMessage', generateMessage(params.user_id, params.room_id));
  


    
    })

  
   
   console.log(member[params.room_id].users.includes(params.user_id))
   

});


client.on('createMessage', (message) => {

    console.log("on create new messages")
    console.log(message)
      let tempObj = generateUserMessage(message.user_id, message.room, 'in', message.type, message.text);
      io.to(message.room).emit('newGroupMessage', tempObj);




  fetch(local_endpoint+'/createChatGroupMsg'
  , {
    method: 'post',
    body:    JSON.stringify({
      room:message.room,
      sender:message.user_id,
      message:message.text,
      time:moment().valueOf(),
      type:message.type
    }),
    headers: { 'Content-Type': 'application/json' },
})
.then(res => res.json())
.then(mjson => {
  
  
  console.log(mjson)



  fetch(local_endpoint+'/allChatGroupMembers?room='+message.room)
.then(res => res.json())
.then(json => {
  
    for (let i in json){

      if (json[i].member === message.user_id) {
        continue;
      }


      fetch(auth_endpoint+'/sendIosNotification?id='+json[i].member
      , {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(json => console.log(json));




      fetch(local_endpoint+'/createChatGroupMsgStatus'
      , {
        method: 'post',
        body:    JSON.stringify({
          msg_id:mjson.id,
          seenby:json[i].member,
          seenat:null
        }),
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(json => console.log(json));


  }


});




});











  console.log("get client id")


});



  client.on("message", e => {
    let targetId = e.to;
    let sourceId = client.user_id;
    // io.emit("message", e)
    console.log("message data")
    console.log(targetId)
    console.log(clients[targetId])
    console.log(sourceId)
    if(targetId && clients[targetId]) {
      clients[targetId].forEach(cli => {



     



        cli.emit("message", e);

       


        console.log("emited this")
      });
    }

    if(sourceId && clients[sourceId]) {
      clients[sourceId].forEach(cli => {



     

        cli.emit("message", e);

        
        console.log("emited that")
      });
    }



    fetch(auth_endpoint+'/sendIosNotification?id='+e.to
    , {
      method: 'get',
      headers: { 'Content-Type': 'application/json' },
  })
  .then(res => res.json())
  .then(json => console.log(json));



    fetch(local_endpoint+'/createPrivateChat'
    , {
      method: 'post',
      body:    JSON.stringify({
        sender:e.from,
        receipt:e.to,
        message:e.message.message,
        time:e.message.time,
        type:e.message.type
      }),
      headers: { 'Content-Type': 'application/json' },
  })
  .then(res => res.json())
  .then(json => {
    
    
    // console.log(json)
  
    fetch(local_endpoint+'/updatePrivateLastChannel?sender='+e.from+'&receipt='+e.to+'&message='+e.message.message+'&time='+e.message.time+'&type='+e.message.type
    , {
      method: 'put',
      headers: { 'Content-Type': 'application/json' },
  })
  .then(res => res.json())
  .then(json => console.log(json));
  
  
  });
    



  });

 












  client.on("disconnect", id=> {

    let targetId = 78;
    let sourceId = 77;
  io.emit("offline", {user_id:client.user_id});


  fetch(local_endpoint+'/updateUserChatStatus?id='+client.user_id+'&chatstatus=offline'
  , {
    method: 'put',
    headers: { 'Content-Type': 'application/json' },
})
.then(res => res.json())
.then(json => console.log(json));








    if (!client.user_id || !clients[client.user_id]) {
      return;
    }
    let targetClients = clients[client.user_id];
    for (let i = 0; i < targetClients.length; ++i) {
      if (targetClients[i] == client) {
        targetClients.splice(i, 1);
      }
    }
  });
});




app.get('/users', (req, res) => {

  fetch('http://localhost:5000/api/tags/locationTags')
    .then(res => res.json())
    .then(json => {
      
      console.log(json)

      res.send(json);
    
    });



});


app.get('/sign_s3_chat_group_image', (req, res) => {
  const fileurl = req.query.fileurl;
  const fileext = req.query.fileext;
  const user_id = req.query.user_id;
  const room_id = req.query.room_id;


io.emit("new group image message", {url:fileurl, user_id:user_id, room_id:room_id, fileext:fileext});

});



app.get('/sign_s3_chat_image', (req, res) => {

  const fileurl = req.query.fileurl;
  const fileext = req.query.fileext;
  const user_id = req.query.user_id;
  const from_id = req.query.from_id;


    io.emit("new image message", {url:fileurl, user_id:user_id, from_id:from_id, fileext:fileext});


    


});














server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
