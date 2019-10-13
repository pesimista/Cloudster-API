const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const os = require('os');

const net = os.networkInterfaces();
const _ = process.platform==='win32'? '\\' : '/';

let books = [
   {
      index : 0,
      isbn: "9781593275846",
      title: "Eloquent JavaScript, Second Edition",
      subtitle: "A Modern Introduction to Programming",
      author: "Marijn Haverbeke",
      published: "2014-12-14T00:00:00.000Z",
      publisher: "No Starch Press",
      pages: 472,
      description: "JavaScript lies at the heart of almost every modern web application, from social apps to the newest browser-based games. Though simple for beginners to pick up and play with, JavaScript is a flexible, complex language that you can use to build full-scale applications.",
      website: "http://eloquentjavascript.net/",
      rating: 4.5
   },
   {
      index : 1,
      isbn: "9781449331818",
      title: "Learning JavaScript Design Patterns",
      subtitle: "A JavaScript and jQuery Developer's Guide",
      author: "Addy Osmani",
      published: "2012-07-01T00:00:00.000Z",
      publisher: "O'Reilly Media",
      pages: 254,
      description: "With Learning JavaScript Design Patterns, you'll learn how to write beautiful, structured, and maintainable JavaScript by applying classical and modern design patterns to the language. If you want to keep your code efficient, more manageable, and up-to-date with the latest best practices, this book is for you.",
      website: "http://www.addyosmani.com/resources/essentialjsdesignpatterns/book/",
      rating: 3
   },
   {
      index : 2,
      isbn: "9781449365035",
      title: "Speaking JavaScript",
      subtitle: "An In-Depth Guide for Programmers",
      author: "Axel Rauschmayer",
      published: "2014-02-01T00:00:00.000Z",
      publisher: "O'Reilly Media",
      pages: 460,
      description: "Like it or not, JavaScript is everywhere these days-from browser to server to mobile-and now you, too, need to learn the language or dive deeper than you have. This concise book guides you into and through JavaScript, written by a veteran programmer who once found himself in the same position.",
      website: "http://speakingjs.com/",
      rating: 5
   },
   {
      index : 3,
      isbn: "9781491950296",
      title: "Programming JavaScript Applications",
      subtitle: "Robust Web Architecture with Node, HTML5, and Modern JS Libraries",
      author: "Eric Elliott",
      published: "2014-07-01T00:00:00.000Z",
      publisher: "O'Reilly Media",
      pages: 254,
      description: "Take advantage of JavaScript's power to build robust web-scale or enterprise applications that are easy to extend and maintain. By applying the design patterns outlined in this practical book, experienced JavaScript developers will learn how to write flexible and resilient code that's easier-yes, easier-to work with as your code base grows.",
      website: "http://chimera.labs.oreilly.com/books/1234000000262/index.html",
      rating: 2.5
   },
   {
      index : 4,
      isbn: "9781593277574",
      title: "Understanding ECMAScript 6",
      subtitle: "The Definitive Guide for JavaScript Developers",
      author: "Nicholas C. Zakas",
      published: "2016-09-03T00:00:00.000Z",
      publisher: "No Starch Press",
      pages: 352,
      description: "ECMAScript 6 represents the biggest update to the core of JavaScript in the history of the language. In Understanding ECMAScript 6, expert developer Nicholas C. Zakas provides a complete guide to the object types, syntax, and other exciting changes that ECMAScript 6 brings to JavaScript.",
      website: "https://leanpub.com/understandinges6/read",
      rating: 1
   },
   {
      index : 5,
      isbn: "9781491904244",
      title: "You Don't Know JS",
      subtitle: "ES6 & Beyond",
      author: "Kyle Simpson",
      published: "2015-12-27T00:00:00.000Z",
      publisher: "O'Reilly Media",
      pages: 278,
      description: "No matter how much experience you have with JavaScript, odds are you don’t fully understand the language. As part of the \"You Don’t Know JS\" series, this compact guide focuses on new features available in ECMAScript 6 (ES6), the latest version of the standard upon which JavaScript is built.",
      website: "https://github.com/getify/You-Dont-Know-JS/tree/master/es6%20&%20beyond",
      rating: 4.5
   },
   {
      index : 6,
      isbn: "9781449325862",
      title: "Git Pocket Guide",
      subtitle: "A Working Introduction",
      author: "Richard E. Silverman",
      published: "2013-08-02T00:00:00.000Z",
      publisher: "O'Reilly Media",
      pages: 234,
      description: "This pocket guide is the perfect on-the-job companion to Git, the distributed version control system. It provides a compact, readable introduction to Git for new users, as well as a reference to common commands and procedures for those of you with Git experience.",
      website: "http://chimera.labs.oreilly.com/books/1230000000561/index.html",
      rating: 2
   },
   {
      index : 7,
      isbn: "9781449337711",
      title: "Designing Evolvable Web APIs with ASP.NET",
      subtitle: "Harnessing the Power of the Web",
      author: "Glenn Block, et al.",
      published: "2014-04-07T00:00:00.000Z",
      publisher: "O'Reilly Media",
      pages: 538,
      description: "Design and build Web APIs for a broad range of clients—including browsers and mobile devices—that can adapt to change over time. This practical, hands-on guide takes you through the theory and tools you need to build evolvable HTTP services with Microsoft’s ASP.NET Web API framework. In the process, you’ll learn how design and implement a real-world Web API.",
      website: "http://chimera.labs.oreilly.com/books/1234000001708/index.html",
      rating: 5
   }
] //Return


