// * * * CONSTANTS * * * //


// Lets server know that this is an express app
const express = require('express');
// Morgan receives status codes is used for troubleshooting
const morgan = require('morgan');
// Cookie session used for encrypted cookies
const cookieSession = require('cookie-session');
// bcrypt is main encryption tool
const bcrypt = require('bcrypt');
// Sets app as an express app
const app = express();
// This the default server port
const PORT = 8080;
// All helper functions kept in seperate file
const { generateRandomString, getUserByEmail, urlsForUser } = require('./functions');


// * * * APP SETTINGS * * * //


app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(cookieSession({
  name: 'session',
  keys: ['mysecretkey'], 
  //
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));


// * * * DATABASES * * * //


// This is where user URLs are stored, these URLs are for testing
const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "userRandomID"
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW"
  }
};

// This is where and how user data is stored, these are bunk users for testing
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("abcd", 10)
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("1234", 10)
  }
};


// * * * GET REQUESTS * * * //


// - - - REDIRECT TO URLS - - - //
// Redirects to the urls page if no address is defined
app.get('/', (req, res) => {
  res.redirect("/urls");
});


// - - - VIEW URLS - - - //
// Sets permissions to view URLS if logged in or else gets redirected back to login page
app.get('/urls', (req, res) => {
  if (req.session.user_id) {
    const userId = req.session.user_id;
    const user = users[userId];
    const urls = urlsForUser(userId, urlDatabase);
    const templateVars = {
      urls,
      user
    };
    res.render('urls_index', templateVars);
  } else {
    res.redirect('/login');
  }
});


// - - - NEW URLS - - - //
// Sets permissions to create new URLs if logged in or else user gets redirected to login page
app.get('/urls/new', (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    res.redirect('/login');
    return;
  }
  const user = users[userId];
  const templateVars = {
    urls: urlDatabase,
    user: user
  };
  res.render("urls_new", templateVars);
});


// - - - VIEW URLS - - - //
// Sets permissions to view short URLs if logged in
app.get('/urls/:shortURL', (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  const url = urlDatabase[req.params.shortURL];
  if (!url) {
    res.send('There is no record of that url on your account!')
  }
  if (userId !== url.userID) {
    return res.status(403).send('Please login to view your urls!');
  }
  const templateVars = {
    user: user,
    shortURL: req.params.shortURL,
    longURL: url.longURL };
  res.render('urls_show', templateVars);
});


// - - - REDIRECT SHORT URL TO LONG URL - - - //
app.get('/u/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL];
  if (!shortURL || !longURL) {
    res.send('There is no record of that url!')
  }
  res.redirect(longURL.longURL);
});


// - - -  REGISTER - - - //
// Users are null by default
app.get('/register', (req, res) => {
  const templateVars = {
    user: null
  };
  res.render('register', templateVars);
});


// - - - LOGIN - - - //
// Users are null by default
app.get('/login', (req, res) => {
  const templateVars = {
    user: null
  };
  res.render('login', templateVars);
});


// * * * POST REQUESTS * * * //


// - - - CREATE URL - - - //
// Create a new URL and short URL is generated via generateRandomString helper function
app.post('/urls', (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    let shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      userID: userId
    };
    res.redirect('/urls/' + shortURL);
  } else {
    return res.status(403).send('Please login to create a URL!');
  }
});


// - - - DELETE URL- - - //
// Users can only delete their own URLs
app.post('/urls/:shortURL/delete', (req, res) => {
  const userId = req.session.user_id;
  let shortURL = req.params.shortURL;
  const url = urlDatabase[shortURL];
  const usersURL = url && url.userID === userId;
  if (usersURL) {
    delete urlDatabase[shortURL];
    res.redirect('/urls');
  } else {
    return res.status(403).send('Please login to delete a URL!');
  }
});


// - - - EDIT URL- - - //
// Users can only edit their own URLs
app.post('/urls/:id', (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    let shortURL = req.params.id;
    urlDatabase[shortURL].longURL = req.body.newLongURL;
    res.redirect('/urls');
  } else {
    return res.status(403).send('Please login to edit this URL!');
  }
});


// - - - REGISTER - - - //
// Multiple checks for valid registration and id assigment for new users
app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // if empty email or password field return error
  if (email === '' || password === '') {
    return res.status(400).send('Please provide a valid email and/or password!');
  }
  const id = generateRandomString(5);
  const user = {
    id,
    email,
    // Sets password encryption
    password: bcrypt.hashSync(req.body.password, 3)
  };
  // Checks if email address is stored
  if (getUserByEmail(email, users)) {
    return res.status(400).send("Email already in use, please use a different Email to register");
  }
  users[id] = user;
  req.session.user_id = id;
  res.redirect('/urls');
});


// - - - LOGIN - - - //
// Checks for valid login credentials else throws error to user
app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (email === '' || password === '') {
    return res.status(403).send("Email and/or password cannot be empty!");
  }// If credentials are valid allows user site permission
  const user = getUserByEmail(email, users);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user_id = user.id;
    res.redirect('/urls');
  } else {
    res.status(403).send('User not found, please register or login with valid credentials!');
  }
});


// - - - LOGOUT - - - //
// Logs user out and nullifies cookie session and redirects user to login page
app.post('/logout', (req, res) => {
  req.session.user_id =  null;
  res.redirect('/urls');
});


// Server setting and port assignment
app.listen(PORT, () => {
  console.log(`TinyApp is listening on port ${PORT}!`);
});