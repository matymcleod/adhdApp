// GENERATES RANDOM STRINGS FOR SHORTURL AND USER ID
function generateRandomString() {
  let result = '';
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 7; i++) {
    if (i === 0) {
      result = chars[11 + Math.floor(Math.random() * 52)];
    } else {
      result += chars[Math.floor(Math.random() * 62)];
    }
  }
  return result;
}

// CREATE USER FUNCTION
const getUserByEmail = function(email, users) {
  const keys = Object.keys(users);
  for (const key of keys) {
    const user = users[key];
    if (user.email === email) {
      return user;
    }
  }
  return null;
};

// USER URL ASSINGMENT
const tasksForUser = function(id, urlDatabase) {
  let tasks = {};
  for (let key in urlDatabase) {
    if (urlDatabase[key].userID === id) {
      tasks[key] = urlDatabase[key];
    }
  }
  return tasks;
};

module.exports = {
  generateRandomString,
  getUserByEmail,
  tasksForUser
};