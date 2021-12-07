let express = require('express');
let app = express();
let bp = require('body-parser');
var session = require('cookie-session');
var pageLocation = "";

//mongoDB
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const http = require('http');
const url = require('url');

const mongourl = 'mongodb://Tony:123321@cluster0-shard-00-00.xuvcs.mongodb.net:27017,cluster0-shard-00-01.xuvcs.mongodb.net:27017,cluster0-shard-00-02.xuvcs.mongodb.net:27017/ProjectDatabase?ssl=true&replicaSet=atlas-20mjmm-shard-0&authSource=admin&retryWrites=true&w=majority';
const mongoose = require('mongoose');

//session
app.use(session({ name:'session',keys:['authenticated','username','password']}));

//users' database
const UserSchema = mongoose.Schema({
    UserID:{type: String, required: true},
    Password: {type:String}
  }
  );

//Inventory database
const InventorySchema = mongoose.Schema({
    inventory_ID:{type: String},
    name: {type:String, required: true},
    type: {type: String},
    quantity: {type:Number},
    photo: {type: String},
    photo_minetype: {type: String},
    inventory_address:[ {
      street: {type: String},
      building: {type: String},
      country: {type: String},
      zipcode: {type: String},
      coord: [{latitude:{type:Number},longitude:{type:Number}}]
    }],
    manager: {type:String, required: true}
  }
  );


const MatchUser = (req,res) => {
    var username = req.body.user_id;
    var password = req.body.user_pw;
    mongoose.connect(mongourl, {useMongoClient: true});
    const db = mongoose.connection;
    
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', () => {
        const User = mongoose.model('User', UserSchema);
  
        const criteria = {UserID: username};
        User.find(criteria, (err, results) => {
            console.log(`# documents meeting the criteria ${JSON.stringify(criteria)}: ${results.length}`);
            for (var doc of results) {
                console.log(doc.UserID, doc.Password);
                req.session.authenticated=true;
                req.session.username=doc.UserID;
                req.session.password=doc.Password
                console.log(`# Now is ${req.session.username} and ${req.session.password} `);
            }
            res.redirect('/');
            db.close();
        })
    })
  }


  const InsertInventory = (req,res) => {
    var Inv_Name = req.body.Inv_Name;
    var Inv_Type = req.body.Inv_Type;
    var Inv_Quan = req.body.Inv_Quan;
    var Inv_Street = req.body.Inv_Street;
    var Inv_Build = req.body.Inv_Build;
    var Inv_Country = req.body.Inv_Country;
    var Inv_Zipcode = req.body.Inv_Zipcode;
    var Inv_Lat = req.body.Inv_Lat;
    var Inv_Lon = req.body.Inv_Lon;
    var Inv_Photo = req.body.Inv_Photo;
    var Inv_ID =0;
    mongoose.connect(mongourl, {useMongoClient: true});
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', () => {
        const Inventory = mongoose.model('Inventory', InventorySchema);
        Inventory.count({}, function(error, numOfDocs) {
            Inv_ID=numOfDocs;
        });
        // create a Inventory
        const pencil = new Inventory({
            inventory_ID:Inv_ID,
            name: Inv_Name,
            type: Inv_Type,
            quantity: Inv_Quan,
            photo: Inv_Photo,
            photo_minetype: "",
            inventory_address:[ {
              street: Inv_Street,
              building: Inv_Build,
              country: Inv_Country,
              zipcode: Inv_Zipcode,
              coord: [{latitude:Inv_Lat,longitude:Inv_Lon}]
            }],
            manager: req.session.username
          });
    
        pencil.save((err) => {
            if (err) throw err;
            console.log('Inventory created!');
            db.close();
            ShowInv(req,res);
        })
    })
}

//
const ShowInv = (req,res) => {

    mongoose.connect(mongourl, {useMongoClient: true});
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', () => {
        const Inventory = mongoose.model('Inventory', InventorySchema);
  
        const criteria = {};
        Inventory.find(criteria, (err, results) => {
            console.log(`# documents meeting the criteria ${JSON.stringify(criteria)}: ${results.length}`);
            res.render('/home/developer/proj/database.ejs',{results:results});
            db.close();
        })
    })
  }
//showdetail
const handle_Details = (res, criteria) => {
    mongoose.connect(mongourl, {useMongoClient: true});
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', () => {
        const Inventory = mongoose.model('Inventory', InventorySchema);
        Inventory.findOne(criteria, (err,results) => {
            if (err) return console.error(err);
            res.render('/home/developer/proj/detail.ejs',{results:results});
            db.close();
        });
    });
}

//delete
const DeleteInv = (req, res) => {
    mongoose.connect(mongourl, {useMongoClient: true});
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', () => {
        const Inventory = mongoose.model('Inventory', InventorySchema);
        criteria=req.query;
        Inventory.findOne(criteria, (err,results) => {
        if(results.manager==req.session.username){
            Inventory.deleteOne(criteria, (err,resultsToDelete) => {
                if (err) return console.error(err);
                console.log("OK");
                db.close();
                res.render('/home/developer/proj/delete.ejs');
            }
            )}
        else res.redirect('/');
        });
    })
}

//bodyparser
app.set('view engine', 'ejs');
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

app.get('/',function(req,res){
    if(!req.session.authenticated){ 
        res.redirect('/login');
    }
    res.redirect('database');
});


app.get('/login', (req,res) => {
    res.render('/home/developer/proj/login.ejs');
    pageLocation="Login";
});

app.get('/database', (req,res) => {
    ShowInv(req,res);
});



app.get('/create', (req,res) => {
    res.render('/home/developer/proj/create.ejs');
    pageLocation="Create";
    });

app.post('/create', (req,res) => {
    InsertInventory(req,res);
    });
        
//read user id and pw
app.post('/login',(req,res)=>{
    MatchUser(req,res);
})

app.get('/logout',function(req,res){ req.session=null; res.redirect('/');});

app.get('/detail', function(req, res) {
    handle_Details(res,req.query);
  });

app.get('/delete', function(req, res) {
    DeleteInv(req,res);
  });

const server = app.listen(process.env.PORT || 8099, () => {
const port = server.address().port;
console.log(`Server listening at port ${port}`);
})