/*----------------------------------------------------------*/
/*--------------------Express Middleware--------------------*/
/*----------------------------------------------------------*/
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use( 
   /**
    * Shows some not that relevant information about the incomming message
    * @param {Object} req The Http Request
    * @param {Object} res The Http Response
    * @param {function} next Function to pass control to the next handler
    */
   (req, res, next) => {
   const at = new Date();
   const time = `${at.getHours()}:${at.getMinutes()}:${at.getMilliseconds()}`
   console.log(`\n--------------Connection enabled with client--------------`);
   console.log(req.headers['user-agent']);
   console.log(req.ip.replace('::', '').replace(':', '\t'), "\tAt "+time);
   next();
} );


/**
 * Enables the server to receive request from anywhere
 * @param {Object} req The Http Request
 * @param {Object} res The Http Response
 * @param {function} next Function to pass control to the next handler
 */
const CORS = (req, res, next) => {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
} ;
app.use( CORS );
app.use(express.static(__dirname + _ ));
/*----------------------------------------------------------*/
/*--------------------Express Middleware--------------------*/
/*----------------------------------------------------------*/

/**
 * El Puerto;
 */
const port = process.env.PORT || 6969;

app.get('/', 
   /**
    * Returns all the books in the record;
    * @param {Object} req The Http Request
    * @param {Object} res The Http Response
    */
   (req, res) =>{
   res.send(books);
})


app.get('/:id', 
   /**
    * Returns a book based on the id passed on the req.params.id;
    * @param {Object} req The Http Request
    * @param {Object} res The Http Response
    */
   (req, res) => {
      if( Number.isInteger( parseInt(req.params.id) ) ){
         let value = parseInt(req.params.id);
         if(value < books.length)
         {
            res.send(books[value]);
            return;
         }
      }
      res.status('404').send({error_message : `Error : ${req.params.id} no es un ID valido`});
   }
);


app.post('/', 
   /**
    * Post the book passed on the req.body into the record;
    * @param {Object} req The Http Request
    * @param {Object} res The Http Response
    */
   (req, res) => {
      let newBook = req.body;
      books.push(newBook);
      res.send(books);
   }
);


app.listen(port, 
   /**
    * Initializes the application and prints out the avalible IP routes and the used port;
    */
   () => {
      console.log('\n');
      console.log(`Express Running on ${process.platform}`);
      Object.keys(net).forEach(type => {
         net[type].forEach( ip =>
         {
            if(ip.family === 'IPv4')
            {
               console.log(`${type}\t: ${ip.address}:${process.env.PORT || 6969}`)
            }
         })
      });
   }
);
