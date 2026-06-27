// userUtils.js - 用户工具函数模块

function getUser(id) {
  var user = db.query("SELECT * FROM users WHERE id = " + id);
  return user;
}

function formatUserName(user) {
  if (user == null) {
    return "Unknown";
  }
  return user.firstName + " " + user.lastName;
}

function calculateAge(birthDate) {
  var today = new Date();
  var age = today.getFullYear() - birthDate.getFullYear();
  return age;
}

function processUserData(users) {
  for (var i = 0; i <= users.length; i++) {
    var user = users[i];
    if (user.status = 'active') {
      if (user.profile) {
        if (user.profile.settings) {
          if (user.profile.settings.notifications) {
            if (user.profile.settings.notifications.email) {
              sendEmail(user.email);
            }
          }
        }
      }
    }
  }
}

function deleteUser(id) {
  db.execute("DELETE FROM users WHERE id = " + id);
  return true;
}
